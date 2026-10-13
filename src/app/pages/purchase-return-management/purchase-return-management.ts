import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  PurchaseService,
  PurchaseReturnService,
  PurchaseReturnDto,
  PurchaseDto,
  PurchaseLookupsDto,
  LookupItem,
  DeleteCheckDto,
} from '../../core/services/master_service';
import { PermissionService } from '../../core/services/permission.service';
import { ToastService } from '../../core/services/toast.service';

export type ReturnMode = 'view' | 'edit' | 'cancel' | 'delete';

@Component({
  selector: 'app-purchase-return-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './purchase-return-management.html',
  styleUrl: './purchase-return-management.css',
})
export class PurchaseReturnManagementPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly svc = inject(PurchaseReturnService);
  private readonly purchaseSvc = inject(PurchaseService);
  private readonly perm = inject(PermissionService);
  private readonly toast = inject(ToastService);

  protected readonly mode = signal<ReturnMode>('view');
  protected readonly loading = signal(false);
  protected readonly loadError = signal('');
  protected readonly saving = signal(false);
  protected readonly ret = signal<PurchaseReturnDto | null>(null);
  protected readonly source = signal<PurchaseDto | null>(null);
  protected readonly lookups = signal<PurchaseLookupsDto | null>(null);
  protected readonly deleteCheck = signal<DeleteCheckDto | null>(null);

  protected readonly canView = signal(false);
  protected readonly canEdit = signal(false);
  protected readonly canCancel = signal(false);
  protected readonly canDelete = signal(false);

  protected cancelReason = '';
  protected editDate = '';
  protected editReason = '';
  protected editRemarks = '';

  async ngOnInit(): Promise<void> {
    this.canView.set(this.perm.has(['purchases-return.view', 'purchases.return.view', 'purchases.return.manage']));
    this.canEdit.set(this.perm.has(['purchases-return.edit', 'purchases.return.manage']));
    this.canCancel.set(this.perm.has(['purchases-return.cancel', 'purchases.return.manage']));
    this.canDelete.set(this.perm.has(['purchases-return.delete', 'purchases.return.manage']));

    const m = (this.route.snapshot.queryParamMap.get('mode') ?? 'view').toLowerCase();
    const mode: ReturnMode = m === 'edit' || m === 'cancel' || m === 'delete' ? (m as ReturnMode) : 'view';
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
    if (!Number.isInteger(id) || id <= 0) {
      this.loadError.set('A valid purchase return ID is required.');
      return;
    }
    await this.load(id);
  }

  private async load(id: number): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');
    try {
      this.lookups.set(await this.purchaseSvc.getLookups().catch(() => null));
      const r = await this.svc.getById(id);
      this.ret.set(r);
      this.editDate = (r.returnDate ?? '').slice(0, 10);
      this.editReason = r.reason ?? '';
      this.editRemarks = r.remarks ?? '';
      try {
        this.source.set(await this.purchaseSvc.getById(r.purchaseId));
      } catch {
        this.source.set(null);
      }
      if (this.mode() === 'delete') {
        this.deleteCheck.set(await this.svc.deleteCheck(id).catch(() => null));
      }
    } catch (e: any) {
      const detail = e?.error?.message ?? e?.message ?? 'Please try again.';
      this.loadError.set(`Failed to load purchase return. ${detail}`);
      this.toast.error('Failed to load purchase return', detail);
    } finally {
      this.loading.set(false);
    }
  }

  protected retryLoad(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (Number.isInteger(id) && id > 0) void this.load(id);
  }

  protected lookupName(items: LookupItem[] | undefined, id: number | null | undefined): string {
    if (id == null) return '—';
    const item = items?.find((entry) => Number(entry.id) === Number(id));
    return item?.name || item?.code || String(id);
  }

  protected get title(): string {
    switch (this.mode()) {
      case 'edit':
        return 'Edit Purchase Return';
      case 'cancel':
        return 'Cancel Purchase Return';
      case 'delete':
        return 'Delete Purchase Return';
      default:
        return 'View Purchase Return';
    }
  }

  protected async saveEdit(): Promise<void> {
    const r = this.ret();
    if (!r || this.saving()) return;
    if (!this.editDate) {
      this.toast.error('Return date is required');
      return;
    }
    this.saving.set(true);
    try {
      const updated = await this.svc.update(r.purchaseReturnId, {
        returnDate: this.editDate,
        reason: this.editReason || null,
        remarks: this.editRemarks || null,
        items: r.items.map((it) => ({
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
        })),
      });
      this.ret.set(updated);
      this.toast.success('Purchase return updated');
      await this.router.navigate(['/purchase'], { queryParams: { tab: 'returns' } });
    } catch (e: any) {
      this.toast.error('Failed to update return', e?.error?.message ?? e?.message ?? '');
    } finally {
      this.saving.set(false);
    }
  }

  protected async confirmCancel(): Promise<void> {
    const r = this.ret();
    if (!r || this.saving()) return;
    if (!this.cancelReason.trim()) {
      this.toast.error('Cancellation reason is required');
      return;
    }
    this.saving.set(true);
    try {
      await this.svc.cancel(r.purchaseReturnId, this.cancelReason.trim());
      this.toast.success('Purchase return cancelled');
      await this.router.navigate(['/purchase'], { queryParams: { tab: 'returns' } });
    } catch (e: any) {
      this.toast.error('Failed to cancel return', e?.error?.message ?? e?.message ?? '');
    } finally {
      this.saving.set(false);
    }
  }

  protected async confirmDelete(): Promise<void> {
    const r = this.ret();
    if (!r || this.saving()) return;
    this.saving.set(true);
    try {
      await this.svc.delete(r.purchaseReturnId);
      this.toast.success('Purchase return deleted');
      await this.router.navigate(['/purchase'], { queryParams: { tab: 'returns' } });
    } catch (e: any) {
      this.toast.error('Cannot delete return', e?.error?.message ?? e?.message ?? '');
    } finally {
      this.saving.set(false);
    }
  }

  protected back(): void {
    this.router.navigate(['/purchase'], { queryParams: { tab: 'returns' } });
  }

  protected goToMode(mode: ReturnMode): void {
    const r = this.ret();
    const allowed = mode === 'view' || (mode === 'edit' && this.canEdit()) ||
      (mode === 'cancel' && this.canCancel()) || (mode === 'delete' && this.canDelete());
    if (!r || !allowed) return;
    void this.router.navigate(['/purchase-returns', r.purchaseReturnId], { queryParams: { mode } });
  }
}
