import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { BasePill } from '../../shared/base-data';
import { DashboardData } from '../../core/models';
import { PermissionService } from '../../core/services/permission.service';
import { ToastService } from '../../core/services/toast.service';
import {
  SalesReportChartDto,
  SalesReportResultDto,
  SalesReportService,
} from '../../core/services/sales-report.service';
import {
  InventoryDashboardDto,
  InventoryService,
  LowStockRow,
} from '../../core/services/inventory.service';
import { SalesInvoiceDto, SalesService } from '../../core/services/sales.service';
import { PrsBars } from '../reports/purchase-reports/prs-bars';

interface QuickAction {
  route: string;
  label: string;
  icon: string;
  permission?: string;
}

interface AccessItem {
  code: string;
  name: string;
}

interface BarPoint {
  label: string;
  value: number;
}

/** Billing quick actions — first release. */
const BILLING_ACTIONS: QuickAction[] = [
  { route: '/sales-entry', label: 'New Sale', icon: 'shopping-cart', permission: 'sales.view' },
  { route: '/purchase-entry', label: 'New Purchase', icon: 'truck' },
  { route: '/business-master', label: 'Customer', icon: 'users' },
  { route: '/products', label: 'Product', icon: 'package' },
  { route: '/payment-entry', label: 'Payment', icon: 'wallet', permission: 'payments.view' },
  { route: '/reports', label: 'Reports', icon: 'chart-no-axes-column' },
];

