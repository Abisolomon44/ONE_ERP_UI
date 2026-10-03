import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { SalesService, SalesInvoiceDto } from '../../core/services/sales.service';
import {
  SalesReturnService,
  SalesReturnDto,
  CreateSalesReturnItemInput,
} from '../../core/services/sales-return.service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionService } from '../../core/services/permission.service';

interface ReturnDraft {
  salesInvoiceItemId: number;
  productId: number;
  productName: string;
  unitID: number;
  originalQty: number;
  returnQuantity: number;
  rate: number;
  discountAmount: number;
  gstPercent: number;
  cgstPercent: number;
  sgstPercent: number;
  igstPercent: number;
  cessPercent: number;
  lineTotal: number;
}

@Component({
  selector: 'app-sales-return',
  standalone: true,
  imports: [FormsModule, DecimalPipe, SlicePipe, LucideAngularModule],
  templateUrl: './sales-return.html',
  styleUrl: './sales-return.css',
})
export class SalesReturnPage implements OnInit {
  private readonly svc = inject(SalesReturnService);
  private readonly salesSvc = inject(SalesService);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);

  protected readonly canView = signal(false);
  protected readonly canManage = signal(false);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly returns = signal<SalesReturnDto[]>([]);

  protected readonly showForm = signal(false);
  protected sourceId = '';
  protected returnDate = new Date().toISOString().slice(0, 10);
  protected reason = '';
  protected remarks = '';
  protected refundAmount = 0;
  protected source: SalesInvoiceDto | null = null;
  protected readonly draft = signal<ReturnDraft[]>([]);

  protected readonly grandTotal = computed(() => this.draft().reduce((s, d) => s + (d.lineTotal || 0), 0));

  async ngOnInit(): Promise<void> {
    this.canView.set(this.perm.has(['sales.return.view', 'sales.return.manage', 'sales.view']));
    this.canManage.set(this.perm.has('sales.return.manage'));
    if (this.canView()) await this.load();
  }

  protected newReturn(): void {
    if (!this.canManage()) return;
    this.showForm.set(true);
    this.sourceId = '';
    this.source = null;
    this.draft.set([]);
    this.reason = '';
    this.remarks = '';
    this.refundAmount = 0;
    this.returnDate = new Date().toISOString().slice(0, 10);
  }

  protected closeForm(): void {
    this.showForm.set(false);
  }

  private async load(): Promise<void> {
    try {
      this.loading.set(true);
      const p = await this.svc.getPaged(1, 50, '');
      this.returns.set(p.items ?? []);
    } catch (e: any) {
      this.toast.error('Failed to load sales returns', e?.error?.message ?? e?.message ?? '');
    } finally {
      this.loading.set(false);
    }
  }

  protected async loadSource(): Promise<void> {
    const id = Number(this.sourceId);
    if (!id) return;
    try {
      const d = await this.salesSvc.getById(id);
      if (!d) {
        this.toast.error('Sales invoice not found');
        return;
      }
      if (!/POSTED/i.test(d.invoiceStatus ?? 'POSTED')) {
        this.toast.error('Only posted invoices can be returned');
        return;
      }
      this.source = d;
      this.draft.set(
        (d.items ?? []).map((it) => ({
          salesInvoiceItemId: it.salesInvoiceItemId,
          productId: it.productId,
          productName: it.productNameSnapshot ?? String(it.productId),
          unitID: it.unitID,
          originalQty: it.quantity,
          returnQuantity: 0,
          rate: it.rate,
          discountAmount: 0,
          gstPercent: it.gstPercent,
          cgstPercent: it.cgstPercent,
          sgstPercent: it.sgstPercent,
          igstPercent: it.igstPercent,
          cessPercent: it.cessPercent,
          lineTotal: 0,
        })),
      );
    } catch (e: any) {
      this.toast.error('Failed to load sales invoice', e?.error?.message ?? e?.message ?? '');
    }
  }

  protected recalc(d: ReturnDraft): void {
    if (d.returnQuantity > d.originalQty) d.returnQuantity = d.originalQty;
    const gross = d.rate * d.returnQuantity;
    const taxable = gross - d.discountAmount;
    d.lineTotal =
      taxable +
      (taxable * d.cgstPercent) / 100 +
      (taxable * d.sgstPercent) / 100 +
      (taxable * d.igstPercent) / 100 +
      (taxable * d.cessPercent) / 100;
  }

  protected onQtyChange(): void {
    for (const d of this.draft()) this.recalc(d);
    this.draft.set([...this.draft()]);
  }

  protected async submit(): Promise<void> {
    const source = this.source;
    if (!source) return;
    const items: CreateSalesReturnItemInput[] = this.draft()
      .filter((d) => d.returnQuantity > 0)
      .map((d) => ({
        salesInvoiceItemId: d.salesInvoiceItemId,
        productId: d.productId,
        unitID: d.unitID,
        returnQuantity: d.returnQuantity,
        freeQuantity: 0,
        rate: d.rate,
        discountAmount: d.discountAmount,
        gstPercent: d.gstPercent,
        cgstPercent: d.cgstPercent,
        sgstPercent: d.sgstPercent,
        igstPercent: d.igstPercent,
        cessPercent: d.cessPercent,
      }));
    if (items.length === 0) {
      this.toast.error('Enter a return quantity for at least one item');
      return;
    }
    this.saving.set(true);
    try {
      await this.svc.create({
        salesInvoiceId: source.salesInvoiceId,
        returnDate: this.returnDate,
        items,
        reason: this.reason || null,
        remarks: this.remarks || null,
        refund: this.refundAmount > 0 ? { amount: this.refundAmount } : null,
      });
      this.toast.success('Sales return created');
      this.showForm.set(false);
      await this.load();
    } catch (e: any) {
      this.toast.error('Failed to create sales return', e?.error?.message ?? e?.message ?? '');
    } finally {
      this.saving.set(false);
    }
  }

  protected async cancelReturn(r: SalesReturnDto): Promise<void> {
    if (!this.canManage()) return;
    const reason = window.prompt(`Cancellation reason for ${r.returnNumber}:`);
    if (!reason) return;
    try {
      await this.svc.cancel(r.salesReturnId, reason);
      this.toast.success('Sales return cancelled');
      await this.load();
    } catch (e: any) {
      this.toast.error('Failed to cancel sales return', e?.error?.message ?? e?.message ?? '');
    }
  }
}
