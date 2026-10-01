import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import {
  DesignerElementDto,
  DesignerItemColumnDto,
  DesignerSectionDto,
  DesignerVersionDto,
  DocumentDesignService,
  DocumentLookupOption,
  apiErrorMessage,
} from '../../core/services/document-design.service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionService } from '../../core/services/permission.service';

/* =====================================================================
   DOCUMENT DESIGNER (3-panel, same-page Design ⇄ Preview).

   LEFT   : component palette (drag onto canvas or click to add) + sections
   CENTER : A4 canvas (210 × 297 mm) in DESIGN mode, or the saved design
            rendered by the backend with sample data in PREVIEW mode.
   RIGHT  : properties of the selected section / element (position, size,
            font, font style, colors, padding, per-side borders, mapped
            variables, item columns).

   Save    -> PUT  /api/document-templates/versions/{id}/designer
   Preview -> GET  /api/document-templates/versions/{id}/preview
   Publish -> POST /api/document-templates/versions/{id}/publish

   Coordinate model (matches the backend renderer):
     - section.x/y            : absolute position on the A4 page (mm)
     - element.x/y            : position RELATIVE to its parent section (mm)
   ===================================================================== */

interface PaletteItem {
  code: string;
  label: string;
  elementType: 'static' | 'variable' | 'item-column';
  defaultWidth: number;
  defaultHeight: number;
}

type ResizeDir = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface DragState {
  kind: 'move' | 'resize' | 'pan';
  dir: ResizeDir | null;
  startX: number; // mouse client px
  startY: number;
  origX: number; // element mm values at drag start
  origY: number;
  origW: number;
  origH: number;
  scrollX: number; // canvas wrap scroll at pan start
  scrollY: number;
}

