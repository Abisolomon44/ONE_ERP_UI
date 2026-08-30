import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { SalesService, SalesInvoiceDto } from '../../core/services/sales.service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionService } from '../../core/services/permission.service';
import { SalesHubService } from '../../core/sales-hub.service';

@Component({
  selector: 'app-sales-list',
  standalone: true,
  imports: [DecimalPipe, SlicePipe, LucideAngularModule],
  templateUrl: './sales-list.html',
  styleUrl: './sales-list.css',
})
export class SalesListPage implements OnInit {
  private readonly svc = inject(SalesService);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);
  private readonly hub = inject(SalesHubService);

  protected readonly canManage = signal(false);
  protected readonly loading = signal(false);
  protected readonly rows = signal<SalesInvoiceDto[]>([]);

  async ngOnInit(): Promise<void> {
    this.canManage.set(this.perm.has('sales.manage'));
    await this.load();
  }

  private async load(): Promise<void> {
    try {
      this.loading.set(true);
      const p = await this.svc.getPaged(1, 100, '');
      this.rows.set(p.items ?? []);
    } catch (e: any) {
      this.toast.error('Failed to load sales', e?.error?.message ?? e?.message ?? '');
    } finally {
      this.loading.set(false);
    }
  }

  protected edit(p: SalesInvoiceDto): void {
    this.hub.requestEdit(p.salesInvoiceId);
  }

  protected newInvoice(): void {
    this.hub.requestNew();
  }

  protected async remove(p: SalesInvoiceDto): Promise<void> {
    if (!confirm(`Delete invoice ${p.salesInvoiceNo}?`)) return;
    try {
      await this.svc.delete(p.salesInvoiceId);
      this.toast.success('Invoice deleted');
      await this.load();
    } catch (e: any) {
      this.toast.error('Failed to delete', e?.error?.message ?? e?.message ?? '');
    }
  }
}
