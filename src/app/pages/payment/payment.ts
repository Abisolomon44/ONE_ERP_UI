import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { PaymentEntryPage } from '../payment-entry/payment-entry';
import { PaymentListPage } from '../payment-list/payment-list';

type PaymentTab = 'entry' | 'list';

const TABS: { id: PaymentTab; label: string; icon: string }[] = [
  { id: 'entry', label: 'Payment Entry', icon: 'wallet' },
  { id: 'list', label: 'Payments', icon: 'list' },
];

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [LucideAngularModule, PaymentEntryPage, PaymentListPage],
  templateUrl: './payment.html',
  styleUrl: './payment.css',
})
export class PaymentWorkspace {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly tabs = TABS;
  protected readonly tab = signal<PaymentTab>('entry');

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const t = params.get('tab') as PaymentTab | null;
      if (t && TABS.some((x) => x.id === t)) this.tab.set(t);
    });
  }

  protected setTab(t: PaymentTab): void {
    this.tab.set(t);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: t },
      queryParamsHandling: 'merge',
    });
  }
}
