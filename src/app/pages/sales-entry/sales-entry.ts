import { Component, OnInit, inject, signal, viewChild, ElementRef, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import {
  SalesService,
  SalesLookupsDto,
  SalesInvoiceDto,
  CreateSalesRequest,
  UpdateSalesRequest,
  CreateSalesItemInput,
  CreateSalesPaymentInput,
  LookupItem,
} from '../../core/services/sales.service';
import {
  AdministrationService,
  BillingMasterService,
  StockService,
  ProductDto,
  TaxTypeSystemDto,
  TaxDto,
  PriceListDto,
  PriceTypeDto,
  ProductCategoryDto,
  ProductBrandDto,
} from '../../core/services/master_service';
import { PosService, SourceDto } from '../../core/services/pos_service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionService } from '../../core/services/permission.service';
import { KeyboardShortcutService } from '../../core/keyboard/keyboard-shortcut.service';
import { SalesHubService } from '../../core/sales-hub.service';
import { ThemeService } from '../../core/services/theme.service';
import { SaleEntryContextPopupComponent } from './sale-entry-context-popup.component';
import { SaleEntryContextResponse } from '../../core/services/sale-entry-context.service';
import { DocumentPrintService } from '../../core/services/document-print.service';

interface DraftItem {
  productId: number | null;
  unitID: number | null;
  productName?: string | null;
  productText?: string | null;
  quantity: number;
  freeQuantity: number;
  rate: number;
  discountPercentage: number;
  gstPercent: number;
  cgstPercent: number;
  sgstPercent: number;
  igstPercent: number;
  cessPercent: number;
  remarks?: string | null;
}

interface DraftPayment {
  amount: number;
  paymentTypeID: number | null;
  paymentMethodID: number | null;
  referenceNo: string;
  remarks: string;
}

interface SaleTabState {
  saleTabId: string;
  saleLabel: string;
  salesNo: string;
  editingId: number | null;
  branchId: number | null;
  warehouseId: number | null;
  companyId: number | null;
  customerId: number | null;
  customerPhone: string;
  invoiceDate: string;
  sourceId: number | null;
  sourceCode: string;
  priceListId: number | null;
  priceTypeId: number | null;
  taxTypeSystemId: number | null;
  paymentTypeID: number | null;
  paymentMethodID: number | null;
  remarks: string;
  paymentLines: DraftPayment[];
  items: DraftItem[];
  contextStoreName: string;
  contextCounterName: string;
  contextCounterCode: string;
  contextOperatorName: string;
  contextOperatorType: string;
  contextSalesperson: string;
  contextPosSessionNumber: string;
  contextPosSessionStatus: string;
  isDirty: boolean;
  isSaved: boolean;
}

@Component({
  selector: 'app-sales-entry',
  standalone: true,
  imports: [FormsModule, DecimalPipe, LucideAngularModule, SaleEntryContextPopupComponent],
  templateUrl: './sales-entry.html',
  styleUrl: './sales-entry.css',
})
export class SalesEntryPage implements OnInit {
  private readonly svc = inject(SalesService);
  private readonly admin = inject(AdministrationService);
  private readonly billing = inject(BillingMasterService);
  private readonly pos = inject(PosService);
  private readonly stockSvc = inject(StockService);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly el = inject(ElementRef);
  protected readonly kb = inject(KeyboardShortcutService);
  private readonly hub = inject(SalesHubService);
  private readonly docPrint = inject(DocumentPrintService);
  protected readonly theme = inject(ThemeService);

  protected readonly showContextPopup = signal(false);
  protected readonly contextValidated = signal(false);
  protected readonly validatedContext = signal<SaleEntryContextResponse | null>(null);

  private readonly itemsBody = viewChild<ElementRef<HTMLElement>>('itemsBody');
  private readonly importInput = viewChild<ElementRef<HTMLInputElement>>('importInput');
  protected readonly panelBody = viewChild<ElementRef<HTMLElement>>('panelBody');

  protected readonly canView = signal(false);
  protected readonly canManage = signal(false);
  protected readonly loading = signal(false);
  protected readonly lookups = signal<SalesLookupsDto | null>(null);
  protected readonly sales = signal<SalesInvoiceDto[]>([]);
  protected readonly showHelp = signal(false);
  protected readonly tabs = signal<SaleTabState[]>([]);
  protected readonly activeTabId = signal<string | null>(null);

  protected readonly sources = signal<SourceDto[]>([]);
  protected readonly taxTypeSystems = signal<TaxTypeSystemDto[]>([]);
  protected readonly taxMasters = signal<TaxDto[]>([]);
  protected readonly priceLists = signal<PriceListDto[]>([]);
  protected readonly priceTypes = signal<PriceTypeDto[]>([]);
  private readonly allPriceTypes = signal<PriceTypeDto[]>([]);
  protected readonly productCategories = signal<ProductCategoryDto[]>([]);
  protected readonly productBrands = signal<ProductBrandDto[]>([]);

  protected branchId: number | null = null;
  protected warehouseId: number | null = null;
  protected companyId: number | null = null;
  protected customerId: number | null = null;
  protected customerPhone = '';
  protected salesNo = '';
  protected invoiceDate = new Date().toISOString().slice(0, 10);
  protected sourceId: number | null = null;
  protected sourceCode = 'SALES';
  protected priceListId: number | null = null;
  protected priceTypeId: number | null = null;
  protected taxTypeSystemId: number | null = null;
  protected paymentTypeID: number | null = null;
  protected paymentMethodID: number | null = null;
  protected remarks = '';
  protected editingId: number | null = null;
  protected saving = false;

  protected paymentLines: DraftPayment[] = [this.newPaymentLine()];

  protected searchText = '';
  protected selectedId: number | null = null;

  // Product Load Panel (centered overlay inside the Items area)
  protected readonly productPanelOpen = signal(false);
  protected readonly panelLoading = signal(false);
  protected readonly panelError = signal<string | null>(null);
  protected readonly panelProducts = signal<ProductDto[]>([]);
  protected readonly panelResults = signal<ProductDto[]>([]);
  protected readonly panelStock = signal<Map<number, number>>(new Map());
  protected readonly panelPrices = signal<Map<number, number>>(new Map());
  protected panelSearch = '';
  protected panelCategoryId: number | null = null;
  protected panelBrandId: number | null = null;
  protected panelHi = 0;

  private readonly productById = new Map<number, ProductDto>();

  protected readonly items = signal<DraftItem[]>([]);

  private kbDeregs: (() => void)[] = [];

  constructor() {
    effect(async () => {
      const req = this.hub.editRequest();
      if (!req || !this.canView()) return;
      if (req.id == null) {
        await this.newDoc();
      } else {
        try {
          const d = await this.svc.getById(req.id);
          if (d) await this.edit(d);
        } catch {
          // ignore missing record
        }
      }
    });
  }

  async ngOnInit(): Promise<void> {
    this.canView.set(this.perm.has('sales.view'));
    this.canManage.set(this.perm.has('sales.manage'));
    this.registerShortcuts();

    if (this.canView()) {
      await this.refreshLookups();
      await this.loadMasters();
      await this.loadList();

      // A POS-originated entry must carry drawer context. A normal sale must not
      // be forced through it: it can be raised with no store, counter, operator
      // or POS session, leaving POSSessionId null.
      const idParam = this.route.snapshot.queryParamMap.get('id');
      const hasHubRequest = this.hub.editRequest();

      if (hasHubRequest) {
        this.showContextPopup.set(true);
      } else if (idParam) {
        try {
          const d = await this.svc.getById(Number(idParam));
          if (d) this.edit(d);
        } catch {
          // ignore missing record
        }
      }

      if (!this.tabs().length && !this.showContextPopup()) {
        await this.newDoc();
      }
    }
  }

  ngOnDestroy(): void {
    this.kbDeregs.forEach((d) => d());
    this.kbDeregs = [];
  }

  // ============================================================
  // Context flow
  // ============================================================

  protected onContextPopupClose(): void {
    this.showContextPopup.set(false);
    // Navigate back to sales register if no tabs open
    if (!this.tabs().length) {
      this.router.navigate(['/sales']);
    }
  }

  protected onContextPopupContinue(event: { contextToken: string; context: SaleEntryContextResponse }): void {
    this.validatedContext.set(event.context);
    this.contextValidated.set(true);
    this.showContextPopup.set(false);

    // Store context token for API calls (could use a service)
    sessionStorage.setItem('sale_entry_context_token', event.contextToken);

    // Create new document with validated context
    this.createNewDocWithContext(event.context);
  }

  private async createNewDocWithContext(ctx: SaleEntryContextResponse): Promise<void> {
    this.syncActiveTabFromForm();
    const nextTab = this.createTabState();

    // Pre-fill with validated context (read-only in the actual form)
    if (ctx.company) nextTab.companyId = ctx.company.id;
    if (ctx.branch) nextTab.branchId = ctx.branch.id;
    nextTab.contextStoreName = ctx.store?.name ?? '';
    nextTab.contextCounterName = ctx.counter?.name ?? '';
    nextTab.contextCounterCode = ctx.counter?.code ?? '';
    nextTab.contextOperatorName = ctx.operator?.name ?? '';
    nextTab.contextOperatorType = ctx.operator?.type ?? '';
    nextTab.contextSalesperson = ctx.counter?.assignment ?? ctx.operator?.name ?? '';
    nextTab.contextPosSessionNumber = ctx.posSession?.sessionNumber ?? '';
    nextTab.contextPosSessionStatus = ctx.posSession?.status ?? '';

    this.tabs.update((tabs) => [...tabs, nextTab]);
    this.activeTabId.set(nextTab.saleTabId);
    this.applyTabState(nextTab);

    try {
      const nextNumber = await this.svc.getNextNumber(this.companyId);
      nextTab.salesNo = nextNumber;
      this.salesNo = nextNumber;
    } catch {
      nextTab.salesNo = '';
      this.salesNo = '';
    }

    nextTab.isDirty = false;
    nextTab.isSaved = false;
  }

  protected get activeTab(): SaleTabState | null {
    const id = this.activeTabId();
    if (!id) return null;
    return this.tabs().find((tab) => tab.saleTabId === id) ?? null;
  }

  protected markDirty(): void {
    const tab = this.activeTab;
    if (!tab) return;
    tab.isDirty = true;
    tab.isSaved = false;
  }

  private syncActiveTabFromForm(): void {
    const tab = this.activeTab;
    if (!tab) return;
    tab.branchId = this.branchId;
    tab.warehouseId = this.warehouseId;
    tab.companyId = this.companyId;
    tab.customerId = this.customerId;
    tab.customerPhone = this.customerPhone;
    tab.salesNo = this.salesNo;
    tab.invoiceDate = this.invoiceDate;
    tab.sourceId = this.sourceId;
    tab.sourceCode = this.sourceCode;
    tab.priceListId = this.priceListId;
    tab.priceTypeId = this.priceTypeId;
    tab.taxTypeSystemId = this.taxTypeSystemId;
    tab.paymentTypeID = this.paymentTypeID;
    tab.paymentMethodID = this.paymentMethodID;
    tab.remarks = this.remarks;
    tab.paymentLines = this.paymentLines.map((p) => ({ ...p }));
    tab.items = [...this.items()];
    tab.editingId = this.editingId;
    tab.isDirty = true;
  }

  private applyTabState(tab: SaleTabState | null): void {
    if (!tab) {
      this.editingId = null;
      this.branchId = null;
      this.warehouseId = null;
      this.companyId = null;
      this.customerId = null;
      this.customerPhone = '';
      this.salesNo = '';
      this.invoiceDate = new Date().toISOString().slice(0, 10);
      this.sourceId = null;
      this.sourceCode = 'SALES';
      this.priceListId = null;
      this.priceTypeId = null;
      this.taxTypeSystemId = null;
      this.paymentTypeID = null;
      this.paymentMethodID = null;
      this.remarks = '';
      this.paymentLines = [this.newPaymentLine()];
      this.items.set([]);
      return;
    }

    this.editingId = tab.editingId;
    this.branchId = tab.branchId;
    this.warehouseId = tab.warehouseId;
    this.companyId = tab.companyId;
    this.customerId = tab.customerId;
    this.customerPhone = tab.customerPhone;
    this.salesNo = tab.salesNo;
    this.invoiceDate = tab.invoiceDate;
    this.sourceId = tab.sourceId;
    this.sourceCode = tab.sourceCode;
    this.priceListId = tab.priceListId;
    this.priceTypeId = tab.priceTypeId;
    this.taxTypeSystemId = tab.taxTypeSystemId;
    this.paymentTypeID = tab.paymentTypeID;
    this.paymentMethodID = tab.paymentMethodID;
    this.remarks = tab.remarks;
    this.paymentLines = tab.paymentLines.length
      ? tab.paymentLines.map((p) => ({ ...p }))
      : [this.newPaymentLine()];
    this.items.set(tab.items.length ? [...tab.items] : []);
    void this.loadPriceTypesForPriceList(this.priceListId);
  }

  protected async newDoc(): Promise<void> {
    this.syncActiveTabFromForm();
    const nextTab = this.createTabState();
    this.tabs.update((tabs) => [...tabs, nextTab]);
    this.activeTabId.set(nextTab.saleTabId);
    this.applyTabState(nextTab);

    try {
      const nextNumber = await this.svc.getNextNumber(this.companyId);
      nextTab.salesNo = nextNumber;
      this.salesNo = nextNumber;
    } catch {
      nextTab.salesNo = '';
      this.salesNo = '';
    }

    nextTab.isDirty = false;
    nextTab.isSaved = false;
  }

  private createTabState(): SaleTabState {
    const index = this.tabs().length + 1;
    const defaultSource = this.defaultSource();
    return {
      saleTabId: `sale-tab-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      saleLabel: `Sale #${index}`,
      salesNo: '',
      editingId: null,
      branchId: this.lookups()?.branches?.[0]?.id ?? null,
      warehouseId: this.lookups()?.warehouses?.[0]?.id ?? null,
      companyId: this.lookups()?.currentCompanyId ?? this.lookups()?.companies?.[0]?.id ?? null,
      customerId: null,
      customerPhone: '',
      invoiceDate: new Date().toISOString().slice(0, 10),
      sourceId: defaultSource?.id ?? null,
      sourceCode: defaultSource ? defaultSource.code || defaultSource.name : 'SALES',
      priceListId: null,
      priceTypeId: null,
      taxTypeSystemId: this.taxTypeSystems().length === 1 ? this.taxTypeSystems()[0].id : null,
      paymentTypeID: null,
      paymentMethodID: null,
      remarks: '',
      paymentLines: [this.newPaymentLine()],
      items: [],
      contextStoreName: '',
      contextCounterName: '',
      contextCounterCode: '',
      contextOperatorName: '',
      contextOperatorType: '',
      contextSalesperson: '',
      contextPosSessionNumber: '',
      contextPosSessionStatus: '',
      isDirty: false,
      isSaved: false,
    };
  }

  // ============================================================
  // Masters
  // ============================================================

  private async loadMasters(): Promise<void> {
    const safe = async <T>(fn: () => Promise<T>): Promise<T | null> => {
      try {
        return await fn();
      } catch {
        return null;
      }
    };

    const sourcesRes = await safe(() => this.pos.sources.getPaged({ page: 1, size: 1000, search: '' }));
    this.sources.set((sourcesRes?.items ?? []).filter((s) => s.isActive !== false));

    const taxRes = await safe(() => this.admin.taxTypeSystems.getPaged(1, 1000, ''));
    this.taxTypeSystems.set((taxRes?.items ?? []).filter((t) => t.isActive !== false));

    const taxMasterRes = await safe(() => this.admin.taxes.getPaged(1, 1000, ''));
    this.taxMasters.set(taxMasterRes?.items ?? []);

    const priceRes = await safe(() => this.billing.priceLists.getPaged(1, 1000, ''));
    this.priceLists.set((priceRes?.items ?? []).filter((p) => p.isActive !== false));

    const priceTypeRes = await safe(() => this.billing.priceTypes.getAll(true));
    this.allPriceTypes.set((priceTypeRes ?? []).filter((pt) => pt.isActive !== false));

    const catRes = await safe(() => this.admin.productCategories.getPaged(1, 1000, ''));
    this.productCategories.set((catRes?.items ?? []).filter((c) => c.isActive !== false));

    const brandRes = await safe(() => this.admin.productBrands.getPaged(1, 1000, ''));
    this.productBrands.set((brandRes?.items ?? []).filter((b) => b.isActive !== false));
  }

  private defaultSource(): SourceDto | null {
    const list = this.sources();
    if (!list.length) return null;
    return list.find((s) => (s.code ?? '').toUpperCase() === 'SALES') ?? list[0];
  }

  protected onSourceChange(id: number | null): void {
    this.sourceId = id;
    const s = this.sources().find((x) => x.id === id);
    this.sourceCode = s ? s.code || s.name : '';
    this.markDirty();
  }

  protected onTaxTypeSystemChange(id: number | null): void {
    this.taxTypeSystemId = id;
    this.applyTaxEngine();
    this.markDirty();
  }

  protected onWarehouseChange(id: number | null): void {
    this.warehouseId = id;
    this.markDirty();
  }

  /**
   * A POS drawer fixes the company and branch that the sale must belong to, so
   * those stay locked for drawer sales. A normal sale picks them freely.
   */
  protected get companyBranchLocked(): boolean {
    return this.contextValidated();
  }

  protected async onCompanyChange(id: number | null): Promise<void> {
    if (id == null || id === this.companyId) return;
    this.companyId = id;

    // Everything scoped to the company is now stale: branches, units, prices
    // and the reserved next invoice number all belong to the old company.
    this.branchId = null;
    this.warehouseId = null;
    this.priceListId = null;
    this.priceTypeId = null;
    this.priceTypes.set([]);
    this.taxTypeSystemId = null;
    this.items.set([]);

    await this.refreshLookups(id);
    this.branchId = this.lookups()?.branches?.[0]?.id ?? null;
    this.warehouseId = this.lookups()?.warehouses?.[0]?.id ?? null;

    try {
      const nextNumber = await this.svc.getNextNumber(id);
      this.salesNo = nextNumber;
      const tab = this.activeTab;
      if (tab) tab.salesNo = nextNumber;
    } catch {
      // keep the previous number rather than blanking the document
    }

    this.toast.warning(
      'Company changed',
      'Items were cleared. Tax and price-list masters still follow your signed-in company.');
    this.markDirty();
  }

  protected onBranchChange(id: number | null): void {
    this.branchId = id;
    this.warehouseId = null;
    this.markDirty();
  }

  protected async onPriceListChange(id: number | null): Promise<void> {
    this.priceListId = id;
    await this.loadPriceTypesForPriceList(id);
    this.markDirty();
    if (this.productPanelOpen()) await this.loadPanelStockAndPrices();
  }

  protected async onPriceTypeChange(id: number | null): Promise<void> {
    this.priceTypeId = id;
    this.markDirty();
    if (this.productPanelOpen()) await this.loadPanelStockAndPrices();
  }

  /**
   * A price list is priced per price type (Sales, Retail, Wholesale, ...), so a
   * product rate only means something once the price type is known. Junction rows
   * win; the list's own price type columns are the fallback for lists that were
   * never linked explicitly.
   */
  private async loadPriceTypesForPriceList(priceListId: number | null): Promise<void> {
    if (!priceListId) {
      this.priceTypes.set([]);
      this.priceTypeId = null;
      return;
    }

    let ids: number[] = [];
    try {
      const junction = await this.billing.priceLists.getPriceTypes(priceListId);
      ids = (junction ?? []).filter((j) => j.isActive !== false).map((j) => j.priceTypeId);
    } catch {
      ids = [];
    }

    if (!ids.length) {
      const list = this.priceLists().find((p) => p.priceListId === priceListId);
      const csv = (list?.priceTypeIds ?? '')
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => n > 0);
      ids = csv.length ? csv : list?.priceTypeId ? [list.priceTypeId] : [];
    }

    const scoped = this.allPriceTypes()
      .filter((pt) => ids.includes(pt.priceTypeId))
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
    this.priceTypes.set(scoped);
    this.priceTypeId =
      scoped.find((pt) => pt.priceTypeId === this.priceTypeId)?.priceTypeId ?? scoped[0]?.priceTypeId ?? null;
  }

  // ============================================================
  // Context bar display helpers (read-only)
  // ============================================================

  protected ctxCompany(): string {
    const c = this.validatedContext()?.company;
    if (c) return `${c.name}${c.code ? ` (${c.code})` : ''}`;
    const comp = this.lookups()?.companies.find((x) => x.id === this.companyId);
    return comp ? `${comp.name}${comp.code ? ` (${comp.code})` : ''}` : '—';
  }

  protected ctxBranch(): string {
    const b = this.validatedContext()?.branch;
    if (b) return `${b.name}${b.code ? ` (${b.code})` : ''}`;
    const br = this.lookups()?.branches.find((x) => x.id === this.branchId);
    return br ? `${br.name}${br.code ? ` (${br.code})` : ''}` : '—';
  }

  protected ctxStore(): string {
    const active = this.activeTab;
    return active?.contextStoreName || this.validatedContext()?.store?.name || '—';
  }

  protected ctxCounter(): string {
    const active = this.activeTab;
    return active?.contextCounterName || this.validatedContext()?.counter?.name || '—';
  }

  protected ctxOperator(): string {
    const active = this.activeTab;
    return active?.contextOperatorName || this.validatedContext()?.operator?.name || '—';
  }

  protected ctxOperatorType(): string {
    const active = this.activeTab;
    return active?.contextOperatorType || this.validatedContext()?.operator?.type || '—';
  }

  protected ctxSalesperson(): string {
    const active = this.activeTab;
    return active?.contextSalesperson || this.validatedContext()?.counter?.assignment || '—';
  }

  protected ctxPosSession(): string {
    const active = this.activeTab;
    return active?.contextPosSessionNumber || this.validatedContext()?.posSession?.sessionNumber || '—';
  }

  protected ctxPosStatus(): string {
    const active = this.activeTab;
    if (active?.contextPosSessionStatus) return active.contextPosSessionStatus;
    return this.validatedContext()?.posSession?.status || '—';
  }

  // ============================================================
  // Tabs
  // ============================================================

  protected switchTab(tabId: string): void {
    const selected = this.tabs().find((tab) => tab.saleTabId === tabId);
    if (!selected) return;
    this.syncActiveTabFromForm();
    this.activeTabId.set(tabId);
    this.applyTabState(selected);
  }

  protected closeTab(tabId: string, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    const target = this.tabs().find((tab) => tab.saleTabId === tabId);
    if (!target) return;
    if (target.isDirty && !confirm('Unsaved changes will be lost. Close this sale?')) return;

    this.tabs.update((tabs) => tabs.filter((tab) => tab.saleTabId !== tabId));
    if (!this.tabs().length) {
      this.activeTabId.set(null);
      this.applyTabState(null);
      return;
    }

    const next = this.tabs()[0];
    this.activeTabId.set(next.saleTabId);
    this.applyTabState(next);
  }

  protected closeActiveSale(): void {
    const current = this.activeTab;
    if (!current) return;
    this.closeTab(current.saleTabId);
  }

  protected selectNextTab(delta: number): void {
    const list = this.tabs();
    if (!list.length) return;
    const currentId = this.activeTabId();
    const currentIndex = list.findIndex((tab) => tab.saleTabId === currentId);
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + delta + list.length) % list.length;
    this.switchTab(list[nextIndex].saleTabId);
  }

  private registerShortcuts(): void {
    const reg = (cfg: Parameters<KeyboardShortcutService['register']>[0]) => this.kbDeregs.push(this.kb.register(cfg));
    const G = 'Sales Entry';

    reg({ combo: 'ctrl+n', global: true, preventDefault: true, group: G, description: 'New Invoice', handler: () => this.newDoc() });
    reg({ combo: 'ctrl+s', global: true, preventDefault: true, group: G, description: 'Save Invoice', handler: () => this.save() });
    reg({ combo: 'ctrl+tab', global: true, preventDefault: true, group: G, description: 'Next tab', handler: () => this.selectNextTab(1) });
    reg({ combo: 'ctrl+shift+tab', global: true, preventDefault: true, group: G, description: 'Previous tab', handler: () => this.selectNextTab(-1) });
    reg({ combo: 'escape', global: true, group: G, description: 'Close popup / cancel', handler: (e) => this.onEscape(e) });
    reg({ combo: 'f6', global: true, group: G, description: 'Focus item grid', handler: () => this.focusGrid() });
    reg({ combo: 'f3', global: true, group: G, description: 'Product search', handler: () => this.openProductPanel() });
    reg({ combo: '?', global: true, group: G, description: 'Keyboard shortcuts help', handler: () => this.showHelp.update((v) => !v) });
    reg({ combo: 'insert', group: G, description: 'Add product', handler: () => this.openProductPanel() });
    reg({ combo: 'delete', group: G, description: 'Delete item row', handler: (e) => this.onDeleteRow(e) });
    reg({ combo: 'arrowup', group: G, description: 'Previous row', handler: (e) => this.onArrow('up', e) });
    reg({ combo: 'arrowdown', group: G, description: 'Next row', handler: (e) => this.onArrow('down', e) });
    reg({ combo: 'arrowleft', group: G, description: 'Previous cell', handler: (e) => this.onArrow('left', e) });
    reg({ combo: 'arrowright', group: G, description: 'Next cell', handler: (e) => this.onArrow('right', e) });
    reg({ combo: 'home', group: G, description: 'First cell in row', handler: (e) => this.onHomeEnd('home', e) });
    reg({ combo: 'end', group: G, description: 'Last cell in row', handler: (e) => this.onHomeEnd('end', e) });
    reg({ combo: 'ctrl+arrowup', group: G, description: 'First item row', handler: (e) => this.onCtrlArrow('up', e) });
    reg({ combo: 'ctrl+arrowdown', group: G, description: 'Last item row', handler: (e) => this.onCtrlArrow('down', e) });
    reg({ combo: 'tab', group: G, description: 'Next cell', handler: (e) => this.onGridTab(e, false) });
    reg({ combo: 'shift+tab', group: G, description: 'Previous cell', handler: (e) => this.onGridTab(e, true) });
    reg({ combo: 'enter', group: G, description: 'Confirm / next cell', handler: (e) => this.onEnter(e) });
  }

  protected focusField(name: string): void {
    const node = (this.el.nativeElement as HTMLElement).querySelector(`[data-field="${name}"]`) as HTMLElement | null;
    node?.focus();
  }

  private cellSelector(row: number, col: number): string {
    return `input[data-row="${row}"][data-col="${col}"], select[data-row="${row}"][data-col="${col}"]`;
  }

  private focusCell(row: number, col: number): void {
    const body = this.itemsBody()?.nativeElement;
    if (!body) return;
    const el = body.querySelector(this.cellSelector(row, col)) as HTMLElement | null;
    el?.focus();
  }

  private currentCell(target: EventTarget | null): { row: number; col: number } | null {
    const el = target as HTMLElement | null;
    const row = el?.dataset?.['row'];
    const col = el?.dataset?.['col'];
    if (row == null || col == null) return null;
    return { row: +row, col: +col };
  }

  protected focusGrid(): void {
    if (this.items().length === 0) {
      void this.openProductPanel();
      return;
    }
    const cur = this.currentCell(document.activeElement);
    if (cur) this.focusCell(cur.row, cur.col);
    else this.focusCell(0, 0);
  }

  private onArrow(dir: 'up' | 'down' | 'left' | 'right', e: KeyboardEvent): void {
    if (this.productPanelOpen()) {
      // Inside the panel search box ArrowUp/Down pick a result, but
      // ArrowLeft/ArrowRight must still move the text caret.
      if (dir === 'left' || dir === 'right') return;
      e.preventDefault();
      this.movePanelHi(dir === 'down' ? 1 : dir === 'up' ? -1 : 0);
      return;
    }
    const cell = this.currentCell(e.target);
    if (!cell) return;
    const rows = this.items().length;
    let { row, col } = cell;
    if (dir === 'up') row = Math.max(0, row - 1);
    else if (dir === 'down') row = Math.min(rows - 1, row + 1);
    else if (dir === 'left') col = Math.max(0, col - 1);
    else if (dir === 'right') col = Math.min(5, col + 1);
    e.preventDefault();
    this.focusCell(row, col);
  }

  private onHomeEnd(which: 'home' | 'end', e: KeyboardEvent): void {
    if (this.productPanelOpen()) {
      if (!this.inPanelFilters(e.target)) this.closeProductPanel();
      return;
    }
    const cell = this.currentCell(e.target);
    if (!cell) return;
    e.preventDefault();
    this.focusCell(cell.row, which === 'home' ? 0 : 5);
  }

  private onCtrlArrow(dir: 'up' | 'down', e: KeyboardEvent): void {
    const cell = this.currentCell(e.target);
    if (!cell) return;
    const rows = this.items().length;
    e.preventDefault();
    this.focusCell(dir === 'up' ? 0 : Math.max(0, rows - 1), cell.col);
  }

  private nextCell(row: number, col: number, back: boolean): { row: number; col: number } | null {
    const rows = this.items().length;
    if (!rows) return null;
    if (back) {
      if (col > 0) return { row, col: col - 1 };
      if (row > 0) return { row: row - 1, col: 5 };
      return null;
    }
    if (col < 5) return { row, col: col + 1 };
    if (row < rows - 1) return { row: row + 1, col: 0 };
    return null;
  }

  private onGridTab(e: KeyboardEvent, back: boolean): void {
    if (this.productPanelOpen()) {
      if (!this.inPanelFilters(e.target)) this.closeProductPanel();
      return;
    }
    const cell = this.currentCell(e.target);
    if (!cell) return;
    const next = this.nextCell(cell.row, cell.col, back);
    if (!next) return;
    e.preventDefault();
    this.focusCell(next.row, next.col);
  }

  private onEnter(e: KeyboardEvent): void {
    if (this.productPanelOpen()) {
      e.preventDefault();
      this.selectPanelHighlighted();
      return;
    }
    const cell = this.currentCell(e.target);
    if (cell) {
      e.preventDefault();
      const rows = this.items().length;
      if (cell.col < 5) {
        this.focusCell(cell.row, cell.col + 1);
      } else if (cell.row < rows - 1) {
        this.focusCell(cell.row + 1, 0);
      } else {
        void this.openProductPanel();
      }
    }
  }

  private onDeleteRow(e: KeyboardEvent): void {
    const cell = this.currentCell(e.target);
    if (!cell) return;
    const target = e.target as HTMLInputElement;
    const val = target && 'value' in target ? (target.value ?? '') : '';
    if (cell.col <= 1 || val === '') {
      e.preventDefault();
      this.removeItem(cell.row);
      const r = Math.max(0, cell.row - 1);
      if (this.items().length) this.focusCell(r, 0);
    }
  }

  // ============================================================
  // Product Load Panel
  // ============================================================

  protected productLabel(it: DraftItem): string {
    if (it.productId != null) {
      const p = this.lookups()?.products.find((x) => x.id === it.productId);
      if (p) return `${p.name} (${p.code})`;
    }
    return it.productText ?? '';
  }

  protected async openProductPanel(): Promise<void> {
    if (!this.canManage()) return;
    if (!this.companyId) {
      this.toast.error('Company context missing — start a new sale to continue');
      return;
    }
    this.productPanelOpen.set(true);
    this.panelSearch = '';
    this.panelCategoryId = null;
    this.panelBrandId = null;
    this.panelHi = 0;
    await this.loadPanelProducts();
  }

  private async loadPanelProducts(): Promise<void> {
    this.panelLoading.set(true);
    this.panelError.set(null);
    try {
      const res = await this.admin.products.getPaged(1, 2000, '', this.companyId);
      // Defensive: accept either a bare array or a paged envelope so a shape
      // mismatch can never silently blank the grid.
      const rows: ProductDto[] = Array.isArray(res) ? res : (res?.items ?? []);
      this.productById.clear();
      for (const p of rows) this.productById.set(p.id, p);
      this.panelProducts.set(rows);
      await this.loadPanelStockAndPrices();
      this.panelQuery();
      if (!rows.length) {
        this.panelError.set(
          `No products found${this.companyId ? ` for company #${this.companyId}` : ''}. Check that products exist and are active for this company.`,
        );
      }
    } catch (e: any) {
      this.panelProducts.set([]);
      this.panelResults.set([]);
      this.panelError.set(
        e?.error?.message ?? e?.message ?? 'Unable to load products — please retry.',
      );
    } finally {
      this.panelLoading.set(false);
    }
  }

  private async loadPanelStockAndPrices(): Promise<void> {
    const stockMap = new Map<number, number>();
    try {
      if (this.warehouseId) {
        const s = await this.stockSvc.getPaged(1, 3000, '', this.warehouseId);
        for (const row of s.items ?? []) stockMap.set(row.productId, row.availableQuantity ?? row.quantity ?? 0);
      }
    } catch {
      /* stock is optional */
    }
    this.panelStock.set(stockMap);

    const priceMap = new Map<number, number>();
    try {
      if (this.priceListId) {
        const details = await this.billing.priceLists.getDetails(this.priceListId);
        for (const d of details ?? []) {
          if (d.isActive === false) continue;
          if (this.priceTypeId != null && d.priceTypeId !== this.priceTypeId) continue;
          priceMap.set(d.productId, d.price);
        }
      }
    } catch {
      /* prices fall back to product master sales price */
    }
    this.panelPrices.set(priceMap);
  }

  protected onPanelSearch(): void {
    this.panelQuery();
  }

  protected onPanelCategoryChange(): void {
    this.panelQuery();
  }

  protected onPanelBrandChange(): void {
    this.panelQuery();
  }

  private panelQuery(): void {
    const q = this.panelSearch.trim().toLowerCase();
    const cat = this.panelCategoryId;
    const brand = this.panelBrandId;
    let rows = this.panelProducts().filter((p) => p.isActive !== false);
    if (cat != null) rows = rows.filter((p) => p.categoryId === cat);
    if (brand != null) rows = rows.filter((p) => p.brandId === brand);
    if (q) {
      rows = rows.filter(
        (p) =>
          (p.productName ?? '').toLowerCase().includes(q) ||
          (p.productCode ?? '').toLowerCase().includes(q) ||
          (p.barcode ?? '').toLowerCase().includes(q),
      );
    }
    this.panelResults.set(rows.slice(0, 200));
    this.panelHi = 0;
  }

  protected movePanelHi(delta: number): void {
    const n = this.panelResults().length;
    if (!n) return;
    this.panelHi = (this.panelHi + delta + n) % n;
    this.scrollHighlightIntoView();
  }

  private scrollHighlightIntoView(): void {
    const body = this.panelBody()?.nativeElement;
    if (!body) return;
    const rows = body.querySelectorAll<HTMLElement>('.panel-table tbody tr');
    rows[this.panelHi]?.scrollIntoView({ block: 'nearest' });
  }

  private inPanelFilters(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null;
    return !!el?.closest('.panel-filters');
  }

  protected stockOf(p: ProductDto): string {
    const v = this.panelStock().get(p.id);
    return v == null ? '—' : String(v);
  }

  protected rateOf(p: ProductDto): number {
    const m = this.panelPrices().get(p.id);
    if (m != null) return m;
    return p.salesPrice ?? 0;
  }

  protected selectPanelProduct(p: ProductDto): void {
    const item = this.blankItem();
    item.productId = p.id;
    item.productName = p.productName;
    item.productText = `${p.productName} (${p.productCode})`;
    item.unitID = p.uomId ?? null;
    item.quantity = 1;
    item.rate = this.rateOf(p);
    this.applyTaxToItem(item);
    this.items.update((cur) => [...cur, item]);
    this.closeProductPanel();
    this.focusCell(this.items().length - 1, 2);
    this.markDirty();
  }

  protected selectPanelHighlighted(): void {
    const p = this.panelResults()[this.panelHi];
    if (p) this.selectPanelProduct(p);
  }

  protected closeProductPanel(): void {
    this.productPanelOpen.set(false);
  }

  // ============================================================
  // Tax engine (rates come from Tax Master, never hardcoded)
  // ============================================================

  private resolveTaxFor(p: ProductDto | null): TaxDto | undefined {
    const active = this.taxMasters().filter((t) => t.isActive !== false);
    if (p?.taxId != null) {
      const byId = active.find((t) => t.id === p.taxId);
      if (byId) return byId;
    }
    if (this.taxTypeSystemId != null) {
      return active.find((t) => t.taxTypeSystemId === this.taxTypeSystemId);
    }
    return undefined;
  }

  private isInterstateTax(t: TaxDto): boolean {
    const hay = [t.taxCode, t.taxName, t.taxTypeSystemName].filter(Boolean).join(' ').toUpperCase();
    return hay.includes('IGST') || hay.includes('INTER-STATE') || hay.includes('INTERSTATE');
  }

  private applyTaxToItem(item: DraftItem): void {
    if (item.productId == null) return;
    const p = this.productById.get(item.productId) ?? null;
    const tax = this.resolveTaxFor(p);
    if (!tax) return;
    const rate = tax.taxRate || 0;
    item.gstPercent = rate;
    if (this.isInterstateTax(tax)) {
      item.igstPercent = rate;
      item.cgstPercent = 0;
      item.sgstPercent = 0;
    } else {
      item.igstPercent = 0;
      item.cgstPercent = round2(rate / 2);
      item.sgstPercent = round2(rate / 2);
    }
    item.cessPercent = 0;
  }

  protected applyTaxEngine(): void {
    for (const it of this.items()) this.applyTaxToItem(it);
  }

  private onEscape(e: KeyboardEvent): void {
    if (this.productPanelOpen()) {
      this.closeProductPanel();
      return;
    }
    if (this.showHelp()) {
      this.showHelp.set(false);
      return;
    }
    if (this.activeTabId()) {
      this.closeActiveSale();
      e.preventDefault();
    }
  }

  // ============================================================
  // Item rows
  // ============================================================

  protected blankItem(): DraftItem {
    return {
      productId: null,
      unitID: null,
      productName: null,
      productText: '',
      quantity: 1,
      freeQuantity: 0,
      rate: 0,
      discountPercentage: 0,
      gstPercent: 0,
      cgstPercent: 0,
      sgstPercent: 0,
      igstPercent: 0,
      cessPercent: 0,
      remarks: null,
    };
  }

  protected addItem(): void {
    this.items.update((items) => [...items, this.blankItem()]);
    this.markDirty();
  }

  protected removeItem(idx: number): void {
    this.items.update((items) => items.filter((_, index) => index !== idx));
    this.markDirty();
  }

  // ============================================================
  // Import (reuse existing pipeline)
  // ============================================================

  protected openImport(): void {
    if (!this.canManage()) return;
    this.importInput()?.nativeElement.click();
  }

  protected onImportFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!this.lookups()) {
      this.toast.error('Lookups not loaded — refresh before importing');
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => this.toast.error('Failed to read file');
    reader.onload = () => {
      try {
        this.parseAndImport(String(reader.result ?? ''));
      } catch (e: any) {
        this.toast.error('Import failed', e?.error?.message ?? e?.message ?? '');
      }
    };
    reader.readAsText(file);
  }

  private parseAndImport(text: string): void {
    const rows = this.parseCsv(text);
    if (!rows.length) {
      this.toast.error('File is empty');
      return;
    }
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const map = this.detectColumns(header);
    const hasHeader = Object.values(map).some((i) => i >= 0);
    const data = hasHeader ? rows.slice(1) : rows;
    const products = this.lookups()?.products ?? [];
    const units = this.lookups()?.units ?? [];
    const imported: DraftItem[] = [];
    const skipped: string[] = [];

    for (const row of data) {
      if (row.every((c) => !c.trim())) continue;
      const get = (field: string): string => (map[field] >= 0 ? (row[map[field]] ?? '').trim() : '');
      const pval = get('product');
      const prod = this.matchProduct(products, pval);
      if (!prod) {
        skipped.push(`"${pval || '(blank)'}": product not found`);
        continue;
      }
      const unit = this.matchUnit(units, get('unit'));
      const item = this.blankItem();
      item.productId = prod.id;
      item.productName = prod.name;
      item.productText = `${prod.name} (${prod.code})`;
      item.unitID = unit ? unit.id : null;
      item.quantity = this.num(get('qty')) || 1;
      item.freeQuantity = this.num(get('free'));
      item.rate = this.num(get('rate'));
      item.discountPercentage = this.num(get('disc'));
      item.gstPercent = this.num(get('gst'));
      item.cessPercent = this.num(get('cess'));
      imported.push(item);
    }

    if (!imported.length) {
      this.toast.error('No valid rows imported', skipped[0] ?? '');
      return;
    }

    this.items.update((cur) => (cur.length ? [...cur, ...imported] : imported));
    this.markDirty();

    if (skipped.length) {
      this.toast.error(`Imported ${imported.length}, skipped ${skipped.length}`, skipped.slice(0, 3).join('; '));
    } else {
      this.toast.success(`Imported ${imported.length} item(s)`);
    }
  }

  private detectColumns(header: string[]): Record<string, number> {
    const aliases: Record<string, string[]> = {
      product: ['product', 'productname', 'product name', 'item', 'itemname', 'item name'],
      unit: ['unit', 'unitname', 'uom', 'unit of measure'],
      qty: ['qty', 'quantity'],
      free: ['free', 'freeqty', 'free quantity'],
      rate: ['rate', 'price', 'salerate', 'sales rate'],
      disc: ['disc', 'discount', 'discount%', 'discountpct', 'discountpercentage', 'discount percentage'],
      gst: ['gst', 'gst%', 'gstpct', 'gstpercentage', 'gst percentage'],
      cess: ['cess', 'cess%', 'cesspct', 'cess percentage'],
    };

    const map: Record<string, number> = {};
    for (const key of Object.keys(aliases)) {
      map[key] = header.findIndex((h) => aliases[key].includes(h));
    }
    return map;
  }

  private matchProduct(products: LookupItem[], value: string): LookupItem | undefined {
    const v = value.trim().toLowerCase();
    if (!v) return undefined;
    return (
      products.find((p) => (p.code ?? '').toLowerCase() === v) ||
      products.find((p) => (p.name ?? '').toLowerCase() === v) ||
      products.find((p) => (p.name ?? '').toLowerCase().includes(v) || (p.code ?? '').toLowerCase().includes(v))
    );
  }

  private matchUnit(units: LookupItem[], value: string): LookupItem | undefined {
    const v = value.trim().toLowerCase();
    if (!v) return undefined;
    return (
      units.find((u) => (u.code ?? '').toLowerCase() === v) ||
      units.find((u) => (u.name ?? '').toLowerCase() === v) ||
      units.find((u) => (u.name ?? '').toLowerCase().includes(v) || (u.code ?? '').toLowerCase().includes(v))
    );
  }

  private num(value: string): number {
    const n = parseFloat((value ?? '').replace(/,/g, ''));
    return isFinite(n) ? n : 0;
  }

  private parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let inQuotes = false;
    const source = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    for (let i = 0; i < source.length; i++) {
      const char = source[i];
      if (inQuotes) {
        if (char === '"') {
          if (source[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += char;
        }
      } else if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(field);
        field = '';
      } else if (char === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += char;
      }
    }

    row.push(field);
    rows.push(row);
    return rows.map((r) => r.map((cell) => cell.trim()));
  }

  // ============================================================
  // Line / totals calculations
  // ============================================================

  protected lineBase(it: DraftItem): number {
    return (it.quantity || 0) * (it.rate || 0);
  }

  protected lineDisc(it: DraftItem): number {
    return (this.lineBase(it) * (it.discountPercentage || 0)) / 100;
  }

  protected lineTaxable(it: DraftItem): number {
    return round2(this.lineBase(it) - this.lineDisc(it));
  }

  protected lineCgst(it: DraftItem): number {
    return round2((this.lineTaxable(it) * (it.cgstPercent || 0)) / 100);
  }

  protected lineSgst(it: DraftItem): number {
    return round2((this.lineTaxable(it) * (it.sgstPercent || 0)) / 100);
  }

  protected lineIgst(it: DraftItem): number {
    return round2((this.lineTaxable(it) * (it.igstPercent || 0)) / 100);
  }

  protected lineCess(it: DraftItem): number {
    return round2((this.lineTaxable(it) * (it.cessPercent || 0)) / 100);
  }

  protected lineTax(it: DraftItem): number {
    return round2(this.lineCgst(it) + this.lineSgst(it) + this.lineIgst(it) + this.lineCess(it));
  }

  protected lineTotal(it: DraftItem): number {
    return round2(this.lineTaxable(it) + this.lineTax(it));
  }

  protected get totalGross(): number {
    return round2(this.items().reduce((sum, it) => sum + this.lineBase(it), 0));
  }

  protected get totalDiscount(): number {
    return round2(this.items().reduce((sum, it) => sum + this.lineDisc(it), 0));
  }

  protected get taxable(): number {
    return round2(this.items().reduce((sum, it) => sum + this.lineTaxable(it), 0));
  }

  protected get totalCgst(): number {
    return round2(this.items().reduce((sum, it) => sum + this.lineCgst(it), 0));
  }

  protected get totalSgst(): number {
    return round2(this.items().reduce((sum, it) => sum + this.lineSgst(it), 0));
  }

  protected get totalIgst(): number {
    return round2(this.items().reduce((sum, it) => sum + this.lineIgst(it), 0));
  }

  protected get totalCess(): number {
    return round2(this.items().reduce((sum, it) => sum + this.lineCess(it), 0));
  }

  protected get grandTotal(): number {
    return round2(this.taxable + this.totalCgst + this.totalSgst + this.totalIgst + this.totalCess);
  }

  // ============================================================
  // Payment
  // ============================================================

  protected newPaymentLine(): DraftPayment {
    return { amount: 0, paymentTypeID: null, paymentMethodID: null, referenceNo: '', remarks: '' };
  }

  /**
   * Recorded tenders are settled against the invoice once it exists, so the
   * lines are shown for reference but not re-edited.
   */
  protected get paymentLinesEditable(): boolean {
    return this.editingId == null;
  }

  protected addPaymentLine(): void {
    if (!this.paymentLinesEditable) return;
    this.paymentLines = [...this.paymentLines, this.newPaymentLine()];
    this.markDirty();
  }

  protected removePaymentLine(index: number): void {
    if (!this.paymentLinesEditable) return;
    if (this.paymentLines.length <= 1) return;
    this.paymentLines = this.paymentLines.filter((_, i) => i !== index);
    this.markDirty();
  }

  protected paymentMethodName(id: number | null): string {
    if (id == null) return '';
    const m = this.lookups()?.paymentMethods.find((x) => x.id === id);
    return m?.name ?? '';
  }

  protected isCashMethod(id: number | null): boolean {
    if (id == null) return false;
    return this.paymentMethodName(id).toLowerCase().includes('cash');
  }

  protected get amountPaid(): number {
    return round2(this.paymentLines.reduce((sum, p) => sum + (Number(p.amount) || 0), 0));
  }

  protected get balanceAmount(): number {
    return round2(Math.max(0, this.grandTotal - this.amountPaid));
  }

  protected get changeAmount(): number {
    return round2(Math.max(0, this.amountPaid - this.grandTotal));
  }

  // ============================================================
  // Save
  // ============================================================

  private toItems(): CreateSalesItemInput[] {
    return this.items().map((it) => ({
      productId: it.productId!,
      unitID: it.unitID!,
      quantity: it.quantity,
      freeQuantity: it.freeQuantity || 0,
      rate: it.rate,
      discountPercentage: it.discountPercentage || 0,
      gstPercent: it.gstPercent || 0,
      cgstPercent: it.cgstPercent || 0,
      sgstPercent: it.sgstPercent || 0,
      igstPercent: it.igstPercent || 0,
      cessPercent: it.cessPercent || 0,
      remarks: it.remarks ?? null,
    }));
  }

  private toRequest(): CreateSalesRequest {
    const req: CreateSalesRequest = {
      branchId: this.branchId!,
      warehouseId: this.warehouseId!,
      customerId: this.customerId!,
      companyId: this.companyId ?? 0,
      invoiceNumber: this.salesNo,
      invoiceDate: this.invoiceDate,
      sourceType: this.sourceCode || 'SALES',
      priceListId: this.priceListId ?? null,
      paymentTypeID: this.toPayments()[0]?.paymentTypeID ?? this.paymentTypeID ?? null,
      paymentMethodID: this.toPayments()[0]?.paymentMethodID ?? this.paymentMethodID ?? null,
      remarks: this.remarks || null,
      items: this.toItems(),
      payments: this.toPayments(),
    };

    return req;
  }

  private toPayments(): CreateSalesPaymentInput[] {
    return this.paymentLines
      .filter((p) => (Number(p.amount) || 0) > 0)
      .map((p) => ({
        amount: round2(Number(p.amount) || 0),
        paymentTypeID: p.paymentTypeID ?? null,
        paymentMethodID: p.paymentMethodID ?? null,
        referenceNo: (p.referenceNo || '').trim() || null,
        remarks: (p.remarks || '').trim() || null,
      }));
  }

  private validate(): string | null {
    if (!this.companyId) {
      this.toast.error('Company context is required');
      return 'company';
    }
    if (!this.branchId) {
      this.toast.error('Branch is required');
      return 'branch';
    }
    if (!this.invoiceDate) {
      this.focusField('saleDate');
      this.toast.error('Sale Date is required');
      return 'saleDate';
    }
    if (!this.sourceId) {
      this.focusField('source');
      this.toast.error('Source is required');
      return 'source';
    }
    if (!this.customerId) {
      this.focusField('customer');
      this.toast.error('Customer is required');
      return 'customer';
    }
    if (!this.warehouseId) {
      this.focusField('warehouse');
      this.toast.error('Warehouse is required');
      return 'warehouse';
    }
    if (!this.items().length) {
      this.toast.error('Add at least one product');
      this.focusGrid();
      return 'grid';
    }

    for (let index = 0; index < this.items().length; index++) {
      const item = this.items()[index];
      if (!item.productId) {
        this.focusCell(index, 0);
        this.toast.error(`Product is required on row ${index + 1}`);
        return 'grid';
      }
      if (!item.unitID) {
        this.focusCell(index, 1);
        this.toast.error(`Unit is required on row ${index + 1}`);
        return 'grid';
      }
      if (!(item.quantity > 0)) {
        this.focusCell(index, 2);
        this.toast.error(`Quantity must be greater than 0 on row ${index + 1}`);
        return 'grid';
      }
    }

    for (let i = 0; i < this.paymentLines.length; i++) {
      const line = this.paymentLines[i];
      if (!(Number(line.amount) > 0)) continue;
      if (line.paymentMethodID == null) {
        this.focusField('paymentMode');
        this.toast.error(`Select a Payment Mode on payment line ${i + 1}`);
        return 'payment';
      }
      if (!this.isCashMethod(line.paymentMethodID) && !(line.referenceNo || '').trim()) {
        this.focusField('paymentReference');
        this.toast.error(`Reference No is required on payment line ${i + 1}`);
        return 'payment';
      }
    }

    if (this.amountPaid > this.grandTotal) {
      this.focusField('paymentAmount');
      this.toast.error('Payment total cannot exceed the invoice total');
      return 'payment';
    }

    return null;
  }

  protected async save(): Promise<boolean> {
    if (this.saving) return false;
    if (!this.canManage()) return false;
    this.syncActiveTabFromForm();
    const tab = this.activeTab;
    if (!tab) return false;
    if (this.validate() !== null) return false;

    this.saving = true;
    try {
      const req = this.toRequest();
      if (tab.editingId) {
        const update: UpdateSalesRequest = {
          branchId: req.branchId,
          warehouseId: req.warehouseId,
          customerId: req.customerId,
          companyId: req.companyId,
          invoiceNumber: req.invoiceNumber,
          invoiceDate: req.invoiceDate,
          priceListId: req.priceListId,
          paymentTypeID: req.paymentTypeID,
          paymentMethodID: req.paymentMethodID,
          remarks: req.remarks,
          items: req.items,
        };
        await this.svc.update(tab.editingId, update);
        this.lastSavedInvoiceId = tab.editingId;
      } else {
        const created = await this.svc.create(req);
        this.lastSavedInvoiceId = created.salesInvoiceId;
      }

      tab.isDirty = false;
      tab.isSaved = true;
      this.toast.success('Sale saved');
      await this.loadList();
      return true;
    } catch (e: any) {
      this.toast.error('Failed to save', e?.error?.message ?? e?.message ?? '');
      return false;
    } finally {
      this.saving = false;
    }
  }

  protected async saveAndPrint(): Promise<void> {
    const ok = await this.save();
    if (!ok) return;
    // Render the published A4 template with the SAVED invoice from the DB —
    // never the Angular form state.
    await this.docPrint.openPreview(this.lastSavedInvoiceId, this.activeTab?.companyId ?? null, true);
  }

  protected async previewSavedInvoice(p: SalesInvoiceDto): Promise<void> {
    await this.docPrint.openPreview(p.salesInvoiceId, p.companyId, false);
  }

  private lastSavedInvoiceId = 0;

  protected async edit(p: SalesInvoiceDto): Promise<void> {
    await this.refreshLookups();
    const tab = this.createTabState();
    tab.editingId = p.salesInvoiceId;
    tab.branchId = p.branchId;
    tab.warehouseId = p.warehouseId;
    tab.companyId = p.companyId ?? null;
    tab.customerId = p.customerId;
    tab.salesNo = p.salesInvoiceNo;
    tab.invoiceDate = p.invoiceDate ? p.invoiceDate.slice(0, 10) : tab.invoiceDate;
    tab.priceListId = p.priceListId ?? null;
    tab.sourceId = this.resolveSourceId(p.sourceType);
    tab.sourceCode = p.sourceType || 'SALES';
    tab.paymentTypeID = p.paymentTypeID ?? null;
    tab.paymentMethodID = p.paymentMethodID ?? null;
    tab.remarks = p.remarks ?? '';
    const allocations = await this.svc.getPayments(p.salesInvoiceId).catch(() => []);
    tab.paymentLines = allocations.length
      ? allocations.map((a) => ({
          amount: a.allocatedAmount,
          paymentTypeID: p.paymentTypeID ?? null,
          paymentMethodID: p.paymentMethodID ?? null,
          referenceNo: '',
          remarks: '',
        }))
      : [this.newPaymentLine()];
    tab.items = p.items.map((i) => ({
      productId: i.productId,
      unitID: i.unitID,
      productName: i.productNameSnapshot ?? null,
      productText: i.productNameSnapshot ?? null,
      quantity: i.quantity,
      freeQuantity: i.freeQuantity,
      rate: i.rate,
      discountPercentage: i.discountPercentage,
      gstPercent: i.gstPercent,
      cgstPercent: i.cgstPercent,
      sgstPercent: i.sgstPercent,
      igstPercent: i.igstPercent,
      cessPercent: i.cessPercent,
      remarks: i.remarks ?? null,
    }));
    tab.isDirty = false;
    tab.isSaved = true;

    this.tabs.update((tabs) => [...tabs, tab]);
    this.activeTabId.set(tab.saleTabId);
    this.applyTabState(tab);
  }

  private resolveSourceId(sourceType: string | null): number | null {
    const st = (sourceType ?? '').trim();
    if (!st) return null;
    const s = this.sources().find((x) => (x.code ?? '').toUpperCase() === st.toUpperCase());
    return s?.id ?? null;
  }

  protected async remove(p: SalesInvoiceDto): Promise<void> {
    if (!confirm('Delete this sales invoice?')) return;
    try {
      await this.svc.delete(p.salesInvoiceId);
      this.toast.success('Sales invoice deleted');
      if (this.selectedId === p.salesInvoiceId) this.selectedId = null;
      await this.loadList();
    } catch (e: any) {
      this.toast.error('Failed to delete', e?.error?.message ?? e?.message ?? '');
    }
  }

  protected resetForm(): void {
    this.applyTabState(null);
  }

  private editSelected(): void {
    const first = this.tabs().find((tab) => tab.editingId != null);
    if (first) {
      this.switchTab(first.saleTabId);
      return;
    }
    this.toast.error('No sale tab selected');
  }

  private deleteSelected(): void {
    const current = this.activeTab;
    if (!current) {
      this.toast.error('No sale selected');
      return;
    }

    if (current.editingId != null) {
      const invoice = this.sales().find((item) => item.salesInvoiceId === current.editingId);
      if (invoice) {
        if (confirm('Delete this sales invoice? This cannot be undone.')) {
          void this.remove(invoice);
        }
        return;
      }
    }

    if (confirm('Delete this unsaved sale tab?')) {
      this.closeTab(current.saleTabId);
    }
  }

  private async refreshLookups(companyId?: number | null): Promise<void> {
    this.lookups.set(await this.svc.getLookups(companyId));
  }

  private async loadList(): Promise<void> {
    try {
      this.loading.set(true);
      const p = await this.svc.getPaged(1, 50, '');
      this.sales.set(p.items ?? []);
    } catch (e: any) {
      this.toast.error('Failed to load sales', e?.error?.message ?? e?.message ?? '');
    } finally {
      this.loading.set(false);
    }
  }

  protected readonly trackByIndex = (index: number): number => index;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}