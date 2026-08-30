import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { StockService, StockTransactionDto, PurchaseService, PurchaseLookupsDto } from '../../../core/services/master_service';
import { PermissionService } from '../../../core/services/permission.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-stock-ledger-report',
  standalone: true,
  imports: [FormsModule, DecimalPipe, SlicePipe],
  templateUrl: './stock-ledger.html',
  styleUrls: ['./stock-ledger.css', '../report-shared.css'],
})
export class StockLedgerReport implements OnInit {
  private readonly svc = inject(StockService);
  private readonly purchaseSvc = inject(PurchaseService);
  private readonly perm = inject(PermissionService);
  private readonly toast = inject(ToastService);

  protected readonly canView = signal(false);
  protected readonly loading = signal(false);
  protected readonly rows = signal<StockTransactionDto[]>([]);
  protected readonly lookups = signal<PurchaseLookupsDto | null>(null);

  protected productId: number | null = null;
  protected warehouseId: number | null = null;
  protected dateFrom = '';
  protected dateTo = '';

  async ngOnInit(): Promise<void> {
    this.canView.set(this.perm.has('stock.view'));
    if (!this.canView()) return;
    try {
      this.lookups.set(await this.purchaseSvc.getLookups());
    } catch {
      /* lookups are optional for display names */
    }
    await this.reload();
  }

  protected async reload(): Promise<void> {
    this.loading.set(true);
    try {
      const page = await this.svc.getTransactions(1, 500, this.productId, this.warehouseId);
      this.rows.set(page.items ?? []);
    } catch (e: any) {
      this.toast.error('Failed to load stock ledger', e?.error?.message ?? e?.message ?? '');
    } finally {
      this.loading.set(false);
    }
  }

  protected readonly filtered = computed(() => {
    return this.rows().filter((r) => {
      if (this.dateFrom && r.transactionDate.slice(0, 10) < this.dateFrom) return false;
      if (this.dateTo && r.transactionDate.slice(0, 10) > this.dateTo) return false;
      return true;
    });
  });

  protected productName(id: number): string {
    return this.lookups()?.products.find((p) => p.id === id)?.name ?? String(id);
  }

  protected warehouseName(id: number): string {
    return this.lookups()?.warehouses.find((w) => w.id === id)?.name ?? String(id);
  }

  protected get totalIn(): number {
    return this.filtered().reduce((s, r) => s + r.quantityIn, 0);
  }
  protected get totalOut(): number {
    return this.filtered().reduce((s, r) => s + r.quantityOut, 0);
  }
}
