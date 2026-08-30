import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { PurchaseService, PurchaseLookupsDto, PaymentService } from '../../../core/services/master_service';
import { PermissionService } from '../../../core/services/permission.service';
import { ToastService } from '../../../core/services/toast.service';

interface LedgerEntry {
  date: string;
  type: 'Purchase' | 'Payment';
  reference: string;
  debit: number;
  credit: number;
  balance: number;
}

@Component({
  selector: 'app-supplier-ledger-report',
  standalone: true,
  imports: [FormsModule, DecimalPipe, SlicePipe],
  templateUrl: './supplier-ledger.html',
  styleUrls: ['./supplier-ledger.css', '../report-shared.css'],
})
export class SupplierLedgerReport implements OnInit {
  private readonly purchaseSvc = inject(PurchaseService);
  private readonly paymentSvc = inject(PaymentService);
  private readonly perm = inject(PermissionService);
  private readonly toast = inject(ToastService);

  protected readonly canView = signal(false);
  protected readonly loading = signal(false);
  protected readonly lookups = signal<PurchaseLookupsDto | null>(null);
  protected readonly entries = signal<LedgerEntry[]>([]);

  protected supplierId: number | null = null;
  protected dateFrom = '';
  protected dateTo = '';

  async ngOnInit(): Promise<void> {
    this.canView.set(this.perm.has('purchases.view'));
    if (!this.canView()) return;
    try {
      this.lookups.set(await this.purchaseSvc.getLookups());
    } catch {
      /* lookups are optional for the supplier picker */
    }
  }

  protected async reload(): Promise<void> {
    if (this.supplierId == null) {
      this.entries.set([]);
      return;
    }
    this.loading.set(true);
    try {
      const [purchasePage, paymentPage] = await Promise.all([
        this.purchaseSvc.getPaged(1, 500, ''),
        this.paymentSvc.getPaged(1, 500, ''),
      ]);
      const purchases = (purchasePage.items ?? []).filter((p) => p.supplierId === this.supplierId);
      const payments = (paymentPage.items ?? []).filter((p) => p.businessPartnerId === this.supplierId);

      const raw = [
        ...purchases.map((p) => ({
          date: p.purchaseDate,
          type: 'Purchase' as const,
          reference: p.purchaseNumber,
          debit: p.grandTotal,
          credit: 0,
        })),
        ...payments.map((p) => ({
          date: p.paymentDate,
          type: 'Payment' as const,
          reference: p.paymentNo,
          debit: 0,
          credit: p.amount,
        })),
      ].sort((a, b) => a.date.localeCompare(b.date));

      let running = 0;
      const withBalance: LedgerEntry[] = raw.map((e) => {
        running += e.debit - e.credit;
        return { ...e, balance: running };
      });
      this.entries.set(withBalance);
    } catch (e: any) {
      this.toast.error('Failed to load supplier ledger', e?.error?.message ?? e?.message ?? '');
    } finally {
      this.loading.set(false);
    }
  }

  protected readonly filtered = computed(() => {
    return this.entries().filter((e) => {
      if (this.dateFrom && e.date.slice(0, 10) < this.dateFrom) return false;
      if (this.dateTo && e.date.slice(0, 10) > this.dateTo) return false;
      return true;
    });
  });

  protected get closingBalance(): number {
    const rows = this.filtered();
    return rows.length ? rows[rows.length - 1].balance : 0;
  }
}
