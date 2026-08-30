import { Component, OnInit, inject, signal, viewChild, ElementRef, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
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
import { ToastService } from '../../core/services/toast.service';
import { PermissionService } from '../../core/services/permission.service';
import { KeyboardShortcutService } from '../../core/keyboard/keyboard-shortcut.service';
import { SalesHubService } from '../../core/sales-hub.service';

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
  customerPoNo: string;
  salesperson: string;
  invoiceDate: string;
  referenceNo: string;
  referenceDate: string;
  sourceType: string;
  paymentTypeID: number | null;
  paymentMethodID: number | null;
  remarks: string;
  payAmount: number;
  payTypeID: number | null;
  payMethodID: number | null;
  payReferenceNo: string;
  payRemarks: string;
  items: DraftItem[];
  isDirty: boolean;
  isSaved: boolean;
}

@Component({
  selector: 'app-sales-entry',
  standalone: true,
  imports: [FormsModule, DecimalPipe, LucideAngularModule],
  templateUrl: './sales-entry.html',
  styleUrl: './sales-entry.css',
})
export class SalesEntryPage implements OnInit {
  private readonly svc = inject(SalesService);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);
  private readonly route = inject(ActivatedRoute);
  private readonly el = inject(ElementRef);
  protected readonly kb = inject(KeyboardShortcutService);
  private readonly hub = inject(SalesHubService);

  private readonly itemsBody = viewChild<ElementRef<HTMLElement>>('itemsBody');
  private readonly importInput = viewChild<ElementRef<HTMLInputElement>>('importInput');

  protected readonly canView = signal(false);
  protected readonly canManage = signal(false);
  protected readonly loading = signal(false);
  protected readonly lookups = signal<SalesLookupsDto | null>(null);
  protected readonly sales = signal<SalesInvoiceDto[]>([]);
  protected readonly showHelp = signal(false);
  protected readonly tabs = signal<SaleTabState[]>([]);
  protected readonly activeTabId = signal<string | null>(null);

  protected branchId: number | null = null;
  protected warehouseId: number | null = null;
  protected companyId: number | null = null;
  protected customerId: number | null = null;
  protected customerPhone = '';
  protected customerPoNo = '';
  protected salesperson = '';
  protected salesNo = '';
  protected invoiceDate = new Date().toISOString().slice(0, 10);
  protected referenceNo = '';
  protected referenceDate = '';
  protected sourceType = 'SALES';
  protected paymentTypeID: number | null = null;
  protected paymentMethodID: number | null = null;
  protected remarks = '';
  protected editingId: number | null = null;
  protected saving = false;

  protected payAmount = 0;
  protected payTypeID: number | null = null;
  protected payMethodID: number | null = null;
  protected payReferenceNo = '';
  protected payRemarks = '';

  protected searchText = '';
  protected selectedId: number | null = null;

  protected productOpen: number | null = null;
  protected productResults: LookupItem[] = [];
  protected productHi = 0;

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
      await this.loadList();
      const idParam = this.route.snapshot.queryParamMap.get('id');
      if (idParam && !this.hub.editRequest()) {
        try {
          const d = await this.svc.getById(Number(idParam));
          if (d) this.edit(d);
        } catch {
          // ignore missing record
        }
      }

      if (!this.tabs().length) {
        await this.newDoc();
      }
    }
  }

  ngOnDestroy(): void {
    this.kbDeregs.forEach((d) => d());
    this.kbDeregs = [];
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
    tab.customerPoNo = this.customerPoNo;
    tab.salesperson = this.salesperson;
    tab.salesNo = this.salesNo;
    tab.invoiceDate = this.invoiceDate;
    tab.referenceNo = this.referenceNo;
    tab.referenceDate = this.referenceDate;
    tab.sourceType = this.sourceType;
    tab.paymentTypeID = this.paymentTypeID;
    tab.paymentMethodID = this.paymentMethodID;
    tab.remarks = this.remarks;
    tab.payAmount = this.payAmount;
    tab.payTypeID = this.payTypeID;
    tab.payMethodID = this.payMethodID;
    tab.payReferenceNo = this.payReferenceNo;
    tab.payRemarks = this.payRemarks;
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
      this.customerPoNo = '';
      this.salesperson = '';
      this.salesNo = '';
      this.invoiceDate = new Date().toISOString().slice(0, 10);
      this.referenceNo = '';
      this.referenceDate = '';
      this.sourceType = 'SALES';
      this.paymentTypeID = null;
      this.paymentMethodID = null;
      this.remarks = '';
      this.payAmount = 0;
      this.payTypeID = null;
      this.payMethodID = null;
      this.payReferenceNo = '';
      this.payRemarks = '';
      this.items.set([]);
      return;
    }

    this.editingId = tab.editingId;
    this.branchId = tab.branchId;
    this.warehouseId = tab.warehouseId;
    this.companyId = tab.companyId;
    this.customerId = tab.customerId;
    this.customerPhone = tab.customerPhone;
    this.customerPoNo = tab.customerPoNo;
    this.salesperson = tab.salesperson;
    this.salesNo = tab.salesNo;
    this.invoiceDate = tab.invoiceDate;
    this.referenceNo = tab.referenceNo;
    this.referenceDate = tab.referenceDate;
    this.sourceType = tab.sourceType;
    this.paymentTypeID = tab.paymentTypeID;
    this.paymentMethodID = tab.paymentMethodID;
    this.remarks = tab.remarks;
    this.payAmount = tab.payAmount;
    this.payTypeID = tab.payTypeID;
    this.payMethodID = tab.payMethodID;
    this.payReferenceNo = tab.payReferenceNo;
    this.payRemarks = tab.payRemarks;
    this.items.set(tab.items.length ? [...tab.items] : [this.blankItem()]);
  }

  protected async newDoc(): Promise<void> {
    this.syncActiveTabFromForm();
    const nextTab = this.createTabState();
    this.tabs.update((tabs) => [...tabs, nextTab]);
    this.activeTabId.set(nextTab.saleTabId);
    this.applyTabState(nextTab);

    try {
      const nextNumber = await this.svc.getNextNumber();
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
      customerPoNo: '',
      salesperson: '',
      invoiceDate: new Date().toISOString().slice(0, 10),
      referenceNo: '',
      referenceDate: '',
      sourceType: 'SALES',
      paymentTypeID: null,
      paymentMethodID: null,
      remarks: '',
      payAmount: 0,
      payTypeID: null,
      payMethodID: null,
      payReferenceNo: '',
      payRemarks: '',
      items: [this.blankItem()],
      isDirty: false,
      isSaved: false,
    };
  }

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
    reg({ combo: 'f3', global: true, group: G, description: 'Product search', handler: () => this.openProductSearch() });
    reg({ combo: '?', global: true, group: G, description: 'Keyboard shortcuts help', handler: () => this.showHelp.update((v) => !v) });
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
      void this.newDoc();
      return;
    }
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
    const rows = this.items().length;
    let { row, col } = cell;
    if (dir === 'up') row = Math.max(0, row - 1);
    else if (dir === 'down') row = Math.min(rows - 1, row + 1);
    else if (dir === 'left') col = Math.max(0, col - 1);
    else if (dir === 'right') col = Math.min(9, col + 1);
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
      if (row > 0) return { row: row - 1, col: 9 };
      return null;
    }
    if (col < 7) return { row, col: col + 1 };
    if (row < rows - 1) return { row: row + 1, col: 0 };
    return { row, col: 9 };
  }

  private onGridTab(e: KeyboardEvent, back: boolean): void {
    if (this.productOpen !== null) {
      this.closeProduct();
      return;
    }
    const cell = this.currentCell(e.target);
    if (!cell) return;
    const next = this.nextCell(cell.row, cell.col, back);
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
      const rows = this.items().length;
      if (cell.col < 9) {
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
    if (cell.col <= 1 || val === '') {
      e.preventDefault();
      this.removeItem(cell.row);
      const r = Math.max(0, cell.row - 1);
      if (this.items().length) this.focusCell(r, 0);
    }
  }

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
    this.markDirty();
  }

  private productQuery(it: DraftItem): void {
    const q = (it.productText ?? '').trim().toLowerCase();
    const all = this.lookups()?.products ?? [];
    this.productResults = q ? all.filter((p) => p.name?.toLowerCase().includes(q) || p.code?.toLowerCase().includes(q)) : all.slice(0, 50);
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
    this.markDirty();
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
    if (related && current?.contains(related)) return;
    this.closeProduct();
  }

  private onEscape(e: KeyboardEvent): void {
    if (this.productOpen !== null) {
      this.closeProduct();
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

  protected focusSearch(): void {
    const node = (this.el.nativeElement as HTMLElement).querySelector('[data-field="search"]') as HTMLInputElement | null;
    node?.focus();
    node?.select();
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

  private printInvoice(): void {
    if (!this.activeTab) {
      this.toast.error('Open a sale to print');
      return;
    }
    window.print();
  }

  private async refreshLookups(): Promise<void> {
    this.lookups.set(await this.svc.getLookups());
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

  protected lineTotal(it: DraftItem): number {
    return round2(this.lineTaxable(it) + this.lineCgst(it) + this.lineSgst(it) + this.lineIgst(it) + this.lineCess(it));
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
      sourceType: this.sourceType || 'SALES',
      referenceNo: this.referenceNo || null,
      referenceDate: this.referenceDate || null,
      paymentTypeID: this.paymentTypeID ?? null,
      paymentMethodID: this.paymentMethodID ?? null,
      remarks: this.remarks || null,
      items: this.toItems(),
      payment: null,
    };

    if (this.payAmount > 0) {
      req.payment = {
        amount: this.payAmount,
        paymentTypeID: this.payTypeID ?? this.paymentTypeID ?? null,
        paymentMethodID: this.payMethodID ?? this.paymentMethodID ?? null,
        referenceNo: this.payReferenceNo || null,
        remarks: this.payRemarks || null,
      };
    }

    return req;
  }

  private validate(): string | null {
    if (!this.companyId) {
      this.focusField('company');
      this.toast.error('Company is required');
      return 'company';
    }
    if (!this.customerId) {
      this.focusField('customer');
      this.toast.error('Customer is required');
      return 'customer';
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

    return null;
  }

  protected async save(): Promise<void> {
    if (this.saving) return;
    if (!this.canManage()) return;
    this.syncActiveTabFromForm();
    const tab = this.activeTab;
    if (!tab) return;
    if (this.validate() !== null) return;

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
          referenceNo: req.referenceNo,
          referenceDate: req.referenceDate,
          paymentTypeID: req.paymentTypeID,
          paymentMethodID: req.paymentMethodID,
          remarks: req.remarks,
          items: req.items,
        };
        await this.svc.update(tab.editingId, update);
      } else {
        await this.svc.create(req);
      }

      tab.isDirty = false;
      tab.isSaved = true;
      this.toast.success('Sale saved');
      await this.loadList();
    } catch (e: any) {
      this.toast.error('Failed to save', e?.error?.message ?? e?.message ?? '');
    } finally {
      this.saving = false;
    }
  }

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
    tab.referenceNo = p.referenceNo ?? '';
    tab.referenceDate = p.referenceDate ? p.referenceDate.slice(0, 10) : '';
    tab.sourceType = p.sourceType || 'SALES';
    tab.paymentTypeID = p.paymentTypeID ?? null;
    tab.paymentMethodID = p.paymentMethodID ?? null;
    tab.remarks = p.remarks ?? '';
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
    this.editingId = null;
    this.branchId = null;
    this.warehouseId = null;
    this.companyId = null;
    this.customerId = null;
    this.customerPhone = '';
    this.customerPoNo = '';
    this.salesperson = '';
    this.salesNo = '';
    this.invoiceDate = new Date().toISOString().slice(0, 10);
    this.referenceNo = '';
    this.referenceDate = '';
    this.sourceType = 'SALES';
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

  protected readonly trackByIndex = (index: number): number => index;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
