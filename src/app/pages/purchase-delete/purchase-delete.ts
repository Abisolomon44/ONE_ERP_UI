import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { PurchaseService, PurchaseDto } from '../../core/services/master_service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionService } from '../../core/services/permission.service';

@Component({
  selector: 'app-purchase-delete',
  standalone: true,
  imports: [FormsModule, DecimalPipe, SlicePipe],
  templateUrl: './purchase-delete.html',
  styleUrl: './purchase-delete.css',
})
export class PurchaseDeletePage implements OnInit {
  private readonly svc = inject(PurchaseService);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected loading = signal(false);
  protected purchase: PurchaseDto | null = null;
  protected canDelete = signal(false);
  protected reason = '';
  protected purchaseId: number = 0;
  protected reasonError: string | null = null;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ? 
      parseInt(this.route.snapshot.paramMap.get('id')!, 10) : 0;
    this.purchaseId = id;
    this.loadPurchase();
    this.checkPermissions();
  }

  private async loadPurchase(): Promise<void> {
    try {
      this.loading.set(true);
      this.purchase = await this.svc.getById(this.purchaseId);
    } catch (e: any) {
      this.toast.error('Failed to load purchase', e?.error?.message ?? e?.message ?? '');
      this.router.navigate(['/purchase-register']);
    } finally {
      this.loading.set(false);
    }
  }

  private checkPermissions(): void {
    this.canDelete.set(this.perm.has(['purchases.delete', 'purchases.manage']));
  }

  protected onReasonChange(value: string): void {
    this.reason = value;
    this.reasonError = null;
  }

  protected deletePurchase(): void {
    if (!this.reason.trim()) {
      this.toast.error('Delete reason is required');
      return;
    }

    if (!this.canDelete()) {
      this.toast.error('You do not have permission to delete purchases');
      return;
    }

    if (!this.purchase) return;

    // Check if already deleted - statusID is a number, use numeric codes
    if (this.purchase.statusID === 2 || this.purchase.statusID === 3) {
      this.toast.error('Cannot delete an already cancelled/deleted purchase');
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete purchase ${this.purchase.purchaseNumber}?`)) {
      return;
    }

    try {
      this.loading.set(true);
      this.svc.delete(this.purchaseId).then(() => {
        this.toast.success('Purchase deleted successfully');
        this.router.navigate(['/purchase-register']);
      }).catch((e: any) => {
        this.toast.error('Failed to delete purchase', e?.error?.message ?? e?.message ?? '');
      });
    } catch (e: any) {
      this.toast.error('Failed to delete purchase', e?.error?.message ?? e?.message ?? '');
    } finally {
      this.loading.set(false);
    }
  }

  protected goBack(): void {
    this.router.navigate(['/purchase-register']);
  }
}