import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { PurchaseService, PurchaseDto } from '../../core/services/master_service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionService } from '../../core/services/permission.service';
import { PurchaseHubService } from '../../core/purchase-hub.service';

@Component({
  selector: 'app-purchase-list',
  standalone: true,
  imports: [DecimalPipe, SlicePipe, LucideAngularModule],
  templateUrl: './purchase-list.html',
  styleUrl: './purchase-list.css',
})
export class PurchaseListPage implements OnInit {
  private readonly svc = inject(PurchaseService);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);
  private readonly hub = inject(PurchaseHubService);
  private readonly router = inject(Router);

  protected readonly canView = signal(false);
  protected readonly canCreate = signal(false);
  protected readonly canEdit = signal(false);
  protected readonly canCancel = signal(false);
  protected readonly canDelete = signal(false);
  protected readonly canReturn = signal(false);
  protected readonly loading = signal(false);
  protected readonly rows = signal<PurchaseDto[]>([]);

  async ngOnInit(): Promise<void> {
    this.canView.set(this.perm.has(['purchases.view', 'purchases.manage']));
    this.canCreate.set(this.perm.has(['purchases.create', 'purchases.manage']));
    this.canEdit.set(this.perm.has(['purchases.edit', 'purchases.manage']));
    this.canCancel.set(this.perm.has(['purchases.cancel', 'purchases.manage']));
    this.canDelete.set(this.perm.has(['purchases.delete', 'purchases.manage']));
    this.canReturn.set(
      this.perm.has(['purchases-return.create', 'purchases.return.manage', 'purchases.return.view']),
    );
    await this.load();
  }

  private async load(): Promise<void> {
    try {
      this.loading.set(true);
      const p = await this.svc.getPaged(1, 100, '');
      this.rows.set(p.items ?? []);
    } catch (e: any) {
      this.toast.error('Failed to load purchases', e?.error?.message ?? e?.message ?? '');
    } finally {
      this.loading.set(false);
    }
  }

  protected open(p: PurchaseDto, mode: 'view' | 'edit' | 'cancel' | 'delete'): void {
    this.router.navigate(['/purchases', p.purchaseId], { queryParams: { mode } });
  }

  protected returnPurchase(p: PurchaseDto): void {
    this.router.navigate(['/purchase-returns/new'], { queryParams: { purchaseId: p.purchaseId } });
  }

  protected newPurchase(): void {
    this.hub.requestNew();
  }
}
