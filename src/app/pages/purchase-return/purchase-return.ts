import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import {
  PurchaseService,
  PurchaseReturnService,
  PurchaseReturnDto,
  PurchaseDto,
  CreatePurchaseReturnRequest,
  CreatePurchaseReturnItemInput,
} from '../../core/services/master_service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionService } from '../../core/services/permission.service';

interface ReturnDraft {
  purchaseItemId: number;
  productId: number;
  productName: string;
  unitId: number;
  originalQty: number;
  returnQuantity: number;
  purchaseRate: number;
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
  lineTotal: number;
}

@Component({
  selector: 'app-purchase-return',
  standalone: true,
  imports: [FormsModule, DecimalPipe, SlicePipe, LucideAngularModule],
  templateUrl: './purchase-return.html',
  styleUrl: './purchase-return.css',
})
export class PurchaseReturnPage implements OnInit {
  private readonly svc = inject(PurchaseReturnService);
  private readonly purchaseSvc = inject(PurchaseService);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);

  protected readonly canView = signal(false);
  protected readonly canManage = signal(false);
  protected readonly loading = signal(false);
  protected readonly returns = signal<PurchaseReturnDto[]>([]);

  protected readonly showForm = signal(false);
  protected sourceId = '';
  protected returnDate = new Date().toISOString().slice(0, 10);
  protected reason = '';
  protected remarks = '';
  protected source: PurchaseDto | null = null;
  protected readonly draft = signal<ReturnDraft[]>([]);

  async ngOnInit(): Promise<void> {
    this.canView.set(this.perm.has('purchases.return.view'));
    this.canManage.set(this.perm.has('purchases.return.manage'));
    if (this.canView()) await this.load();
  }

  private async load(): Promise<void> {
    try {
      this.loading.set(true);
      const p = await this.svc.getPaged(1, 50, '');
      this.returns.set(p.items ?? []);
    } catch (e: any) {
      this.toast.error('Failed to load returns', e?.error?.message ?? e?.message ?? '');
    } finally {
      this.loading.set(false);
    }
  }

  protected async openForm(): Promise<void> {
    if (!this.canManage()) return;
    this.showForm.set(true);
    this.sourceId = '';
    this.source = null;
    this.draft.set([]);
    this.reason = '';
    this.remarks = '';
    this.returnDate = new Date().toISOString().slice(0, 10);
  }

  protected async loadSource(): Promise<void> {
    const id = Number(this.sourceId);
    if (!id) return;
    try {
      const d = await this.purchaseSvc.getById(id);
      if (!d) {
        this.toast.error('Purchase not found');
        return;
      }
      this.source = d;
      this.draft.set(
        d.items.map((i) => {
          const taxable = Math.round(i.quantity * i.purchaseRate * 100) / 100;
          return {
            purchaseItemId: i.purchaseItemId,
            productId: i.productId,
            productName: i.productNameSnapshot ?? '',
            unitId: i.unitID,
            originalQty: i.quantity,
            returnQuantity: 0,
            purchaseRate: i.purchaseRate,
            discountAmount: 0,
            taxableValue: taxable,
            gstRate: i.gstRate,
            gstAmount: Math.round(taxable * (i.gstRate / 100) * 100) / 100,
            cgstRate: i.cgstRate,
            cgstAmount: Math.round(taxable * (i.cgstRate / 100) * 100) / 100,
            sgstRate: i.sgstRate,
            sgstAmount: Math.round(taxable * (i.sgstRate / 100) * 100) / 100,
            igstRate: i.igstRate,
            igstAmount: Math.round(taxable * (i.igstRate / 100) * 100) / 100,
            cessRate: i.cessRate,
            cessAmount: Math.round(taxable * (i.cessRate / 100) * 100) / 100,
            lineTotal: 0,
          } as ReturnDraft;
        }),
      );
      this.recalculate();
    } catch (e: any) {
      this.toast.error('Failed to load purchase', e?.error?.message ?? e?.message ?? '');
    }
  }

  protected onQtyChange(): void {
    this.recalculate();
  }

  protected recalculate(): void {
    this.draft.update((items) =>
      items.map((it) => {
        const base = it.returnQuantity * it.purchaseRate;
        const taxable = Math.round((base - it.discountAmount) * 100) / 100;
        it.taxableValue = taxable;
        it.gstAmount = Math.round(taxable * (it.gstRate / 100) * 100) / 100;
        it.cgstAmount = Math.round(taxable * (it.cgstRate / 100) * 100) / 100;
        it.sgstAmount = Math.round(taxable * (it.sgstRate / 100) * 100) / 100;
        it.igstAmount = Math.round(taxable * (it.igstRate / 100) * 100) / 100;
        it.cessAmount = Math.round(taxable * (it.cessRate / 100) * 100) / 100;
        it.lineTotal = Math.round((taxable + it.gstAmount + it.cessAmount) * 100) / 100;
        return it;
      }),
    );
  }

  protected get grandTotal(): number {
    return Math.round(this.draft().reduce((s, it) => s + it.lineTotal, 0) * 100) / 100;
  }

  protected async submit(): Promise<void> {
    if (!this.source) {
      this.toast.error('Load a purchase first');
      return;
    }
    const items: CreatePurchaseReturnItemInput[] = this.draft()
      .filter((it) => it.returnQuantity > 0)
      .map((it) => ({
        purchaseItemId: it.purchaseItemId,
        productId: it.productId,
        unitId: it.unitId,
        returnQuantity: it.returnQuantity,
        purchaseRate: it.purchaseRate,
        discountAmount: it.discountAmount,
        taxableValue: it.taxableValue,
        gstRate: it.gstRate,
        gstAmount: it.gstAmount,
        cgstRate: it.cgstRate,
        cgstAmount: it.cgstAmount,
        sgstRate: it.sgstRate,
        sgstAmount: it.sgstAmount,
        igstRate: it.igstRate,
        igstAmount: it.igstAmount,
        cessRate: it.cessRate,
        cessAmount: it.cessAmount,
      }));
    if (!items.length) {
      this.toast.error('Enter at least one return quantity');
      return;
    }
    const req: CreatePurchaseReturnRequest = {
      purchaseId: this.source.purchaseId,
      returnDate: this.returnDate,
      reason: this.reason || null,
      remarks: this.remarks || null,
      items,
    };
    try {
      await this.svc.create(req);
      this.toast.success('Purchase return saved');
      this.showForm.set(false);
      await this.load();
    } catch (e: any) {
      this.toast.error('Failed to save return', e?.error?.message ?? e?.message ?? '');
    }
  }

  protected cancel(): void {
    this.showForm.set(false);
  }
}
