import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  PurchaseService,
  PurchaseDto,
  DeleteCheckDto,
  PaymentAllocationDto,
  StockTransactionDto,
} from '../../core/services/master_service';
import { PermissionService } from '../../core/services/permission.service';
import { ToastService } from '../../core/services/toast.service';

export type PurchaseMode = 'view' | 'edit' | 'cancel' | 'delete';

@Component({
  selector: 'app-purchase-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './purchase-management.html',
  styleUrl: './purchase-management.css',
})
export class PurchaseManagementPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly svc = inject(PurchaseService);
  private readonly perm = inject(PermissionService);
  private readonly toast = inject(ToastService);

  protected readonly mode = signal<PurchaseMode>('view');
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly purchase = signal<PurchaseDto | null>(null);
  protected readonly payments = signal<PaymentAllocationDto[]>([]);
  protected readonly stockTx = signal<StockTransactionDto[]>([]);
  protected readonly deleteCheck = signal<DeleteCheckDto | null>(null);

  protected readonly canView = signal(false);
  protected readonly canEdit = signal(false);
  protected readonly canCancel = signal(false);
  protected readonly canDelete = signal(false);

  protected cancelReason = '';
  protected editModel: PurchaseDto | null = null;

  protected get supplierPONumber(): string {
    return (this.mode() === 'edit' && this.editModel) ? (this.editModel as any).supplierPONumber ?? '' : (this.purchase() as any)?.supplierPONumber ?? '';
  }
  protected set supplierPONumber(v: string) {
    if (this.editModel) (this.editModel as any).supplierPONumber = v;
  }

  protected get referenceNumber(): string {
    return (this.mode() === 'edit' && this.editModel) ? (this.editModel as any).referenceNumber ?? '' : (this.purchase() as any)?.referenceNumber ?? '';
  }
  protected set referenceNumber(v: string) {
    if (this.editModel) (this.editModel as any).referenceNumber = v;
  }

  async ngOnInit(): Promise<void> {
    this.canView.set(this.perm.has(['purchases.view', 'purchases.manage']));
    this.canEdit.set(this.perm.has(['purchases.edit', 'purchases.manage']));
    this.canCancel.set(this.perm.has(['purchases.cancel', 'purchases.manage']));
    this.canDelete.set(this.perm.has(['purchases.delete', 'purchases.manage']));

    const m = (this.route.snapshot.queryParamMap.get('mode') ?? 'view').toLowerCase();
    const mode: PurchaseMode =
      m === 'edit' || m === 'cancel' || m === 'delete' ? (m as PurchaseMode) : 'view';
    this.mode.set(mode);

    if (
      (mode === 'view' && !this.canView()) ||
      (mode === 'edit' && !this.canEdit()) ||
      (mode === 'cancel' && !this.canCancel()) ||
      (mode === 'delete' && !this.canDelete())
    ) {
      this.toast.error('You do not have permission for this operation');
      await this.router.navigate(['/access-denied']);
      return;
    }

    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.toast.error('Purchase id is missing');
      await this.router.navigate(['/purchase'], { queryParams: { tab: 'list' } });
      return;
    }
    await this.load(id);
  }

  private async load(id: number): Promise<void> {
    this.loading.set(true);
    try {
      const p = await this.svc.getById(id);
      this.purchase.set(p);
      this.editModel = structuredClone(p);
      const [pay, stock] = await Promise.all([
        this.svc.getPayments(id).catch(() => [] as PaymentAllocationDto[]),
        this.svc.getStock(id).catch(() => [] as StockTransactionDto[]),
      ]);
      this.payments.set(pay);
      this.stockTx.set(stock);
      if (this.mode() === 'delete') {
        this.deleteCheck.set(await this.svc.deleteCheck(id).catch(() => null));
      }
    } catch (e: any) {
      this.toast.error('Failed to load purchase', e?.error?.message ?? e?.message ?? '');
    } finally {
      this.loading.set(false);
    }
  }

  protected get title(): string {
    switch (this.mode()) {
      case 'edit':
        return 'EDIT PURCHASE';
      case 'cancel':
        return 'CANCEL PURCHASE';
      case 'delete':
        return 'DELETE PURCHASE';
      default:
        return 'VIEW PURCHASE';
    }
  }

  protected get readOnly(): boolean {
    return this.mode() !== 'edit';
  }

  protected async saveEdit(): Promise<void> {
    const p = this.purchase();
    const m = this.editModel;
    if (!p || !m) return;
    this.saving.set(true);
    try {
      const updated = await this.svc.update(p.purchaseId, {
        branchId: m.branchId,
        warehouseId: m.warehouseId,
        supplierId: m.supplierId,
        purchaseNumber: m.purchaseNumber,
        purchaseDate: typeof m.purchaseDate === 'string' ? m.purchaseDate : new Date(m.purchaseDate).toISOString(),
        supplierInvoiceNumber: m.supplierInvoiceNumber ?? null,
        supplierInvoiceDate: (m as any).supplierInvoiceDate ?? null,
        paymentTypeID: m.paymentTypeID ?? null,
        paymentMethodID: m.paymentMethodID ?? null,
        paidAmount: m.paidAmount ?? 0,
        balanceAmount: m.balanceAmount ?? 0,
        remarks: m.remarks ?? null,
        companyId: m.companyId,
        supplierPoNumber: (m as any).supplierPONumber ?? null,
        referenceNumber: (m as any).referenceNumber ?? null,
        currencyId: (m as any).currencyId ?? null,
        purchaseTypeId: (m as any).purchaseTypeId ?? null,
        accountingYearId: (m as any).accountingYearId ?? null,
        taxId: (m as any).taxId ?? null,
        isGSTInclusive: (m as any).isGSTInclusive ?? null,
        items: (m.items ?? []).map((i) => ({
          productId: i.productId,
          unitID: i.unitID,
          quantity: i.quantity,
          freeQuantity: i.freeQuantity ?? 0,
          purchaseRate: i.purchaseRate,
          mrp: i.mrp ?? null,
          retailPrice: i.retailPrice ?? null,
          wholesalePrice: i.wholesalePrice ?? null,
          saleRate: i.saleRate ?? null,
          discountPercentage: i.discountPercentage ?? 0,
          isGSTInclusive: (i as any).isGSTInclusive ?? false,
          gstRate: (i as any).gstRate ?? (i as any).gSTRate ?? 0,
          cgstRate: (i as any).cgstRate ?? 0,
          sgstRate: (i as any).sgstRate ?? 0,
          igstRate: (i as any).igstRate ?? 0,
          cessRate: (i as any).cessRate ?? 0,
        })),
      });
      this.purchase.set(updated);
      this.toast.success('Purchase updated');
      await this.router.navigate(['/purchase'], { queryParams: { tab: 'list' } });
    } catch (e: any) {
      this.toast.error('Failed to update purchase', e?.error?.message ?? e?.message ?? '');
    } finally {
      this.saving.set(false);
    }
  }

  protected async confirmCancel(): Promise<void> {
    const p = this.purchase();
    if (!p) return;
    if (!this.cancelReason.trim()) {
      this.toast.error('Cancellation reason is required');
      return;
    }
    this.saving.set(true);
    try {
      await this.svc.cancel(p.purchaseId, this.cancelReason.trim());
      this.toast.success('Purchase cancelled');
      await this.router.navigate(['/purchase'], { queryParams: { tab: 'list' } });
    } catch (e: any) {
      this.toast.error('Failed to cancel purchase', e?.error?.message ?? e?.message ?? '');
    } finally {
      this.saving.set(false);
    }
  }

  protected async confirmDelete(): Promise<void> {
    const p = this.purchase();
    if (!p) return;
    this.saving.set(true);
    try {
      await this.svc.delete(p.purchaseId);
      this.toast.success('Purchase deleted');
      await this.router.navigate(['/purchase'], { queryParams: { tab: 'list' } });
    } catch (e: any) {
      this.toast.error('Cannot delete purchase', e?.error?.message ?? e?.message ?? '');
    } finally {
      this.saving.set(false);
    }
  }

  protected back(): void {
    this.router.navigate(['/purchase'], { queryParams: { tab: 'list' } });
  }
}