@Component({
  selector: 'app-document-designer',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, DecimalPipe],
  templateUrl: './document-designer.html',
  styleUrl: './document-designer.css',
})
export class DocumentDesignerPage implements OnInit {
  private readonly svc = inject(DocumentDesignService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly versionId = signal(0);
  protected readonly design = signal<DesignerVersionDto | null>(null);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly dirty = signal(false);
  protected readonly mode = signal<'design' | 'preview'>('design');
  protected readonly previewHtml = signal<string | null>(null);
  protected readonly previewLoading = signal(false);

  /* The preview HTML is produced by our own backend renderer (pure HTML+CSS,
     no scripts), so bypass Angular's <style>-stripping HTML sanitizer. */
  protected get previewHtmlSafe(): SafeHtml | null {
    const html = this.previewHtml();
    return html ? this.sanitizer.bypassSecurityTrustHtml(html) : null;
  }
  protected readonly canEdit = computed(
    () => this.perm.has('invoice-templates.edit') && this.design()?.status === 'DRAFT',
  );

  protected readonly components = signal<DocumentLookupOption[]>([]);
  protected readonly variables = signal<DocumentLookupOption[]>([]);
  protected readonly fonts = signal<DocumentLookupOption[]>([]);

  /* A4 canvas metrics (mm) rendered at CSS px per mm × zoom */
  protected static readonly PAGE_W = 210;
  protected static readonly PAGE_H = 297;
  protected readonly pageW = DocumentDesignerPage.PAGE_W;
  protected readonly pageH = DocumentDesignerPage.PAGE_H;
  protected readonly zoom = signal(1);
  protected px = computed(() => 1.45 * this.zoom()); // screen px per mm

  protected readonly paletteSearch = signal('');
  protected readonly filteredPalette = computed(() => {
    const q = this.paletteSearch().trim().toLowerCase();
    if (!q) return this.palette;
    return this.palette.filter(
      (p) => p.label.toLowerCase().includes(q) || p.code.toLowerCase().includes(q),
    );
  });

  protected readonly selectedKind = signal<'section' | 'element' | null>(null);
  protected readonly selectedSection = signal<DesignerSectionDto | null>(null);
  protected readonly selectedElement = signal<DesignerElementDto | null>(null);

  protected readonly palette: PaletteItem[] = [
    { code: 'CUSTOM_TEXT', label: 'Text / Label', elementType: 'static', defaultWidth: 60, defaultHeight: 8 },
    { code: 'CUSTOMER', label: 'Variable Block', elementType: 'variable', defaultWidth: 70, defaultHeight: 14 },
    { code: 'ITEM_TABLE', label: 'Item Table', elementType: 'item-column', defaultWidth: 190, defaultHeight: 60 },
    { code: 'LOGO', label: 'Image / Logo', elementType: 'static', defaultWidth: 35, defaultHeight: 18 },
    { code: 'DIVIDER', label: 'Line', elementType: 'static', defaultWidth: 190, defaultHeight: 1.5 },
    { code: 'TOTAL', label: 'Total', elementType: 'variable', defaultWidth: 80, defaultHeight: 9 },
  ];

  private drag: DragState | null = null;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.queryParamMap.get('versionId'));
    if (!Number.isFinite(id) || id <= 0) {
      this.toast.error('No template version selected', 'Open the designer from a template version.');
      return;
    }
    this.versionId.set(id);
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    try {
      const [design, comps, vars, fonts] = await Promise.all([
        this.svc.designer(this.versionId()),
        this.svc.components(true),
        this.svc.variables(true),
        this.svc.fonts(true),
      ]);
      this.design.set(design);
      this.components.set(comps);
      this.variables.set(vars);
      this.fonts.set(fonts);
      this.dirty.set(false);
      this.clearSelection();
    } catch (e) {
      this.toast.error('Failed to load design', apiErrorMessage(e));
    } finally {
      this.loading.set(false);
    }
  }

  /* ==================================================================== */
  /* Same-page Design ⇄ Preview                                           */
  /* ==================================================================== */

  protected setMode(m: 'design' | 'preview'): void {
    if (m === this.mode()) return;
    if (m === 'preview') {
      void this.refreshPreview();
    }
    this.mode.set(m);
  }

  protected async refreshPreview(): Promise<void> {
    this.previewLoading.set(true);
    try {
      this.previewHtml.set(await this.svc.preview(this.versionId()));
    } catch (e) {
      this.toast.error('Preview failed', apiErrorMessage(e));
      this.mode.set('design');
    } finally {
      this.previewLoading.set(false);
    }
  }

  protected printPreview(): void {
    const html = this.previewHtml();
    if (!html) return;
    const win = window.open('', '_blank');
    if (!win) {
      this.toast.warning('Popup blocked', 'Allow popups to print, then use the browser print button.');
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  }

  /* ==================================================================== */
  /* Palette → canvas (drag & drop + click fallback)                      */
  /* ==================================================================== */

  protected paletteDragStart(event: DragEvent, item: PaletteItem): void {
    event.dataTransfer?.setData('application/x-dsg-component', item.code);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy';
  }

  protected onCanvasDrop(event: DragEvent): void {
    event.preventDefault();
    this.canvasDragOver.set(false);
    if (!this.canEdit()) return;
    const code = event.dataTransfer?.getData('application/x-dsg-component');
    if (!code) return;
    const item = this.palette.find((p) => p.code === code);
    if (!item) return;

    // Drop point on the page (mm) → choose the section under the cursor.
    const wrap = event.currentTarget as HTMLElement;
    const rect = wrap.getBoundingClientRect();
    const scroll = this.wrapScroll(wrap);
    const mmX = (event.clientX - rect.left + scroll.x) / this.px();
    const mmY = (event.clientY - rect.top + scroll.y) / this.px();
    const target =
      this.design()?.sections.find((s) => {
        if (!s.isVisible) return false;
        const x = s.x ?? 0;
        const y = s.y ?? 0;
        return mmX >= x && mmX <= x + (s.width ?? 190) && mmY >= y && mmY <= y + (s.height ?? 30);
      }) ?? this.design()?.sections[0];
    if (!target) return;

    // Element coords are section-relative.
    const x = clamp(mmX - (target.x ?? 0) - item.defaultWidth / 2, 0, (target.width ?? 190) - item.defaultWidth);
    const y = clamp(mmY - (target.y ?? 0) - item.defaultHeight / 2, 0, (target.height ?? 30) - item.defaultHeight);
    this.addElement(item, target, Number.isFinite(x) ? x : 0, Number.isFinite(y) ? y : 0);
  }

  protected readonly canvasDragOver = signal(false);
  protected onCanvasDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    this.canvasDragOver.set(true);
  }
  protected onCanvasDragLeave(): void {
    this.canvasDragOver.set(false);
  }

  protected addElement(item: PaletteItem, target?: DesignerSectionDto, x?: number, y?: number): void {
    if (!this.canEdit()) return;
    const section = target ?? (this.selectedKind() === 'section' ? this.selectedSection() : null) ?? this.design()?.sections[0];
    if (!section) return;

    const componentId = this.components().find((c) => c.code === item.code)?.id ?? 0;
    const element: DesignerElementDto = {
      componentId,
      componentCode: item.code,
      elementType: item.elementType,
      elementName: item.label,
      x: x ?? 10,
      y: y ?? 10,
      width: item.defaultWidth,
      height: item.defaultHeight,
      displayOrder: section.elements.length,
      isVisible: true,
      fields: item.elementType === 'variable' ? [{ variableId: 0, fieldName: '', bindingPath: '', label: null, isVisible: true }] : [],
      itemColumns:
        item.elementType === 'item-column'
          ? [
              { fieldName: 'SlNo', headerText: '#', displayOrder: 1, width: 10, alignment: 'CENTER', isVisible: true },
              { fieldName: 'ProductName', headerText: 'Product', displayOrder: 2, width: 60, alignment: 'LEFT', isVisible: true },
              { fieldName: 'Quantity', headerText: 'Qty', displayOrder: 3, width: 16, alignment: 'RIGHT', isVisible: true },
              { fieldName: 'Rate', headerText: 'Rate', displayOrder: 4, width: 22, alignment: 'RIGHT', isVisible: true },
              { fieldName: 'LineTotal', headerText: 'Amount', displayOrder: 5, width: 28, alignment: 'RIGHT', isVisible: true },
            ]
          : [],
      style: { fontSize: 3.2, fontWeight: null, fontStyle: null, textAlign: 'LEFT' },
    };
    section.elements.push(element);
    this.markDirty();
    this.selectElement(section, element);
  }

  protected addSection(): void {
    if (!this.canEdit() || !this.design()) return;
    const n = this.design()!.sections.length + 1;
    this.design()!.sections.push({
      sectionCode: `SECTION${n}`,
      sectionName: `Section ${n}`,
      displayOrder: n,
      x: 10,
      y: 10,
      width: 190,
      height: 30,
      isVisible: true,
      elements: [],
    });
    this.markDirty();
  }

  protected removeSection(section: DesignerSectionDto): void {
    if (!this.canEdit()) return;
    if (!confirm(`Remove section "${section.sectionName}" and all its elements?`)) return;
    this.design()!.sections = this.design()!.sections.filter((s) => s !== section);
    if (this.selectedSection() === section) this.clearSelection();
    this.markDirty();
  }

  protected removeElement(section: DesignerSectionDto, element: DesignerElementDto): void {
    if (!this.canEdit()) return;
    section.elements = section.elements.filter((e) => e !== element);
    if (this.selectedElement() === element) this.clearSelection();
    this.markDirty();
  }

  protected duplicateElement(section: DesignerSectionDto, element: DesignerElementDto): void {
    if (!this.canEdit()) return;
    const copy: DesignerElementDto = JSON.parse(JSON.stringify(element));
    copy.elementId = null;
    for (const f of copy.fields) f.templateFieldId = null;
    for (const c of copy.itemColumns) c.itemColumnId = null;
    copy.x = (element.x ?? 0) + 4;
    copy.y = (element.y ?? 0) + 4;
    copy.elementName = `${element.elementName ?? element.componentCode ?? 'Element'} copy`;
    copy.displayOrder = section.elements.length;
    section.elements.push(copy);
    this.markDirty();
    this.selectElement(section, copy);
  }

  /* Layer order = array order inside the section (renderer stacks alike). */
  protected moveLayer(section: DesignerSectionDto, element: DesignerElementDto, op: 'front' | 'back' | 'forward' | 'backward'): void {
    if (!this.canEdit()) return;
    const arr = section.elements;
    const i = arr.indexOf(element);
    if (i < 0) return;
    arr.splice(i, 1);
    const j =
      op === 'front' ? arr.length :
      op === 'back' ? 0 :
      op === 'forward' ? Math.min(arr.length, i + 1) :
      Math.max(0, i - 1);
    arr.splice(j, 0, element);
    arr.forEach((e, idx) => (e.displayOrder = idx));
    this.markDirty();
  }

  /* ==================================================================== */
  /* Selection                                                            */
  /* ==================================================================== */

  protected selectSection(section: DesignerSectionDto): void {
    this.selectedKind.set('section');
    this.selectedSection.set(section);
    this.selectedElement.set(null);
  }

  protected selectElement(section: DesignerSectionDto, element: DesignerElementDto): void {
    this.selectedKind.set('element');
    this.selectedSection.set(section);
    this.selectedElement.set(element);
  }

  protected clearSelection(): void {
    this.selectedKind.set(null);
    this.selectedSection.set(null);
    this.selectedElement.set(null);
  }

  protected isSectionSelected(section: DesignerSectionDto): boolean {
    return this.selectedKind() === 'section' && this.selectedSection() === section;
  }

  protected isElementSelected(section: DesignerSectionDto, element: DesignerElementDto): boolean {
    return this.selectedKind() === 'element' && this.selectedElement() === element;
  }

  /* ==================================================================== */
  /* Canvas drag: move / resize / panning                                 */
  /* ==================================================================== */

  protected startElementDrag(
    event: MouseEvent,
    section: DesignerSectionDto,
    element: DesignerElementDto,
  ): void {
    if (this.mode() !== 'design') return;
    if (!this.canEdit() || event.button !== 0) return;
    const t = event.target as HTMLElement;
    if (t.closest('.dsg-rz') || t.closest('button')) return; // handles / delete btn
    event.preventDefault();
    event.stopPropagation();
    this.selectElement(section, element);
    this.drag = {
      kind: 'move', dir: null,
      startX: event.clientX, startY: event.clientY,
      origX: element.x ?? 0, origY: element.y ?? 0,
      origW: element.width ?? 40, origH: element.height ?? 8,
      scrollX: 0, scrollY: 0,
    };
  }

  protected startResize(event: MouseEvent, section: DesignerSectionDto, element: DesignerElementDto, dir: ResizeDir): void {
    if (!this.canEdit() || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    this.selectElement(section, element);
    this.drag = {
      kind: 'resize', dir,
      startX: event.clientX, startY: event.clientY,
      origX: element.x ?? 0, origY: element.y ?? 0,
      origW: element.width ?? 40, origH: element.height ?? 8,
      scrollX: 0, scrollY: 0,
    };
  }

  protected startPan(event: MouseEvent): void {
    if (this.mode() !== 'design') return;
    const t = event.target as HTMLElement;
    if (t !== event.currentTarget) return; // only blank canvas background
    if (event.button !== 0) return;
    const wrap = (event.currentTarget as HTMLElement).parentElement; // .dsg-canvas-wrap
    this.drag = {
      kind: 'pan', dir: null,
      startX: event.clientX, startY: event.clientY,
      origX: 0, origY: 0, origW: 0, origH: 0,
      scrollX: wrap?.scrollLeft ?? 0,
      scrollY: wrap?.scrollTop ?? 0,
    };
  }

  @HostListener('document:mousemove', ['$event'])
  protected onMouseMove(event: MouseEvent): void {
    const d = this.drag;
    if (!d) return;
    if (d.kind === 'pan') {
      const wrap = document.querySelector<HTMLElement>('.dsg-canvas-wrap');
      if (wrap) {
        wrap.scrollLeft = d.scrollX - (event.clientX - d.startX);
        wrap.scrollTop = d.scrollY - (event.clientY - d.startY);
      }
      return;
    }
    const el = this.selectedElement();
    if (!el) return;
    const dx = (event.clientX - d.startX) / this.px();
    const dy = (event.clientY - d.startY) / this.px();
    if (d.kind === 'move') {
      el.x = Math.round((d.origX + dx) * 10) / 10;
      el.y = Math.round((d.origY + dy) * 10) / 10;
    } else if (d.kind === 'resize' && d.dir) {
      let x = d.origX, y = d.origY, w = d.origW, h = d.origH;
      const dir = d.dir;
      if (dir.includes('e')) w = Math.max(4, d.origW + dx);
      if (dir.includes('s')) h = Math.max(1, d.origH + dy);
      if (dir.includes('w')) { w = Math.max(4, d.origW - dx); x = d.origX + (d.origW - w); }
      if (dir.includes('n')) { h = Math.max(1, d.origH - dy); y = d.origY + (d.origH - h); }
      el.x = Math.round(x * 10) / 10;
      el.y = Math.round(y * 10) / 10;
      el.width = Math.round(w * 10) / 10;
      el.height = Math.round(h * 10) / 10;
    }
    this.markDirty();
  }

  @HostListener('document:mouseup')
  protected onMouseUp(): void {
    this.drag = null;
  }

  @HostListener('document:keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    if (this.mode() !== 'design' || !this.selectedElement() || !this.canEdit()) return;
    const target = event.target as HTMLElement;
    if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;
    if (event.key === 'Delete') {
      const el = this.selectedElement()!;
      const sec = this.selectedSection();
      if (sec) {
        event.preventDefault();
        this.removeElement(sec, el);
      }
      return;
    }
    if (!event.ctrlKey || event.key.toLowerCase() !== 'd') return;
    const el = this.selectedElement()!;
    const sec = this.selectedSection();
    if (sec) {
      event.preventDefault();
      this.duplicateElement(sec, el);
    }
  }

  protected zoomIn(): void { this.zoom.set(Math.min(2, Math.round((this.zoom() + 0.1) * 10) / 10)); }
  protected zoomOut(): void { this.zoom.set(Math.max(0.4, Math.round((this.zoom() - 0.1) * 10) / 10)); }
  protected zoomReset(): void { this.zoom.set(1); }

  private wrapScroll(wrap: HTMLElement): { x: number; y: number } {
    // The page div is centered inside the scrollable wrap; compute the
    // scroll offset relative to the page origin.
    const page = wrap.querySelector<HTMLElement>('.dsg-canvas');
    if (!page) return { x: 0, y: 0 };
    const pageRect = page.getBoundingClientRect();
    return { x: wrap.scrollLeft + (pageRect.left - wrap.getBoundingClientRect().left), y: wrap.scrollTop + (pageRect.top - wrap.getBoundingClientRect().top) };
  }

  /* ==================================================================== */
  /* Element body preview                                                 */
  /* ==================================================================== */

  protected elementPreview(element: DesignerElementDto): string {
    if (element.itemColumns.length) {
      return element.itemColumns.map((c) => c.headerText).join(' | ');
    }
    if (element.fields.length) {
      return element.fields
        .filter((f) => f.bindingPath)
        .map((f) => (f.label ? `${f.label}: {${f.bindingPath}}` : `{${f.bindingPath}}`))
        .join('  ') || element.elementName || element.componentCode || element.elementType;
    }
    return element.elementName || element.componentCode || element.elementType;
  }

  protected elementAlign(element: DesignerElementDto): string {
    return (element.style?.textAlign ?? 'left').toLowerCase();
  }

  protected elementWeight(element: DesignerElementDto): string {
    return (element.style?.fontWeight ?? 'normal').toLowerCase();
  }

  protected elementItalic(element: DesignerElementDto): boolean {
    return (element.style?.fontStyle ?? '').toLowerCase() === 'italic';
  }

  /* ==================================================================== */
  /* Variable field mapping (add / remove / reorder / change)             */
  /* ==================================================================== */

  protected addField(element: DesignerElementDto): void {
    element.fields.push({ variableId: 0, fieldName: '', bindingPath: '', label: null, isVisible: true });
    this.markDirty();
  }

  protected removeField(element: DesignerElementDto, index: number): void {
    element.fields.splice(index, 1);
    this.markDirty();
  }

  protected moveField(element: DesignerElementDto, index: number, dir: -1 | 1): void {
    const j = index + dir;
    if (j < 0 || j >= element.fields.length) return;
    const [f] = element.fields.splice(index, 1);
    element.fields.splice(j, 0, f);
    this.markDirty();
  }

  protected onFieldVariable(element: DesignerElementDto, index: number, variableId: number): void {
    const v = this.variables().find((x) => x.id === Number(variableId));
    const f = element.fields[index];
    if (v) {
      f.variableId = v.id;
      f.bindingPath = v.bindingPath ?? v.code;
      f.fieldName = v.code;
      if (!f.label) f.label = v.name;
    }
    this.markDirty();
  }

  protected addItemColumn(element: DesignerElementDto): void {
    element.itemColumns.push({
      fieldName: '', headerText: '', displayOrder: element.itemColumns.length + 1,
      width: 20, alignment: 'LEFT', isVisible: true,
    });
    this.markDirty();
  }

  protected removeItemColumn(element: DesignerElementDto, index: number): void {
    element.itemColumns.splice(index, 1);
    this.markDirty();
  }

  protected moveItemColumn(element: DesignerElementDto, index: number, dir: -1 | 1): void {
    const cols = element.itemColumns;
    const j = index + dir;
    if (j < 0 || j >= cols.length) return;
    const [c] = cols.splice(index, 1);
    cols.splice(j, 0, c);
    cols.forEach((cc, i) => (cc.displayOrder = i + 1));
    this.markDirty();
  }

  protected readonly knownItemFields = [
    'SlNo', 'ProductCode', 'ProductName', 'HsnCode', 'UnitName', 'Quantity',
    'Rate', 'DiscountAmount', 'TaxableAmount', 'TaxPercent', 'TaxAmount', 'LineTotal',
  ];

  protected onItemFieldChange(element: DesignerElementDto, index: number, fieldName: string): void {
    const c = element.itemColumns[index];
    if (!c) return;
    c.fieldName = fieldName;
    if (!c.headerText) c.headerText = fieldName;
    this.markDirty();
  }

  /* ---------------- color pickers ---------------- */

  protected colorOf(value: string | null | undefined, fallback: string): string {
    const v = (value ?? '').trim();
    return /^#[0-9a-fA-F]{3,8}$/.test(v) ? v.slice(0, 7) : fallback;
  }

  protected setColor(
    st: import('../../core/services/document-design.service').DesignerStyleDto,
    prop: 'textColor' | 'backgroundColor' | 'borderColor',
    value: string,
  ): void {
    st[prop] = value;
    this.markDirty();
  }

  protected clearColor(
    st: import('../../core/services/document-design.service').DesignerStyleDto,
    prop: 'textColor' | 'backgroundColor' | 'borderColor',
  ): void {
    st[prop] = null;
    this.markDirty();
  }

  /* ==================================================================== */
  /* Save / publish                                                       */
  /* ==================================================================== */

  protected async save(): Promise<void> {
    if (!this.canEdit() || this.saving()) return;
    const design = this.design();
    if (!design) return;
    if (!design.sections.length) {
      this.toast.error('Add at least one section before saving');
      return;
    }
    this.saving.set(true);
    try {
      await this.svc.saveDesigner(this.versionId(), design.sections);
      this.dirty.set(false);
      this.toast.success('Design saved', 'Status remains Draft until you publish.');
      await this.load();
    } catch (e) {
      this.toast.error('Save failed', apiErrorMessage(e));
    } finally {
      this.saving.set(false);
    }
  }

  protected async publish(): Promise<void> {
    if (this.dirty()) {
      this.toast.warning('Unsaved changes', 'Save the design before publishing.');
      return;
    }
    if (!confirm('Publish this version? It becomes the live design for printing.')) return;
    try {
      await this.svc.publish(this.versionId());
      this.toast.success('Version published');
      await this.load();
    } catch (e) {
      this.toast.error('Publish failed', apiErrorMessage(e));
    }
  }

  protected canDeactivate(): boolean {
    if (!this.dirty()) return true;
    return confirm('You have unsaved design changes. Leave anyway?');
  }

  protected markDirty(): void {
    this.dirty.set(true);
  }

  /* ==================================================================== */
  /* Canvas helpers                                                       */
  /* ==================================================================== */

  protected sectionStyle(section: DesignerSectionDto): Record<string, string> {
    return {
      left: `${(section.x ?? 0) * this.px()}px`,
      top: `${(section.y ?? 0) * this.px()}px`,
      width: `${(section.width ?? 190) * this.px()}px`,
      height: `${(section.height ?? 30) * this.px()}px`,
    };
  }

  /* Element x/y are SECTION-RELATIVE (same model as the HTML renderer),
     so they are used as-is inside the positioned section box. */
  protected elementStyle(element: DesignerElementDto, zIndex: number): Record<string, string> {
    const st = element.style;
    const style: Record<string, string> = {
      left: `${(element.x ?? 0) * this.px()}px`,
      top: `${(element.y ?? 0) * this.px()}px`,
      width: `${(element.width ?? 40) * this.px()}px`,
      height: `${(element.height ?? 8) * this.px()}px`,
      fontSize: `${(st?.fontSize ?? 3.2) * this.px()}px`,
      textAlign: this.elementAlign(element),
      fontWeight: this.elementWeight(element),
      zIndex: String(zIndex),
    };
    if (st) {
      if (st.fontStyle) style['fontStyle'] = st.fontStyle;
      if (st.verticalAlign) style['verticalAlign'] = st.verticalAlign.toLowerCase();
      if (st.textColor) style['color'] = st.textColor;
      if (st.backgroundColor) style['background'] = st.backgroundColor;
      const bc = st.borderColor ?? '#444';
      if (st.borderTop) style['borderTop'] = `1px solid ${bc}`;
      if (st.borderRight) style['borderRight'] = `1px solid ${bc}`;
      if (st.borderBottom) style['borderBottom'] = `1px solid ${bc}`;
      if (st.borderLeft) style['borderLeft'] = `1px solid ${bc}`;
      const pad = (v: number | null | undefined) => `${(v ?? 0) * this.px()}px`;
      if (st.paddingTop) style['paddingTop'] = pad(st.paddingTop);
      if (st.paddingRight) style['paddingRight'] = pad(st.paddingRight);
      if (st.paddingBottom) style['paddingBottom'] = pad(st.paddingBottom);
      if (st.paddingLeft) style['paddingLeft'] = pad(st.paddingLeft);
    }
    return style;
  }

  protected componentLabel(code: string | null | undefined): string {
    if (!code) return '';
    return this.components().find((c) => c.code === code)?.name ?? code;
  }

  protected variableLabel(id: number): string {
    return this.variables().find((v) => v.id === id)?.name ?? '(select variable)';
  }

  protected backToHub(): void {
    if (!this.canDeactivate()) return;
    void this.router.navigate(['/document-design']);
  }

  protected readonly resizeDirs: ResizeDir[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
