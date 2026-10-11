import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { BaseButton } from '../../shared/base-button';
import { BaseDropdown, BaseInput, BaseSearch } from '../../shared/base-controls';
import { ToastService } from '../../core/services/toast.service';
import { PermissionService } from '../../core/services/permission.service';
import {
  PurchaseWorkflowService,
  PurchaseOrderDto,
  CreatePurchaseOrderRequest,
} from '../../core/services/purchase-workflow.service';
import { PurchaseService, PurchaseLookupsDto } from '../../core/services/master_service';

interface OrderLine {
  productId: number | string;
  unitId: number | string;
  orderedQuantity: string;
  unitPrice: string;
}

@Component({
  selector: 'app-purchase-orders',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, DatePipe, LucideAngularModule, BaseButton, BaseDropdown, BaseInput, BaseSearch],
  templateUrl: './purchase-orders.html',
  styleUrl: './purchase-orders.css',
})
export class PurchaseOrdersPage implements OnInit {
  private readonly workflow = inject(PurchaseWorkflowService);
  private readonly purchases = inject(PurchaseService);
  private readonly toast = inject(ToastService);
  protected readonly perm = inject(PermissionService);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly rows = signal<PurchaseOrderDto[]>([]);
  protected readonly search = signal('');
  protected readonly statusFilter = signal('');
  protected readonly pageNumber = signal(1);
  protected readonly totalCount = signal(0);
  protected readonly pageSize = 20;

  protected readonly showEntry = signal(false);
  protected readonly selected = signal<PurchaseOrderDto | null>(null);
  protected readonly detail = signal<PurchaseOrderDto | null>(null);

  protected readonly lookups = signal<PurchaseLookupsDto | null>(null);
  protected readonly supplierId = signal<string | number>('');
  protected readonly warehouseId = signal<string | number>('');
  protected readonly orderDate = signal(new Date().toISOString().slice(0, 10));
  protected readonly expectedDate = signal('');
  protected readonly remarks = signal('');
  protected readonly lines = signal<OrderLine[]>([]);

  protected readonly canCreate = () => this.perm.has('purchases.create');
  protected readonly canManage = () => this.perm.has('purchases.manage');

  protected readonly supplierOptions = computed(() =>
    (this.lookups()?.suppliers ?? []).map((s) => ({ value: s.id, label: s.name || s.code || String(s.id) })),
  );
  protected readonly warehouseOptions = computed(() =>
    (this.lookups()?.warehouses ?? []).map((w) => ({ value: w.id, label: w.name || String(w.id) })),
  );
  protected readonly productOptions = computed(() =>
    (this.lookups()?.products ?? []).map((p) => ({
      value: p.id,
      label: `${p.code ? p.code + ' — ' : ''}${p.name ?? p.id}`,
      uomId: p.uomId ?? null,
    })),
  );

  protected readonly statusOptions = [
    { value: '', label: 'All statuses' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'SUBMITTED', label: 'Submitted' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    try {
      const result = await this.workflow.getOrders(this.pageNumber(), this.pageSize, this.statusFilter());
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
    this.selected.set(null);
    this.detail.set(null);
    try {
      if (!this.lookups()) this.lookups.set(await this.purchases.getLookups());
    } catch {
      /* lookups optional for entry */
    }
    const lk = this.lookups();
    this.supplierId.set('');
    this.warehouseId.set(lk?.warehouses?.[0]?.id ?? '');
    this.orderDate.set(new Date().toISOString().slice(0, 10));
    this.expectedDate.set('');
    this.remarks.set('');
    this.lines.set([{ productId: '', unitId: '', orderedQuantity: '1', unitPrice: '0' }]);
    this.showEntry.set(true);
  }

  protected async openDetail(id: number): Promise<void> {
    try {
      const po = await this.workflow.getOrder(id);
      this.detail.set(po);
      this.selected.set(po);
      this.showEntry.set(false);
    } catch {
      /* interceptor shows the error */
    }
  }

  protected addLine(): void {
    this.lines.update((l) => [...l, { productId: '', unitId: '', orderedQuantity: '1', unitPrice: '0' }]);
  }

  protected removeLine(index: number): void {
    this.lines.update((l) => l.filter((_, i) => i !== index));
  }

  protected lineTotal(line: OrderLine): number {
    return (Number(line.orderedQuantity) || 0) * (Number(line.unitPrice) || 0);
  }

  protected get grandTotal(): number {
    return this.lines().reduce((sum, l) => sum + this.lineTotal(l), 0);
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    const lines = this.lines().filter((l) => l.productId !== '' && Number(l.orderedQuantity) > 0);
    if (!this.supplierId() || lines.length === 0) {
      this.toast.warning('Supplier and at least one line with a quantity are required');
      return;
    }
    const lk = this.lookups();
    const payload: CreatePurchaseOrderRequest = {
      supplierId: Number(this.supplierId()),
      orderDate: this.orderDate(),
      expectedDate: this.expectedDate() || null,
      warehouseId: Number(this.warehouseId() || lk?.warehouses?.[0]?.id || 0),
      remarks: this.remarks() || null,
      items: lines.map((l) => ({
        productId: Number(l.productId),
        unitId: Number(l.unitId || lk?.products?.find((p) => p.id === Number(l.productId))?.uomId || 0),
        orderedQuantity: Number(l.orderedQuantity),
        unitPrice: Number(l.unitPrice),
      })),
    };
    this.saving.set(true);
    try {
      const po = await this.workflow.createOrder(payload);
      this.toast.success(`Purchase order ${po.purchaseOrderNumber} created`);
      this.showEntry.set(false);
      await this.openDetail(po.purchaseOrderId);
      await this.load();
    } catch {
      /* interceptor shows the error */
    } finally {
      this.saving.set(false);
    }
  }

  protected async act(action: 'submit' | 'approve'): Promise<void> {
    const po = this.detail();
    if (!po) return;
    this.saving.set(true);
    try {
      const updated =
        action === 'submit' ? await this.workflow.submitOrder(po.purchaseOrderId) : await this.workflow.approveOrder(po.purchaseOrderId);
      this.detail.set(updated);
      this.toast.success(`Order ${updated.status.toLowerCase()}`);
      await this.load();
    } catch {
      /* interceptor shows the error */
    } finally {
      this.saving.set(false);
    }
  }

  protected async actWithReason(action: 'reject' | 'cancel'): Promise<void> {
    const po = this.detail();
    if (!po) return;
    const reason = window.prompt(action === 'reject' ? 'Rejection reason' : 'Cancellation reason');
    if (!reason?.trim()) return;
    this.saving.set(true);
    try {
      const updated =
        action === 'reject' ? await this.workflow.rejectOrder(po.purchaseOrderId, reason) : await this.workflow.cancelOrder(po.purchaseOrderId, reason);
      this.detail.set(updated);
      this.toast.success(`Order ${updated.status.toLowerCase()}`);
      await this.load();
    } catch {
      /* interceptor shows the error */
    } finally {
      this.saving.set(false);
    }
  }

  protected statusClass(status: string): string {
    switch (status) {
      case 'APPROVED':
        return 'status-pill status-approved';
      case 'SUBMITTED':
        return 'status-pill status-submitted';
      case 'REJECTED':
      case 'CANCELLED':
        return 'status-pill status-rejected';
      default:
        return 'status-pill status-draft';
    }
  }
}
