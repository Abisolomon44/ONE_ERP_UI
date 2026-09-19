import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { PurchaseReportScreen } from './purchase-report-screen';
import { PURCHASE_REPORT_CONFIGS } from './purchase-reports-config';

@Component({
  selector: 'app-purchase-reports-workspace',
  standalone: true,
  imports: [LucideAngularModule, PurchaseReportScreen],
  templateUrl: './purchase-reports-workspace.html',
  styleUrls: ['./purchase-reports-workspace.css', '../reports-workspace.css'],
})
export class PurchaseReportsWorkspace {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly configs = PURCHASE_REPORT_CONFIGS;
  protected readonly active = signal<string>(PURCHASE_REPORT_CONFIGS[0].id);

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const t = params.get('pr');
      if (t && PURCHASE_REPORT_CONFIGS.some((c) => c.id === t)) this.active.set(t);
    });
  }

  protected setActive(id: string): void {
    this.active.set(id);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { pr: id },
      queryParamsHandling: 'merge',
    });
  }
}