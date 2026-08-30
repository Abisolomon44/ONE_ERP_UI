import { Component, OnInit, inject, signal, computed, viewChild, ElementRef, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
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
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cessRate: number;
  remarks?: string | null;
}

interface PurchaseTab {
  tabId: number;
  label: string;
  isDirty: boolean;
  isSaved: boolean;
  editingId: number | null;
  purchaseNumber: string;
  supplierId: number | null;
  companyId: number | null;
  branchId: number | null;
  warehouseId: number | null;
  supplierInvoiceNo: string;
  supplierPoNo: string;
  purchaseDate: string;
  supplierInvoiceDate: string;
  source: string;
  referenceNo: string;
  currencyId: string;
  priceListId: string;
  taxType: string;
  purchaseType: string;
  contactNo: string;
  paymentTypeID: number | null;
  paymentMethodID: number | null;
  remarks: string;
  payAmount: number;
  payTypeID: number | null;
  payMethodID: number | null;
  payReferenceNo: string;
  payRemarks: string;
  items: DraftItem[];
}

const CURRENCIES = [
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'AED', name: 'UAE Dirham' },
  { code: 'SAR', name: 'Saudi Riyal' },
];

@Component({
  selector: 'app-purchase-entry',
  standalone: true,
  imports: [FormsModule, DecimalPipe, LucideAngularModule],
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

  private readonly itemsBody = viewChild<ElementRef<HTMLElement>>('itemsBody');
  private readonly importInput = viewChild<ElementRef<HTMLInputElement>>('importInput');

  protected readonly canView = signal(false);
  protected readonly canManage = signal(false);
  protected readonly loading = signal(false);
  protected readonly lookups = signal<PurchaseLookupsDto | null>(null);
  protected readonly showHelp = signal(false);

  protected readonly currencies = CURRENCIES;

  // Multi-tab state.
  protected readonly tabs = signal<PurchaseTab[]>([]);
  protected readonly activeTabId = signal<number | null>(null);
  private nextTabId = 1;

  protected readonly activeTab = computed<PurchaseTab | null>(
    () => this.tabs().find((t) => t.tabId === this.activeTabId()) ?? null,
  );

  // product autocomplete state
  protected productOpen: number | null = null;
  protected productResults: LookupItem[] = [];
  protected productHi = 0;

  private kbDeregs: (() => void)[] = [];

  constructor() {
    effect(async () => {
      const req = this.hub.editRequest();
      if (!req || !this.canView()) return;
      if (req.id == null) {
        this.newDoc();
      } else {
        try {
          const d = await this.svc.getById(req.id);
          if (d) this.openTab(d);
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
      this.ensureTab();
      const idParam = this.route.snapshot.queryParamMap.get('id');
      if (idParam && !this.hub.editRequest()) {
        try {
          const d = await this.svc.getById(Number(idParam));
          if (d) this.openTab(d);
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
     Tabs
     ========================================================= */
  protected ensureTab(): PurchaseTab {
    let tab = this.activeTab();
    if (!tab) {
      tab = this.newTab();
    }
    return tab;
  }

  protected newDoc(): void {
    if (!this.canManage()) return;
    this.newTab();
  }

  private newTab(): PurchaseTab {
    const t = this.buildTab(null);
    this.tabs.update((arr) => [...arr, t]);
    this.activeTabId.set(t.tabId);
    void this.refreshTabNumber(t);
    return t;
  }

  private buildTab(editingId: number | null): PurchaseTab {
    const lookups = this.lookups();
    return {
      tabId: this.nextTabId++,
      label: 'Purchase',
      isDirty: false,
      isSaved: editingId != null,
      editingId,
      purchaseNumber: '',
      branchId: lookups?.branches?.[0]?.id ?? null,
      warehouseId: lookups?.warehouses?.[0]?.id ?? null,
      companyId: lookups?.currentCompanyId ?? lookups?.companies?.[0]?.id ?? null,
      supplierId: null,
      supplierInvoiceNo: '',
      supplierPoNo: '',
      purchaseDate: new Date().toISOString().slice(0, 10),
      supplierInvoiceDate: '',
      source: 'Purchase',
      referenceNo: '',
      currencyId: 'INR',
      priceListId: '',
      taxType: '',
      purchaseType: '',
      contactNo: '',
      paymentTypeID: null,
      paymentMethodID: null,
      remarks: '',
      payAmount: 0,
      payTypeID: null,
      payMethodID: null,
      payReferenceNo: '',
      payRemarks: '',
      items: [this.blankItem()],
    };
  }

  private async refreshTabNumber(tab: PurchaseTab): Promise<void> {
    try {
      tab.purchaseNumber = await this.svc.getNextNumber();
      this.relabelTab(tab);
    } catch {
      tab.purchaseNumber = '';
    }
  }

  private relabelTab(tab: PurchaseTab): void {
    const no = tab.purchaseNumber ? `#${tab.purchaseNumber}` : `#${tab.tabId}`;
    tab.label = `${no}${tab.isDirty ? ' *' : ''}`;
    this.tabs.update((arr) => [...arr]);
  }

  protected switchTab(tabId: number): void {
    this.closeProduct();
    this.activeTabId.set(tabId);
  }

  protected closeTab(tabId: number, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.closeProduct();
    const tab = this.tabs().find((t) => t.tabId === tabId);
    if (tab?.isDirty && !confirm('Discard unsaved changes on this purchase?')) return;
    const remaining = this.tabs().filter((t) => t.tabId !== tabId);
    this.tabs.set(remaining);
    if (this.activeTabId() === tabId) {
      if (!remaining.length) this.newTab();
      else this.activeTabId.set(remaining[remaining.length - 1].tabId);
    }
  }

  protected closeActivePurchase(): void {
    const tab = this.activeTab();
    if (!tab) return;
    this.closeTab(tab.tabId, new Event('click'));
  }

  protected markDirty(): void {
    const tab = this.activeTab();
    if (!tab || tab.editingId != null) return;
    if (!tab.isDirty) {
      tab.isDirty = true;
      this.relabelTab(tab);
    }
  }

  /* =========================================================
     Shortcuts
     ========================================================= */
  private registerShortcuts(): void {
    const reg = (cfg: Parameters<KeyboardShortcutService['register']>[0]) =>
      this.kbDeregs.push(this.kb.register(cfg));
    const G = 'Purchase Entry';

    reg({ combo: 'ctrl+n', global: true, preventDefault: true, group: G, description: 'New Purchase', handler: () => this.newDoc() });
    reg({ combo: 'ctrl+s', global: true, preventDefault: true, group: G, description: 'Save Purchase', handler: () => this.save() });
    reg({ combo: 'ctrl+tab', global: true, preventDefault: true, group: G, description: 'Next tab', handler: () => this.moveTab(1) });
    reg({ combo: 'ctrl+shift+tab', global: true, preventDefault: true, group: G, description: 'Previous tab', handler: () => this.moveTab(-1) });
    reg({ combo: 'escape', global: true, group: G, description: 'Close popup / cancel', handler: (e) => this.onEscape(e) });
    reg({ combo: 'f6', global: true, group: G, description: 'Focus item grid', handler: () => this.focusGrid() });
    reg({ combo: 'f3', global: true, group: G, description: 'Product search', handler: () => this.openProductSearch() });
    reg({ combo: '?', global: true, group: G, description: 'Keyboard shortcuts help', handler: () => this.showHelp.update((v) => !v) });

    reg({ combo: 'alt+s', group: G, description: 'Focus Supplier', handler: () => this.focusField('supplier') });
    reg({ combo: 'alt+c', group: G, description: 'Focus Company', handler: () => this.focusField('company') });
    reg({ combo: 'alt+b', group: G, description: 'Focus Branch', handler: () => this.focusField('branch') });
    reg({ combo: 'alt+w', group: G, description: 'Focus Warehouse', handler: () => this.focusField('warehouse') });
    reg({ combo: 'alt+d', group: G, description: 'Focus Purchase Date', handler: () => this.focusField('purchaseDate') });
    reg({ combo: 'alt+i', group: G, description: 'Focus Supplier Invoice No', handler: () => this.focusField('supplierInvoiceNo') });
    reg({ combo: 'alt+p', group: G, description: 'Focus Payment Type', handler: () => this.focusField('paymentType') });
    reg({ combo: 'alt+m', group: G, description: 'Focus Payment Method', handler: () => this.focusField('paymentMethod') });

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

  private moveTab(delta: number): void {
    const arr = this.tabs();
    if (!arr.length) return;
    const idx = arr.findIndex((t) => t.tabId === this.activeTabId());
    const next = (idx + delta + arr.length) % arr.length;
    this.switchTab(arr[next].tabId);
  }

  protected focusField(name: string): void {
    const node = (this.el.nativeElement as HTMLElement).querySelector(`[data-field="${name}"]`) as HTMLElement | null;
    node?.focus();
  }

  /* =========================================================
     Grid cell helpers
     ========================================================= */
  private cellSelector(row: number, col: number): string {
    return `input[data-row="${row}"][data-col="${col}"], select[data-row="${row}"][data-col="${col}"]`;
  }

  private itemsOf(tab: PurchaseTab | null): DraftItem[] {
    return tab?.items ?? [];
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
    const tab = this.activeTab();
    if (!tab) {
      this.newTab();
      return;
    }
    if (!tab.items.length) tab.items.push(this.blankItem());
    const cur = this.currentCell(document.activeElement);
    if (cur) this.focusCell(cur.row, cur.col);
    else this.focusCell(0, 0);
  }

  private onArrow(dir: 'up' | 'down' | 'left' | 'right', e: KeyboardEvent): void {
    if (this.productOpen !== null) {
      e.preventDefault();
      this.moveProductHi(dir === 'down' ? 1 : dir === 'up' ? -1 : 0);
      return;
    }
    const cell = this.currentCell(e.target);
    if (!cell) return;
    const items = this.itemsOf(this.activeTab());
    const rows = items.length;
    let { row, col } = cell;
    if (dir === 'up') row = Math.max(0, row - 1);
    else if (dir === 'down') row = Math.min(rows - 1, row + 1);
    else if (dir === 'left') col = Math.max(0, col - 1);
    else if (dir === 'right') col = Math.min(8, col + 1);
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
    this.focusCell(cell.row, which === 'home' ? 0 : 8);
  }

  private onCtrlArrow(dir: 'up' | 'down', e: KeyboardEvent): void {
    const cell = this.currentCell(e.target);
    if (!cell) return;
    const rows = this.itemsOf(this.activeTab()).length;
    e.preventDefault();
    this.focusCell(dir === 'up' ? 0 : Math.max(0, rows - 1), cell.col);
  }

  private nextCell(row: number, col: number, back: boolean, rows: number): { row: number; col: number } | null {
    if (!rows) return null;
    if (back) {
      if (col > 0) return { row, col: col - 1 };
      if (row > 0) return { row: row - 1, col: 8 };
      return null;
    }
    if (col < 8) return { row, col: col + 1 };
    if (row < rows - 1) return { row: row + 1, col: 0 };
    return { row, col: 8 };
  }

  private onGridTab(e: KeyboardEvent, back: boolean): void {
    if (this.productOpen !== null) {
      this.closeProduct();
      return;
    }
    const cell = this.currentCell(e.target);
    if (!cell) return;
    const next = this.nextCell(cell.row, cell.col, back, this.itemsOf(this.activeTab()).length);
    if (!next) return;
    e.preventDefault();
    this.closeProduct();
    this.focusCell(next.row, next.col);
  }

  private onEnter(e: KeyboardEvent): void {
    if (this.productOpen !== null) {
      e.preventDefault();
      this.selectProductHighlighted();
      return;
    }
    const cell = this.currentCell(e.target);
    if (cell) {
      e.preventDefault();
      this.closeProduct();
      const items = this.itemsOf(this.activeTab());
      const rows = items.length;
      if (cell.col < 8) {
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
    const tab = this.ensureTab();
    const r = tab.items.length;
    this.addItem();
    this.focusCell(r, 0);
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
      if (this.itemsOf(this.activeTab()).length) this.focusCell(r, 0);
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
    if (value && it.productId != null) it.productId = null;
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
    this.focusCell(row, 1);
  }

  private selectProductHighlighted(): void {
    if (this.productOpen === null) return;
    const row = this.productOpen;
    const p = this.productResults[this.productHi];
    const it = this.activeTab()?.items[row];
    if (p && it) this.selectProduct(it, row, p);
  }

  protected closeProduct(): void {
    this.productOpen = null;
  }

  protected openProductSearch(): void {
    const tab = this.ensureTab();
    const cur = this.currentCell(document.activeElement);
    const row = cur ? cur.row : tab.items.length ? 0 : -1;
    if (row < 0) {
      this.addItem();
      this.focusCell(0, 0);
      this.openProduct(tab.items[0], 0);
      return;
    }
    this.focusCell(row, 0);
    this.openProduct(tab.items[row], row);
  }

  protected onProductBlur(e: FocusEvent): void {
    const related = e.relatedTarget as HTMLElement | null;
    const current = e.currentTarget as HTMLElement | null;
    if (related && current?.contains(related)) return;
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
    const tab = this.activeTab();
    if (tab && (tab.editingId !== null || tab.items.length)) {
      this.closeTab(tab.tabId, new Event('click'));
    }
  }

  /* =========================================================
     Data loading
     ========================================================= */
  private async refreshLookups(): Promise<void> {
    this.lookups.set(await this.svc.getLookups());
  }

  /* =========================================================
     Tab lifecycle: new / edit / save / remove
     ========================================================= */
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
      cgstRate: 0,
      sgstRate: 0,
      igstRate: 0,
      cessRate: 0,
      remarks: null,
    };
  }

  protected addItem(): void {
    const tab = this.ensureTab();
    tab.items.push(this.blankItem());
    this.markDirty();
    this.tabs.update((arr) => [...arr]);
  }

  protected removeItem(idx: number): void {
    const tab = this.activeTab();
    if (!tab) return;
    tab.items = tab.items.filter((_, n) => n !== idx);
    this.tabs.update((arr) => [...arr]);
  }

  private openTab(p: PurchaseDto): void {
    const t = this.buildTab(p.purchaseId);
    t.companyId = p.companyId ?? null;
    t.branchId = p.branchId;
    t.warehouseId = p.warehouseId;
    t.supplierId = p.supplierId;
    t.purchaseNumber = p.purchaseNumber;
    t.supplierInvoiceNo = p.supplierInvoiceNumber ?? '';
    t.purchaseDate = p.purchaseDate ? p.purchaseDate.slice(0, 10) : t.purchaseDate;
    t.supplierInvoiceDate = p.supplierInvoiceDate ? p.supplierInvoiceDate.slice(0, 10) : '';
    t.paymentTypeID = p.paymentTypeID ?? null;
    t.paymentMethodID = p.paymentMethodID ?? null;
    t.remarks = p.remarks ?? '';
    t.items = p.items.map((i) => ({
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
      cgstRate: i.cgstRate,
      sgstRate: i.sgstRate,
      igstRate: i.igstRate,
      cessRate: i.cessRate,
      remarks: i.remarks ?? null,
    }));
    t.label = `#${t.purchaseNumber}`;
    this.tabs.update((arr) => [...arr, t]);
    this.activeTabId.set(t.tabId);
  }

  private lineBase(it: DraftItem): number {
    return (it.quantity || 0) * (it.purchaseRate || 0);
  }
  private lineDisc(it: DraftItem): number {
    return (this.lineBase(it) * (it.discountPercentage || 0)) / 100;
  }
  protected lineTaxable(it: DraftItem): number {
    return round2(this.lineBase(it) - this.lineDisc(it));
  }
  protected lineCgst(it: DraftItem): number {
    return round2((this.lineTaxable(it) * (it.cgstRate || 0)) / 100);
  }
  protected lineSgst(it: DraftItem): number {
    return round2((this.lineTaxable(it) * (it.sgstRate || 0)) / 100);
  }
  protected lineIgst(it: DraftItem): number {
    return round2((this.lineTaxable(it) * (it.igstRate || 0)) / 100);
  }
  protected lineCess(it: DraftItem): number {
    return round2((this.lineTaxable(it) * (it.cessRate || 0)) / 100);
  }
  protected lineTotal(it: DraftItem): number {
    return round2(this.lineTaxable(it) + this.lineCgst(it) + this.lineSgst(it) + this.lineIgst(it) + this.lineCess(it));
  }

  private itemsSum(fn: (it: DraftItem) => number): number {
    const tab = this.activeTab();
    if (!tab) return 0;
    return round2(tab.items.reduce((s, it) => s + fn(it), 0));
  }
  protected get totalGross(): number {
    return this.itemsSum((it) => this.lineBase(it));
  }
  protected get totalDiscount(): number {
    return this.itemsSum((it) => this.lineDisc(it));
  }
  protected get taxable(): number {
    return this.itemsSum((it) => this.lineTaxable(it));
  }
  protected get totalCgst(): number {
    return this.itemsSum((it) => this.lineCgst(it));
  }
  protected get totalSgst(): number {
    return this.itemsSum((it) => this.lineSgst(it));
  }
  protected get totalIgst(): number {
    return this.itemsSum((it) => this.lineIgst(it));
  }
  protected get totalCess(): number {
    return this.itemsSum((it) => this.lineCess(it));
  }
  protected get grandTotal(): number {
    return round2(this.taxable + this.totalCgst + this.totalSgst + this.totalIgst + this.totalCess);
  }

  private toItems(tab: PurchaseTab): CreatePurchaseItemInput[] {
    return tab.items.map((it) => ({
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
      gstRate: (it.cgstRate || 0) + (it.sgstRate || 0),
      cgstRate: it.cgstRate || 0,
      sgstRate: it.sgstRate || 0,
      igstRate: it.igstRate || 0,
      cessRate: it.cessRate || 0,
      remarks: it.remarks ?? null,
    }));
  }

  private toRequest(tab: PurchaseTab): CreatePurchaseRequest {
    return {
      branchId: tab.branchId!,
      warehouseId: tab.warehouseId!,
      supplierId: tab.supplierId!,
      companyId: tab.companyId ?? 0,
      purchaseNumber: tab.purchaseNumber,
      purchaseDate: tab.purchaseDate,
      supplierInvoiceNumber: tab.supplierInvoiceNo || null,
      supplierInvoiceDate: tab.supplierInvoiceDate || null,
      paymentTypeID: tab.paymentTypeID ?? null,
      paymentMethodID: tab.paymentMethodID ?? null,
      remarks: tab.remarks || null,
      items: this.toItems(tab),
      payment: null,
    };
  }

  private validate(tab: PurchaseTab): string | null {
    if (!tab.companyId) {
      this.focusField('company');
      this.toast.error('Company is required');
      return 'company';
    }
    if (!tab.supplierId) {
      this.focusField('supplier');
      this.toast.error('Supplier is required');
      return 'supplier';
    }
    if (!tab.branchId) {
      this.focusField('branch');
      this.toast.error('Branch is required');
      return 'branch';
    }
    if (!tab.warehouseId) {
      this.focusField('warehouse');
      this.toast.error('Warehouse is required');
      return 'warehouse';
    }
    if (!tab.items.length) {
      this.toast.error('Add at least one item');
      this.focusGrid();
      return 'grid';
    }
    for (let i = 0; i < tab.items.length; i++) {
      const it = tab.items[i];
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
    const tab = this.activeTab();
    if (!tab) return;
    if (this.saving) return;
    if (!this.canManage()) return;
    if (this.validate(tab) !== null) return;
    this.saving = true;
    try {
      const req = this.toRequest(tab);
      if (tab.editingId) {
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
        await this.svc.update(tab.editingId, up);
      } else {
        await this.svc.create(req);
      }
      this.toast.success('Purchase saved');
      tab.isSaved = true;
      tab.isDirty = false;
      this.relabelTab(tab);
      this.newTab();
    } catch (e: any) {
      this.toast.error('Failed to save', e?.error?.message ?? e?.message ?? '');
    } finally {
      this.saving = false;
    }
  }

  /* =========================================================
     CSV Import
     ========================================================= */
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

    for (const r of data) {
      if (r.every((c) => !c.trim())) continue;
      const get = (f: string): string => (map[f] >= 0 ? (r[map[f]] ?? '').trim() : '');
      const pval = get('product');
      const prod = this.matchProduct(products, pval);
      if (!prod) {
        skipped.push(`"${pval || '(blank)'}": product not found`);
        continue;
      }
      const unit = this.matchUnit(units, get('unit'));
      const it = this.blankItem();
      it.productId = prod.id;
      it.productName = prod.name;
      it.productText = `${prod.name} (${prod.code})`;
      it.unitID = unit ? unit.id : null;
      it.quantity = this.num(get('qty')) || 1;
      it.freeQuantity = this.num(get('free'));
      it.purchaseRate = this.num(get('rate'));
      it.discountPercentage = this.num(get('disc'));
      const gst = this.num(get('gst'));
      it.cgstRate = gst / 2;
      it.sgstRate = gst / 2;
      it.cessRate = this.num(get('cess'));
      imported.push(it);
    }

    if (!imported.length) {
      this.toast.error('No valid rows imported', skipped[0] ?? '');
      return;
    }
    const tab = this.ensureTab();
    tab.items = tab.items.length ? [...tab.items, ...imported] : imported;
    this.tabs.update((arr) => [...arr]);
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
      rate: ['rate', 'price', 'purchaserate', 'purchase rate'],
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

  private matchProduct(products: LookupItem[], val: string): LookupItem | undefined {
    const v = val.trim().toLowerCase();
    if (!v) return undefined;
    return (
      products.find((p) => (p.code ?? '').toLowerCase() === v) ||
      products.find((p) => (p.name ?? '').toLowerCase() === v) ||
      products.find((p) => (p.name ?? '').toLowerCase().includes(v) || (p.code ?? '').toLowerCase().includes(v))
    );
  }

  private matchUnit(units: LookupItem[], val: string): LookupItem | undefined {
    const v = val.trim().toLowerCase();
    if (!v) return undefined;
    return (
      units.find((u) => (u.code ?? '').toLowerCase() === v) ||
      units.find((u) => (u.name ?? '').toLowerCase() === v) ||
      units.find((u) => (u.name ?? '').toLowerCase().includes(v) || (u.code ?? '').toLowerCase().includes(v))
    );
  }

  private num(v: string): number {
    const n = parseFloat((v ?? '').replace(/,/g, ''));
    return isFinite(n) ? n : 0;
  }

  private parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let inQuotes = false;
    const src = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    for (let i = 0; i < src.length; i++) {
      const c = src[i];
      if (inQuotes) {
        if (c === '"') {
          if (src[i + 1] === '"') {
            field += '"';
            i++;
          } else inQuotes = false;
        } else field += c;
      } else if (c === '"') inQuotes = true;
      else if (c === ',') {
        row.push(field);
        field = '';
      } else if (c === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else field += c;
    }
    row.push(field);
    rows.push(row);
    return rows.map((r) => r.map((c) => c.trim()));
  }

  protected readonly trackByIndex = (i: number): number => i;
  protected saving = false;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