/** Admin actions (unchanged first-release admin panel). */
const MANAGE_ACTIONS: QuickAction[] = [
  { route: '/users', label: 'Manage Users', icon: 'user-cog', permission: 'users.view' },
  { route: '/roles', label: 'Manage Roles', icon: 'shield', permission: 'roles.view' },
  { route: '/company', label: 'Company Profile', icon: 'building-2', permission: 'companies.view' },
  { route: '/settings', label: 'Workspace Settings', icon: 'settings' },
];

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  users: 'Users',
  roles: 'Roles',
  companies: 'Company',
  settings: 'Settings',
  profile: 'Profile',
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [LucideAngularModule, PrsBars, BasePill],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  protected readonly perms = inject(PermissionService);
  private readonly reports = inject(SalesReportService);
  private readonly inventory = inject(InventoryService);
  private readonly sales = inject(SalesService);

  protected readonly greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  });

  protected readonly todayLabel = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  /** Admin / workspace info (existing /api/dashboard — kept for the manage panel). */
  protected readonly data = signal<DashboardData | null>(null);

  /** Business KPI widgets — all sourced from existing report/inventory APIs. */
  protected readonly loading = signal(true);
  protected readonly salesToday = signal('—');
  protected readonly invoicesToday = signal('—');
  protected readonly collectionToday = signal('—');
  protected readonly outstanding = signal('—');
  protected readonly inv = signal<InventoryDashboardDto | null>(null);
  protected readonly trend = signal<BarPoint[]>([]);
  protected readonly topProducts = signal<BarPoint[]>([]);
  protected readonly paymentSummary = signal<BarPoint[]>([]);
  protected readonly customerOutstanding = signal<BarPoint[]>([]);
  protected readonly lowStock = signal<LowStockRow[]>([]);
  protected readonly recentSales = signal<SalesInvoiceDto[]>([]);

  protected readonly canSales = computed(() => this.perms.has('sales.view'));
  protected readonly canStock = computed(() => this.perms.has('stock.view'));

  protected readonly billingActions = computed(() =>
    BILLING_ACTIONS.filter((a) => !a.permission || this.perms.has(a.permission)),
  );
  protected readonly manageActions = computed(() =>
    MANAGE_ACTIONS.filter((a) => !a.permission || this.perms.has(a.permission)),
  );

  protected readonly permissionGroups = computed(() => {
    const codes = this.data()?.permissions ?? [];
    const map = new Map<string, AccessItem[]>();
    for (const code of codes) {
      const module = this.moduleLabel(code);
      const list = map.get(module) ?? [];
      list.push({ code, name: code.split('.').slice(1).join(' ').replace(/^./, (c) => c.toUpperCase()) });
      map.set(module, list);
    }
    return [...map.entries()].map(([module, items]) => ({ module, items }));
  });

  constructor() {
    void this.load();
  }

  protected initials(name: string): string {
    const parts = (name || 'A').trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'A';
  }

  protected go(route: string): void {
    void this.router.navigate([route]);
  }

  protected fmtMoney(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  }

  protected fmtQty(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value);
  }

  protected reload(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    const jobs: Promise<void>[] = [this.loadAdmin(), this.loadBusiness()];
    await Promise.allSettled(jobs);
    this.loading.set(false);
  }

  /** Existing admin-info dashboard endpoint; failure here is non-fatal. */
  private async loadAdmin(): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<DashboardData>('/api/dashboard'));
      this.data.set(res);
    } catch {
      /* the business widgets below still render without the admin panel */
    }
  }

  /**
   * Business widgets — reuses ONLY existing APIs (dashboard audit, V1 plan):
   *  - sales-reports?Report=overview (today and all-time) → KPI cards + trend/rankings
   *  - sales-reports?Report=payments|outstanding rows → client-side grouping (V1)
   *  - inventory/dashboard + inventory/low-stock → stock value + alerts
   *  - /api/sales paged → recent invoices
   */
  private async loadBusiness(): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    const jobs: Promise<void>[] = [];

    if (this.canSales()) {
      jobs.push(
        this.safe(async () => {
          const r = await this.reports.run({ report: 'overview', dateFrom: today, dateTo: today, size: 1 });
          this.salesToday.set(this.kpiText(r, 'grand'));
          this.collectionToday.set(this.kpiText(r, 'paid'));
          this.invoicesToday.set(this.kpiText(r, 'invoices'));
        }),
        this.safe(async () => {
          const r = await this.reports.run({ report: 'overview', size: 1 });
          this.outstanding.set(this.kpiText(r, 'balance'));
          this.trend.set(this.barPoints(r.trend));
          this.topProducts.set(this.barPoints(r.productRanking).slice(0, 8));
        }),
        this.safe(async () => {
          const r = await this.reports.run({ report: 'payments', dateFrom: today, dateTo: today, size: 300 });
          this.paymentSummary.set(this.groupSum(r.rows, 'paymentMethod', 'amount').slice(0, 8));
        }),
        this.safe(async () => {
          const r = await this.reports.run({ report: 'outstanding', size: 300 });
          this.customerOutstanding.set(this.groupSum(r.rows, 'customer', 'balance').slice(0, 8));
        }),
        this.safe(async () => {
          const r = await this.sales.getPaged(1, 8);
          this.recentSales.set(r.items ?? []);
        }),
      );
    }

    if (this.canStock()) {
      jobs.push(
        this.safe(async () => {
          this.inv.set(await this.inventory.dashboard());
        }),
        this.safe(async () => {
          const r = await this.inventory.lowStock();
          this.lowStock.set((r.items ?? []).slice(0, 8));
        }),
      );
    }

    const results = await Promise.allSettled(jobs);
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) {
      this.toast.error('Dashboard', `${failed} widget${failed > 1 ? 's' : ''} failed to load. Try again.`);
    }
  }

  private async safe(fn: () => Promise<void>): Promise<void> {
    await fn();
  }

  private kpiText(r: SalesReportResultDto, key: string): string {
    const k = r.kpis?.find((x) => x.key === key);
    if (!k) return '—';
    return k.display ?? this.fmtMoney(k.value);
  }

  private barPoints(points: SalesReportChartDto[] | undefined): BarPoint[] {
    return (points ?? [])
      .map((p) => ({ label: String(p.label ?? ''), value: Number(p.value ?? 0) }))
      .filter((p) => p.label !== '');
  }

  /** Client-side grouping (audit V1): sum `valueKey` per `labelKey` over report rows. */
  private groupSum(rows: Record<string, unknown>[], labelKey: string, valueKey: string): BarPoint[] {
    const map = new Map<string, number>();
    for (const row of rows ?? []) {
      const rawLabel = row[labelKey];
      const label = rawLabel === null || rawLabel === undefined || rawLabel === '' ? 'Unspecified' : String(rawLabel);
      const value = Number(row[valueKey] ?? 0);
      if (Number.isNaN(value)) continue;
      map.set(label, (map.get(label) ?? 0) + value);
    }
    return [...map.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }

  private moduleLabel(code: string): string {
    const prefix = code.split('.')[0] ?? 'other';
    return MODULE_LABELS[prefix] ?? prefix.charAt(0).toUpperCase() + prefix.slice(1);
  }
}
