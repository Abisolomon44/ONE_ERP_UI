import { Component, OnInit, inject, signal, viewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import {
  SalesService,
  SalesLookupsDto,
  CreateSalesRequest,
  CreateSalesItemInput,
  CreateSalesPaymentInput,
  LookupItem,
} from '../../core/services/sales.service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionService } from '../../core/services/permission.service';
import { KeyboardShortcutService } from '../../core/keyboard/keyboard-shortcut.service';

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
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);
  private readonly el = inject(ElementRef);
  protected readonly kb = inject(KeyboardShortcutService);

  private readonly barcode = viewChild<ElementRef<HTMLInputElement>>('barcode');

  protected readonly canView = signal(false);
  protected readonly canManage = signal(false);
  protected readonly loading = signal(false);
  protected readonly lookups = signal<SalesLookupsDto | null>(null);

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

  // product search state (dialog-style dropdown)
  protected searchOpen = false;
  protected searchText = '';
  protected productResults: LookupItem[] = [];
  protected productHi = 0;

  protected readonly cart = signal<PosItem[]>([]);

  private kbDeregs: (() => void)[] = [];

  async ngOnInit(): Promise<void> {
    this.canView.set(this.perm.has('sales.view'));
    this.canManage.set(this.perm.has('sales.manage') || this.perm.has('sales.pos.view'));
    this.registerShortcuts();
    if (this.canView()) {
      await this.refreshLookups();
      this.branchId = this.lookups()?.branches?.[0]?.id ?? null;
      this.warehouseId = this.lookups()?.warehouses?.[0]?.id ?? null;
      this.companyId = this.lookups()?.currentCompanyId ?? this.lookups()?.companies?.[0]?.id ?? null;
      this.paymentTypeID = this.lookups()?.paymentTypes?.[0]?.id ?? null;
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
    reg({ combo: 'f3', global: true, group: G, description: 'Product search', handler: () => this.openSearch() });
    reg({ combo: 'escape', global: true, group: G, description: 'Close search', handler: () => (this.searchOpen = false) });
    reg({ combo: 'ctrl+p', global: true, preventDefault: true, group: G, description: 'Print last invoice', handler: () => window.print() });
    reg({ combo: 'f9', global: true, preventDefault: true, group: G, description: 'Checkout', handler: () => this.checkout() });
  }

  private async refreshLookups(): Promise<void> {
    this.lookups.set(await this.svc.getLookups());
  }

  private productById(id: number): LookupItem | undefined {
    return this.lookups()?.products.find((p) => p.id === id);
  }

  protected focusBarcode(): void {
    this.barcode()?.nativeElement?.focus();
  }

  /* ---------- product search ---------- */
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
    this.addLine(p, this.productById(p.id));
    this.focusBarcode();
  }

  /* ---------- barcode scanner ---------- */
  protected onBarcodeEnter(): void {
    const val = this.barcodeText.trim();
    if (!val) return;
    const barcode = val.toLowerCase();
    const match =
      this.lookups()?.products.find(
        (p) => (p.code ?? '').toLowerCase() === barcode || (p.name ?? '').toLowerCase() === barcode,
      ) ||
      this.lookups()?.products.find(
        (p) =>
          (p.code ?? '').toLowerCase().includes(barcode) ||
          (p.name ?? '').toLowerCase().includes(barcode),
      );
    if (match) {
      this.addLine(match, this.productById(match.id));
      this.barcodeText = '';
    } else {
      this.toast.error(`Product not found: ${val}`);
      this.barcodeText = '';
    }
  }

  private addLine(p: LookupItem, _full: LookupItem | undefined): void {
    const existing = this.cart().find((i) => i.productId === p.id && i.rate === 0);
    if (existing) {
      existing.quantity += 1;
      return;
    }
    const item: PosItem = {
      productId: p.id,
      unitID: this.lookups()?.units?.[0]?.id ?? null,
      productName: p.name,
      productText: `${p.name} (${p.code})`,
      quantity: 1,
      rate: 0,
      discountPercentage: 0,
      gstPercent: 0,
      cgstPercent: 0,
      sgstPercent: 0,
      igstPercent: 0,
      cessPercent: 0,
    };
    this.cart.update((c) => [...c, item]);
  }

  protected removeItem(idx: number): void {
    this.cart.update((c) => c.filter((_, n) => n !== idx));
  }

  protected clearCart(): void {
    this.cart.set([]);
  }

  protected itemLabel(it: PosItem): string {
    return it.productText ?? '';
  }

  /* ---------- totals ---------- */
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
    return round2(this.cart().reduce((s, it) => s + this.lineBase(it), 0));
  }
  protected get totalDiscount(): number {
    return round2(this.cart().reduce((s, it) => s + this.lineDisc(it), 0));
  }
  protected get taxable(): number {
    return round2(this.cart().reduce((s, it) => s + this.lineTaxable(it), 0));
  }
  protected get totalTax(): number {
    return round2(
      this.cart().reduce((s, it) => s + this.lineCgst(it) + this.lineSgst(it) + this.lineIgst(it) + this.lineCess(it), 0),
    );
  }
  protected get grandTotal(): number {
    return round2(this.taxable + this.totalTax);
  }

  /* ---------- checkout ---------- */
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
    this.loading.set(true);
    try {
      if (!this.saleNo) {
        try {
          this.saleNo = await this.svc.getNextNumber();
        } catch {
          this.saleNo = '';
        }
      }
      const items: CreateSalesItemInput[] = this.cart().map((it) => ({
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
        branchId: this.branchId!,
        warehouseId: this.warehouseId!,
        customerId: this.customerId ?? 0,
        companyId: this.companyId ?? 0,
        invoiceNumber: this.saleNo || 'AUTO',
        invoiceDate: this.invoiceDate,
        sourceType: 'POS',
        paymentTypeID: this.paymentTypeID ?? null,
        paymentMethodID: this.paymentMethodID ?? null,
        remarks: 'POS sale',
        items,
        payment,
      };
      const created = await this.svc.create(req);
      this.lastSaleNumber = created.salesInvoiceNo;
      this.lastGrandTotal = created.grandTotal;
      this.saleNo = '';
      this.toast.success(`Sale #${created.salesInvoiceNo} complete`);
      this.cart.set([]);
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
