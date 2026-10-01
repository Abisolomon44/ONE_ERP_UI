import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import {
  DocumentDesignService,
  DocumentLookupOption,
  DocumentMasterKind,
  DocumentMasterRow,
  DocumentTemplateListItem,
  DocumentTemplateVersionListItem,
  SaveDocumentMasterRequest,
  SaveDocumentTemplateRequest,
  apiErrorMessage,
} from '../../core/services/document-design.service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionService } from '../../core/services/permission.service';

/* =====================================================================
   DOCUMENT DESIGN hub (Screen 1).

   Tabs:
     - Templates  : template list + entry + versions + designer entry
     - Settings   : default assignment grid
     - Masters    : the 10 document master tables (types, paper sizes, ...)
   Toolbar action "Create Default A4 Sales Invoice" runs the idempotent
   seed so a fresh install can go from zero to a printable A4 invoice.
   ===================================================================== */

interface MasterTabDef {
  kind: DocumentMasterKind;
  label: string;
  codeLabel: string;
  usesPrinterType?: boolean;
  usesDimensions?: boolean;
  usesComponentType?: boolean;
  usesBindingPath?: boolean;
  usesFontFamily?: boolean;
  usesThermal?: boolean;
}

const MASTER_TABS: MasterTabDef[] = [
  { kind: 'types', label: 'Document Types', codeLabel: 'Type Code' },
  { kind: 'categories', label: 'Categories', codeLabel: 'Category Code' },
  { kind: 'components', label: 'Components', codeLabel: 'Component Code', usesComponentType: true },
  { kind: 'variables', label: 'Variables', codeLabel: 'Variable Code', usesBindingPath: true },
  { kind: 'fonts', label: 'Fonts', codeLabel: 'Font Code', usesFontFamily: true },
  { kind: 'paper-sizes', label: 'Paper Sizes', codeLabel: 'Paper Code', usesDimensions: true, usesThermal: true },
  { kind: 'printer-types', label: 'Printer Types', codeLabel: 'Printer Type Code' },
  { kind: 'printer-models', label: 'Printer Models', codeLabel: 'Model Code', usesPrinterType: true },
  { kind: 'orientations', label: 'Orientations', codeLabel: 'Orientation Code' },
  { kind: 'units', label: 'Units', codeLabel: 'Unit Code' },
];

/** Dedicated page route per master kind; hub master tabs navigate to these
 *  pages so all masters share one CRUD implementation and URL. */
const MASTER_ROUTES: Record<MasterTabDef['kind'], string> = {
  types: '/document-design/master/types',
  categories: '/document-design/master/categories',
  components: '/document-design/master/template-components',
  variables: '/document-design/master/variables',
  fonts: '/document-design/master/fonts',
  'paper-sizes': '/document-design/master/paper-sizes',
  'printer-types': '/document-design/master/printer-types',
  'printer-models': '/document-design/master/printer-models',
  orientations: '/document-design/master/orientations',
  units: '/document-design/master/units',
};

@Component({
  selector: 'app-document-design',
  standalone: true,
  imports: [FormsModule, SlicePipe, LucideAngularModule],
  templateUrl: './document-design.html',
  styleUrl: './document-design.css',
})
export class DocumentDesignPage implements OnInit {
  private readonly svc = inject(DocumentDesignService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);

  /* ---------------- shared state ---------------- */
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly seeding = signal(false);
  protected readonly activeTab = signal<'templates' | 'settings' | 'masters'>('templates');
  protected readonly canManage = computed(() => this.perm.has('invoice-templates.edit') || this.perm.has('invoice-templates.create'));
  protected readonly canAssign = computed(() => this.perm.has('invoice-templates.assign'));

  /* ---------------- templates tab ---------------- */
  protected readonly templates = signal<DocumentTemplateListItem[]>([]);
  protected readonly search = signal('');
  protected readonly showTemplateEntry = signal(false);
  protected readonly editingTemplate = signal<DocumentTemplateListItem | null>(null);
  protected readonly invoiceTypes = signal<DocumentLookupOption[]>([]);
  protected readonly paperSizes = signal<DocumentLookupOption[]>([]);
  protected readonly orientations = signal<DocumentLookupOption[]>([]);
  protected readonly categories = signal<DocumentLookupOption[]>([]);
  protected templateModel: SaveDocumentTemplateRequest = this.blankTemplate();

  /* versions of the template currently expanded */
  protected readonly versionsTemplateId = signal<number | null>(null);
  protected readonly versions = signal<DocumentTemplateVersionListItem[]>([]);

  /* ---------------- masters tab ---------------- */
  protected readonly masterTabs = MASTER_TABS;
  protected readonly activeMaster = signal<MasterTabDef>(MASTER_TABS[0]);
  protected readonly masterRows = signal<DocumentMasterRow[]>([]);
  protected readonly masterPrinterTypes = signal<DocumentLookupOption[]>([]);
  protected readonly showMasterEntry = signal(false);
  protected readonly editingMasterId = signal<number | null>(null);
  protected masterModel: SaveDocumentMasterRequest = this.blankMaster();

