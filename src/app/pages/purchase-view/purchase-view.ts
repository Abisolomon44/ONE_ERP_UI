import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { PurchaseService, PurchaseDto } from '../../core/services/master_service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionService } from '../../core/services/permission.service';
import { DocumentPrintService } from '../../core/services/document-print.service';
import { PurchaseDetailsPanel } from '../purchase-shared/purchase-details-panel';

@Component({
  selector: 'app-purchase-view',
  standalone: true,
  imports: [PurchaseDetailsPanel],
  templateUrl: './purchase-view.html',
  styleUrl: './purchase-view.css',
})
export class PurchaseViewPage implements OnInit {
  private readonly svc = inject(PurchaseService);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly docPrint = inject(DocumentPrintService);

  protected loading = signal(false);
  protected purchase = signal<PurchaseDto | null>(null);
  protected loadError = signal('');
  protected canEdit = signal(false);
  protected canCancel = signal(false);
  protected canDelete = signal(false);
  protected canReturn = signal(false);

  protected purchaseId: number = 0;

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
    const purchase = this.purchase();
    if (purchase) void this.docPrint.openPurchasePreview(this.purchaseId, purchase.companyId, 'PURCHASE');
  }
}
