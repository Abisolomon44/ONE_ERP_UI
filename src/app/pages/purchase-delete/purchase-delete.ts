import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PurchaseService, PurchaseDto } from '../../core/services/master_service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionService } from '../../core/services/permission.service';
import { PurchaseDetailsPanel } from '../purchase-shared/purchase-details-panel';

@Component({
  selector: 'app-purchase-delete',
  standalone: true,
  imports: [FormsModule, PurchaseDetailsPanel],
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
  protected purchase = signal<PurchaseDto | null>(null);
  protected loadError = signal('');
  protected canDelete = signal(false);
  protected reason = '';
  protected purchaseId: number = 0;
  protected reasonError: string | null = null;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.purchaseId = id;
    if (!Number.isInteger(id) || id <= 0) this.loadError.set('A valid purchase ID is required.');
    else void this.loadPurchase();
    this.checkPermissions();
  }

  private async loadPurchase(): Promise<void> {
    try {
      this.loading.set(true);
      this.loadError.set('');
      this.purchase.set(await this.svc.getById(this.purchaseId));
      if (!this.purchase()) this.loadError.set('Purchase record was not found.');
    } catch (e: any) {
      const detail = e?.error?.message ?? e?.message ?? 'Please try again.';
      this.loadError.set(`Failed to load purchase. ${detail}`);
      this.toast.error('Failed to load purchase', detail);
    } finally {
      this.loading.set(false);
    }
  }

  protected retryLoad(): void { void this.loadPurchase(); }

  private checkPermissions(): void {
    this.canDelete.set(this.perm.has(['purchases.delete', 'purchases.manage']));
  }

  protected onReasonChange(value: string): void {
    this.reason = value;
    this.reasonError = null;
  }

  protected async deletePurchase(): Promise<void> {
    if (!this.reason.trim()) {
      this.toast.error('Delete reason is required');
      return;
    }

    if (!this.canDelete()) {
      this.toast.error('You do not have permission to delete purchases');
      return;
    }

    const purchase = this.purchase();
    if (!purchase || this.loading()) return;

    // Check if already deleted - statusID is a number, use numeric codes
    if (purchase.statusID === 2 || purchase.statusID === 3) {
      this.toast.error('Cannot delete an already cancelled/deleted purchase');
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete purchase ${purchase.purchaseNumber}?`)) {
      return;
    }

    try {
      this.loading.set(true);
      await this.svc.delete(this.purchaseId);
      this.toast.success('Purchase deleted successfully');
      await this.router.navigate(['/purchase-register']);
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