  /* ---------------- settings tab ---------------- */
  protected readonly assignments = signal<
    import('../../core/services/document-design.service').TemplateAssignmentDto[]
  >([]);
  protected readonly componentIds = signal<Record<string, number>>({});

  ngOnInit(): void {
    void this.loadTemplates();
    void this.loadLookups();
  }

  /* ==================================================================== */
  /* Templates                                                            */
  /* ==================================================================== */

  protected async loadTemplates(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await this.svc.templates(1, 100, this.search());
      this.templates.set(res.items ?? []);
    } catch (e) {
      this.toast.error('Failed to load document templates', apiErrorMessage(e));
    } finally {
      this.loading.set(false);
    }
  }

  private async loadLookups(): Promise<void> {
    try {
      const [types, sizes, orients, cats] = await Promise.all([
        this.svc.invoiceTypes(),
        this.svc.paperSizes(),
        this.svc.orientations(),
        this.svc.categories(),
      ]);
      this.invoiceTypes.set(types);
      this.paperSizes.set(sizes);
      this.orientations.set(orients);
      this.categories.set(cats);
    } catch (e) {
      this.toast.error('Failed to load document lookups', apiErrorMessage(e));
    }
  }

  protected newTemplate(): void {
    this.editingTemplate.set(null);
    this.templateModel = this.blankTemplate();
    this.showTemplateEntry.set(true);
  }

  protected editTemplate(t: DocumentTemplateListItem): void {
    this.editingTemplate.set(t);
    this.templateModel = {
      companyId: t.companyId,
      templateCategoryId: t.templateCategoryId,
      invoiceTypeId: t.invoiceTypeId,
      paperSizeId: t.paperSizeId,
      orientationId: t.orientationId,
      code: t.code,
      name: t.name,
      description: t.description ?? null,
      width: t.width,
      height: t.height,
      isDefault: t.isDefault,
      isActive: t.isActive,
    };
    this.showTemplateEntry.set(true);
  }

  protected async saveTemplate(): Promise<void> {
    if (this.saving()) return;
    if (!this.templateModel.code?.trim() || !this.templateModel.name?.trim()) {
      this.toast.error('Template code and name are required');
      return;
    }
    if (!this.templateModel.invoiceTypeId || !this.templateModel.paperSizeId || !this.templateModel.orientationId) {
      this.toast.error('Document type, paper size and orientation are required');
      return;
    }
    this.saving.set(true);
    try {
      const payload = {
        ...this.templateModel,
        code: this.templateModel.code.trim().toUpperCase(),
        name: this.templateModel.name.trim(),
      };
      if (this.editingTemplate()) {
        await this.svc.updateTemplate(this.editingTemplate()!.invoiceTemplateId, payload);
        this.toast.success('Template updated');
      } else {
        const created = await this.svc.createTemplate(payload);
        this.toast.success('Template created', 'Draft Version 1 was opened automatically.');
        this.showTemplateEntry.set(false);
        await this.loadTemplates();
        // Show the A4 preview of the new template's draft Version 1
        // immediately (sample data until the design is filled in).
        if (created?.invoiceTemplateId) {
          const versions = await this.svc.versions(created.invoiceTemplateId);
          const v1 = versions.find((v) => v.versionNumber === 1);
          if (v1) {
            void this.router.navigate(['/document-design/preview'], {
              queryParams: { versionId: v1.templateVersionId },
            });
          }
        }
        return;
      }
      this.showTemplateEntry.set(false);
      await this.loadTemplates();
    } catch (e) {
      this.toast.error('Failed to save template', apiErrorMessage(e));
    } finally {
      this.saving.set(false);
    }
  }

  protected async removeTemplate(t: DocumentTemplateListItem): Promise<void> {
    if (!confirm(`Delete document template "${t.name}"? This cannot be undone.`)) return;
    try {
      await this.svc.deleteTemplate(t.invoiceTemplateId);
      this.toast.success('Template deleted');
      await this.loadTemplates();
    } catch (e) {
      this.toast.error('Failed to delete template', apiErrorMessage(e));
    }
  }

  protected async setDefault(t: DocumentTemplateListItem): Promise<void> {
    try {
      await this.svc.setDefault(t.invoiceTemplateId);
      this.toast.success(`${t.name} is now the default template`);
      await this.loadTemplates();
    } catch (e) {
      this.toast.error('Failed to set default', apiErrorMessage(e));
    }
  }

  protected toggleVersions(t: DocumentTemplateListItem): void {
    if (this.versionsTemplateId() === t.invoiceTemplateId) {
      this.versionsTemplateId.set(null);
      this.versions.set([]);
      return;
    }
    this.versionsTemplateId.set(t.invoiceTemplateId);
    void this.loadVersions(t.invoiceTemplateId);
  }

  protected async loadVersions(templateId: number): Promise<void> {
    try {
      this.versions.set(await this.svc.versions(templateId));
    } catch (e) {
      this.toast.error('Failed to load versions', apiErrorMessage(e));
    }
  }

  protected async createVersion(t: DocumentTemplateListItem): Promise<void> {
    try {
      await this.svc.createVersion(t.invoiceTemplateId);
      this.toast.success('New draft version created');
      await this.loadVersions(t.invoiceTemplateId);
      await this.loadTemplates();
    } catch (e) {
      this.toast.error('Failed to create version', apiErrorMessage(e));
    }
  }

  protected async cloneVersion(v: DocumentTemplateVersionListItem): Promise<void> {
    try {
      await this.svc.cloneVersion(v.templateVersionId);
      this.toast.success('Draft cloned from published version');
      await this.loadVersions(v.invoiceTemplateId);
      await this.loadTemplates();
    } catch (e) {
      this.toast.error('Failed to clone version', apiErrorMessage(e));
    }
  }

  protected openDesigner(v: DocumentTemplateVersionListItem): void {
    void this.router.navigate(['/document-designer'], {
      queryParams: { versionId: v.templateVersionId },
    });
  }

  protected previewVersion(v: DocumentTemplateVersionListItem): void {
    void this.router.navigate(['/document-design/preview'], {
      queryParams: { versionId: v.templateVersionId },
    });
  }

  protected async publishVersion(v: DocumentTemplateVersionListItem): Promise<void> {
    if (v.status === 'PUBLISHED') {
      this.toast.info('This version is already published');
      return;
    }
    try {
      await this.svc.publish(v.templateVersionId);
      this.toast.success(`Version ${v.versionNumber} published`);
      await this.loadVersions(v.invoiceTemplateId);
      await this.loadTemplates();
    } catch (e) {
      this.toast.error('Publish failed', apiErrorMessage(e));
    }
  }

  /* ==================================================================== */
  /* Seed: Create Default A4 Sales Invoice (idempotent)                   */
  /* ==================================================================== */

  protected async seedDefaultA4(): Promise<void> {
    if (this.seeding()) return;
    this.seeding.set(true);
    try {
      const log: string[] = [];

      // 1. Document type "SALES" (Sales Invoice) — reuse when present.
      const types = await this.svc.invoiceTypes(true);
      const salesType =
        types.find((t) => t.code?.toUpperCase() === 'SALES') ??
        types.find((t) => (t.name ?? '').toLowerCase().includes('sales invoice'));
      let invoiceTypeId = salesType?.id ?? 0;
      if (!invoiceTypeId) {
        const created = await this.svc.createMaster('types', {
          code: 'SALES', name: 'Sales Invoice', description: 'Standard sales invoice',
          displayOrder: 1, isCollection: false, isThermal: false, isCustom: false, isActive: true,
        });
        invoiceTypeId = created.id;
        log.push('Created document type SALES');
      }

      // 2. Paper size A4 — reuse when present.
      const sizes = await this.svc.paperSizes(true);
      const a4 = sizes.find((p) => p.code?.toUpperCase() === 'A4');
      let paperSizeId = a4?.id ?? 0;
      if (!paperSizeId) {
        const created = await this.svc.createMaster('paper-sizes', {
          code: 'A4', name: 'A4', description: 'A4 210 x 297 mm',
          displayOrder: 1, width: 210, height: 297, unit: 'MM',
          isCollection: false, isThermal: false, isCustom: false, isActive: true,
        });
        paperSizeId = created.id;
        log.push('Created A4 paper size');
      }

      // 3. Portrait orientation.
      const orients = await this.svc.orientations(true);
      const portrait = orients.find((o) => o.code?.toUpperCase() === 'PORTRAIT');
      let orientationId = portrait?.id ?? 0;
      if (!orientationId) {
        const created = await this.svc.createMaster('orientations', {
          code: 'PORTRAIT', name: 'Portrait', displayOrder: 1,
          isCollection: false, isThermal: false, isCustom: false, isActive: true,
        });
        orientationId = created.id;
        log.push('Created Portrait orientation');
      }

      // 4. Arial font + MM unit (required by styles / designer).
      const fonts = await this.svc.fonts(true);
      let fontId = fonts.find((f) => f.code?.toUpperCase() === 'ARIAL')?.id ?? 0;
      if (!fontId) {
        const created = await this.svc.createMaster('fonts', {
          code: 'ARIAL', name: 'Arial', fontFamily: 'Arial',
          displayOrder: 1, isCollection: false, isThermal: false, isCustom: false, isActive: true,
        });
        fontId = created.id;
        log.push('Created Arial font');
      }
      const units = await this.svc.units(true);
      let unitId = units.find((u) => u.code?.toUpperCase() === 'MM')?.id ?? 0;
      if (!unitId) {
        const created = await this.svc.createMaster('units', {
          code: 'MM', name: 'Millimeter', displayOrder: 1,
          isCollection: false, isThermal: false, isCustom: false, isActive: true,
        });
        unitId = created.id;
        log.push('Created MM unit');
      }

      // 5. Components required by the default design.
      const neededComponents: Array<[string, string, string]> = [
        ['LOGO', 'Logo', 'IMAGE'],
        ['COMPANY_NAME', 'Company Name', 'TEXT'],
        ['CUSTOM_TEXT', 'Custom Text', 'TEXT'],
        ['CUSTOMER', 'Customer', 'TEXT'],
        ['ITEM_TABLE', 'Item Table', 'TABLE'],
        ['SUBTOTAL', 'Subtotal', 'TEXT'],
        ['TAX', 'Tax', 'TEXT'],
        ['TOTAL', 'Total', 'TEXT'],
        ['PAYMENT', 'Payment', 'TEXT'],
        ['FOOTER', 'Footer', 'TEXT'],
        ['INVOICE_INFO', 'Invoice Info', 'TEXT'],
        ['TAX_SUMMARY', 'Tax Summary', 'TABLE'],
        ['BANK_DETAILS', 'Bank Details', 'TEXT'],
        ['TERMS', 'Terms', 'TEXT'],
        ['SIGNATURE', 'Signature', 'IMAGE'],
      ];
      const existingComponents = await this.svc.components(true);
      const componentIds: Record<string, number> = {};
      for (const c of existingComponents) {
        if (c.code) componentIds[c.code.toUpperCase()] = c.id;
      }
      for (const [code, name, type] of neededComponents) {
        if (!existingComponents.some((c) => c.code?.toUpperCase() === code)) {
          const created = await this.svc.createMaster('components', {
            code, name, componentType: type, displayOrder: 1,
            isCollection: false, isThermal: false, isCustom: false, isActive: true,
          });
          componentIds[code] = created.id;
          log.push(`Created component ${code}`);
        }
      }
      this.componentIds.set(componentIds);

      // 5b. Prefer the existing GST category — never create one (§9).
      const cats = await this.svc.categories(true);
      const gstCat =
        cats.find((c) => c.code?.toUpperCase() === 'GST') ??
        cats.find((c) => (c.name ?? '').toLowerCase().includes('gst'));

      // 6. Variables required by the default design.
      const neededVariables: Array<[string, string, string, string]> = [
        ['Company.Name', 'Company Name', 'Company', 'STRING'],
        ['Company.Address', 'Company Address', 'Company', 'STRING'],
        ['Company.GSTIN', 'Company GSTIN', 'Company', 'STRING'],
        ['Invoice.Number', 'Invoice Number', 'Invoice', 'STRING'],
        ['Invoice.Date', 'Invoice Date', 'Invoice', 'DATETIME'],
        ['Invoice.SubTotal', 'Subtotal', 'Invoice', 'DECIMAL'],
        ['Invoice.Discount', 'Discount', 'Invoice', 'DECIMAL'],
        ['Invoice.Tax', 'Tax', 'Invoice', 'DECIMAL'],
        ['Invoice.GrandTotal', 'Grand Total', 'Invoice', 'DECIMAL'],
        ['Invoice.PaidAmount', 'Paid Amount', 'Invoice', 'DECIMAL'],
        ['Invoice.BalanceAmount', 'Balance Amount', 'Invoice', 'DECIMAL'],
        ['Customer.Name', 'Customer Name', 'Customer', 'STRING'],
        ['Customer.Address', 'Customer Address', 'Customer', 'STRING'],
        ['Customer.GSTIN', 'Customer GSTIN', 'Customer', 'STRING'],
        ['Payment.Method', 'Payment Method', 'Payment', 'STRING'],
        ['Item.ProductName', 'Product Name', 'Item', 'STRING'],
        ['Item.Unit', 'Unit', 'Item', 'STRING'],
        ['Item.Quantity', 'Quantity', 'Item', 'DECIMAL'],
        ['Item.Rate', 'Rate', 'Item', 'DECIMAL'],
        ['Item.Discount', 'Item Discount', 'Item', 'DECIMAL'],
        ['Item.Tax', 'Item Tax', 'Item', 'DECIMAL'],
        ['Item.Amount', 'Item Amount', 'Item', 'DECIMAL'],
      ];
      const existingVariables = await this.svc.variables(true);
      const varMap = new Map<string, number>();
      for (const v of existingVariables) varMap.set((v.bindingPath ?? v.code).trim(), v.id);
      for (const [code, name, category, dataType] of neededVariables) {
        if (!varMap.has(code)) {
          const created = await this.svc.createMaster('variables', {
            code, name, bindingPath: code, dataType, category,
            displayOrder: 1, isCollection: false, isThermal: false, isCustom: false, isActive: true,
          });
          varMap.set(code, created.id);
          log.push(`Created variable ${code}`);
        }
      }

      // 7. Template — never duplicate. Exact-code lookup sees inactive/global
      //    rows (the paged list hides them), matching the backend 409 guard.
      let template: DocumentTemplateListItem | null = null;
      try {
        template = await this.svc.templateByCode('SALES-INVOICE-A4');
      } catch {
        template = null; // not found yet — create below
      }
      let createdAnything = log.length > 0;
      if (!template) {
        try {
          template = await this.svc.createTemplate({
            companyId: null,
            templateCategoryId: gstCat?.id ?? null,
            invoiceTypeId,
            paperSizeId,
            orientationId,
            code: 'SALES-INVOICE-A4',
            name: 'Sales Invoice A4',
            description: 'Default A4 Sales Invoice Template',
            width: 210,
            height: 297,
            isDefault: true,
            isActive: true,
          });
          createdAnything = true;
          log.push('Created template SALES-INVOICE-A4 (Version 1 draft)');
        } catch (createErr) {
          // Lost a race or the row is hidden from this user's list view:
          // load the existing template instead of failing with 409.
          try {
            template = await this.svc.templateByCode('SALES-INVOICE-A4');
            log.push('Loaded existing template SALES-INVOICE-A4');
          } catch {
            throw createErr;
          }
        }
      }
      if (!template) throw new Error('Template SALES-INVOICE-A4 could not be created or found.');

      // 8. Version 1 — create only when the template has no versions yet.
      let versions = await this.svc.versions(template.invoiceTemplateId);
      let draft = versions.find((v) => v.versionNumber === 1) ?? null;
      if (!draft) {
        draft = await this.svc.createVersion(template.invoiceTemplateId);
        log.push('Created Version 1 (Draft)');
        createdAnything = true;
      }

      // 9. Save the default A4 design when Version 1 has no sections yet.
      const design = await this.svc.designer(draft.templateVersionId);
      if (!design.sections?.length) {
        await this.svc.saveDesigner(
          draft.templateVersionId,
          buildDefaultA4Sections(varMap, fontId, this.componentIds()),
        );
        log.push('Saved default A4 designer layout');
        createdAnything = true;
      } else if (!hasTableElement(design.sections, this.componentIds())) {
        // Self-repair: a V1 layout saved before the ITEM_TABLE master existed
        // (or with a zero/stale component id) cannot publish — "An ITEM_TABLE
        // element is required". Re-point its item-column element(s) at the
        // seeded master; if none exists, rebuild the default layout.
        let sections = fixTableElement(design.sections, this.componentIds());
        if (!hasTableElement(sections, this.componentIds())) {
          sections = buildDefaultA4Sections(varMap, fontId, this.componentIds());
          log.push('Rebuilt default A4 layout (no Item Table element present)');
        } else {
          log.push('Re-linked Item Table element to ITEM_TABLE component master');
        }
        await this.svc.saveDesigner(draft.templateVersionId, sections);
        createdAnything = true;
      }

      // 10. NO auto-publish: §7 requires an explicit Publish by the user in
      //     the designer. Version 1 stays DRAFT until then.

      // 11. Default assignment for the Sales Invoice type + A4.
      const assignments = await this.svc.assignments(template.invoiceTemplateId);
      const hasDefault = (assignments ?? []).some(
        (a) => a.isActive && a.invoiceTypeId === invoiceTypeId,
      );
      if (!hasDefault) {
        await this.svc.createAssignment(template.invoiceTemplateId, {
          companyId: null,
          invoiceTypeId,
          paperSizeId,
          isDefault: true,
          isActive: true,
        });
        log.push('Created default Sales Invoice assignment');
        createdAnything = true;
      }

      await this.loadTemplates();
      if (createdAnything) {
        this.toast.success('Default A4 Sales Invoice ready', log.join(' · '));
      } else {
        this.toast.info('Default A4 Sales Invoice already up to date', 'No duplicate records created.');
      }

      // §6: after create/repair, open the A4 preview of Version 1 so the
      // result is visible immediately; the Designer is one click away
      // ("Open in Designer"), then Save → Preview → Publish.
      if (draft) {
        void this.router.navigate(['/document-design/preview'], {
          queryParams: { versionId: draft.templateVersionId },
        });
      }
    } catch (e) {
      this.toast.error('Seed failed', apiErrorMessage(e));
    } finally {
      this.seeding.set(false);
    }
  }

  /* ==================================================================== */
  /* Masters                                                              */
  /* ==================================================================== */

  protected selectMaster(tab: MasterTabDef): void {
    // Each master now has a dedicated page (DB-seeded URLs +
    // /document-design/master/* aliases); navigate to it instead of
    // swapping lists inside the hub.
    const target = MASTER_ROUTES[tab.kind];
    if (target) {
      void this.router.navigate([target]);
      return;
    }
    this.activeMaster.set(tab);
    this.showMasterEntry.set(false);
    void this.loadMasterRows();
  }

  protected async loadMasterRows(): Promise<void> {
    this.loading.set(true);
    try {
      this.masterRows.set(await this.svc.master(this.activeMaster().kind, true));
      if (this.activeMaster().usesPrinterType) {
        this.masterPrinterTypes.set(await this.svc.printerTypes(true));
      }
    } catch (e) {
      this.toast.error('Failed to load master data', apiErrorMessage(e));
    } finally {
      this.loading.set(false);
    }
  }

  protected newMaster(): void {
    this.editingMasterId.set(null);
    this.masterModel = this.blankMaster();
    this.showMasterEntry.set(true);
  }

  protected editMaster(row: DocumentMasterRow): void {
    this.editingMasterId.set(row.id);
    this.masterModel = {
      code: row.code,
      name: row.name,
      description: row.description ?? null,
      displayOrder: row.displayOrder ?? 0,
      componentType: row.componentType ?? null,
      bindingPath: row.bindingPath ?? null,
      dataType: row.dataType ?? null,
      category: row.category ?? null,
      isCollection: row.isCollection,
      fontFamily: row.fontFamily ?? null,
      fontFileId: row.fontFileId ?? null,
      width: row.width ?? null,
      height: row.height ?? null,
      unit: row.unit ?? null,
      isThermal: row.isThermal,
      isCustom: row.isCustom,
      printerTypeId: row.printerTypeId ?? null,
      manufacturer: row.manufacturer ?? null,
      isActive: row.isActive,
    };
    this.showMasterEntry.set(true);
  }

  protected async saveMaster(): Promise<void> {
    if (this.saving()) return;
    if (!this.masterModel.code?.trim() || !this.masterModel.name?.trim()) {
      this.toast.error('Code and name are required');
      return;
    }
    this.saving.set(true);
    try {
      const payload = { ...this.masterModel, code: this.masterModel.code.trim().toUpperCase() };
      if (this.editingMasterId()) {
        await this.svc.updateMaster(this.activeMaster().kind, this.editingMasterId()!, payload);
        this.toast.success('Record updated');
      } else {
        await this.svc.createMaster(this.activeMaster().kind, payload);
        this.toast.success('Record created');
      }
      this.showMasterEntry.set(false);
      await this.loadMasterRows();
    } catch (e) {
      this.toast.error('Failed to save', apiErrorMessage(e));
    } finally {
      this.saving.set(false);
    }
  }

  protected async removeMaster(row: DocumentMasterRow): Promise<void> {
    if (!confirm(`Delete "${row.name}"? This cannot be undone.`)) return;
    try {
      await this.svc.deleteMaster(this.activeMaster().kind, row.id);
      this.toast.success('Record deleted');
      await this.loadMasterRows();
    } catch (e) {
      this.toast.error('Failed to delete', apiErrorMessage(e));
    }
  }

  /* ==================================================================== */
  /* Settings (assignments)                                               */
  /* ==================================================================== */

  protected async loadAssignments(): Promise<void> {
    this.loading.set(true);
    try {
      this.assignments.set(await this.svc.allAssignments());
    } catch (e) {
      this.toast.error('Failed to load assignments', apiErrorMessage(e));
    } finally {
      this.loading.set(false);
    }
  }

  protected async removeAssignment(a: import('../../core/services/document-design.service').TemplateAssignmentDto): Promise<void> {
    if (!confirm('Remove this template assignment?')) return;
    try {
      await this.svc.deleteAssignment(a.assignmentId);
      this.toast.success('Assignment removed');
      await this.loadAssignments();
    } catch (e) {
      this.toast.error('Failed to remove assignment', apiErrorMessage(e));
    }
  }

  protected switchTab(tab: 'templates' | 'settings' | 'masters'): void {
    this.activeTab.set(tab);
    if (tab === 'settings') void this.loadAssignments();
    if (tab === 'masters' && !this.masterRows().length) void this.loadMasterRows();
  }

  protected cancelEntry(): void {
    this.showTemplateEntry.set(false);
    this.showMasterEntry.set(false);
  }

  private blankTemplate(): SaveDocumentTemplateRequest {
    return {
      companyId: null,
      templateCategoryId: null,
      invoiceTypeId: 0,
      paperSizeId: 0,
      orientationId: 0,
      code: '',
      name: '',
      description: null,
      width: null,
      height: null,
      isDefault: false,
      isActive: true,
    };
  }

  private blankMaster(): SaveDocumentMasterRequest {
    return {
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
      isActive: true,
    };
  }
}

