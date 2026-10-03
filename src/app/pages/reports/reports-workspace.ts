import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { PurchaseReportsWorkspace } from './purchase-reports/purchase-reports-workspace';
import { SalesReportsWorkspace } from './sales-reports/sales-reports-workspace';

type ReportModule = 'sales' | 'purchase';

@Component({
  selector: 'app-reports-workspace',
  standalone: true,
  imports: [LucideAngularModule, SalesReportsWorkspace, PurchaseReportsWorkspace],
  templateUrl: './reports-workspace.html',
  styleUrl: './reports-workspace.css',
})
export class ReportsWorkspace {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly module = signal<ReportModule>('sales');

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const m = params.get('module');
      if (m === 'sales' || m === 'purchase') this.module.set(m);
    });
  }

  protected setModule(m: ReportModule): void {
    this.module.set(m);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { module: m },
      queryParamsHandling: 'merge',
    });
  }
}
