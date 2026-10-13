import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PurchaseService, PurchaseDto } from '../../core/services/master_service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionService } from '../../core/services/permission.service';
import { PurchaseDetailsPanel } from '../purchase-shared/purchase-details-panel';

@Component({
  selector: 'app-purchase-cancel',
  standalone: true,
  imports: [FormsModule, PurchaseDetailsPanel],
  templateUrl: './purchase-cancel.html',
  styleUrl: './purchase-cancel.css',
})
export class PurchaseCancelPage implements OnInit {
  private readonly svc = inject(PurchaseService);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected loading = signal(false);
  protected purchase = signal<PurchaseDto | null>(null);
  protected loadError = signal('');
  protected canCancel = signal(false);
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
    this.canCancel.set(this.perm.has(['purchases.cancel', 'purchases.manage']));
  }

  protected onReasonChange(value: string): void {
    this.reason = value;
    this.reasonError = null;
  }

  protected async cancelPurchase(): Promise<void> {
    if (!this.reason.trim()) {
      this.toast.error('Cancellation reason is required');
      return;
    }

    if (!this.canCancel()) {
      this.toast.error('You do not have permission to cancel purchases');
      return;
    }

    if (this.loading()) return;
    try {
      this.loading.set(true);
      await this.svc.cancel(this.purchaseId, this.reason);
      this.toast.success('Purchase cancelled successfully');
      await this.router.navigate(['/purchase-register']);
    } catch (e: any) {
      this.toast.error('Failed to cancel purchase', e?.error?.message ?? e?.message ?? '');
    } finally {
      this.loading.set(false);
    }
  }

  protected goBack(): void {
    this.router.navigate(['/purchase-register']);
  }
}
