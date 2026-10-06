import { Component, inject, signal, effect } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { PurchaseEntryPage } from '../purchase-entry/purchase-entry';
import { PurchaseListPage } from '../purchase-list/purchase-list';
import { StockPage } from '../stock/stock';
import { PurchaseReturnPage } from '../purchase-return/purchase-return';
import { PurchaseReportScreen } from '../reports/purchase-reports/purchase-report-screen';
import { PurchaseHubService } from '../../core/purchase-hub.service';
import { PermissionService } from '../../core/services/permission.service';

type PurchaseTab = 'dashboard' | 'entry' | 'list' | 'stock' | 'returns';

const TABS: { id: PurchaseTab; label: string; icon: string; permission?: string }[] = [
  // T059 — dashboard tab reuses the existing purchase report screen (Report=dashboard).
  { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard', permission: 'purchases.view' },
  { id: 'entry', label: 'Purchase Entry', icon: 'shopping-cart' },
  { id: 'list', label: 'Purchases', icon: 'list' },
  { id: 'stock', label: 'Stock', icon: 'package' },
  { id: 'returns', label: 'Returns', icon: 'undo-2' },
];

@Component({
  selector: 'app-purchase',
  standalone: true,
  imports: [LucideAngularModule, PurchaseEntryPage, PurchaseListPage, StockPage, PurchaseReturnPage, PurchaseReportScreen],
  templateUrl: './purchase.html',
  styleUrl: './purchase.css',
})
export class PurchaseWorkspace {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly hub = inject(PurchaseHubService);
  private readonly perm = inject(PermissionService);

  protected readonly tabs = TABS.filter((t) => !t.permission || this.perm.has(t.permission));
  protected readonly tab = signal<PurchaseTab>(this.tabs.some((t) => t.id === 'dashboard') ? 'dashboard' : 'entry');
  protected readonly collapsed = signal(false);

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const t = params.get('tab') as PurchaseTab | null;
      // Only accept tabs visible to this user (dashboard tab is permission-filtered).
      if (t && this.tabs.some((x) => x.id === t)) this.tab.set(t);
    });

    // When the list asks to edit/new a purchase, jump to the entry tab.
    effect(() => {
      if (this.hub.editRequest()) this.setTab('entry');
    });
  }

  protected setTab(t: PurchaseTab): void {
    this.tab.set(t);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: t },
      queryParamsHandling: 'merge',
    });
  }
}
