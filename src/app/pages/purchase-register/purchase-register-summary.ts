import { Component, OnInit, inject, signal, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { PurchaseService, PurchaseDto } from '../../core/services/master_service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionService } from '../../core/services/permission.service';

@Component({
  selector: 'app-purchase-register-summary',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './purchase-register-summary.html',
  styleUrl: './purchase-register-summary.css',
})
export class PurchaseRegisterSummary implements OnInit {
  private readonly svc = inject(PurchaseService);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);

  // Input from parent component
  protected readonly rows = input<PurchaseDto[]>([]);

  protected loading = signal(false);
  protected totalPurchases = signal(0);
  protected postedPurchases = signal(0);
  protected creditPurchases = signal(0);
  protected paidAmount = signal(0);
  protected outstandingAmount = signal(0);
  protected purchaseReturns = signal(0);

  // Computed grandTotal based on rows
  protected readonly grandTotal = computed(() => 
    this.rows().reduce((sum, r) => sum + (r.grandTotal ?? 0), 0)
  );

  ngOnInit(): void {
    this.loadSummary();
  }

  private loadSummary(): void {
    try {
      this.loading.set(true);
      const rows = this.rows();
      this.totalPurchases.set(rows.length);
      this.postedPurchases.set(rows.filter(r => r.statusID?.toString() === 'Posted' || r.statusID?.toString() === 'Posted').length);
      this.creditPurchases.set(rows.filter(r => r.statusID?.toString() === 'Credit' || r.statusID?.toString() === 'Credit').length);
      this.paidAmount.set(rows.reduce((sum, r) => sum + (r.paidAmount ?? 0), 0));
      this.outstandingAmount.set(rows.reduce((sum, r) => sum + ((r.grandTotal ?? 0) - (r.paidAmount ?? 0)), 0));
      this.purchaseReturns.set(0); // Will be updated if return API is available
    } catch (e: any) {
      this.toast.error('Failed to load summary', e?.error?.message ?? e?.message ?? '');
    } finally {
      this.loading.set(false);
    }
  }
}