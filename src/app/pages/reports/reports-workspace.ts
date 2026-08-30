import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { PurchaseRegisterReport } from './purchase-register/purchase-register';
import { StockLedgerReport } from './stock-ledger/stock-ledger';
import { SupplierLedgerReport } from './supplier-ledger/supplier-ledger';
import { PurchaseOutstandingReport } from './purchase-outstanding/purchase-outstanding';
import { GstPurchaseReport } from './gst-purchase-report/gst-purchase-report';

type ReportTab = 'purchase-register' | 'stock-ledger' | 'supplier-ledger' | 'purchase-outstanding' | 'gst-purchase';

const TABS: { id: ReportTab; label: string; icon: string }[] = [
  { id: 'purchase-register', label: 'Purchase Register', icon: 'list' },
  { id: 'stock-ledger', label: 'Stock Ledger', icon: 'package' },
  { id: 'supplier-ledger', label: 'Supplier Ledger', icon: 'book-user' },
  { id: 'purchase-outstanding', label: 'Purchase Outstanding', icon: 'circle-alert' },
  { id: 'gst-purchase', label: 'GST Purchase', icon: 'receipt' },
];

@Component({
  selector: 'app-reports-workspace',
  standalone: true,
  imports: [LucideAngularModule, PurchaseRegisterReport, StockLedgerReport, SupplierLedgerReport, PurchaseOutstandingReport, GstPurchaseReport],
  templateUrl: './reports-workspace.html',
  styleUrl: './reports-workspace.css',
})
export class ReportsWorkspace {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly tabs = TABS;
  protected readonly tab = signal<ReportTab>('purchase-register');

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const t = params.get('tab') as ReportTab | null;
      if (t && TABS.some((x) => x.id === t)) this.tab.set(t);
    });
  }

  protected setTab(t: ReportTab): void {
    this.tab.set(t);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: t },
      queryParamsHandling: 'merge',
    });
  }
}
