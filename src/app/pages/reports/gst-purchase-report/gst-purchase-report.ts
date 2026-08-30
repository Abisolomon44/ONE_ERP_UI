// GST Purchase report
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';

import { PurchaseService, PurchaseItemDto } from '../../../core/services/master_service';
import { PermissionService } from '../../../core/services/permission.service';
import { ToastService } from '../../../core/services/toast.service';

interface GstGroup {
  gstRate: number;
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  gstAmount: number;
}

@Component({
  selector: 'app-gst-purchase-report',
  standalone: true,
  imports: [FormsModule, DecimalPipe],
  templateUrl: './gst-purchase-report.html',
  styleUrls: ['./gst-purchase-report.css', '../report-shared.css'],
})
export class GstPurchaseReport implements OnInit {
  private readonly svc = inject(PurchaseService);
  private readonly perm = inject(PermissionService);
  private readonly toast = inject(ToastService);

  protected readonly canView = signal(false);
  protected readonly loading = signal(false);
  protected readonly items = signal<PurchaseItemDto[]>([]);

  protected dateFrom = '';
  protected dateTo = '';

  async ngOnInit(): Promise<void> {
    this.canView.set(this.perm.has('purchases.view'));
    if (!this.canView()) return;
    await this.reload();
  }

  protected async reload(): Promise<void> {
    this.loading.set(true);
    try {
      const page = await this.svc.getPaged(1, 500, '');
      const purchases = page.items ?? [];
      // Fall back to per-purchase item fetch when the list endpoint doesn't embed items.
      const missing = purchases.filter((p) => !p.items?.length);
      if (missing.length) {
        const fetched = await Promise.all(missing.map((p) => this.svc.getItems(p.purchaseId)));
        missing.forEach((p, i) => (p.items = fetched[i]));
      }
      const inRange = purchases.filter((p) => {
        const d = p.purchaseDate.slice(0, 10);
        if (this.dateFrom && d < this.dateFrom) return false;
        if (this.dateTo && d > this.dateTo) return false;
        return true;
      });
      this.items.set(inRange.flatMap((p) => p.items ?? []));
    } catch (e: any) {
      this.toast.error('Failed to load GST purchase report', e?.error?.message ?? e?.message ?? '');
    } finally {
      this.loading.set(false);
    }
  }

  protected readonly groups = computed<GstGroup[]>(() => {
    const map = new Map<number, GstGroup>();
    for (const it of this.items()) {
      const key = it.gstRate ?? 0;
      const g = map.get(key) ?? { gstRate: key, taxableValue: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0, cessAmount: 0, gstAmount: 0 };
      g.taxableValue += it.taxableValue;
      g.cgstAmount += it.cgstAmount;
      g.sgstAmount += it.sgstAmount;
      g.igstAmount += it.igstAmount;
      g.cessAmount += it.cessAmount;
      g.gstAmount += it.gstAmount;
      map.set(key, g);
    }
    return [...map.values()].sort((a, b) => a.gstRate - b.gstRate);
  });

  protected get totalTaxable(): number {
    return this.groups().reduce((s, g) => s + g.taxableValue, 0);
  }
  protected get totalGst(): number {
    return this.groups().reduce((s, g) => s + g.gstAmount, 0);
  }
  protected get totalCess(): number {
    return this.groups().reduce((s, g) => s + g.cessAmount, 0);
  }
}
