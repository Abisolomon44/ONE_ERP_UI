import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  PurchaseService,
  PurchaseReturnService,
  PurchaseDto,
  PurchaseReturnDto,
  CreatePurchaseReturnItemInput,
  PurchaseLookupsDto,
  PurchaseItemDto,
  CreatePurchaseReturnRequest,
} from '../../core/services/master_service';
import { PermissionService } from '../../core/services/permission.service';
import { ToastService } from '../../core/services/toast.service';

interface EntryRow {
  purchaseItemId: number;
  productId: number;
  productCode?: string | null;
  productName?: string | null;
  barcode?: string | null;
  unitId: number;
  unitName?: string | null;
  purchasedQty: number;
  prevReturnedQty: number;
  availableQty: number;
  purchaseRate: number;
  discountPercentage: number;
  discountAmount: number;
  taxableValue: number;
  gstRate: number;
  gstAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  cessRate: number;
  cessAmount: number;
  returnQty: number;
  lineTotal: number;
  validationStatus?: 'valid' | 'invalid' | 'fullyReturned' | 'exceedsLimit';
  validationMessage?: string;
}

@Component({
  selector: 'app-purchase-return-entry',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './purchase-return-entry.html',
  styleUrl: './purchase-return-entry.css',
})
export class PurchaseReturnEntryPage implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly purchaseSvc = inject(PurchaseService);
  private readonly svc = inject(PurchaseReturnService);
  private readonly perm = inject(PermissionService);
  private readonly toast = inject(ToastService);

  protected readonly canCreate = signal(false);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly lookups = signal<PurchaseLookupsDto | null>(null);
  protected readonly invoices = signal<PurchaseDto[]>([]);
  protected readonly source = signal<PurchaseDto | null>(null);
  protected readonly rows = signal<EntryRow[]>([]);

  protected supplierId: number | null = null;
  protected purchaseId: number | null = null;
  protected returnDate = new Date().toISOString().slice(0, 10);
  protected reason = '';
  protected remarks = '';

  protected readonly grandTotal = computed(() =>
    Math.round(this.rows().reduce((s, r) => s + r.lineTotal, 0) * 100) / 100,
  );

  protected readonly totalReturnQty = computed(() =>
    Math.round(this.rows().reduce((s, r) => s + r.returnQty, 0) * 100) / 100,
  );

  protected readonly totalGross = computed(() =>
    Math.round(this.rows().reduce((s, r) => s + r.discountAmount + r.taxableValue, 0) * 100) / 100,
  );

  protected readonly totalDiscount = computed(() =>
    Math.round(this.rows().reduce((s, r) => s + r.discountAmount, 0) * 100) / 100,
  );

  protected readonly totalTaxable = computed(() =>
    Math.round(this.rows().reduce((s, r) => s + r.taxableValue, 0) * 100) / 100,
  );

  protected readonly totalGst = computed(() =>
    Math.round(this.rows().reduce((s, r) => s + r.gstAmount, 0) * 100) / 100,
  );

  protected readonly totalCess = computed(() =>
    Math.round(this.rows().reduce((s, r) => s + r.cessAmount, 0) * 100) / 100,
  );

  protected readonly totalReturnAmount = computed(() =>
    Math.round(
      (this.rows().reduce((s, r) => s + r.lineTotal, 0) - this.totalDiscount() + this.totalGst() + this.totalCess()) *
        100 /
        100,
    ));

  async ngOnInit(): Promise<void> {
    this.canCreate.set(
      this.perm.has(['purchases-return.create', 'purchases.return.manage']),
    );
    if (!this.canCreate()) {
      this.toast.error('You do not have permission to create purchase returns');
      await this.router.navigate(['/access-denied']);
      return;
    }
    try {
      this.lookups.set(await this.purchaseSvc.getLookups());
    } catch (e: any) {
      this.toast.error('Failed to load lookups', e?.error?.message ?? e?.message ?? '');
    }
    // Deep-link from Purchase Register / list Return action.
    const pre = Number(this.route.snapshot.queryParamMap.get('purchaseId'));
    if (pre > 0) {
      try {
        const p = await this.purchaseSvc.getById(pre);
        this.supplierId = p.supplierId;
        await this.onSupplierChange();
        this.purchaseId = p.purchaseId;
        await this.onInvoiceChange();
      } catch {
        /* entry stays blank; user can select manually */
      }
    }
  }

  protected async onSupplierChange(): Promise<void> {
    this.purchaseId = null;
    this.source.set(null);
    this.rows.set([]);
    this.reason = '';
    this.remarks = '';
    if (!this.supplierId) {
      this.invoices.set([]);
      return;
    }
    this.loading.set(true);
    try {
      const page = await this.purchaseSvc.getPaged(1, 200, '');
      this.invoices.set((page.items ?? []).filter((p) => p.supplierId === this.supplierId));
    } catch (e: any) {
      this.toast.error('Failed to load supplier invoices', e?.error?.message ?? e?.message ?? '');
    } finally {
      this.loading.set(false);
    }
  }

  protected async onInvoiceChange(): Promise<void> {
    if (!this.purchaseId) return;
    this.loading.set(true);
    try {
      const p = await this.purchaseSvc.getById(this.purchaseId);
      this.source.set(p);
      // Aggregate previous returns for this purchase.
      let prev = new Map<number, number>();
      try {
        const rp = await this.svc.getPaged(1, 200, '');
        for (const r of rp.items ?? []) {
          if (r.purchaseId !== p.purchaseId) continue;
          let full: PurchaseReturnDto | null = null;
          try {
            full = await this.svc.getById(r.purchaseReturnId);
          } catch {
            full = null;
          }
          for (const it of full?.items ?? r.items ?? []) {
            if (it.purchaseItemId) {
              prev.set(it.purchaseItemId, (prev.get(it.purchaseItemId) ?? 0) + it.returnQuantity);
            }
          }
        }
      } catch {
        prev = new Map();
      }
      this.rows.set(
        p.items.map((i) => {
          const already = prev.get(i.purchaseItemId) ?? 0;
          const available = Math.max(0, i.quantity - already);
          const isFullyReturned = available <= 0;
          return {
            purchaseItemId: i.purchaseItemId,
            productId: i.productId,
            productCode: i.productCodeSnapshot,
            productName: i.productNameSnapshot,
            barcode: (i as any).barcode ?? null,
            unitId: i.unitID,
            unitName: i.unitNameSnapshot,
            purchasedQty: i.quantity,
            prevReturnedQty: already,
            availableQty: available,
            purchaseRate: i.purchaseRate,
            discountPercentage: 0,
            discountAmount: 0,
            taxableValue: 0,
            gstRate: (i as any).gstRate ?? (i as any).gSTRate ?? 0,
            gstAmount: 0,
            cgstRate: (i as any).cgstRate ?? 0,
            cgstAmount: 0,
            sgstRate: (i as any).sgstRate ?? 0,
            sgstAmount: 0,
            igstRate: (i as any).igstRate ?? 0,
            igstAmount: 0,
            cessRate: (i as any).cessRate ?? 0,
            cessAmount: 0,
            returnQty: 0,
            lineTotal: 0,
            validationStatus: isFullyReturned ? 'fullyReturned' : 'valid',
            validationMessage: isFullyReturned ? 'Fully Returned - No quantity available for return' : undefined,
          } as EntryRow;
        }),
      );
    } catch (e: any) {
      this.toast.error('Failed to load purchase', e?.error?.message ?? e?.message ?? '');
    } finally {
      this.loading.set(false);
    }
  }

  protected onQtyInput(): void {
    this.rows.update((list) =>
      list.map((r) => {
        // Skip fully returned rows
        if (r.validationStatus === 'fullyReturned') {
          r.returnQty = 0;
          r.lineTotal = 0;
          r.discountAmount = 0;
          r.taxableValue = 0;
          r.gstAmount = 0;
          r.cgstAmount = 0;
          r.sgstAmount = 0;
          r.igstAmount = 0;
          r.cessAmount = 0;
          return r;
        }

        // If returnQty is 0 or negative, clear calculations
        if (r.returnQty <= 0) {
          r.discountAmount = 0;
          r.taxableValue = 0;
          r.gstAmount = 0;
          r.cgstAmount = 0;
          r.sgstAmount = 0;
          r.igstAmount = 0;
          r.cessAmount = 0;
          r.lineTotal = 0;
          r.validationStatus = 'valid';
          r.validationMessage = undefined;
          return r;
        }

        // Ensure returnQty does not exceed available
        const cappedQty = Math.min(r.returnQty, r.availableQty);
        if (cappedQty !== r.returnQty) {
          r.returnQty = cappedQty;
          this.toast.warning(`Return quantity adjusted to available ${r.availableQty} for ${r.productName || r.productId}`);
        }

        // Gross Amount = CurrentReturnQty × PurchaseRate
        const grossAmount = Math.round(r.returnQty * r.purchaseRate * 100) / 100;

        // Discount Amount = GrossAmount × DiscountPercentage / 100
        // Use proportional discount based on returned quantity
        const discountPercentage = r.discountPercentage;
        const discountAmount = Math.round((grossAmount * discountPercentage) / 100 * 100) / 100;

        // Taxable Amount = Gross Amount - Discount Amount
        let taxableAmount = Math.round((grossAmount - discountAmount) * 100) / 100;

        // GST calculation - use original purchase tax information
        // Check if GST is inclusive or exclusive from the original purchase item
        const isGstInclusive = (r as any).isGSTInclusive ?? false;
        let gstAmount = 0;
        let cgstAmount = 0;
        let sgstAmount = 0;
        let igstAmount = 0;
        let cessAmount = 0;

        if (isGstInclusive) {
          // Inclusive GST: TaxableAmount = GrossAmount / (1 + GSTRate / 100)
          // GSTAmount = GrossAmount - TaxableAmount
          const rate = r.gstRate / 100;
          const taxable = Math.round(grossAmount / (1 + rate) * 100) / 100;
          gstAmount = Math.round((grossAmount - taxable) * 100) / 100;
          // Split into CGST/SGST/IGST based on original rates
          const totalGstRate = r.gstRate;
          // Assume proportionate split if original item had CGST/SGST/IGST rates
          const cgstPortion = Math.round((totalGstRate * 0.5) / 100 * taxable * 100) / 100;
          const sgstPortion = Math.round((totalGstRate * 0.5) / 100 * taxable * 100) / 100;
          const igstPortion = Math.round(totalGstRate / 100 * taxable * 100) / 100;
          // Adjust so they sum correctly
          const calculatedTotal = Math.round((cgstPortion + sgstPortion + igstPortion) * 100) / 100;
          if (calculatedTotal < Math.round(gstAmount * 100) / 100) {
            const diff = Math.round(gstAmount * 100) / 100 - calculatedTotal;
            // Add remainder to IGST
            igstAmount = Math.round((igstPortion + diff) * 100) / 100;
          } else {
            cgstAmount = cgstPortion;
            sgstAmount = sgstPortion;
            igstAmount = igstPortion;
          }
          taxableAmount = Math.round((grossAmount - gstAmount) * 100) / 100;
        } else {
          // Exclusive GST:
          // GSTAmount = TaxableAmount × GSTRate / 100
          // But we need to solve: TaxableAmount + TaxableAmount × GSTRate/100 = GrossAmount
          // TaxableAmount = GrossAmount / (1 + GSTRate/100)
          const rate = r.gstRate / 100;
          const baseTaxable = Math.round(grossAmount / (1 + rate) * 100) / 100;
          gstAmount = Math.round((grossAmount - baseTaxable) * 100) / 100;

          // Split into CGST/SGST/IGST
          const totalGstRate = r.gstRate;
          const cgstPortion = Math.round((totalGstRate * 0.5) / 100 * baseTaxable * 100) / 100;
          const sgstPortion = Math.round((totalGstRate * 0.5) / 100 * baseTaxable * 100) / 100;
          const igstPortion = Math.round(totalGstRate / 100 * baseTaxable * 100) / 100;
          const calculatedTotal = Math.round((cgstPortion + sgstPortion + igstPortion) * 100) / 100;
          if (calculatedTotal < Math.round(gstAmount * 100) / 100) {
            const diff = Math.round(gstAmount * 100) / 100 - calculatedTotal;
            igstAmount = Math.round((igstPortion + diff) * 100) / 100;
          } else {
            cgstAmount = cgstPortion;
            sgstAmount = sgstPortion;
            igstAmount = igstPortion;
          }
        }

        // CGST/SGST/IGST amounts
        r.cgstAmount = cgstAmount;
        r.sgstAmount = sgstAmount;
        r.igstAmount = igstAmount;

        // CESS Amount
        const cessRate = r.cessRate;
        r.cessAmount = cessRate ? Math.round((taxableAmount * cessRate) / 100 * 100) / 100 : 0;

        // Line Total = TaxableAmount + CGST + SGST + IGST + CESS
        r.lineTotal = Math.round(
          (taxableAmount + cgstAmount + sgstAmount + igstAmount + r.cessAmount) * 100,
        ) / 100;

        // Validation
        if (r.returnQty <= 0) {
          r.validationStatus = 'valid';
          r.validationMessage = undefined;
        } else if (r.returnQty > r.availableQty) {
          r.validationStatus = 'exceedsLimit';
          r.validationMessage = `Return qty ${r.returnQty} exceeds available ${r.availableQty}`;
        } else {
          r.validationStatus = 'valid';
          r.validationMessage = undefined;
        }

        return r;
      }),
    );
  }

  protected async submit(): Promise<void> {
    const src = this.source();
    if (!src) {
      this.toast.error('Select a purchase invoice first');
      return;
    }
    // Validate all rows
    for (const r of this.rows()) {
      if (r.returnQty <= 0) {
        this.toast.error(`Return quantity must be greater than zero for ${r.productName || r.productId}`);
        return;
      }
      if (r.returnQty > r.availableQty) {
        this.toast.error(`Return qty for ${r.productName || r.productId} exceeds available ${r.availableQty}`);
        return;
      }
      if (r.availableQty <= 0) {
        this.toast.error(`(${r.productName || r.productId}) is fully returned - no quantity available`);
        return;
      }
    }

    // Calculate final payload items
    const items: CreatePurchaseReturnItemInput[] = [];
    for (const r of this.rows()) {
      if (r.returnQty <= 0) continue;
      if (r.validationStatus !== 'valid') {
        this.toast.error(r.validationMessage || 'Invalid return quantity');
        return;
      }

      // Recalculate values for payload
      const grossAmount = Math.round(r.returnQty * r.purchaseRate * 100) / 100;
      const discountPercentage = r.discountPercentage;
      const discountAmount = Math.round((grossAmount * discountPercentage) / 100 * 100) / 100;
      const taxableValue = Math.round((grossAmount - discountAmount) * 100) / 100;

      let gstRate = r.gstRate;
      let gstAmount = r.gstAmount;
      let cgstRate = r.cgstRate;
      let cgstAmount = r.cgstAmount;
      let sgstRate = r.sgstRate;
      let sgstAmount = r.sgstAmount;
      let igstRate = r.igstRate;
      let igstAmount = r.igstAmount;
      let cessRate = r.cessRate;
      let cessAmount = r.cessAmount;

      // If rates are 0, try to get from original purchase item
      if (gstRate === 0) {
        gstRate = (src.items?.find((x) => x.purchaseItemId === r.purchaseItemId) as any)?.gstRate ?? 0;
      }
      if (cgstRate === 0) {
        cgstRate = (src.items?.find((x) => x.purchaseItemId === r.purchaseItemId) as any)?.cgstRate ?? 0;
      }
      if (sgstRate === 0) {
        sgstRate = (src.items?.find((x) => x.purchaseItemId === r.purchaseItemId) as any)?.sgstRate ?? 0;
      }
      if (igstRate === 0) {
        igstRate = (src.items?.find((x) => x.purchaseItemId === r.purchaseItemId) as any)?.igstRate ?? 0;
      }
      if (cessRate === 0) {
        cessRate = (src.items?.find((x) => x.purchaseItemId === r.purchaseItemId) as any)?.cessRate ?? 0;
      }

      items.push({
        purchaseItemId: r.purchaseItemId,
        productId: r.productId,
        unitId: r.unitId,
        returnQuantity: r.returnQty,
        purchaseRate: r.purchaseRate,
        discountAmount: discountAmount,
        taxableValue: taxableValue,
        gstRate: gstRate,
        gstAmount: gstAmount,
        cgstRate: cgstRate,
        cgstAmount: cgstAmount,
        sgstRate: sgstRate,
        sgstAmount: sgstAmount,
        igstRate: igstRate,
        igstAmount: igstAmount,
        cessRate: cessRate,
        cessAmount: cessAmount,
      });
    }

    if (!items.length) {
      this.toast.error('Enter at least one return quantity');
      return;
    }

    this.saving.set(true);
    try {
      await this.svc.create({
        purchaseId: src.purchaseId,
        returnDate: this.returnDate,
        reason: this.reason || null,
        remarks: this.remarks || null,
        items,
      });
      this.toast.success('Purchase return created');
      await this.router.navigate(['/purchase'], { queryParams: { tab: 'returns' } });
    } catch (e: any) {
      this.toast.error('Failed to create return', e?.error?.message ?? e?.message ?? '');
    } finally {
      this.saving.set(false);
    }
  }

  protected cancel(): void {
    this.router.navigate(['/purchase'], { queryParams: { tab: 'returns' } });
  }
}