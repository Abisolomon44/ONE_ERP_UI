import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, SlicePipe, TitleCasePipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import {
  InventoryService,
  InventoryDashboardDto,
  StockReconciliationRow,
  StockValuationRow,
  LowStockRow,
} from '../../core/services/inventory.service';
import {
  PurchaseService,
  PurchaseLookupsDto,
} from '../../core/services/master_service';
import { PermissionService } from '../../core/services/permission.service';
import { ToastService } from '../../core/services/toast.service';

type Tab = 'dashboard' | 'adjustment' | 'transfer' | 'count' | 'reconciliation' | 'valuation' | 'low-stock';

interface Line {
  productId: number;
  unitId: number;
  quantity: number;
  delta: number;
  rate: number;
}

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [FormsModule, DecimalPipe, SlicePipe, TitleCasePipe, LucideAngularModule],
  templateUrl: './inventory.html',
  styleUrl: './inventory.css',
})
export class InventoryPage implements OnInit {
  private readonly svc = inject(InventoryService);
  private readonly master = inject(PurchaseService);
  private readonly perm = inject(PermissionService);
  private readonly toast = inject(ToastService);

  protected readonly canView = signal(false);
  protected readonly canManage = signal(false);
  protected readonly loading = signal(false);
  protected readonly tab = signal<Tab>('dashboard');
  protected readonly tabs: Tab[] = ['dashboard', 'adjustment', 'transfer', 'count', 'reconciliation', 'valuation', 'low-stock'];
  protected readonly lookups = signal<PurchaseLookupsDto>({
    suppliers: [],
    products: [],
    units: [],
    paymentTypes: [],
    paymentMethods: [],
    branches: [],
    warehouses: [],
    companies: [],
    currentCompanyId: 0,
  });

  protected readonly dash = signal<InventoryDashboardDto | null>(null);
  protected readonly recon = signal<StockReconciliationRow[]>([]);
  protected readonly valuation = signal<StockValuationRow[]>([]);
  protected readonly valuationTotal = signal(0);
  protected readonly low = signal<LowStockRow[]>([]);

  // Shared form state
  protected warehouseId: number | null = null;
  protected branchId: number | null = null;
  protected toWarehouseId: number | null = null;
  protected docDate = new Date().toISOString().slice(0, 10);
  protected reason = '';
  protected remarks = '';
  protected readonly lines = signal<Line[]>([]);

  protected readonly docs = signal<{ id: number; number: string; date: string; status: string; extra: string }[]>([]);

  async ngOnInit(): Promise<void> {
    this.canView.set(this.perm.has('stock.view'));
    this.canManage.set(this.perm.has('stock.manage'));
    if (!this.canView()) return;
    try {
      this.lookups.set(await this.master.getLookups());
    } catch {
      /* keep empty defaults so templates never dereference null */
    }
    await this.loadDashboard();
  }

  protected setTab(t: Tab): void {
    this.tab.set(t);
    if (t === 'dashboard') void this.loadDashboard();
    if (t === 'reconciliation') void this.loadRecon();
    if (t === 'valuation') void this.loadValuation();
    if (t === 'low-stock') void this.loadLow();
    if (t === 'adjustment' || t === 'transfer' || t === 'count') void this.loadDocs();
  }

  protected async loadDashboard(): Promise<void> {
    await this.run(async () => this.dash.set(await this.svc.dashboard()));
  }

  protected async loadRecon(): Promise<void> {
    await this.run(async () => this.recon.set((await this.svc.reconciliation(this.warehouseId)).items ?? []));
  }

  protected async loadValuation(): Promise<void> {
    await this.run(async () => {
      const r = await this.svc.valuation(this.warehouseId);
      this.valuation.set(r.rows ?? []);
      this.valuationTotal.set(r.totalValue ?? 0);
    });
  }

  protected async loadLow(): Promise<void> {
    await this.run(async () => this.low.set((await this.svc.lowStock(this.warehouseId)).items ?? []));
  }

