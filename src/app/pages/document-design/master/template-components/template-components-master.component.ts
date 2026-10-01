import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import {
  DocumentDesignService,
  DocumentMasterRow,
  SaveDocumentMasterRequest,
  apiErrorMessage,
} from '../../../../core/services/document-design.service';
import { ToastService } from '../../../../core/services/toast.service';
import { PermissionService } from '../../../../core/services/permission.service';

/* =====================================================================
   DOCUMENT MASTER → TEMPLATE COMPONENTS (dedicated master screen).

   CRUD over the EXISTING /api/document/master/components endpoints
   (table dbo.InvoiceTemplateComponent) via the shared
   DocumentDesignService — no new tables, no seed creation, no
   designer features. Seed data lives in the database; this screen
   only reads and maintains it.
   ===================================================================== */

/** Document Master navigation; Template Components is this screen.
 *  The other masters live on their own dedicated pages. */
const MASTER_TABS = [
  'Document Types',
  'Paper Sizes',
  'Template Categories',
  'Template Components',
  'Template Variables',
  'Fonts',
  'Print Orientations',
  'Print Units',
  'Printer Types',
  'Printer Models',
] as const;

/** Dedicated page route per tab label (master tab → alias URL). */
const MASTER_TAB_ROUTES: Record<(typeof MASTER_TABS)[number], string> = {
  'Document Types': '/document-design/master/types',
  'Paper Sizes': '/document-design/master/paper-sizes',
  'Template Categories': '/document-design/master/categories',
  'Template Components': '/document-design/master/template-components',
  'Template Variables': '/document-design/master/variables',
  Fonts: '/document-design/master/fonts',
  'Print Orientations': '/document-design/master/orientations',
  'Print Units': '/document-design/master/units',
  'Printer Types': '/document-design/master/printer-types',
  'Printer Models': '/document-design/master/printer-models',
};

type StatusFilter = 'all' | 'active' | 'inactive';

@Component({
  selector: 'app-template-components-master',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  templateUrl: './template-components-master.component.html',
  styleUrl: './template-components-master.component.css',
})
export class TemplateComponentsMasterComponent implements OnInit {
  private readonly svc = inject(DocumentDesignService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);

  protected readonly masterTabs = MASTER_TABS;
  protected readonly activeTab: string = 'Template Components';

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly rows = signal<DocumentMasterRow[]>([]);
  protected readonly search = signal('');
  protected readonly statusFilter = signal<StatusFilter>('all');
  protected readonly showEntry = signal(false);
  protected readonly editingId = signal<number | null>(null);
  protected model: SaveDocumentMasterRequest = this.blankModel();

  /* Mirrors the backend's authorization: delete is gated by
     document-master.components.delete (or .manage); create/edit fall
     back to manage. The backend remains authoritative either way. */
  protected readonly canManage = computed(() =>
    this.perm.has([
      'document-master.components.create',
      'document-master.components.edit',
      'document-master.components.manage',
    ]),
  );
  protected readonly canDelete = computed(() =>
    this.perm.has(['document-master.components.delete', 'document-master.components.manage']),
  );

  /** Distinct ComponentType values present in the loaded rows — feeds the
   *  Component Type datalist (free text stays free text per the schema). */
  protected readonly componentTypes = computed(() => {
    const set = new Set<string>();
    for (const r of this.rows()) {
      const t = (r.componentType ?? '').trim();
      if (t) set.add(t);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  });

  /** Server already orders by DisplayOrder, Name; re-applied so search and
   *  status filtering keep the default ordering. */
  protected readonly filteredRows = computed(() => {
    const q = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    return this.rows()
      .filter((r) => {
        if (status === 'active' && !r.isActive) return false;
        if (status === 'inactive' && r.isActive) return false;
        if (!q) return true;
        return (
          r.code?.toLowerCase().includes(q) ||
          r.name?.toLowerCase().includes(q) ||
          (r.componentType ?? '').toLowerCase().includes(q) ||
          (r.description ?? '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
  });

  ngOnInit(): void {
    void this.load();
  }

  /* ==================================================================== */
  /* List                                                                 */
  /* ==================================================================== */

  protected async load(): Promise<void> {
    this.loading.set(true);
    try {
      // includeInactive=true → one fetch drives search + All/Active/Inactive filter.
      this.rows.set(await this.svc.master('components', true));
    } catch (e) {
      this.toast.error('Failed to load document components', apiErrorMessage(e));
    } finally {
      this.loading.set(false);
    }
  }

  protected openHubMaster(tab: string): void {
    if (tab === this.activeTab) return;
    // Every master has a dedicated page now — route to it.
    const target = MASTER_TAB_ROUTES[tab as keyof typeof MASTER_TAB_ROUTES];
    if (target) {
      void this.router.navigate([target]);
      return;
    }
    void this.router.navigate(['/document-design']);
  }

  /* ==================================================================== */
  /* Create / Edit                                                        */
  /* ==================================================================== */

  protected newComponent(): void {
    this.editingId.set(null);
    this.model = this.blankModel();
    this.showEntry.set(true);
  }

  protected async editComponent(row: DocumentMasterRow): Promise<void> {
    try {
      // Load the authoritative record: GET /api/document/master/components/{id}
      const fresh = await this.svc.masterById('components', row.id);
      this.editingId.set(fresh.id);
      this.model = this.toModel(fresh);
      this.showEntry.set(true);
    } catch (e) {
      this.toast.error('Failed to load document component', apiErrorMessage(e));
    }
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;

    // Frontend validation is UX only; the backend stays authoritative.
    const code = (this.model.code ?? '').trim();
    const name = (this.model.name ?? '').trim();
    const type = (this.model.componentType ?? '').trim();
    if (!code) {
      this.toast.error('Component Code is required');
      return;
    }
    if (!name) {
      this.toast.error('Component Name is required');
      return;
    }
    if (!type) {
      this.toast.error('Component Type is required');
      return;
    }

    this.saving.set(true);
    try {
      const payload: SaveDocumentMasterRequest = {
        ...this.model,
        code: code.toUpperCase(), // matches backend Trim().ToUpperInvariant()
        name,
        componentType: type,
      };
      if (this.editingId()) {
        await this.svc.updateMaster('components', this.editingId()!, payload);
        this.toast.success('Document component updated successfully');
      } else {
        await this.svc.createMaster('components', payload);
        this.toast.success('Document component created successfully');
      }
      this.showEntry.set(false);
      await this.load();
    } catch (e) {
      // Duplicate Code (409) and other backend messages surface here.
      this.toast.error('Failed to save document component', apiErrorMessage(e));
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
    if (!confirm(`Delete template component "${row.name}"? This cannot be undone.`)) return;
    try {
      await this.svc.deleteMaster('components', row.id);
      this.toast.success('Document component deleted successfully');
      await this.load();
    } catch (e) {
      // e.g. in-use protection: backend rejects with a 409 message.
      this.toast.error('Failed to delete document component', apiErrorMessage(e));
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
      componentType: r.componentType ?? null,
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
      isActive: r.isActive,
    };
  }

  private blankModel(): SaveDocumentMasterRequest {
    return {
      code: '',
      name: '',
      description: null,
      displayOrder: 0,
      componentType: '',
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
  }
}
