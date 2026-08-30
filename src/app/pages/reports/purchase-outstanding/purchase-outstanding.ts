import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { PurchaseService, PurchaseDto, PurchaseLookupsDto } from '../../../core/services/master_service';
import { PermissionService } from '../../../core/services/permission.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-purchase-outstanding-report',
  standalone: true,
  imports: [FormsModule, DecimalPipe, SlicePipe],
  templateUrl: './purchase-outstanding.html',
  styleUrls: ['./purchase-outstanding.css', '../report-shared.css'],
})
export class PurchaseOutstandingReport implements OnInit {
  private readonly svc = inject(PurchaseService);
  private readonly perm = inject(PermissionService);
  private readonly toast = inject(ToastService);

  protected readonly canView = signal(false);
  protected readonly loading = signal(false);
  protected readonly rows = signal<PurchaseDto[]>([]);
  protected readonly lookups = signal<PurchaseLookupsDto | null>(null);

  protected supplierId: number | null = null;

  async ngOnInit(): Promise<void> {
    this.canView.set(this.perm.has('purchases.view'));
    if (!this.canView()) return;
    this.loading.set(true);
    try {
      const [lookups, page] = await Promise.all([this.svc.getLookups(), this.svc.getPaged(1, 500, '')]);
      this.lookups.set(lookups);
      this.rows.set((page.items ?? []).filter((p) => p.balanceAmount > 0.004));
    } catch (e: any) {
      this.toast.error('Failed to load purchase outstanding', e?.error?.message ?? e?.message ?? '');
    } finally {
      this.loading.set(false);
    }
  }

  protected readonly filtered = computed(() => {
    return this.rows().filter((p) => this.supplierId == null || p.supplierId === this.supplierId);
  });

  protected get totalGrand(): number {
    return this.filtered().reduce((s, p) => s + p.grandTotal, 0);
  }
  protected get totalPaid(): number {
    return this.filtered().reduce((s, p) => s + p.paidAmount, 0);
  }
  protected get totalBalance(): number {
    return this.filtered().reduce((s, p) => s + p.balanceAmount, 0);
  }
}
