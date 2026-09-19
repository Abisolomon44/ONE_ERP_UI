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
  protected purchase: PurchaseDto | null = null;
  protected canSave = signal(false);
  protected isNew = signal(false);
  protected purchaseId: number = 0;
  protected lookups = signal<PurchaseLookupsDto | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ? 
      parseInt(this.route.snapshot.paramMap.get('id')!, 10) : 0;
    this.purchaseId = id;
    this.isNew.set(id === 0);
    
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
      this.purchase = await this.svc.getById(this.purchaseId);
      // Transform to create/update request shape
      if (this.purchase) {
        this.canSave.set(this.perm.has(['purchases.edit', 'purchases.manage']));
      }
    } catch (e: any) {
      this.toast.error('Failed to load purchase', e?.error?.message ?? e?.message ?? '');
      this.router.navigate(['/purchase-register']);
    } finally {
      this.loading.set(false);
    }
  }

  private checkPermissions(): void {
    this.canSave.set(this.perm.has(['purchases.edit', 'purchases.manage']));
  }

  protected savePurchase(): void {
    if (!this.purchase || !this.canSave()) return;

    try {
      const request: UpdatePurchaseRequest = {
        supplierId: this.purchase.supplierId,
        companyId: this.purchase.companyId,
        branchId: this.purchase.branchId,
        warehouseId: this.purchase.warehouseId,
        purchaseNumber: this.purchase.purchaseNumber,
        purchaseDate: this.purchase.purchaseDate,
        supplierInvoiceNumber: this.purchase.supplierInvoiceNumber,
        supplierInvoiceDate: this.purchase.supplierInvoiceDate,
        supplierPoNumber: this.purchase.supplierPoNumber,
        referenceNumber: this.purchase.referenceNumber,
        currencyId: this.purchase.currencyId,
        purchaseTypeId: this.purchase.purchaseTypeId,
        accountingYearId: this.purchase.accountingYearId,
        taxId: this.purchase.taxId,
        isGSTInclusive: this.purchase.isGSTInclusive,
        paymentTypeID: this.purchase.paymentTypeID,
        paymentMethodID: this.purchase.paymentMethodID,
        paidAmount: this.purchase.paidAmount,
        balanceAmount: this.purchase.balanceAmount,
        remarks: this.purchase.remarks,
        items: this.purchase.items?.map(item => ({
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
      this.svc.update(this.purchase.purchaseId, request).then(() => {
        this.toast.success('Purchase updated successfully');
        this.router.navigate(['/purchase-register']);
      }).catch((e: any) => {
        this.toast.error('Failed to update purchase', e?.error?.message ?? e?.message ?? '');
      });
    } catch (e: any) {
      this.toast.error('Failed to update purchase', e?.error?.message ?? e?.message ?? '');
    }
  }

  protected goBack(): void {
    this.router.navigate(['/purchase-register']);
  }
}