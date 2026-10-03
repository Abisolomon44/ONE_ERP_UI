import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { SalesReportScreen } from './sales-report-screen';
import { SALES_REPORT_CONFIGS } from './sales-reports-config';

@Component({
  selector: 'app-sales-reports-workspace',
  standalone: true,
  imports: [LucideAngularModule, SalesReportScreen],
  templateUrl: './sales-reports-workspace.html',
  styleUrls: ['../purchase-reports/purchase-reports-workspace.css', '../reports-workspace.css'],
})
export class SalesReportsWorkspace {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly configs = SALES_REPORT_CONFIGS;
  protected readonly active = signal<string>(SALES_REPORT_CONFIGS[0].id);

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const t = params.get('sr');
      if (t && SALES_REPORT_CONFIGS.some((c) => c.id === t)) this.active.set(t);
    });
  }

  protected setActive(id: string): void {
    this.active.set(id);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { sr: id },
      queryParamsHandling: 'merge',
    });
  }
}