/* ====================================================================== */
/* Publish-safety helpers + default A4 designer layout                    */
/* ====================================================================== */

/** True when any element references the seeded ITEM_TABLE component master —
 *  the publish validator's hard requirement (component type TABLE). */
export function hasTableElement(
  sections: import('../../core/services/document-design.service').DesignerSectionDto[],
  componentIds: Record<string, number>,
): boolean {
  const tableId = componentIds['ITEM_TABLE'] ?? 0;
  if (!tableId) return false;
  return (sections ?? []).some((s) =>
    s.elements.some((e) => e.componentId === tableId),
  );
}

/** Re-links the Item Table element of an existing design to the seeded
 *  ITEM_TABLE component master (componentId 0 / stale id otherwise blocks
 *  publishing with "An ITEM_TABLE element is required"). Returns new arrays. */
export function fixTableElement(
  sections: import('../../core/services/document-design.service').DesignerSectionDto[],
  componentIds: Record<string, number>,
): import('../../core/services/document-design.service').DesignerSectionDto[] {
  const tableId = componentIds['ITEM_TABLE'] ?? 0;
  return (sections ?? []).map((s) => ({
    ...s,
    elements: s.elements.map((e) =>
      e.elementType === 'item-column'
        ? { ...e, componentId: tableId }
        : e,
    ),
  }));
}

