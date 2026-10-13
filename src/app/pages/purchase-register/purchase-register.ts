import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { PurchaseService, PurchaseDto, PurchaseLookupsDto } from '../../core/services/master_service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionService } from '../../core/services/permission.service';
import { PurchaseHubService } from '../../core/purchase-hub.service';
import { DocumentPrintService } from '../../core/services/document-print.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-purchase-register',
  standalone: true,
  imports: [FormsModule, DecimalPipe, SlicePipe, LucideAngularModule],
  templateUrl: './purchase-register.html',
  styleUrl: './purchase-register.css',
})
export class PurchaseRegisterPage implements OnInit {
  private readonly svc = inject(PurchaseService);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly hub = inject(PurchaseHubService);
  private readonly docPrint = inject(DocumentPrintService);
  protected readonly theme = inject(ThemeService);

  protected readonly canView = signal(false);
  protected readonly canCreate = signal(false);
  protected readonly canEdit = signal(false);
  protected readonly canCancel = signal(false);
  protected readonly canDelete = signal(false);
  protected readonly canReturn = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly rows = signal<PurchaseDto[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly lookups = signal<PurchaseLookupsDto | null>(null);
  protected readonly search = signal('');
  protected readonly dateFrom = signal('');
  protected readonly dateTo = signal('');
  protected readonly supplierId = signal(0);
  protected readonly companyId = signal(0);
  protected readonly branchId = signal(0);
  protected readonly warehouseId = signal(0);
  protected readonly statusId = signal(0);
  protected readonly paymentStatus = signal('');

  // Pagination signals
  protected readonly page = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly totalPages = signal(1);

  async ngOnInit(): Promise<void> {
    this.canView.set(this.perm.has(['purchases.view', 'purchases.manage']));
    this.canCreate.set(this.perm.has(['purchases.create', 'purchases.manage']));
    this.canEdit.set(this.perm.has(['purchases.edit', 'purchases.manage']));
    this.canCancel.set(this.perm.has(['purchases.cancel', 'purchases.manage']));
    this.canDelete.set(this.perm.has(['purchases.delete', 'purchases.manage']));
    this.canReturn.set(
      this.perm.has(['purchases-return.create', 'purchases.return.manage', 'purchases.return.view']),
    );
    try {
      this.lookups.set(await this.svc.getLookups());
    } catch {
      // The register can still render snapshot names and IDs when lookups fail.
    }
    await this.load();
  }

  private async load(): Promise<void> {
    try {
      this.loading.set(true);
      this.error.set('');
      const p = await this.svc.getPaged(this.page(), this.pageSize(), this.search());
      this.rows.set(p.items ?? []);
      this.totalCount.set(p.totalCount ?? 0);
      this.totalPages.set(Math.max(1, Math.ceil((p.totalCount ?? 0) / this.pageSize())));
    } catch (e: any) {
      const message = e?.error?.message ?? e?.message ?? 'Unable to retrieve purchase data.';
      this.error.set(message);
      this.toast.error('Failed to load purchases', message);
    } finally {
      this.loading.set(false);
    }
  }

  protected onSearch(): void {
    this.page.set(1); // Reset to first page on search
    this.load();
  }

  protected clearFilters(): void {
    this.search.set('');
    this.dateFrom.set('');
    this.dateTo.set('');
    this.supplierId.set(0);
    this.companyId.set(0);
    this.branchId.set(0);
    this.warehouseId.set(0);
    this.statusId.set(0);
    this.paymentStatus.set('');
    this.load();
  }

  protected refresh(): void {
    this.load();
  }

  protected lookupName(items: { id: number; name?: string | null }[] | undefined, id: number): string {
    return items?.find((item) => Number(item.id) === Number(id))?.name || String(id);
  }

  protected firstEntry(): number {
    return this.totalCount() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1;
  }

  protected lastEntry(): number {
    return Math.min(this.page() * this.pageSize(), this.totalCount());
  }

  protected newPurchase(): void {
    this.router.navigate(['/purchase-entry']);
  }

  protected viewPurchase(id: number): void {
    this.router.navigate(['/purchase-view', id]);
  }

  protected editPurchase(id: number): void {
    this.router.navigate(['/purchase-edit', id]);
  }

  protected cancelPurchase(id: number): void {
    this.router.navigate(['/purchase-cancel', id]);
  }

  protected deletePurchase(id: number): void {
    this.router.navigate(['/purchase-delete', id]);
  }

  protected returnPurchase(id: number): void {
    this.router.navigate(['/purchase-returns/new'], { queryParams: { purchaseId: id } });
  }

  protected printPurchase(id: number): void {
    const purchase = this.rows().find((row) => row.purchaseId === id);
    if (purchase) void this.docPrint.openPurchasePreview(id, purchase.companyId, 'PURCHASE');
  }

  protected loadPage(page: number): void {
    this.page.set(page);
    this.load();
  }
}
