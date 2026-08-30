import { Component, inject, signal, effect } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { SalesEntryPage } from '../sales-entry/sales-entry';
import { SalesListPage } from '../sales-list/sales-list';
import { PosPage } from '../pos/pos';
import { SalesHubService } from '../../core/sales-hub.service';

type SalesTab = 'entry' | 'list' | 'pos';

const TABS: { id: SalesTab; label: string; icon: string }[] = [
  { id: 'entry', label: 'Sales Entry', icon: 'shopping-cart' },
  { id: 'list', label: 'Invoices', icon: 'list' },
  { id: 'pos', label: 'POS', icon: 'credit-card' },
];

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [LucideAngularModule, SalesEntryPage, SalesListPage, PosPage],
  templateUrl: './sales.html',
  styleUrl: './sales.css',
})
export class SalesWorkspace {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly hub = inject(SalesHubService);

  protected readonly tabs = TABS;
  protected readonly tab = signal<SalesTab>('entry');
  protected readonly collapsed = signal(false);

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const t = params.get('tab') as SalesTab | null;
      if (t && TABS.some((x) => x.id === t)) this.tab.set(t);
    });

    effect(() => {
      if (this.hub.editRequest()) this.setTab('entry');
    });
  }

  protected setTab(t: SalesTab): void {
    this.tab.set(t);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: t },
      queryParamsHandling: 'merge',
    });
  }
}