  protected async loadDocs(): Promise<void> {
    await this.run(async () => {
      const t = this.tab();
      if (t === 'adjustment') {
        const r = await this.svc.getAdjustments();
        this.docs.set((r.items ?? []).map((d: any) => ({ id: d.stockAdjustmentId, number: d.adjustmentNumber, date: d.adjustmentDate, status: d.status, extra: d.reason ?? '' })));
      } else if (t === 'transfer') {
        const r = await this.svc.getTransfers();
        this.docs.set((r.items ?? []).map((d: any) => ({ id: d.stockTransferId, number: d.transferNumber, date: d.transferDate, status: d.status, extra: `${d.fromWarehouseId} → ${d.toWarehouseId}` })));
      } else {
        const r = await this.svc.getCounts();
        this.docs.set((r.items ?? []).map((d: any) => ({ id: d.stockCountId, number: d.countNumber, date: d.countDate, status: d.status, extra: '' })));
      }
    });
  }

  protected addLine(): void {
    this.lines.update((l) => [...l, { productId: 0, unitId: 0, quantity: 0, delta: 0, rate: 0 }]);
  }

  protected removeLine(index: number): void {
    this.lines.update((l) => l.filter((_, i) => i !== index));
  }

  /** ngModel cannot bind to a conditional expression — route it here. */
  protected setLineValue(line: Line, field: 'delta' | 'quantity', value: number): void {
    if (field === 'delta') line.delta = Number(value) || 0;
    else line.quantity = Number(value) || 0;
  }

  protected async save(): Promise<void> {
    if (!this.canManage()) return;
    const t = this.tab();
    const lines = this.lines().filter((l) => l.productId > 0);
    if (lines.length === 0) {
      this.toast.error('Add at least one product line');
      return;
    }
    await this.run(async () => {
      if (t === 'adjustment') {
        await this.svc.createAdjustment({
          branchId: this.branchId ?? 0,
          warehouseId: this.warehouseId ?? 0,
          adjustmentDate: this.docDate,
          reason: this.reason || null,
          remarks: this.remarks || null,
          items: lines.map((l) => ({ productId: l.productId, unitId: l.unitId, quantityDelta: l.delta, rate: l.rate, reason: this.reason || null })),
        });
        this.toast.success('Adjustment saved as DRAFT — post it to update stock');
      } else if (t === 'transfer') {
        await this.svc.createTransfer({
          branchId: this.branchId ?? 0,
          fromWarehouseId: this.warehouseId ?? 0,
          toWarehouseId: this.toWarehouseId ?? 0,
          transferDate: this.docDate,
          remarks: this.remarks || null,
          items: lines.map((l) => ({ productId: l.productId, unitId: l.unitId, quantity: l.quantity, rate: l.rate })),
        });
        this.toast.success('Transfer saved as DRAFT — post it to move stock');
      } else {
        await this.svc.createCount({
          branchId: this.branchId ?? 0,
          warehouseId: this.warehouseId ?? 0,
          countDate: this.docDate,
          remarks: this.remarks || null,
          items: lines.map((l) => ({ productId: l.productId, unitId: l.unitId, countedQuantity: l.quantity, rate: l.rate })),
        });
        this.toast.success('Stock count saved as DRAFT — post it to apply variances');
      }
      this.lines.set([]);
      this.reason = '';
      this.remarks = '';
      await this.loadDocs();
    });
  }

  protected async post(id: number): Promise<void> {
    if (!this.canManage()) return;
    await this.run(async () => {
      const t = this.tab();
      if (t === 'adjustment') await this.svc.postAdjustment(id);
      else if (t === 'transfer') await this.svc.postTransfer(id);
      else await this.svc.postCount(id);
      this.toast.success('Posted — stock ledger updated');
      await this.loadDocs();
      await this.loadDashboard();
    });
  }

  private async run(action: () => Promise<void>): Promise<void> {
    this.loading.set(true);
    try {
      await action();
    } catch (e: any) {
      this.toast.error('Inventory request failed', e?.error?.message ?? e?.message ?? '');
    } finally {
      this.loading.set(false);
    }
  }

  protected readonly hasLookups = computed(() => this.lookups().products.length > 0);
}
