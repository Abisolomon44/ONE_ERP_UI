import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { BaseButton } from '../../shared/base-button';
import { BaseDropdown, BaseInput } from '../../shared/base-controls';
import { ToastService } from '../../core/services/toast.service';
import { PermissionService } from '../../core/services/permission.service';
import {
  PurchaseWorkflowService,
  GoodsReceiptDto,
  ReceiptStatusDto,
  CreateGoodsReceiptRequest,
} from '../../core/services/purchase-workflow.service';
import { PurchaseService, PurchaseLookupsDto } from '../../core/services/master_service';

interface ReceiptLine {
  purchaseOrderItemId: number | null;
  productId: number;
  unitId: number;
  productName: string;
  ordered: number;
  received: string;
  accepted: string;
  rejected: string;
  unitCost: string;
}

@Component({
  selector: 'app-goods-receipts',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, DatePipe, LucideAngularModule, BaseButton, BaseDropdown, BaseInput],
  templateUrl: './goods-receipts.html',
  styleUrl: './goods-receipts.css',
})
export class GoodsReceiptsPage implements OnInit {
  private readonly workflow = inject(PurchaseWorkflowService);
  private readonly purchases = inject(PurchaseService);
  private readonly toast = inject(ToastService);
  protected readonly perm = inject(PermissionService);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly rows = signal<GoodsReceiptDto[]>([]);
  protected readonly statusFilter = signal('');
  protected readonly pageNumber = signal(1);
  protected readonly totalCount = signal(0);
  protected readonly pageSize = 20;

  protected readonly showEntry = signal(false);
  protected readonly detail = signal<GoodsReceiptDto | null>(null);

  protected readonly lookups = signal<PurchaseLookupsDto | null>(null);
  protected readonly approvedOrders = signal<{ value: number; label: string }[]>([]);
  protected readonly selectedPoId = signal<string | number>('');
  protected readonly receiptStatus = signal<ReceiptStatusDto | null>(null);
  protected readonly supplierId = signal<number>(0);
  protected readonly warehouseId = signal<string | number>('');
  protected readonly receiptDate = signal(new Date().toISOString().slice(0, 10));
  protected readonly remarks = signal('');
  protected readonly lines = signal<ReceiptLine[]>([]);

  protected readonly canCreate = () => this.perm.has('purchases.create');
  protected readonly canManage = () => this.perm.has('purchases.manage');

