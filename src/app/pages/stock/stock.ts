import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

import {
  StockService,
  StockDto,
  StockTransactionDto,
} from '../../core/services/master_service';

import { ToastService } from '../../core/services/toast.service';
import { PermissionService } from '../../core/services/permission.service';

@Component({
  selector: 'app-stock',
  standalone: true,

  imports: [
    DecimalPipe,
    SlicePipe,
    FormsModule,
    LucideAngularModule,
  ],

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

  // ===================== Computed: On Hand =====================

  protected readonly uniqueProducts = computed(() => {
    const seen = new Set<number>();

    for (const row of this.rows()) {
      if (row.productId != null) {
        seen.add(Number(row.productId));
      }
    }

    return seen.size;
  });

  protected readonly totalQuantity = computed(() =>
    this.rows().reduce(
      (sum, row) => sum + (Number(row.quantity) || 0),
      0
    )
  );

  protected readonly totalAvailable = computed(() =>
    this.rows().reduce(
      (sum, row) => sum + (Number(row.availableQuantity) || 0),
      0
    )
  );

  protected readonly lowStockCount = computed(() =>
    this.rows().filter(
      row => (Number(row.availableQuantity) || 0) <= 0
    ).length
  );

  // ===================== Computed: Transactions =====================

  protected readonly totalIn = computed(() =>
    this.rows().reduce(
      (sum, row) => sum + (Number(row.quantityIn) || 0),
      0
    )
  );

  protected readonly totalOut = computed(() =>
    this.rows().reduce(
      (sum, row) => sum + (Number(row.quantityOut) || 0),
      0
    )
  );

  // ===================== Lifecycle =====================

  async ngOnInit(): Promise<void> {
    this.canView.set(this.perm.has('stock.view'));

    if (this.canView()) {
      await this.load();
    }
  }

  // ===================== Mode =====================

  protected async setMode(
    selectedMode: 'onhand' | 'transactions'
  ): Promise<void> {
    if (this.mode() === selectedMode) {
      return;
    }

    this.mode.set(selectedMode);
    this.page = 1;
    this.search = '';

    await this.load();
  }

  // ===================== Load =====================

  protected async load(): Promise<void> {
    if (!this.canView() || this.loading()) {
      return;
    }

    this.loading.set(true);

    try {
      if (this.mode() === 'onhand') {
        const response = await this.svc.getPaged(
          this.page,
          20,
          this.search.trim()
        );

        console.log('[Stock] OnHand API response:', response);
        console.log('[Stock] OnHand items:', response?.items);

        this.rows.set(response?.items ?? []);
      } else {
        const response = await this.svc.getTransactions(
          this.page,
          20
        );

        console.log('[Stock] Transactions API response:', response);
        console.log('[Stock] Transaction items:', response?.items);

        this.rows.set(response?.items ?? []);
      }
    } catch (error: any) {
      console.error('[Stock] Load error:', error);

      this.rows.set([]);

      this.toast.error(
        'Failed to load stock',
        error?.error?.message ??
          error?.message ??
          'Unable to retrieve stock data.'
      );
    } finally {
      this.loading.set(false);
    }
  }

  // ===================== Search =====================

  protected async searchNow(): Promise<void> {
    this.page = 1;
    await this.load();
  }
}