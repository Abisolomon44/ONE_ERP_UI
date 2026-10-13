import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { PurchaseService, PurchaseDto, UpdatePurchaseRequest, PurchaseLookupsDto } from '../../core/services/master_service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionService } from '../../core/services/permission.service';

@Component({
  selector: 'app-purchase-edit',
  standalone: true,
  imports: [FormsModule, DecimalPipe],
  templateUrl: './purchase-edit.html',
  styleUrl: './purchase-edit.css',
})
export class PurchaseEditPage implements OnInit {
  private readonly svc = inject(PurchaseService);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected loading = signal(false);
  protected purchase = signal<PurchaseDto | null>(null);
  protected loadError = signal('');
  protected canSave = signal(false);
  protected isNew = signal(false);
  protected purchaseId: number = 0;
  protected lookups = signal<PurchaseLookupsDto | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.purchaseId = id;
    this.isNew.set(!Number.isInteger(id) || id <= 0);
    
    if (this.isNew()) {
      this.router.navigate(['/purchase-entry']);
      return;
    }

    this.loadLookups();
    this.loadPurchase();
    this.checkPermissions();
  }

  private async loadLookups(): Promise<void> {
    try {
      this.lookups.set(await this.svc.getLookups());
    } catch (e: any) {
      this.toast.error('Failed to load lookups', e?.error?.message ?? e?.message ?? '');
    }
  }

  private async loadPurchase(): Promise<void> {
    try {
      this.loading.set(true);
      this.loadError.set('');
      this.purchase.set(await this.svc.getById(this.purchaseId));
      this.canSave.set(!!this.purchase() && this.perm.has(['purchases.edit', 'purchases.manage']));
    } catch (e: any) {
      const detail = e?.error?.message ?? e?.message ?? 'Please try again.';
      this.loadError.set(`Failed to load purchase. ${detail}`);
      this.toast.error('Failed to load purchase', detail);
    } finally {
      this.loading.set(false);
    }
  }

  private checkPermissions(): void {
    this.canSave.set(this.perm.has(['purchases.edit', 'purchases.manage']));
  }

  protected async savePurchase(): Promise<void> {
    const purchase = this.purchase();
    if (!purchase || !this.canSave() || this.loading()) return;

    try {
      const request: UpdatePurchaseRequest = {
        supplierId: purchase.supplierId,
        companyId: purchase.companyId,
        branchId: purchase.branchId,
        warehouseId: purchase.warehouseId,
        purchaseNumber: purchase.purchaseNumber,
        purchaseDate: purchase.purchaseDate,
        supplierInvoiceNumber: purchase.supplierInvoiceNumber,
        supplierInvoiceDate: purchase.supplierInvoiceDate,
        supplierPoNumber: purchase.supplierPoNumber,
        referenceNumber: purchase.referenceNumber,
        currencyId: purchase.currencyId,
        purchaseTypeId: purchase.purchaseTypeId,
        accountingYearId: purchase.accountingYearId,
        taxId: purchase.taxId,
        isGSTInclusive: purchase.isGSTInclusive,
        paymentTypeID: purchase.paymentTypeID,
        paymentMethodID: purchase.paymentMethodID,
        paidAmount: purchase.paidAmount,
        balanceAmount: purchase.balanceAmount,
        remarks: purchase.remarks,
        items: purchase.items?.map(item => ({
          purchaseItemId: item.purchaseItemId,
          productId: item.productId,
          productCodeSnapshot: item.productCodeSnapshot,
          productNameSnapshot: item.productNameSnapshot,
          brandID: item.brandID,
          categoryID: item.categoryID,
          subCategoryID: item.subCategoryID,
          unitID: item.unitID,
          unitNameSnapshot: item.unitNameSnapshot,
          quantity: item.quantity,
          freeQuantity: item.freeQuantity,
          purchaseRate: item.purchaseRate,
          mrp: item.mrp,
          retailPrice: item.retailPrice,
          wholesalePrice: item.wholesalePrice,
          saleRate: item.saleRate,
          discountPercentage: item.discountPercentage,
          isGSTInclusive: item.isGSTInclusive,
          taxableValue: item.taxableValue,
          gstRate: item.gstRate,
          cgstRate: item.cgstRate,
          cgstAmount: item.cgstAmount,
          sgstRate: item.sgstRate,
          sgstAmount: item.sgstAmount,
          igstRate: item.igstRate,
          igstAmount: item.igstAmount,
          cessRate: item.cessRate,
          cessAmount: item.cessAmount,
          lineTotal: item.lineTotal,
          manufacturingDate: item.manufacturingDate,
          expiryDate: item.expiryDate,
          batchNumber: item.batchNumber,
          serialNumber: item.serialNumber,
          remarks: item.remarks,
        })) || [],
      };

      this.loading.set(true);
      await this.svc.update(purchase.purchaseId, request);
        this.toast.success('Purchase updated successfully');
      this.router.navigate(['/purchase-register']);
    } catch (e: any) {
      this.toast.error('Failed to update purchase', e?.error?.message ?? e?.message ?? '');
    } finally {
      this.loading.set(false);
    }
  }

  protected retryLoad(): void {
    void this.loadPurchase();
  }

  protected goBack(): void {
    this.router.navigate(['/purchase-register']);
  }
}
