import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
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

  protected readonly canManage = signal(false);
  protected readonly loading = signal(false);
  protected readonly rows = signal<PurchaseDto[]>([]);

  async ngOnInit(): Promise<void> {
    this.canManage.set(this.perm.has('purchases.manage'));
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

  protected edit(p: PurchaseDto): void {
    this.hub.requestEdit(p.purchaseId);
  }

  protected newPurchase(): void {
    this.hub.requestNew();
  }

  protected async remove(p: PurchaseDto): Promise<void> {
    if (!confirm(`Delete purchase ${p.purchaseNumber}?`)) return;
    try {
      await this.svc.delete(p.purchaseId);
      this.toast.success('Purchase deleted');
      await this.load();
    } catch (e: any) {
      this.toast.error('Failed to delete', e?.error?.message ?? e?.message ?? '');
    }
  }
}
