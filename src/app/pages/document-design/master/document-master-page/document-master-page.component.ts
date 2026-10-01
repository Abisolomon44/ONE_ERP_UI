import { UpperCasePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import {
  DocumentDesignService,
  DocumentLookupOption,
  DocumentMasterKind,
  DocumentMasterRow,
  SaveDocumentMasterRequest,
  apiErrorMessage,
} from '../../../../core/services/document-design.service';
import { ToastService } from '../../../../core/services/toast.service';
import { PermissionService } from '../../../../core/services/permission.service';

/* =====================================================================
   DOCUMENT MASTER — generic, config-driven master CRUD screen.

   One standalone component serves the dedicated Document Master pages
   (DB Screen routes under Print Setup → Print Configuration, plus the
   /document-design/master/* aliases). Each route supplies
   `data: { master: kind }`; the CONFIG map below defines that master's
   columns and form fields. All CRUD goes through the existing
   /api/document/master/{kind} endpoints via DocumentDesignService —
   no new tables, no seed creation, backend stays authoritative.

   Template Components has its own dedicated component
   (template-components-master.component.ts) per its spec; this generic
   page covers the other nine masters.
   ===================================================================== */

type MasterFieldKey = keyof SaveDocumentMasterRequest & string;

interface MasterColumnDef {
  field: keyof DocumentMasterRow & string;
  label: string;
  type?: 'text' | 'mono' | 'badge' | 'bool' | 'status';
}

interface MasterFieldDef {
  name: MasterFieldKey;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'select' | 'checkbox';
  required?: boolean;
  maxLength?: number;
  options?: string[];
  placeholder?: string;
}

interface MasterKindConfig {
  label: string;
  singular: string;
  subtitle: string;
  columns: MasterColumnDef[];
  fields: MasterFieldDef[];
  needsPrinterTypes?: boolean;
}

const DATA_TYPES = ['STRING', 'DECIMAL', 'DATETIME', 'NUMBER', 'BOOLEAN'];

const CONFIG: Record<DocumentMasterKind, MasterKindConfig> = {
  types: {
    label: 'Document Types',
    singular: 'Document Type',
    subtitle: 'Manage document types used by document templates (e.g. Sales Invoice).',
    columns: [
      { field: 'code', label: 'Code', type: 'mono' },
      { field: 'name', label: 'Name' },
      { field: 'description', label: 'Description' },
      { field: 'displayOrder', label: 'Order' },
      { field: 'isActive', label: 'Status', type: 'status' },
    ],
    fields: [
      { name: 'code', label: 'Type Code', type: 'text', required: true, maxLength: 50, placeholder: 'e.g. SALES' },
      { name: 'name', label: 'Type Name', type: 'text', required: true, maxLength: 100, placeholder: 'e.g. Sales Invoice' },
      { name: 'description', label: 'Description', type: 'textarea', maxLength: 300 },
      { name: 'displayOrder', label: 'Display Order', type: 'number' },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  },
  'paper-sizes': {
    label: 'Paper Sizes',
    singular: 'Paper Size',
    subtitle: 'Manage paper sizes for documents and thermal rolls.',
    columns: [
      { field: 'code', label: 'Code', type: 'mono' },
      { field: 'name', label: 'Name' },
      { field: 'width', label: 'Width (mm)' },
      { field: 'height', label: 'Height (mm)' },
      { field: 'unit', label: 'Unit', type: 'badge' },
      { field: 'isThermal', label: 'Thermal', type: 'bool' },
      { field: 'isCustom', label: 'Custom', type: 'bool' },
      { field: 'displayOrder', label: 'Order' },
      { field: 'isActive', label: 'Status', type: 'status' },
    ],
    fields: [
      { name: 'code', label: 'Paper Code', type: 'text', required: true, maxLength: 50, placeholder: 'e.g. A4' },
      { name: 'name', label: 'Paper Name', type: 'text', required: true, maxLength: 100, placeholder: 'e.g. A4' },
      { name: 'width', label: 'Width (mm)', type: 'number' },
      { name: 'height', label: 'Height (mm)', type: 'number' },
      { name: 'unit', label: 'Unit', type: 'text', maxLength: 10, placeholder: 'MM' },
      { name: 'description', label: 'Description', type: 'textarea', maxLength: 300 },
      { name: 'displayOrder', label: 'Display Order', type: 'number' },
      { name: 'isThermal', label: 'Thermal roll', type: 'checkbox' },
      { name: 'isCustom', label: 'Custom size', type: 'checkbox' },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  },
  categories: {
    label: 'Template Categories',
    singular: 'Template Category',
    subtitle: 'Manage categories used to group document templates.',
    columns: [
      { field: 'code', label: 'Code', type: 'mono' },
      { field: 'name', label: 'Name' },
      { field: 'description', label: 'Description' },
      { field: 'displayOrder', label: 'Order' },
      { field: 'isActive', label: 'Status', type: 'status' },
    ],
    fields: [
      { name: 'code', label: 'Category Code', type: 'text', required: true, maxLength: 50 },
      { name: 'name', label: 'Category Name', type: 'text', required: true, maxLength: 100 },
      { name: 'description', label: 'Description', type: 'textarea', maxLength: 300 },
      { name: 'displayOrder', label: 'Display Order', type: 'number' },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  },
  variables: {
    label: 'Template Variables',
    singular: 'Template Variable',
    subtitle: 'Manage bindable data variables used by the document designer.',
    columns: [
      { field: 'code', label: 'Code', type: 'mono' },
      { field: 'name', label: 'Name' },
      { field: 'bindingPath', label: 'Binding Path', type: 'mono' },
      { field: 'dataType', label: 'Data Type', type: 'badge' },
      { field: 'category', label: 'Category' },
      { field: 'isCollection', label: 'Collection', type: 'bool' },
      { field: 'isActive', label: 'Status', type: 'status' },
    ],
    fields: [
      { name: 'code', label: 'Variable Code', type: 'text', required: true, maxLength: 50, placeholder: 'e.g. Invoice.GrandTotal' },
      { name: 'name', label: 'Variable Name', type: 'text', required: true, maxLength: 100, placeholder: 'e.g. Grand Total' },
      { name: 'bindingPath', label: 'Binding Path', type: 'text', maxLength: 100, placeholder: 'e.g. Invoice.GrandTotal' },
      { name: 'dataType', label: 'Data Type', type: 'select', options: DATA_TYPES },
      { name: 'category', label: 'Category', type: 'text', maxLength: 50, placeholder: 'e.g. Invoice' },
      { name: 'description', label: 'Description', type: 'textarea', maxLength: 300 },
      { name: 'isCollection', label: 'Collection (list of items)', type: 'checkbox' },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  },
  fonts: {
    label: 'Fonts',
    singular: 'Font',
    subtitle: 'Manage fonts available to the document designer.',
    columns: [
      { field: 'code', label: 'Code', type: 'mono' },
      { field: 'name', label: 'Name' },
      { field: 'fontFamily', label: 'Font Family' },
      { field: 'isActive', label: 'Status', type: 'status' },
    ],
    fields: [
      { name: 'code', label: 'Font Code', type: 'text', required: true, maxLength: 50, placeholder: 'e.g. ARIAL' },
      { name: 'name', label: 'Font Name', type: 'text', required: true, maxLength: 100, placeholder: 'e.g. Arial' },
      { name: 'fontFamily', label: 'Font Family', type: 'text', maxLength: 100, placeholder: 'Defaults to Font Name' },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  },
  orientations: {
    label: 'Print Orientations',
    singular: 'Print Orientation',
    subtitle: 'Manage print orientations (Portrait / Landscape).',
    columns: [
      { field: 'code', label: 'Code', type: 'mono' },
      { field: 'name', label: 'Name' },
      { field: 'isActive', label: 'Status', type: 'status' },
    ],
    fields: [
      { name: 'code', label: 'Orientation Code', type: 'text', required: true, maxLength: 50, placeholder: 'e.g. PORTRAIT' },
      { name: 'name', label: 'Orientation Name', type: 'text', required: true, maxLength: 100, placeholder: 'e.g. Portrait' },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  },
  units: {
    label: 'Print Units',
    singular: 'Print Unit',
    subtitle: 'Manage measurement units used by paper sizes (e.g. MM, INCH).',
    columns: [
      { field: 'code', label: 'Code', type: 'mono' },
      { field: 'name', label: 'Name' },
      { field: 'isActive', label: 'Status', type: 'status' },
    ],
    fields: [
      { name: 'code', label: 'Unit Code', type: 'text', required: true, maxLength: 50, placeholder: 'e.g. MM' },
      { name: 'name', label: 'Unit Name', type: 'text', required: true, maxLength: 100, placeholder: 'e.g. Millimeter' },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  },
  'printer-types': {
    label: 'Printer Types',
    singular: 'Printer Type',
    subtitle: 'Manage printer types (e.g. Laser, Thermal, Dot Matrix).',
    columns: [
      { field: 'code', label: 'Code', type: 'mono' },
      { field: 'name', label: 'Name' },
      { field: 'description', label: 'Description' },
      { field: 'isActive', label: 'Status', type: 'status' },
    ],
    fields: [
      { name: 'code', label: 'Printer Type Code', type: 'text', required: true, maxLength: 50 },
      { name: 'name', label: 'Printer Type Name', type: 'text', required: true, maxLength: 100 },
      { name: 'description', label: 'Description', type: 'textarea', maxLength: 300 },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  },
  'printer-models': {
    label: 'Printer Models',
    singular: 'Printer Model',
    subtitle: 'Manage printer models and assign them to printer types.',
    columns: [
      { field: 'code', label: 'Code', type: 'mono' },
      { field: 'name', label: 'Name' },
      { field: 'printerTypeName', label: 'Printer Type' },
      { field: 'manufacturer', label: 'Manufacturer' },
      { field: 'isActive', label: 'Status', type: 'status' },
    ],
    fields: [
      { name: 'printerTypeId', label: 'Printer Type', type: 'select', required: true },
      { name: 'code', label: 'Model Code', type: 'text', required: true, maxLength: 50 },
      { name: 'name', label: 'Model Name', type: 'text', required: true, maxLength: 100 },
      { name: 'manufacturer', label: 'Manufacturer', type: 'text', maxLength: 100 },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
    needsPrinterTypes: true,
  },
  components: {
    // Unused — Template Components has its dedicated screen — kept so the
    // Record<DocumentMasterKind, …> map stays total.
    label: 'Template Components',
    singular: 'Template Component',
    subtitle: 'Managed on the dedicated Template Components page.',
    columns: [],
    fields: [],
  },
};

type StatusFilter = 'all' | 'active' | 'inactive';

interface MasterTabDef {
  label: string;
  kind: DocumentMasterKind;
  route: string;
}

/** Document Master tab strip; mirrors template-components-master's tabs
 *  but routes to each master's dedicated alias page. */
const MASTER_TABS: readonly MasterTabDef[] = [
  { label: 'Document Types', kind: 'types', route: '/document-design/master/types' },
  { label: 'Paper Sizes', kind: 'paper-sizes', route: '/document-design/master/paper-sizes' },
  { label: 'Template Categories', kind: 'categories', route: '/document-design/master/categories' },
  { label: 'Template Components', kind: 'components', route: '/document-design/master/template-components' },
  { label: 'Template Variables', kind: 'variables', route: '/document-design/master/variables' },
  { label: 'Fonts', kind: 'fonts', route: '/document-design/master/fonts' },
  { label: 'Print Orientations', kind: 'orientations', route: '/document-design/master/orientations' },
  { label: 'Print Units', kind: 'units', route: '/document-design/master/units' },
  { label: 'Printer Types', kind: 'printer-types', route: '/document-design/master/printer-types' },
  { label: 'Printer Models', kind: 'printer-models', route: '/document-design/master/printer-models' },
];

@Component({
  selector: 'app-document-master-page',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, UpperCasePipe],
  templateUrl: './document-master-page.component.html',
  styleUrl: './document-master-page.component.css',
})
export class DocumentMasterPageComponent implements OnInit {
  private readonly svc = inject(DocumentDesignService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);

  protected readonly masterTabs = MASTER_TABS;
  protected readonly kind = signal<DocumentMasterKind>('types');
  protected readonly config = computed(() => CONFIG[this.kind()]);
  protected readonly labelLower = computed(() => this.config().label.toLowerCase());

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly rows = signal<DocumentMasterRow[]>([]);
  protected readonly search = signal('');
  protected readonly statusFilter = signal<StatusFilter>('all');
  protected readonly showEntry = signal(false);
  protected readonly editingId = signal<number | null>(null);
  protected readonly printerTypes = signal<DocumentLookupOption[]>([]);
  protected model: SaveDocumentMasterRequest = this.blankModel();

  /* Mirrors the hub's gate (invoice-templates.*) plus the backend's
     document-master.{kind}.* codes. The backend remains authoritative. */
  protected readonly canManage = computed(() => {
    const k = this.kind();
    return (
      this.perm.has(['invoice-templates.edit', 'invoice-templates.create']) ||
      this.perm.has([
        `document-master.${k}.create`,
        `document-master.${k}.edit`,
        `document-master.${k}.manage`,
      ])
    );
  });
  protected readonly canDelete = computed(() => {
    const k = this.kind();
    return (
      this.canManage() ||
      this.perm.has([`document-master.${k}.delete`, `document-master.${k}.manage`])
    );
  });

  /** Server orders by its default; re-applied so search/filter keep it. */
  protected readonly filteredRows = computed(() => {
    const q = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    const cols = this.config().columns;
    return this.rows()
      .filter((r) => {
        if (status === 'active' && !r.isActive) return false;
        if (status === 'inactive' && r.isActive) return false;
        if (!q) return true;
        return cols.some((c) => String(r[c.field] ?? '').toLowerCase().includes(q));
      })
      .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
  });

  ngOnInit(): void {
    // One component instance can be reused across routes that differ only
    // in `data.master`, so react to data changes instead of reading once.
    this.route.data.subscribe((d) => {
      const k = d['master'] as DocumentMasterKind | undefined;
      if (k && k !== this.kind()) {
        this.kind.set(k);
        this.showEntry.set(false);
        this.search.set('');
        this.statusFilter.set('all');
        void this.load();
      }
    });
    const initial = this.route.snapshot.data['master'] as DocumentMasterKind | undefined;
    if (initial) {
      this.kind.set(initial);
      void this.load();
    }
  }

  /* ==================================================================== */
  /* List                                                                 */
  /* ==================================================================== */

  protected async load(): Promise<void> {
    const kind = this.kind();
    this.loading.set(true);
    try {
      // includeInactive=true → one fetch drives search + All/Active/Inactive filter.
      this.rows.set(await this.svc.master(kind, true));
      if (this.config().needsPrinterTypes) {
        this.printerTypes.set(await this.svc.printerTypes(true));
      }
    } catch (e) {
      this.toast.error(`Failed to load ${this.labelLower()}`, apiErrorMessage(e));
    } finally {
      this.loading.set(false);
    }
  }

  /** Template helper: string coercion for title attributes. */
  protected titleOf(row: DocumentMasterRow, field: string): string {
    return String((row as unknown as Record<string, unknown>)[field] ?? '');
  }

  protected openTab(tab: MasterTabDef): void {
    if (tab.kind === this.kind()) return;
    void this.router.navigate([tab.route]);
  }

  protected openHub(): void {
    void this.router.navigate(['/document-design']);
  }

  /* ==================================================================== */
  /* Create / Edit                                                        */
  /* ==================================================================== */

  protected newRecord(): void {
    this.editingId.set(null);
    this.model = this.blankModel();
    this.showEntry.set(true);
  }

  protected async editRecord(row: DocumentMasterRow): Promise<void> {
    try {
      // Load the authoritative record: GET /api/document/master/{kind}/{id}
      const fresh = await this.svc.masterById(this.kind(), row.id);
      this.editingId.set(fresh.id);
      this.model = this.toModel(fresh);
      this.showEntry.set(true);
    } catch (e) {
      this.toast.error(`Failed to load ${this.config().singular.toLowerCase()} record`, apiErrorMessage(e));
    }
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;

    // Frontend validation is UX only; the backend stays authoritative.
    const code = (this.model.code ?? '').trim();
    const name = (this.model.name ?? '').trim();
    if (!code) {
      this.toast.error('Code is required');
      return;
    }
    if (!name) {
      this.toast.error('Name is required');
      return;
    }
    if (this.config().fields.some((f) => f.name === 'printerTypeId' && f.required) && !this.model.printerTypeId) {
      this.toast.error('Printer Type is required');
      return;
    }

    this.saving.set(true);
    try {
      const payload: SaveDocumentMasterRequest = {
        ...this.model,
        code: code.toUpperCase(), // matches backend Trim().ToUpperInvariant()
        name,
      };
      if (this.editingId()) {
        await this.svc.updateMaster(this.kind(), this.editingId()!, payload);
        this.toast.success('Record updated successfully');
      } else {
        await this.svc.createMaster(this.kind(), payload);
        this.toast.success('Record created successfully');
      }
      this.showEntry.set(false);
      await this.load();
    } catch (e) {
      // Duplicate Code (409) and other backend messages surface here.
      this.toast.error('Failed to save record', apiErrorMessage(e));
    } finally {
      this.saving.set(false);
    }
  }

  protected cancel(): void {
    this.showEntry.set(false);
  }

  /* ==================================================================== */
  /* Delete                                                               */
  /* ==================================================================== */

  protected async remove(row: DocumentMasterRow): Promise<void> {
    if (!confirm(`Delete "${row.name}"? This cannot be undone.`)) return;
    try {
      await this.svc.deleteMaster(this.kind(), row.id);
      this.toast.success('Record deleted successfully');
      await this.load();
    } catch (e) {
      // e.g. in-use protection: backend rejects with a 409 message.
      this.toast.error('Failed to delete record', apiErrorMessage(e));
    }
  }

  /* ==================================================================== */
  /* Helpers                                                              */
  /* ==================================================================== */

  private toModel(r: DocumentMasterRow): SaveDocumentMasterRequest {
    return {
      code: r.code,
      name: r.name,
      description: r.description ?? null,
      displayOrder: r.displayOrder ?? 0,
      componentType: null,
      bindingPath: r.bindingPath ?? null,
      dataType: r.dataType ?? null,
      category: r.category ?? null,
      isCollection: r.isCollection ?? false,
      fontFamily: r.fontFamily ?? null,
      fontFileId: r.fontFileId ?? null,
      width: r.width ?? null,
      height: r.height ?? null,
      unit: r.unit ?? null,
      isThermal: r.isThermal ?? false,
      isCustom: r.isCustom ?? false,
      printerTypeId: r.printerTypeId ?? null,
      manufacturer: r.manufacturer ?? null,
      isActive: r.isActive,
    };
  }

  private blankModel(): SaveDocumentMasterRequest {
    const base: SaveDocumentMasterRequest = {
      code: '',
      name: '',
      description: null,
      displayOrder: 0,
      componentType: null,
      bindingPath: null,
      dataType: null,
      category: null,
      isCollection: false,
      fontFamily: null,
      fontFileId: null,
      width: null,
      height: null,
      unit: null,
      isThermal: false,
      isCustom: false,
      printerTypeId: null,
      manufacturer: null,
      isActive: true, // default TRUE for new records
    };
    if (this.kind() === 'paper-sizes') base.unit = 'MM';
    return base;
  }
}
