import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { PurchaseService, PurchaseDto, PurchaseLookupsDto } from '../../../core/services/master_service';
import { PermissionService } from '../../../core/services/permission.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-purchase-register-report',
  standalone: true,
  imports: [FormsModule, DecimalPipe, SlicePipe],
  templateUrl: './purchase-register.html',
  styleUrls: ['./purchase-register.css', '../report-shared.css'],
})
export class PurchaseRegisterReport implements OnInit {
  private readonly svc = inject(PurchaseService);
  private readonly perm = inject(PermissionService);
  private readonly toast = inject(ToastService);

  protected readonly canView = signal(false);
  protected readonly loading = signal(false);
  protected readonly rows = signal<PurchaseDto[]>([]);
  protected readonly lookups = signal<PurchaseLookupsDto | null>(null);

  protected dateFrom = '';
  protected dateTo = '';
  protected supplierId: number | null = null;
  protected search = '';

  async ngOnInit(): Promise<void> {
    this.canView.set(this.perm.has('purchases.view'));
    if (!this.canView()) return;
    this.loading.set(true);
    try {
      const [lookups, page] = await Promise.all([this.svc.getLookups(), this.svc.getPaged(1, 500, '')]);
      this.lookups.set(lookups);
      this.rows.set(page.items ?? []);
    } catch (e: any) {
      this.toast.error('Failed to load purchase register', e?.error?.message ?? e?.message ?? '');
    } finally {
      this.loading.set(false);
    }
  }

  protected readonly filtered = computed(() => {
    const q = this.search.trim().toLowerCase();
    return this.rows().filter((p) => {
      if (this.supplierId != null && p.supplierId !== this.supplierId) return false;
      if (this.dateFrom && p.purchaseDate.slice(0, 10) < this.dateFrom) return false;
      if (this.dateTo && p.purchaseDate.slice(0, 10) > this.dateTo) return false;
      if (q && !p.purchaseNumber.toLowerCase().includes(q) && !(p.supplierNameSnapshot ?? '').toLowerCase().includes(q)) return false;
      return true;
    });
  });

  protected get totalGross(): number {
    return this.filtered().reduce((s, p) => s + p.totalGrossAmount, 0);
  }
  protected get totalDiscount(): number {
    return this.filtered().reduce((s, p) => s + p.totalDiscountAmount, 0);
  }
  protected get totalTax(): number {
    return this.filtered().reduce((s, p) => s + p.totalTaxAmount, 0);
  }
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
