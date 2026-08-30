import { Component, OnInit, inject, signal, computed, viewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import {
  SalesService,
  SalesLookupsDto,
  CreateSalesRequest,
  CreateSalesItemInput,
  CreateSalesPaymentInput,
  LookupItem,
} from '../../core/services/sales.service';
import { ProductDto, StockService, PaginatedResult } from '../../core/services/master_service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionService } from '../../core/services/permission.service';
import { KeyboardShortcutService } from '../../core/keyboard/keyboard-shortcut.service';

type PosMode = 'touch' | 'scan' | 'search';
type ProductViewMode = 'grid' | 'list';
type SaleStatus = 'draft' | 'held' | 'parked' | 'completed';

interface PosItem {
  productId: number | null;
  unitID: number | null;
  productName?: string | null;
  productText?: string | null;
  quantity: number;
  rate: number;
  discountPercentage: number;
  gstPercent: number;
  cgstPercent: number;
  sgstPercent: number;
  igstPercent: number;
  cessPercent: number;
  available?: number | null;
}

interface SaleSession {
  id: number;
  saleNumber: string;
  customerId: number | null;
  branchId: number | null;
  warehouseId: number | null;
  date: string;
  paymentMethodID: number | null;
  items: PosItem[];
  discount: number;
  taxes: number;
  status: SaleStatus;
  isDirty: boolean;
}

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [FormsModule, DecimalPipe, LucideAngularModule],
  templateUrl: './pos.html',
  styleUrl: './pos.css',
})
export class PosPage implements OnInit {
  private readonly svc = inject(SalesService);
  private readonly http = inject(HttpClient);
  private readonly stockSvc = inject(StockService);
  protected readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);
  private readonly el = inject(ElementRef);
  protected readonly kb = inject(KeyboardShortcutService);
  protected readonly Math = Math;

  private readonly barcode = viewChild<ElementRef<HTMLInputElement>>('barcode');

  protected readonly canView = signal(false);
  protected readonly canManage = signal(false);
  protected readonly loading = signal(false);
  protected readonly lookups = signal<SalesLookupsDto | null>(null);
  protected readonly saleSessions = signal<SaleSession[]>([]);
  protected readonly activeSaleId = signal<number | null>(null);
  protected readonly recentOpen = signal(false);

  protected branchId: number | null = null;
  protected warehouseId: number | null = null;
  protected companyId: number | null = null;
  protected customerId: number | null = null;
  protected invoiceDate = new Date().toISOString().slice(0, 10);
  protected paymentTypeID: number | null = null;
  protected paymentMethodID: number | null = null;

  protected barcodeText = '';
  protected saleNo = '';
  protected lastSaleNumber = '';
  protected lastGrandTotal = 0;

  protected searchOpen = false;
  protected searchText = '';
  protected productResults: LookupItem[] = [];
  protected productHi = 0;

  protected readonly cart = computed<PosItem[]>(() => this.activeSale()?.items ?? []);
  protected readonly activeSale = computed<SaleSession | undefined>(() => {
    const sessions = this.saleSessions();
    const activeId = this.activeSaleId();
    return sessions.find((sale) => sale.id === activeId) ?? sessions[0];
  });

  protected readonly posMode = signal<PosMode>('touch');
  protected readonly viewMode = signal<ProductViewMode>('grid');
  protected readonly touchProducts = signal<ProductDto[]>([]);
  protected readonly stockByProduct = signal<Map<number, number>>(new Map());
  protected readonly activeCategory = signal<string>('All');
  protected readonly justAddedId = signal<number | null>(null);

  protected readonly categories = computed<string[]>(() => {
    const names = new Set<string>();
    for (const p of this.touchProducts()) {
      if (p.categoryName) names.add(p.categoryName);
    }
    return ['All', ...[...names].sort()];
  });

  protected readonly filteredTouchProducts = computed<ProductDto[]>(() => {
    const cat = this.activeCategory();
    return this.touchProducts().filter((p) => cat === 'All' || p.categoryName === cat);
  });

  protected readonly holdList = computed(() => this.saleSessions().filter((s) => s.status === 'held' || s.status === 'parked'));

  private kbDeregs: (() => void)[] = [];

  async ngOnInit(): Promise<void> {
    this.canView.set(this.perm.has('sales.view'));
    this.canManage.set(this.perm.has('sales.manage') || this.perm.has('sales.pos.view'));
    this.registerShortcuts();
    if (this.canView()) {
      await this.refreshLookups();
      this.alignDefaultsFromLookups();
      this.addSaleTab(true);
      await this.loadTouchProducts();
      await this.loadStock();
    }
  }

  ngOnDestroy(): void {
    this.kbDeregs.forEach((d) => d());
    this.kbDeregs = [];
  }

  private registerShortcuts(): void {
    const reg = (cfg: Parameters<KeyboardShortcutService['register']>[0]) =>
      this.kbDeregs.push(this.kb.register(cfg));
    const G = 'POS';
    reg({ combo: 'ctrl+n', global: true, preventDefault: true, group: G, description: 'New sale', handler: () => this.addSaleTab() });
    reg({ combo: 'ctrl+tab', global: true, preventDefault: true, group: G, description: 'Next sale', handler: () => this.moveSaleTab(1) });
    reg({ combo: 'ctrl+shift+tab', global: true, preventDefault: true, group: G, description: 'Previous sale', handler: () => this.moveSaleTab(-1) });
    reg({ combo: 'f2', global: true, group: G, description: 'Customer', handler: () => this.focusField('customer') });
    reg({ combo: 'f3', global: true, group: G, description: 'Product search', handler: () => this.openSearch() });
    reg({ combo: 'f4', global: true, group: G, description: 'Hold sale', handler: () => this.holdCurrentSale() });
    reg({ combo: 'f5', global: true, group: G, description: 'Park sale', handler: () => this.parkCurrentSale() });
    reg({ combo: 'f6', global: true, group: G, description: 'Recent sales', handler: () => this.openRecent() });
    reg({ combo: 'f7', global: true, group: G, description: 'Discount', handler: () => this.toast.info('Discount editor is available in the cart.') });
    reg({ combo: 'f8', global: true, preventDefault: true, group: G, description: 'Clear cart', handler: () => this.clearCart() });
    reg({ combo: 'f9', global: true, preventDefault: true, group: G, description: 'Checkout', handler: () => void this.checkout() });
    reg({ combo: 'escape', global: true, group: G, description: 'Close dialogs', handler: () => this.escapeAction() });
  }

  private escapeAction(): void {
    if (this.searchOpen) {
      this.searchOpen = false;
      return;
    }
    if (this.recentOpen()) {
      this.recentOpen.set(false);
    }
  }

  private alignDefaultsFromLookups(): void {
    this.branchId = this.lookups()?.branches?.[0]?.id ?? null;
    this.warehouseId = this.lookups()?.warehouses?.[0]?.id ?? null;
    this.companyId = this.lookups()?.currentCompanyId ?? this.lookups()?.companies?.[0]?.id ?? null;
    this.paymentTypeID = this.lookups()?.paymentTypes?.[0]?.id ?? null;
    this.invoiceDate = new Date().toISOString().slice(0, 10);
  }

  private async refreshLookups(): Promise<void> {
    this.lookups.set(await this.svc.getLookups());
  }

  private buildSession(index = 1): SaleSession {
    return {
      id: Date.now() + Math.random(),
      saleNumber: `Sale #${index}`,
      customerId: this.customerId,
      branchId: this.branchId,
      warehouseId: this.warehouseId,
      date: this.invoiceDate,
      paymentMethodID: this.paymentMethodID,
      items: [],
      discount: 0,
      taxes: 0,
      status: 'draft',
      isDirty: false,
    };
  }

  private syncFormFromActiveSale(): void {
    const active = this.activeSale();
    if (!active) return;
    this.customerId = active.customerId ?? null;
    this.branchId = active.branchId ?? this.branchId;
    this.warehouseId = active.warehouseId ?? this.warehouseId;
    this.invoiceDate = active.date || new Date().toISOString().slice(0, 10);
    this.paymentMethodID = active.paymentMethodID ?? null;
  }

  private updateActiveSale(mutator: (sale: SaleSession) => void): void {
    const current = this.activeSale();
    if (!current) return;
    const nextSale: SaleSession = {
      ...current,
      items: [...current.items],
      isDirty: true,
    };
    mutator(nextSale);
    this.saleSessions.update((sessions) => sessions.map((sale) => (sale.id === current.id ? nextSale : sale)));
    this.syncFormFromActiveSale();
  }

  protected addSaleTab(forceFirst = false): void {
    const sessions = this.saleSessions();
    if (!sessions.length || forceFirst) {
      const newSale = this.buildSession(Math.max(1, sessions.length + 1));
      this.saleSessions.set([newSale]);
      this.activeSaleId.set(newSale.id);
      this.syncFormFromActiveSale();
      return;
    }

    const newSale = this.buildSession(sessions.length + 1);
    this.saleSessions.update((list) => [...list, newSale]);
    this.activeSaleId.set(newSale.id);
    this.syncFormFromActiveSale();
  }

  protected switchSale(saleId: number): void {
    this.activeSaleId.set(saleId);
    this.syncFormFromActiveSale();
  }

  protected moveSaleTab(offset: number): void {
    const sessions = this.saleSessions();
    if (!sessions.length) return;
    const currentIndex = sessions.findIndex((sale) => sale.id === this.activeSaleId());
    const nextIndex = currentIndex >= 0 ? (currentIndex + offset + sessions.length) % sessions.length : 0;
    this.switchSale(sessions[nextIndex].id);
  }

  protected closeSale(saleId: number): void {
    const sessions = this.saleSessions();
    if (sessions.length <= 1) {
      const resetSale = this.buildSession(1);
      this.saleSessions.set([resetSale]);
      this.activeSaleId.set(resetSale.id);
      this.syncFormFromActiveSale();
      return;
    }

    const remaining = sessions.filter((sale) => sale.id !== saleId);
    const previousActive = remaining[0];
    this.saleSessions.set(remaining);
    this.activeSaleId.set(previousActive.id);
    this.syncFormFromActiveSale();
  }

  protected setActiveField<T extends 'customerId' | 'branchId' | 'warehouseId' | 'paymentMethodID'>(field: T, value: SaleSession[T]): void {
    this.updateActiveSale((sale) => {
      sale[field] = value;
      sale.isDirty = true;
    });
    if (field === 'customerId') this.customerId = value as number | null;
    if (field === 'branchId') this.branchId = value as number | null;
    if (field === 'warehouseId') this.warehouseId = value as number | null;
    if (field === 'paymentMethodID') this.paymentMethodID = value as number | null;
  }

  protected setActiveInvoiceDate(value: string): void {
    this.invoiceDate = value;
    this.updateActiveSale((sale) => {
      sale.date = value;
      sale.isDirty = true;
    });
  }

  protected onWarehouseChange(): void {
    const active = this.activeSale();
    if (!active) return;
    this.updateActiveSale((sale) => {
      sale.warehouseId = this.warehouseId;
      sale.isDirty = true;
    });
    this.focusBarcode();
  }

  protected openRecent(): void {
    this.recentOpen.set(true);
  }

  protected restoreRecentSale(saleId: number): void {
    this.switchSale(saleId);
    this.recentOpen.set(false);
  }

  protected holdCurrentSale(): void {
    this.updateActiveSale((sale) => {
      sale.status = 'held';
      sale.isDirty = false;
    });
    this.toast.success('Sale held');
  }

  protected parkCurrentSale(): void {
    this.updateActiveSale((sale) => {
      sale.status = 'parked';
      sale.isDirty = false;
    });
    this.toast.success('Sale parked');
  }

  protected saleTabLabel(sale: SaleSession): string {
    return sale.isDirty ? `${sale.saleNumber} *` : sale.saleNumber;
  }

  protected saleTabState(sale: SaleSession): string {
    return sale.status === 'held' ? 'Held' : sale.status === 'parked' ? 'Parked' : sale.isDirty ? 'Dirty' : 'Open';
  }

  protected focusField(name: string): void {
    const node = (this.el.nativeElement as HTMLElement).querySelector(`[data-field="${name}"]`) as HTMLInputElement | HTMLSelectElement | null;
    node?.focus();
  }

  protected setCategory(name: string): void {
    this.activeCategory.set(name);
  }

  protected setViewMode(mode: ProductViewMode): void {
    this.viewMode.set(mode);
  }

  protected setPosMode(mode: PosMode): void {
    this.posMode.set(mode);
    if (mode === 'scan') this.focusBarcode();
    if (mode === 'search') this.openSearch();
  }

  protected stockQty(p: ProductDto): number | null {
    return p.isStockItem ? this.stockByProduct().get(p.id) ?? 0 : null;
  }

  protected stockLabel(p: ProductDto): string {
    const qty = this.stockQty(p);
    if (qty == null) return '';
    if (qty <= 0) return 'Out of Stock';
    if (qty <= 5) return `Low Stock ${qty}`;
    return `Stock ${qty}`;
  }

  protected canTapProduct(p: ProductDto): boolean {
    const qty = this.stockQty(p);
    return qty == null || qty > 0;
  }

  protected tapProduct(p: ProductDto): void {
    if (!this.canTapProduct(p)) return;
    void this.addLine({ id: p.id, code: p.productCode, name: p.productName });
    this.justAddedId.set(p.id);
    setTimeout(() => {
      if (this.justAddedId() === p.id) this.justAddedId.set(null);
    }, 350);
  }

  protected focusBarcode(): void {
    this.barcode()?.nativeElement?.focus();
  }

  protected openSearch(): void {
    this.searchOpen = true;
    this.searchText = '';
    this.productQuery('');
    setTimeout(() => {
      const node = (this.el.nativeElement as HTMLElement).querySelector('[data-pos-search]') as HTMLInputElement | null;
      node?.focus();
    });
  }

  protected onSearchType(value: string): void {
    this.searchText = value;
    this.productQuery(value);
  }

  private productQuery(q: string): void {
    const query = q.trim().toLowerCase();
    const all = this.lookups()?.products ?? [];
    this.productResults = query
      ? all.filter((p) => p.name?.toLowerCase().includes(query) || p.code?.toLowerCase().includes(query))
      : all.slice(0, 60);
    this.productHi = 0;
  }

  protected moveHi(delta: number): void {
    const n = this.productResults.length;
    if (!n) return;
    this.productHi = (this.productHi + delta + n) % n;
  }

  protected pickProduct(p: LookupItem): void {
    this.searchOpen = false;
    this.searchText = '';
    this.barcodeText = '';
    void this.addLine(p);
    this.focusBarcode();
  }

  protected onBarcodeEnter(): void {
    const val = this.barcodeText.trim();
    if (!val) return;
    const barcode = val.toLowerCase();
    const match =
      this.lookups()?.products.find(
        (p) => (p.code ?? '').toLowerCase() === barcode || (p.name ?? '').toLowerCase() === barcode,
      ) ||
      this.lookups()?.products.find(
        (p) => (p.code ?? '').toLowerCase().includes(barcode) || (p.name ?? '').toLowerCase().includes(barcode),
      );
    if (match) {
      void this.addLine(match);
      this.barcodeText = '';
    } else {
      this.toast.error(`Product not found: ${val}`);
      this.barcodeText = '';
    }
  }

  private async addLine(p: LookupItem): Promise<void> {
    let unitId = this.lookups()?.units?.[0]?.id ?? null;
    let available: number | null = null;
    try {
      const stocks = await this.svc.getProductStock(p.id);
      if (stocks.length) {
        const picked = stocks.find((s) => this.warehouseId == null || s.warehouseId === this.warehouseId) ?? stocks[0];
        unitId = picked.unitId;
        available = picked.availableQuantity;
      }
    } catch {
      // best effort stock lookup
    }

    this.updateActiveSale((sale) => {
      const existing = sale.items.find((item) => item.productId === p.id && item.unitID === unitId);
      if (existing) {
        existing.quantity += 1;
        if (available != null) existing.available = available;
        return;
      }

      sale.items.push({
        productId: p.id,
        unitID: unitId,
        productName: p.name,
        productText: `${p.name} (${p.code})`,
        quantity: 1,
        rate: p.salesPrice ?? 0,
        discountPercentage: 0,
        gstPercent: 0,
        cgstPercent: 0,
        sgstPercent: 0,
        igstPercent: 0,
        cessPercent: 0,
        available,
      });
    });
  }

  protected removeItem(index: number): void {
    this.updateActiveSale((sale) => {
      sale.items = sale.items.filter((_, i) => i !== index);
      sale.isDirty = true;
    });
  }

  protected clearCart(): void {
    if (!this.cart().length) return;
    const ok = window.confirm('Clear the active cart?');
    if (!ok) return;
    this.updateActiveSale((sale) => {
      sale.items = [];
      sale.isDirty = true;
    });
  }

  protected itemLabel(it: PosItem): string {
    return it.productText ?? it.productName ?? '';
  }

  protected lineBase(it: PosItem): number {
    return (it.quantity || 0) * (it.rate || 0);
  }

  protected lineDisc(it: PosItem): number {
    return (this.lineBase(it) * (it.discountPercentage || 0)) / 100;
  }

  protected lineTaxable(it: PosItem): number {
    return round2(this.lineBase(it) - this.lineDisc(it));
  }

  protected lineCgst(it: PosItem): number {
    return round2((this.lineTaxable(it) * (it.cgstPercent || 0)) / 100);
  }

  protected lineSgst(it: PosItem): number {
    return round2((this.lineTaxable(it) * (it.sgstPercent || 0)) / 100);
  }

  protected lineIgst(it: PosItem): number {
    return round2((this.lineTaxable(it) * (it.igstPercent || 0)) / 100);
  }

  protected lineCess(it: PosItem): number {
    return round2((this.lineTaxable(it) * (it.cessPercent || 0)) / 100);
  }

  protected lineTotal(it: PosItem): number {
    return round2(this.lineTaxable(it) + this.lineCgst(it) + this.lineSgst(it) + this.lineIgst(it) + this.lineCess(it));
  }

  protected get totalGross(): number {
    return round2(this.cart().reduce((sum, item) => sum + this.lineBase(item), 0));
  }

  protected get totalDiscount(): number {
    return round2(this.cart().reduce((sum, item) => sum + this.lineDisc(item), 0));
  }

  protected get taxable(): number {
    return round2(this.cart().reduce((sum, item) => sum + this.lineTaxable(item), 0));
  }

  protected get totalTax(): number {
    return round2(
      this.cart().reduce(
        (sum, item) => sum + this.lineCgst(item) + this.lineSgst(item) + this.lineIgst(item) + this.lineCess(item),
        0,
      ),
    );
  }

  protected get grandTotal(): number {
    return round2(this.taxable + this.totalTax);
  }

  protected async checkout(): Promise<void> {
    if (this.loading()) return;
    if (!this.canManage()) return;
    if (!this.cart().length) {
      this.toast.error('Cart is empty');
      this.focusBarcode();
      return;
    }
    if (!this.branchId || !this.warehouseId) {
      this.toast.error('Branch and Warehouse are required');
      return;
    }

    const active = this.activeSale();
    if (!active) return;
    this.loading.set(true);
    try {
      const invoiceNumber = this.saleNo || (await this.svc.getNextNumber()) || 'AUTO';
      const items: CreateSalesItemInput[] = active.items.map((it) => ({
        productId: it.productId!,
        unitID: it.unitID!,
        quantity: it.quantity,
        freeQuantity: 0,
        rate: it.rate,
        discountPercentage: it.discountPercentage || 0,
        gstPercent: it.gstPercent || 0,
        cgstPercent: it.cgstPercent || 0,
        sgstPercent: it.sgstPercent || 0,
        igstPercent: it.igstPercent || 0,
        cessPercent: it.cessPercent || 0,
      }));

      const payment: CreateSalesPaymentInput = {
        amount: this.grandTotal,
        paymentTypeID: this.paymentTypeID ?? null,
        paymentMethodID: this.paymentMethodID ?? null,
        referenceNo: null,
        remarks: 'POS sale',
      };

      const req: CreateSalesRequest = {
        branchId: active.branchId ?? this.branchId,
        warehouseId: active.warehouseId ?? this.warehouseId,
        customerId: active.customerId ?? this.customerId ?? 0,
        companyId: this.companyId ?? 0,
        invoiceNumber,
        invoiceDate: active.date || this.invoiceDate,
        sourceType: 'POS',
        paymentTypeID: this.paymentTypeID ?? null,
        paymentMethodID: active.paymentMethodID ?? this.paymentMethodID ?? null,
        remarks: 'POS sale',
        items,
        payment,
      };

      const created = await this.svc.create(req);
      this.lastSaleNumber = created.salesInvoiceNo;
      this.lastGrandTotal = created.grandTotal;
      this.saleNo = '';

      this.saleSessions.update((sessions) =>
        sessions.map((sale) =>
          sale.id === active.id
            ? { ...sale, status: 'completed', isDirty: false, saleNumber: `Invoice #${created.salesInvoiceNo}` }
            : sale,
        ),
      );

      this.toast.success(`Sale ${created.salesInvoiceNo} complete`);
      this.addSaleTab();
      this.focusBarcode();
    } catch (e: any) {
      this.toast.error('Checkout failed', e?.error?.message ?? e?.message ?? '');
    } finally {
      this.loading.set(false);
    }
  }

  protected windowPrint(): void {
    window.print();
  }

  protected readonly trackByIndex = (i: number): number => i;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
