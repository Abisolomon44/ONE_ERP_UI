import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { PurchaseService, PurchaseDto, PurchaseLookupsDto } from '../../core/services/master_service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionService } from '../../core/services/permission.service';
import { PurchaseHubService } from '../../core/purchase-hub.service';

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

  protected readonly canView = signal(false);
  protected readonly canCreate = signal(false);
  protected readonly canEdit = signal(false);
  protected readonly canCancel = signal(false);
  protected readonly canDelete = signal(false);
  protected readonly canReturn = signal(false);
  protected readonly loading = signal(false);
  protected readonly rows = signal<PurchaseDto[]>([]);
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

  ngOnInit(): void {
    this.canView.set(this.perm.has(['purchases.view', 'purchases.manage']));
    this.canCreate.set(this.perm.has(['purchases.create', 'purchases.manage']));
    this.canEdit.set(this.perm.has(['purchases.edit', 'purchases.manage']));
    this.canCancel.set(this.perm.has(['purchases.cancel', 'purchases.manage']));
    this.canDelete.set(this.perm.has(['purchases.delete', 'purchases.manage']));
    this.canReturn.set(
      this.perm.has(['purchases-return.create', 'purchases.return.manage', 'purchases.return.view']),
    );
    this.load();
  }

  private async load(): Promise<void> {
    try {
      this.loading.set(true);
      const p = await this.svc.getPaged(this.page(), this.pageSize(), this.search());
      this.rows.set(p.items ?? []);
      this.totalPages.set(Math.ceil(p.totalCount ?? 0 / this.pageSize()));
    } catch (e: any) {
      this.toast.error('Failed to load purchases', e?.error?.message ?? e?.message ?? '');
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
    this.router.navigate(['/purchase-print', id]);
  }

  protected loadPage(page: number): void {
    this.page.set(page);
    this.load();
  }
}