import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { PurchaseReturnDto, PurchaseReturnService } from '../../core/services/master_service';
import { DocumentPrintService } from '../../core/services/document-print.service';
import { PermissionService } from '../../core/services/permission.service';
import { ThemeService } from '../../core/services/theme.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-purchase-return',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './purchase-return.html',
  styleUrl: './purchase-return.css',
})
export class PurchaseReturnPage implements OnInit, OnDestroy {
  protected readonly theme = inject(ThemeService);
  private readonly svc = inject(PurchaseReturnService);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);
  private readonly router = inject(Router);
  private readonly docPrint = inject(DocumentPrintService);

  protected readonly canView = signal(false);
  protected readonly canCreate = signal(false);
  protected readonly canEdit = signal(false);
  protected readonly canCancel = signal(false);
  protected readonly canDelete = signal(false);
  protected readonly loading = signal(false);
  protected readonly loadError = signal('');
  protected readonly search = signal('');
  protected readonly returns = signal<PurchaseReturnDto[]>([]);
  protected readonly filteredReturns = computed(() => {
    const query = this.search().trim().toLocaleLowerCase();
    if (!query) return this.returns();
    return this.returns().filter((r) =>
      [r.returnNumber, r.supplierNameSnapshot, r.purchaseId, r.supplierId, r.reason]
        .some((value) => String(value ?? '').toLocaleLowerCase().includes(query)),
    );
  });
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private loadRequestId = 0;

  async ngOnInit(): Promise<void> {
    this.canView.set(this.perm.has(['purchases-return.view', 'purchases.return.view', 'purchases.return.manage']));
    this.canCreate.set(this.perm.has(['purchases-return.create', 'purchases.return.manage']));
    this.canEdit.set(this.perm.has(['purchases-return.edit', 'purchases.return.manage']));
    this.canCancel.set(this.perm.has(['purchases-return.cancel', 'purchases.return.manage']));
    this.canDelete.set(this.perm.has(['purchases-return.delete', 'purchases.return.manage']));
    if (this.canView()) await this.load();
  }

  protected open(r: PurchaseReturnDto, mode: 'view' | 'edit' | 'cancel' | 'delete'): void {
    this.router.navigate(['/purchase-returns', r.purchaseReturnId], { queryParams: { mode } });
  }

  protected newReturn(): void {
    this.router.navigate(['/purchase-returns/new']);
  }

  protected printReturn(r: PurchaseReturnDto, debitNote = false): void {
    void this.docPrint.openPurchasePreview(r.purchaseReturnId, r.companyId, debitNote ? 'DEBIT_NOTE' : 'PURCHASE_RETURN');
  }

  protected async refresh(): Promise<void> {
    if (this.loading() || !this.canView()) return;
    await this.load();
  }

  protected onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.search.set(input.value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => void this.load(), 250);
  }

  protected clearSearch(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = null;
    this.search.set('');
    void this.load();
  }

  ngOnDestroy(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
  }

  private async load(): Promise<void> {
    const requestId = ++this.loadRequestId;
    this.loading.set(true);
    this.loadError.set('');
    try {
      const page = await this.svc.getPaged(1, 50, this.search().trim());
      if (requestId === this.loadRequestId) this.returns.set(page.items ?? []);
    } catch (e: any) {
      const detail = e?.error?.message ?? e?.message ?? 'Please try again.';
      if (requestId === this.loadRequestId) {
        this.loadError.set(detail);
        this.toast.error('Failed to load returns', detail);
      }
    } finally {
      if (requestId === this.loadRequestId) this.loading.set(false);
    }
  }
}