export function buildDefaultA4Sections(
  varMap: Map<string, number>,
  fontId: number,
  componentIds: Record<string, number> = {},
): import('../../core/services/document-design.service').DesignerSectionDto[] {
  const v = (path: string): number => varMap.get(path) ?? 0;
  const field = (path: string, label?: string) => ({
    variableId: v(path),
    fieldName: path,
    bindingPath: path,
    label: label ?? null,
    isVisible: true,
  });
  const col = (fieldName: string, headerText: string, displayOrder: number, width: number | null, alignment: string) => ({
    fieldName,
    headerText,
    displayOrder,
    width,
    alignment,
    isVisible: true,
  });
  const cid = (code: string): number => componentIds[code] ?? 0;

  const st = (over: Record<string, unknown> = {}) => ({
    fontId,
    fontSize: 3.2,
    fontWeight: null as string | null,
    textAlign: 'LEFT' as string | null,
    verticalAlign: null as string | null,
    paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0,
    borderTop: false, borderRight: false, borderBottom: false, borderLeft: false,
    ...over,
  });

  const el = (
    componentCode: string,
    elementType: string,
    name: string,
    x: number, y: number, width: number, height: number,
    over: Partial<import('../../core/services/document-design.service').DesignerElementDto> = {},
  ) => ({
    componentId: cid(componentCode),
    componentCode,
    elementType,
    elementName: name,
    x, y, width, height,
    displayOrder: 0,
    isVisible: true,
    fields: [],
    itemColumns: [],
    style: st(),
    ...over,
  });

  /* Default A4 portrait layout per spec §8/§10 — twelve sections that fit
     one A4 page. Section x/y are page-absolute; element x/y are
     SECTION-RELATIVE (same coordinate model as the backend renderer). */
  const sections: import('../../core/services/document-design.service').DesignerSectionDto[] = [
    {
      sectionCode: 'HEADER', sectionName: 'Header', displayOrder: 1,
      x: 10, y: 10, width: 190, height: 30, isVisible: true,
      elements: [
        el('LOGO', 'static', 'Company Logo', 0, 0, 40, 22),
        el('COMPANY_NAME', 'variable', 'Company Name', 45, 0, 100, 10, {
          fields: [field('Company.Name')],
          style: st({ fontSize: 5, fontWeight: 'bold' }),
        }),
        el('CUSTOM_TEXT', 'variable', 'Company Address / Contact / GSTIN', 45, 11, 110, 18, {
          fields: [field('Company.Address'), field('Company.Phone', 'Phone'), field('Company.GSTIN', 'GSTIN')],
          style: st({ fontSize: 3 }),
        }),
        el('CUSTOM_TEXT', 'static', 'TAX INVOICE', 145, 0, 45, 10, {
          style: st({ fontSize: 5.5, fontWeight: 'bold', textAlign: 'RIGHT' }),
        }),
      ],
    },
    {
      sectionCode: 'INVOICE_INFO', sectionName: 'Invoice Information', displayOrder: 2,
      x: 10, y: 44, width: 190, height: 20, isVisible: true,
      elements: [
        el('CUSTOMER', 'static', 'BILL TO', 0, 0, 60, 6, {
          style: st({ fontSize: 3.4, fontWeight: 'bold' }),
        }),
        el('INVOICE_INFO', 'variable', 'Invoice No / Date / Due Date', 100, 0, 90, 19, {
          fields: [
            field('Invoice.Number', 'Invoice No'),
            field('Invoice.Date', 'Invoice Date'),
            field('Invoice.DueDate', 'Due Date'),
          ],
          style: st({ fontSize: 3.2, textAlign: 'RIGHT' }),
        }),
      ],
    },
    {
      sectionCode: 'BILL_TO', sectionName: 'Bill To / Customer', displayOrder: 3,
      x: 10, y: 68, width: 190, height: 24, isVisible: true,
      elements: [
        el('CUSTOMER', 'variable', 'Customer Info', 0, 0, 95, 23, {
          fields: [
            field('Customer.Name'),
            field('Customer.Address'),
            field('Customer.GSTIN', 'GSTIN'),
            field('Customer.Phone', 'Contact'),
          ],
          style: st({ fontSize: 3.2 }),
        }),
      ],
    },
    {
      sectionCode: 'ITEMS', sectionName: 'Items', displayOrder: 4,
      x: 10, y: 96, width: 190, height: 80, isVisible: true,
      elements: [
        el('ITEM_TABLE', 'item-column', 'Item Table', 0, 0, 190, 78, {
          itemColumns: [
            col('SlNo', '#', 1, 10, 'CENTER'),
            col('ProductName', 'Product / Description', 2, 64, 'LEFT'),
            col('HsnCode', 'HSN/SAC', 3, 18, 'CENTER'),
            col('UnitName', 'Unit', 4, 14, 'CENTER'),
            col('Quantity', 'Qty', 5, 14, 'RIGHT'),
            col('Rate', 'Rate', 6, 20, 'RIGHT'),
            col('DiscountAmount', 'Discount', 7, 18, 'RIGHT'),
            col('TaxAmount', 'GST', 8, 16, 'RIGHT'),
            col('LineTotal', 'Amount', 9, 16, 'RIGHT'),
          ],
          style: st({ fontSize: 3, borderBottom: true, borderColor: '#999999' }),
        }),
      ],
    },
    {
      sectionCode: 'TAX_SUMMARY', sectionName: 'Tax Summary', displayOrder: 5,
      x: 10, y: 180, width: 190, height: 24, isVisible: true,
      elements: [
        el('TAX_SUMMARY', 'variable', 'Tax Rate Summary', 0, 0, 90, 23, {
          fields: [
            field('Invoice.TaxableAmount', 'Taxable Amount'),
            field('Invoice.CGST', 'CGST'),
            field('Invoice.SGST', 'SGST'),
            field('Invoice.IGST', 'IGST'),
            field('Invoice.CESS', 'CESS'),
          ],
          style: st({ fontSize: 3 }),
        }),
      ],
    },
    {
      sectionCode: 'TOTALS', sectionName: 'Totals', displayOrder: 6,
      x: 10, y: 208, width: 190, height: 26, isVisible: true,
      elements: [
        el('SUBTOTAL', 'variable', 'Gross / Discount / Taxable', 100, 0, 90, 15, {
          fields: [
            field('Invoice.SubTotal', 'Subtotal'),
            field('Invoice.Discount', 'Discount'),
            field('Invoice.Tax', 'Tax (GST)'),
          ],
          style: st({ fontSize: 3.2 }),
        }),
        el('TOTAL', 'variable', 'Grand Total', 100, 16, 90, 9, {
          fields: [field('Invoice.GrandTotal', 'GRAND TOTAL')],
          style: st({ fontSize: 4.2, fontWeight: 'bold', borderTop: true }),
        }),
      ],
    },
    {
      sectionCode: 'PAYMENT', sectionName: 'Payment', displayOrder: 7,
      x: 10, y: 238, width: 190, height: 14, isVisible: true,
      elements: [
        el('PAYMENT', 'variable', 'Payment Details', 0, 0, 120, 13, {
          fields: [
            field('Payment.Method', 'Payment Mode'),
            field('Invoice.PaidAmount', 'Amount Paid'),
            field('Invoice.BalanceAmount', 'Balance'),
          ],
          style: st({ fontSize: 3 }),
        }),
      ],
    },
    {
      sectionCode: 'AMOUNT_IN_WORDS', sectionName: 'Amount in Words', displayOrder: 8,
      x: 10, y: 256, width: 190, height: 10, isVisible: true,
      elements: [
        el('CUSTOM_TEXT', 'static', 'Amount in Words', 0, 0, 190, 9, {
          style: st({ fontSize: 2.8, fontStyle: 'italic' }),
        }),
      ],
    },
    {
      sectionCode: 'BANK_DETAILS', sectionName: 'Bank Details', displayOrder: 9,
      x: 10, y: 268, width: 190, height: 10, isVisible: true,
      elements: [
        el('BANK_DETAILS', 'static', 'Bank Details', 0, 0, 190, 9, {
          style: st({ fontSize: 2.8 }),
        }),
      ],
    },
    {
      sectionCode: 'TERMS', sectionName: 'Terms & Conditions', displayOrder: 10,
      x: 10, y: 280, width: 110, height: 9, isVisible: true,
      elements: [
        el('TERMS', 'static', 'Terms & Conditions', 0, 0, 108, 8, {
          style: st({ fontSize: 2.5 }),
        }),
      ],
    },
    {
      sectionCode: 'SIGNATURE', sectionName: 'Authorized Signature', displayOrder: 11,
      x: 125, y: 280, width: 75, height: 9, isVisible: true,
      elements: [
        el('SIGNATURE', 'static', 'Authorized Signatory', 0, 0, 75, 8, {
          style: st({ fontSize: 3, textAlign: 'RIGHT' }),
        }),
      ],
    },
    {
      sectionCode: 'FOOTER', sectionName: 'Footer', displayOrder: 12,
      x: 10, y: 291, width: 190, height: 6, isVisible: true,
      elements: [
        el('FOOTER', 'static', 'Thank You For Your Business', 0, 0, 190, 5, {
          style: st({ fontSize: 2.8, textAlign: 'CENTER' }),
        }),
      ],
    },
  ];

  void v;
  return sections;
}

/** Opens the rendered preview HTML in a new window and prints when asked. */
export function openPreviewWindow(html: string, autoPrint = false): void {
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  if (autoPrint) {
    win.onload = () => win.print();
  }
}
