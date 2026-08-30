import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { StockService, StockDto, StockTransactionDto } from '../../core/services/master_service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionService } from '../../core/services/permission.service';

@Component({
  selector: 'app-stock',
  standalone: true,
  imports: [FormsModule, DecimalPipe, SlicePipe, LucideAngularModule],
  templateUrl: './stock.html',
  styleUrl: './stock.css',
})
export class StockPage implements OnInit {
  private readonly svc = inject(StockService);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);

  protected readonly canView = signal(false);
  protected readonly loading = signal(false);
  protected readonly mode = signal<'onhand' | 'transactions'>('onhand');
  protected readonly rows = signal<any[]>([]);

  protected page = 1;
  protected search = '';

  async ngOnInit(): Promise<void> {
    this.canView.set(this.perm.has('stock.view'));
    if (this.canView()) await this.load();
  }

  protected async setMode(m: 'onhand' | 'transactions'): Promise<void> {
    this.mode.set(m);
    this.page = 1;
    await this.load();
  }

  protected async load(): Promise<void> {
    if (!this.canView()) return;
    try {
      this.loading.set(true);
      if (this.mode() === 'onhand') {
        const p = await this.svc.getPaged(this.page, 20, this.search);
        this.rows.set(p.items ?? []);
      } else {
        const p = await this.svc.getTransactions(this.page, 20);
        this.rows.set(p.items ?? []);
      }
    } catch (e: any) {
      this.toast.error('Failed to load stock', e?.error?.message ?? e?.message ?? '');
    } finally {
      this.loading.set(false);
    }
  }

  protected async searchNow(): Promise<void> {
    this.page = 1;
    await this.load();
  }
}
