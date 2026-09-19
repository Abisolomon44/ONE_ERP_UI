import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { PurchaseService, PurchaseDto } from '../../core/services/master_service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionService } from '../../core/services/permission.service';

@Component({
  selector: 'app-purchase-cancel',
  standalone: true,
  imports: [FormsModule, DecimalPipe, SlicePipe],
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
  protected purchase: PurchaseDto | null = null;
  protected canCancel = signal(false);
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
    this.canCancel.set(this.perm.has(['purchases.cancel', 'purchases.manage']));
  }

  protected onReasonChange(value: string): void {
    this.reason = value;
    this.reasonError = null;
  }

  protected cancelPurchase(): void {
    if (!this.reason.trim()) {
      this.toast.error('Cancellation reason is required');
      return;
    }

    if (!this.canCancel()) {
      this.toast.error('You do not have permission to cancel purchases');
      return;
    }

    try {
      this.loading.set(true);
      this.svc.cancel(this.purchaseId, this.reason).then(() => {
        this.toast.success('Purchase cancelled successfully');
        this.router.navigate(['/purchase-register']);
      }).catch((e: any) => {
        this.toast.error('Failed to cancel purchase', e?.error?.message ?? e?.message ?? '');
      });
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