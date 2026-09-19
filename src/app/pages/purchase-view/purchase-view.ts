import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { PurchaseService, PurchaseDto } from '../../core/services/master_service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionService } from '../../core/services/permission.service';

@Component({
  selector: 'app-purchase-view',
  standalone: true,
  imports: [DecimalPipe, SlicePipe],
  templateUrl: './purchase-view.html',
  styleUrl: './purchase-view.css',
})
export class PurchaseViewPage implements OnInit {
  private readonly svc = inject(PurchaseService);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected loading = signal(false);
  protected purchase: PurchaseDto | null = null;
  protected canEdit = signal(false);
  protected canCancel = signal(false);
  protected canDelete = signal(false);
  protected canReturn = signal(false);

  protected purchaseId: number = 0;

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
    this.canEdit.set(this.perm.has(['purchases.edit', 'purchases.manage']));
    this.canCancel.set(this.perm.has(['purchases.cancel', 'purchases.manage']));
    this.canDelete.set(this.perm.has(['purchases.delete', 'purchases.manage']));
    this.canReturn.set(
      this.perm.has(['purchases-return.create', 'purchases.return.manage', 'purchases.return.view']),
    );
  }

  protected goBack(): void {
    this.router.navigate(['/purchase-register']);
  }

  protected cancelPurchase(): void {
    this.router.navigate(['/purchase-cancel', this.purchaseId]);
  }

  protected editPurchase(): void {
    this.router.navigate(['/purchase-edit', this.purchaseId]);
  }

  protected returnPurchase(): void {
    this.router.navigate(['/purchase-returns/new'], { queryParams: { purchaseId: this.purchaseId } });
  }

  protected deletePurchase(): void {
    this.router.navigate(['/purchase-delete', this.purchaseId]);
  }

  protected printPurchase(): void {
    this.router.navigate(['/purchase-print', this.purchaseId]);
  }
}