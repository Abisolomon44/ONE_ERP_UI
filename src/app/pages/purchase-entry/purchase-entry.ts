import { Component, OnInit, inject, signal, viewChild, ElementRef, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import {
  PurchaseService,
  PurchaseLookupsDto,
  PurchaseDto,
  CreatePurchaseRequest,
  UpdatePurchaseRequest,
  CreatePurchaseItemInput,
  CreatePurchasePaymentInput,
  LookupItem,
} from '../../core/services/master_service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionService } from '../../core/services/permission.service';
import { KeyboardShortcutService } from '../../core/keyboard/keyboard-shortcut.service';
import { PurchaseHubService } from '../../core/purchase-hub.service';

interface DraftItem {
  productId: number | null;
  unitID: number | null;
  productName?: string | null;
  productText?: string | null; // autocomplete display text
  quantity: number;
  freeQuantity: number;
  purchaseRate: number;
  mrp?: number | null;
  retailPrice?: number | null;
  wholesalePrice?: number | null;
  saleRate?: number | null;
  discountPercentage: number;
  gstRate: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cessRate: number;
  remarks?: string | null;
}

@Component({
  selector: 'app-purchase-entry',
  standalone: true,
  imports: [FormsModule, DecimalPipe, SlicePipe, LucideAngularModule],
  templateUrl: './purchase-entry.html',
  styleUrl: './purchase-entry.css',
})
export class PurchaseEntryPage implements OnInit {
  private readonly svc = inject(PurchaseService);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);
  private readonly route = inject(ActivatedRoute);
  private readonly el = inject(ElementRef);
  protected readonly kb = inject(KeyboardShortcutService);
  private readonly hub = inject(PurchaseHubService);

  // Grid body reference used for cell-focus math.
  private readonly itemsBody = viewChild<ElementRef<HTMLElement>>('itemsBody');

  protected readonly canView = signal(false);
  protected readonly canManage = signal(false);
  protected readonly loading = signal(false);
  protected readonly lookups = signal<PurchaseLookupsDto | null>(null);
  protected readonly purchases = signal<PurchaseDto[]>([]);
  protected readonly showHelp = signal(false);

  protected branchId: number | null = null;
  protected warehouseId: number | null = null;
  protected companyId: number | null = null;
  protected supplierId: number | null = null;
  protected purchaseNo = '';
  protected supplierInvoiceNo = '';
  protected purchaseDate = new Date().toISOString().slice(0, 10);
  protected supplierInvoiceDate = '';
  protected paymentTypeID: number | null = null;
  protected paymentMethodID: number | null = null;
  protected remarks = '';
  protected editingId: number | null = null;
  protected saving = false;

  // advance payment
  protected payAmount = 0;
  protected payTypeID: number | null = null;
  protected payMethodID: number | null = null;
  protected payReferenceNo = '';
  protected payRemarks = '';

  // list search (Ctrl+F)
  protected searchText = '';
  protected selectedId: number | null = null;

  // product autocomplete state
  protected productOpen: number | null = null;
  protected productResults: LookupItem[] = [];
  protected productHi = 0;

  protected readonly items = signal<DraftItem[]>([]);

  // shortcut deregister functions (avoid duplicate handlers)
  private kbDeregs: (() => void)[] = [];

  constructor() {
    // React to "edit this purchase" / "new purchase" requests coming from the
    // Purchase workspace (list tab), so the entry opens in place.
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
          /* ignore missing record */
        }
      }
    });
  }

  async ngOnInit(): Promise<void> {
    this.canView.set(this.perm.has('purchases.view'));
    this.canManage.set(this.perm.has('purchases.manage'));
    this.registerShortcuts();
    if (this.canView()) {
      await this.refreshLookups();
      await this.loadList();
      // Standalone route (?id=) support; workspace requests are handled by the effect.
      const idParam = this.route.snapshot.queryParamMap.get('id');
      if (idParam && !this.hub.editRequest()) {
        try {
          const d = await this.svc.getById(Number(idParam));
          if (d) this.edit(d);
        } catch {
          /* ignore missing record */
        }
      }
    }
  }

  ngOnDestroy(): void {
    this.kbDeregs.forEach((d) => d());
    this.kbDeregs = [];
  }

  /* =========================================================
     Centralized shortcut registration (single source)
     ========================================================= */
  private registerShortcuts(): void {
    const reg = (cfg: Parameters<KeyboardShortcutService['register']>[0]) =>
      this.kbDeregs.push(this.kb.register(cfg));
    const G = 'Purchase Entry';

    // --- Global shortcuts (work even while typing) ---
    reg({ combo: 'ctrl+n', global: true, preventDefault: true, group: G, description: 'New Purchase', handler: () => this.newDoc() });
    reg({ combo: 'ctrl+s', global: true, preventDefault: true, group: G, description: 'Save Purchase', handler: () => this.save() });
    reg({ combo: 'ctrl+e', global: true, group: G, description: 'Edit selected Purchase', handler: () => this.editSelected() });
    reg({ combo: 'ctrl+d', global: true, preventDefault: true, group: G, description: 'Delete selected Purchase', handler: () => this.deleteSelected() });
    reg({ combo: 'ctrl+f', global: true, preventDefault: true, group: G, description: 'Search purchases', handler: () => this.focusSearch() });
    reg({ combo: 'ctrl+p', global: true, preventDefault: true, group: G, description: 'Print Purchase', handler: () => this.printPurchase() });
    reg({ combo: 'escape', global: true, group: G, description: 'Close popup / cancel', handler: (e) => this.onEscape(e) });
    reg({ combo: 'f6', global: true, group: G, description: 'Focus item grid', handler: () => this.focusGrid() });
    reg({ combo: 'f3', global: true, group: G, description: 'Product search', handler: () => this.openProductSearch() });
    reg({ combo: '?', global: true, group: G, description: 'Keyboard shortcuts help', handler: () => this.showHelp.update((v) => !v) });

    // --- Header Alt shortcuts (jump to field) ---
    reg({ combo: 'alt+s', group: G, description: 'Focus Supplier', handler: () => this.focusField('supplier') });
    reg({ combo: 'alt+c', group: G, description: 'Focus Company', handler: () => this.focusField('company') });
    reg({ combo: 'alt+b', group: G, description: 'Focus Branch', handler: () => this.focusField('branch') });
    reg({ combo: 'alt+w', group: G, description: 'Focus Warehouse', handler: () => this.focusField('warehouse') });
    reg({ combo: 'alt+d', group: G, description: 'Focus Purchase Date', handler: () => this.focusField('purchaseDate') });
    reg({ combo: 'alt+i', group: G, description: 'Focus Supplier Invoice No', handler: () => this.focusField('supplierInvoiceNo') });
    reg({ combo: 'alt+p', group: G, description: 'Focus Payment Type', handler: () => this.focusField('paymentType') });
    reg({ combo: 'alt+m', group: G, description: 'Focus Payment Method', handler: () => this.focusField('paymentMethod') });

    // --- Grid shortcuts (only act when focus is inside the grid) ---
    reg({ combo: 'insert', group: G, description: 'Add item row', handler: () => this.onInsertRow() });
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

  /* =========================================================
     Focus helpers
     ========================================================= */
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
    const rows = this.items().length;
    if (!rows) {
      this.newDoc();
      return;
    }
    // focus the currently focused grid cell if any, else first cell
    const cur = this.currentCell(document.activeElement);
    if (cur) this.focusCell(cur.row, cur.col);
    else this.focusCell(0, 0);
  }

  /* =========================================================
     Grid navigation
     ========================================================= */
  private onArrow(dir: 'up' | 'down' | 'left' | 'right', e: KeyboardEvent): void {
    if (this.productOpen !== null) {
      e.preventDefault();
      this.moveProductHi(dir === 'down' ? 1 : dir === 'up' ? -1 : 0);
      return;
    }
    const cell = this.currentCell(e.target);
    if (!cell) return;
    const rows = this.items().length;
    let { row, col } = cell;
    if (dir === 'up') row = Math.max(0, row - 1);
    else if (dir === 'down') row = Math.min(rows - 1, row + 1);
    else if (dir === 'left') col = Math.max(0, col - 1);
    else if (dir === 'right') col = Math.min(7, col + 1);
    e.preventDefault();
    this.focusCell(row, col);
  }

  private onHomeEnd(which: 'home' | 'end', e: KeyboardEvent): void {
    if (this.productOpen !== null) {
      this.closeProduct();
      return;
    }
    const cell = this.currentCell(e.target);
    if (!cell) return;
    e.preventDefault();
    this.focusCell(cell.row, which === 'home' ? 0 : 7);
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
      if (row > 0) return { row: row - 1, col: 7 };
      return null; // let native move out of grid
    }
    if (col < 7) return { row, col: col + 1 };
    if (row < rows - 1) return { row: row + 1, col: 0 };
    return { row, col: 7 }; // last cell
  }

  private onGridTab(e: KeyboardEvent, back: boolean): void {
    if (this.productOpen !== null) {
      this.closeProduct();
      return;
    }
    const cell = this.currentCell(e.target);
    if (!cell) return;
    const next = this.nextCell(cell.row, cell.col, back);
    if (!next) return; // first cell going back: allow native focus out
    e.preventDefault();
    this.closeProduct();
    this.focusCell(next.row, next.col);
  }

  private onEnter(e: KeyboardEvent): void {
    // 1) product dropdown open -> select highlighted
    if (this.productOpen !== null) {
      e.preventDefault();
      this.selectProductHighlighted();
      return;
    }
    // 2) inside grid -> confirm and advance
    const cell = this.currentCell(e.target);
    if (cell) {
      e.preventDefault();
      this.closeProduct();
      const rows = this.items().length;
      if (cell.col < 7) {
        this.focusCell(cell.row, cell.col + 1);
      } else if (cell.row < rows - 1) {
        this.focusCell(cell.row + 1, 0);
      } else {
        this.addItem();
        this.focusCell(cell.row + 1, 0);
      }
    }
  }

  private onInsertRow(): void {
    this.addItem();
    const r = this.items().length - 1;
    this.focusCell(r, 0);
  }

  private onDeleteRow(e: KeyboardEvent): void {
    const cell = this.currentCell(e.target);
    if (!cell) return;
    const target = e.target as HTMLInputElement;
    const val = target && 'value' in target ? (target.value ?? '') : '';
    // Only delete the row when on the product/unit cell or an empty cell,
    // so typing/deleting inside numeric cells still works normally.
    if (cell.col <= 1 || val === '') {
      e.preventDefault();
      this.removeItem(cell.row);
      const r = Math.max(0, cell.row - 1);
      if (this.items().length) this.focusCell(r, 0);
    }
  }

  /* =========================================================
     Product autocomplete
     ========================================================= */
  protected productLabel(it: DraftItem): string {
    if (it.productId != null) {
      const p = this.lookups()?.products.find((x) => x.id === it.productId);
      if (p) return `${p.name} (${p.code})`;
    }
    return it.productText ?? '';
  }

  protected openProduct(it: DraftItem, row: number): void {
    this.productOpen = row;
    this.productQuery(it);
  }

  protected onProductType(it: DraftItem, row: number, value: string): void {
    it.productText = value;
    if (value && it.productId != null) it.productId = null; // typing clears prior pick
    this.productOpen = row;
    this.productQuery(it);
  }

  private productQuery(it: DraftItem): void {
    const q = (it.productText ?? '').trim().toLowerCase();
    const all = this.lookups()?.products ?? [];
    this.productResults = q
      ? all.filter((p) => p.name?.toLowerCase().includes(q) || p.code?.toLowerCase().includes(q))
      : all.slice(0, 50);
    this.productHi = 0;
  }

  protected moveProductHi(delta: number): void {
    const n = this.productResults.length;
    if (!n) return;
    this.productHi = (this.productHi + delta + n) % n;
  }

  protected selectProduct(it: DraftItem, row: number, p: LookupItem): void {
    it.productId = p.id;
    it.productName = p.name;
    it.productText = `${p.name} (${p.code})`;
    this.closeProduct();
    this.focusCell(row, 1); // auto-advance to Unit
  }

  private selectProductHighlighted(): void {
    if (this.productOpen === null) return;
    const row = this.productOpen;
    const p = this.productResults[this.productHi];
    const it = this.items()[row];
    if (p && it) this.selectProduct(it, row, p);
  }

  protected closeProduct(): void {
    this.productOpen = null;
  }

  protected openProductSearch(): void {
    const cur = this.currentCell(document.activeElement);
    const row = cur ? cur.row : this.items().length ? 0 : -1;
    if (row < 0) {
      this.addItem();
      this.focusCell(0, 0);
      this.openProduct(this.items()[0], 0);
      return;
    }
    this.focusCell(row, 0);
    this.openProduct(this.items()[row], row);
  }

  protected onProductBlur(e: FocusEvent): void {
    const related = e.relatedTarget as HTMLElement | null;
    const current = e.currentTarget as HTMLElement | null;
    if (related && current?.contains(related)) return; // moving within dropdown
    this.closeProduct();
  }

  /* =========================================================
     Global action handlers
     ========================================================= */
  private onEscape(e: KeyboardEvent): void {
    if (this.productOpen !== null) {
      this.closeProduct();
      return;
    }
    if (this.showHelp()) {
      this.showHelp.set(false);
      return;
    }
    if (this.editingId !== null || this.items().length) {
      this.resetForm();
    }
  }

  protected focusSearch(): void {
    const node = (this.el.nativeElement as HTMLElement).querySelector('[data-field="search"]') as HTMLInputElement | null;
    node?.focus();
    node?.select();
  }

  private editSelected(): void {
    let target = this.editingId;
    if (!target) target = this.selectedId;
    if (!target && this.purchases().length) target = this.purchases()[0].purchaseId;
    const rec = this.purchases().find((p) => p.purchaseId === target);
    if (rec) this.edit(rec);
    else this.toast.error('No purchase selected');
  }

  private deleteSelected(): void {
    let target = this.editingId ?? this.selectedId;
    if (!target && this.purchases().length) target = this.purchases()[0].purchaseId;
    const rec = this.purchases().find((p) => p.purchaseId === target);
    if (!rec) {
      this.toast.error('No purchase selected');
      return;
    }
    if (confirm('Delete this purchase? This cannot be undone.')) {
      void this.remove(rec);
    }
  }

  private printPurchase(): void {
    if (this.editingId === null && !this.items().length) {
      this.toast.error('Open a purchase to print');
      return;
    }
    window.print();
  }

  /* =========================================================
     Data loading (unchanged behaviour)
     ========================================================= */
  private async refreshLookups(): Promise<void> {
    this.lookups.set(await this.svc.getLookups());
  }

  private async loadList(): Promise<void> {
    try {
      this.loading.set(true);
      const p = await this.svc.getPaged(1, 50, '');
      this.purchases.set(p.items ?? []);
    } catch (e: any) {
      this.toast.error('Failed to load purchases', e?.error?.message ?? e?.message ?? '');
    } finally {
      this.loading.set(false);
    }
  }

  protected filteredPurchases(): PurchaseDto[] {
    const q = this.searchText.trim().toLowerCase();
    if (!q) return this.purchases();
    return this.purchases().filter(
      (p) =>
        p.purchaseNumber.toLowerCase().includes(q) ||
        (p.supplierNameSnapshot ?? '').toLowerCase().includes(q) ||
        (p.companyNameSnapshot ?? '').toLowerCase().includes(q),
    );
  }

  protected selectRow(p: PurchaseDto): void {
    this.selectedId = p.purchaseId;
  }

  protected async newDoc(): Promise<void> {
    this.editingId = null;
    this.branchId = this.lookups()?.branches?.[0]?.id ?? null;
    this.warehouseId = this.lookups()?.warehouses?.[0]?.id ?? null;
    this.companyId = this.lookups()?.currentCompanyId ?? this.lookups()?.companies?.[0]?.id ?? null;
    this.supplierId = null;
    this.purchaseNo = '';
    this.supplierInvoiceNo = '';
    this.supplierInvoiceDate = '';
    this.paymentTypeID = null;
    this.paymentMethodID = null;
    this.remarks = '';
    this.payAmount = 0;
    this.payTypeID = null;
    this.payMethodID = null;
    this.payReferenceNo = '';
    this.payRemarks = '';
    await this.refreshLookups();
    try {
      this.purchaseNo = await this.svc.getNextNumber();
    } catch {
      this.purchaseNo = '';
    }
    this.items.set([this.blankItem()]);
  }

  protected blankItem(): DraftItem {
    return {
      productId: null,
      unitID: null,
      quantity: 1,
      freeQuantity: 0,
      purchaseRate: 0,
      mrp: null,
      retailPrice: null,
      wholesalePrice: null,
      saleRate: null,
      discountPercentage: 0,
      gstRate: 0,
      cgstRate: 0,
      sgstRate: 0,
      igstRate: 0,
      cessRate: 0,
      remarks: null,
    };
  }

  protected addItem(): void {
    this.items.update((i) => [...i, this.blankItem()]);
  }

  protected removeItem(idx: number): void {
    this.items.update((i) => i.filter((_, n) => n !== idx));
  }

  protected onProductPick(it: DraftItem): void {
    const p = this.lookups()?.products.find((x) => x.id === it.productId);
    it.productName = p?.name ?? null;
  }

  protected lineBase(it: DraftItem): number {
    return (it.quantity || 0) * (it.purchaseRate || 0);
  }
  protected lineDisc(it: DraftItem): number {
    return this.lineBase(it) * (it.discountPercentage || 0) / 100;
  }
  protected lineTaxable(it: DraftItem): number {
    return Math.round((this.lineBase(it) - this.lineDisc(it)) * 100) / 100;
  }
  protected lineGst(it: DraftItem): number {
    return Math.round(this.lineTaxable(it) * (it.gstRate || 0) / 100 * 100) / 100;
  }
  protected lineCess(it: DraftItem): number {
    return Math.round(this.lineTaxable(it) * (it.cessRate || 0) / 100 * 100) / 100;
  }
  protected lineTotal(it: DraftItem): number {
    return Math.round((this.lineTaxable(it) + this.lineGst(it) + this.lineCess(it)) * 100) / 100;
  }

  protected get totalGross(): number {
    return Math.round(this.items().reduce((s, it) => s + this.lineBase(it), 0) * 100) / 100;
  }
  protected get totalDiscount(): number {
    return Math.round(this.items().reduce((s, it) => s + this.lineDisc(it), 0) * 100) / 100;
  }
  protected get taxable(): number {
    return Math.round(this.items().reduce((s, it) => s + this.lineTaxable(it), 0) * 100) / 100;
  }
  protected get totalTax(): number {
    return Math.round(this.items().reduce((s, it) => s + this.lineGst(it), 0) * 100) / 100;
  }
  protected get totalCess(): number {
    return Math.round(this.items().reduce((s, it) => s + this.lineCess(it), 0) * 100) / 100;
  }
  protected get grandTotal(): number {
    return Math.round((this.taxable + this.totalTax + this.totalCess) * 100) / 100;
  }

  private toItems(): CreatePurchaseItemInput[] {
    return this.items().map((it) => ({
      productId: it.productId!,
      unitID: it.unitID!,
      quantity: it.quantity,
      freeQuantity: it.freeQuantity || 0,
      purchaseRate: it.purchaseRate,
      mrp: it.mrp ?? null,
      retailPrice: it.retailPrice ?? null,
      wholesalePrice: it.wholesalePrice ?? null,
      saleRate: it.saleRate ?? null,
      discountPercentage: it.discountPercentage || 0,
      gstRate: it.gstRate || 0,
      cgstRate: it.cgstRate || 0,
      sgstRate: it.sgstRate || 0,
      igstRate: it.igstRate || 0,
      cessRate: it.cessRate || 0,
      remarks: it.remarks ?? null,
    }));
  }

  private toRequest(): CreatePurchaseRequest {
    const req: CreatePurchaseRequest = {
      branchId: this.branchId!,
      warehouseId: this.warehouseId!,
      supplierId: this.supplierId!,
      companyId: this.companyId ?? 0,
      purchaseNumber: this.purchaseNo,
      purchaseDate: this.purchaseDate,
      supplierInvoiceNumber: this.supplierInvoiceNo || null,
      supplierInvoiceDate: this.supplierInvoiceDate || null,
      paymentTypeID: this.paymentTypeID ?? null,
      paymentMethodID: this.paymentMethodID ?? null,
      remarks: this.remarks || null,
      items: this.toItems(),
      payment: null,
    };
    if (this.payAmount > 0) {
      const pay: CreatePurchasePaymentInput = {
        amount: this.payAmount,
        paymentTypeID: this.payTypeID ?? this.paymentTypeID ?? null,
        paymentMethodID: this.payMethodID ?? this.paymentMethodID ?? null,
        referenceNo: this.payReferenceNo || null,
        remarks: this.payRemarks || null,
      };
      req.payment = pay;
    }
    return req;
  }

  /** Blocking validation: focuses the first invalid control and returns null when valid. */
  private validate(): string | null {
    if (!this.companyId) {
      this.focusField('company');
      this.toast.error('Company is required');
      return 'company';
    }
    if (!this.supplierId) {
      this.focusField('supplier');
      this.toast.error('Supplier is required');
      return 'supplier';
    }
    if (!this.branchId) {
      this.focusField('branch');
      this.toast.error('Branch is required');
      return 'branch';
    }
    if (!this.warehouseId) {
      this.focusField('warehouse');
      this.toast.error('Warehouse is required');
      return 'warehouse';
    }
    if (!this.items().length) {
      this.toast.error('Add at least one item');
      this.focusGrid();
      return 'grid';
    }
    for (let i = 0; i < this.items().length; i++) {
      const it = this.items()[i];
      if (!it.productId) {
        this.focusCell(i, 0);
        this.toast.error(`Product is required on row ${i + 1}`);
        return 'grid';
      }
      if (!it.unitID) {
        this.focusCell(i, 1);
        this.toast.error(`Unit is required on row ${i + 1}`);
        return 'grid';
      }
      if (!(it.quantity > 0)) {
        this.focusCell(i, 2);
        this.toast.error(`Quantity must be greater than 0 on row ${i + 1}`);
        return 'grid';
      }
    }
    return null;
  }

  protected async save(): Promise<void> {
    if (this.saving) return; // guard against repeated Ctrl+S
    if (!this.canManage()) return;
    if (this.validate() !== null) return;
    this.saving = true;
    try {
      const req = this.toRequest();
      if (this.editingId) {
        const up: UpdatePurchaseRequest = {
          branchId: req.branchId,
          warehouseId: req.warehouseId,
          supplierId: req.supplierId,
          companyId: req.companyId,
          purchaseNumber: req.purchaseNumber,
          purchaseDate: req.purchaseDate,
          supplierInvoiceNumber: req.supplierInvoiceNumber,
          supplierInvoiceDate: req.supplierInvoiceDate,
          paymentTypeID: req.paymentTypeID,
          paymentMethodID: req.paymentMethodID,
          remarks: req.remarks,
          items: req.items,
        };
        await this.svc.update(this.editingId, up);
      } else {
        await this.svc.create(req);
      }
      this.toast.success('Purchase saved');
      await this.loadList();
      this.resetForm();
    } catch (e: any) {
      this.toast.error('Failed to save', e?.error?.message ?? e?.message ?? '');
    } finally {
      this.saving = false;
    }
  }

  protected async edit(p: PurchaseDto): Promise<void> {
    await this.refreshLookups();
    this.editingId = p.purchaseId;
    this.branchId = p.branchId;
    this.warehouseId = p.warehouseId;
    this.companyId = p.companyId ?? null;
    this.supplierId = p.supplierId;
    this.purchaseNo = p.purchaseNumber;
    this.supplierInvoiceNo = p.supplierInvoiceNumber ?? '';
    this.purchaseDate = p.purchaseDate ? p.purchaseDate.slice(0, 10) : this.purchaseDate;
    this.supplierInvoiceDate = p.supplierInvoiceDate ? p.supplierInvoiceDate.slice(0, 10) : '';
    this.paymentTypeID = p.paymentTypeID ?? null;
    this.paymentMethodID = p.paymentMethodID ?? null;
    this.remarks = p.remarks ?? '';
    this.items.set(
      p.items.map((i) => ({
        productId: i.productId,
        unitID: i.unitID,
        productName: i.productNameSnapshot ?? null,
        productText: i.productNameSnapshot ?? null,
        quantity: i.quantity,
        freeQuantity: i.freeQuantity,
        purchaseRate: i.purchaseRate,
        mrp: i.mrp ?? null,
        retailPrice: i.retailPrice ?? null,
        wholesalePrice: i.wholesalePrice ?? null,
        saleRate: i.saleRate ?? null,
        discountPercentage: i.discountPercentage,
        gstRate: i.gstRate,
        cgstRate: i.cgstRate,
        sgstRate: i.sgstRate,
        igstRate: i.igstRate,
        cessRate: i.cessRate,
        remarks: i.remarks ?? null,
      })),
    );
  }

  protected async remove(p: PurchaseDto): Promise<void> {
    if (!confirm('Delete this purchase?')) return;
    try {
      await this.svc.delete(p.purchaseId);
      this.toast.success('Purchase deleted');
      if (this.selectedId === p.purchaseId) this.selectedId = null;
      await this.loadList();
    } catch (e: any) {
      this.toast.error('Failed to delete', e?.error?.message ?? e?.message ?? '');
    }
  }

  protected resetForm(): void {
    this.editingId = null;
    this.branchId = null;
    this.warehouseId = null;
    this.companyId = null;
    this.supplierId = null;
    this.purchaseNo = '';
    this.supplierInvoiceNo = '';
    this.supplierInvoiceDate = '';
    this.paymentTypeID = null;
    this.paymentMethodID = null;
    this.remarks = '';
    this.payAmount = 0;
    this.payTypeID = null;
    this.payMethodID = null;
    this.payReferenceNo = '';
    this.payRemarks = '';
    this.items.set([]);
  }

  protected readonly trackByIndex = (i: number): number => i;
}