  protected readonly statusOptions = [
    { value: '', label: 'All statuses' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'POSTED', label: 'Posted' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  protected readonly warehouseOptions = computed(() =>
    (this.lookups()?.warehouses ?? []).map((w) => ({ value: w.id, label: w.name || String(w.id) })),
  );

  ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    try {
      const result = await this.workflow.getReceipts(this.pageNumber(), this.pageSize, this.statusFilter());
      this.rows.set(result.items ?? []);
      this.totalCount.set(result.totalCount ?? 0);
    } catch {
      /* interceptor shows the error */
    } finally {
      this.loading.set(false);
    }
  }

  protected prevPage(): void {
    if (this.pageNumber() > 1) {
      this.pageNumber.update((p) => p - 1);
      void this.load();
    }
  }

  protected nextPage(): void {
    const pages = Math.max(1, Math.ceil(this.totalCount() / this.pageSize));
    if (this.pageNumber() < pages) {
      this.pageNumber.update((p) => p + 1);
      void this.load();
    }
  }

  protected async openNew(): Promise<void> {
    this.detail.set(null);
    try {
      if (!this.lookups()) this.lookups.set(await this.purchases.getLookups());
      // Approved POs are the valid receipt sources in ERP mode.
      const orders = await this.workflow.getOrders(1, 100, 'APPROVED');
      this.approvedOrders.set(
        (orders.items ?? []).map((o) => ({
          value: o.purchaseOrderId,
          label: `${o.purchaseOrderNumber} — ${o.supplierName || o.supplierId} (${o.grandTotal})`,
        })),
      );
    } catch {
      /* lookups optional */
    }
    this.selectedPoId.set('');
    this.receiptStatus.set(null);
    this.receiptDate.set(new Date().toISOString().slice(0, 10));
    this.remarks.set('');
    this.lines.set([]);
    this.warehouseId.set(this.lookups()?.warehouses?.[0]?.id ?? '');
    this.showEntry.set(true);
  }

  protected async selectPo(): Promise<void> {
    const poId = Number(this.selectedPoId());
    if (!poId) return;
    try {
      const [po, status] = await Promise.all([this.workflow.getOrder(poId), this.workflow.getReceiptStatus(poId)]);
      this.receiptStatus.set(status);
      this.supplierId.set(po.supplierId);
      this.warehouseId.set(po.warehouseId);
      const poItems = po.items ?? [];
      this.lines.set(
        status.items.map((si) => {
          const poItem = poItems.find((x) => x.purchaseOrderItemId === si.purchaseOrderItemId);
          const remaining = Math.max(0, si.orderedQuantity - si.cancelledQuantity - si.receivedQuantity);
          return {
            purchaseOrderItemId: si.purchaseOrderItemId,
            productId: si.productId,
            unitId: poItem?.unitId ?? 0,
            productName: poItem?.productName || poItem?.productCode || String(si.productId),
            ordered: si.orderedQuantity,
            received: String(remaining),
            accepted: String(remaining),
            rejected: '0',
            unitCost: String(poItem?.unitPrice ?? 0),
          };
        }),
      );
    } catch {
      /* interceptor shows the error */
    }
  }

  protected updateAccepted(line: ReceiptLine): void {
    const recv = Number(line.received) || 0;
    const rej = Number(line.rejected) || 0;
    line.accepted = String(Math.max(0, recv - rej));
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    const active = this.lines().filter((l) => Number(l.received) > 0);
    if (active.length === 0 || !this.supplierId()) {
      this.toast.warning('Add at least one received line');
      return;
    }
    for (const l of active) {
      const recv = Number(l.received) || 0;
      const acc = Number(l.accepted) || 0;
      const rej = Number(l.rejected) || 0;
      if (acc + rej > recv) {
        this.toast.error('Accepted + rejected cannot exceed received', l.productName);
        return;
      }
    }
    const poId = Number(this.selectedPoId());
    const payload: CreateGoodsReceiptRequest = {
      purchaseOrderId: poId || null,
      supplierId: this.supplierId(),
      warehouseId: Number(this.warehouseId() || 0),
      receiptDate: this.receiptDate(),
      remarks: this.remarks() || null,
      items: active.map((l) => ({
        purchaseOrderItemId: l.purchaseOrderItemId,
        productId: l.productId,
        unitId: l.unitId,
        receivedQuantity: Number(l.received),
        acceptedQuantity: Number(l.accepted),
        rejectedQuantity: Number(l.rejected),
        unitCost: Number(l.unitCost),
      })),
    };
    this.saving.set(true);
    try {
      const grn = await this.workflow.createReceipt(payload);
      this.toast.success(`Receipt ${grn.grnNumber} created as draft`);
      this.showEntry.set(false);
      this.detail.set(grn);
      await this.load();
    } catch {
      /* interceptor shows the error */
    } finally {
      this.saving.set(false);
    }
  }

  protected async openDetail(id: number): Promise<void> {
    try {
      this.detail.set(await this.workflow.getReceipt(id));
      this.showEntry.set(false);
    } catch {
      /* interceptor shows the error */
    }
  }

  protected async post(): Promise<void> {
    const grn = this.detail();
    if (!grn) return;
    this.saving.set(true);
    try {
      const posted = await this.workflow.postReceipt(grn.goodsReceiptId);
      this.detail.set(posted);
      this.toast.success('Receipt posted — stock updated');
      await this.load();
    } catch {
      /* interceptor shows the error */
    } finally {
      this.saving.set(false);
    }
  }

  protected async cancel(): Promise<void> {
    const grn = this.detail();
    if (!grn) return;
    const reason = window.prompt('Cancellation reason');
    if (!reason?.trim()) return;
    this.saving.set(true);
    try {
      const cancelled = await this.workflow.cancelReceipt(grn.goodsReceiptId, reason);
      this.detail.set(cancelled);
      this.toast.success('Receipt cancelled');
      await this.load();
    } catch {
      /* interceptor shows the error */
    } finally {
      this.saving.set(false);
    }
  }

  protected statusClass(status: string): string {
    switch (status) {
      case 'POSTED':
        return 'status-pill status-approved';
      case 'CANCELLED':
        return 'status-pill status-rejected';
      default:
        return 'status-pill status-draft';
    }
  }
}
