import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { PermissionService } from '../../../core/services/permission.service';
import { SalesHubService } from '../../../core/sales-hub.service';
import { SalesReportChartDto, SalesReportResultDto, SalesReportService } from '../../../core/services/sales-report.service';
import { SalesReportUiStore } from '../../../core/services/sales-report-ui.store';
import { ToastService } from '../../../core/services/toast.service';
import { PrsBars } from '../purchase-reports/prs-bars';
import {
  SalesReportColumn,
  SalesReportScreenConfig,
  getSalesReportConfig,
  resolveSalesColumns,
} from './sales-reports-config';

@Component({
  selector: 'app-sales-report-screen',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, PrsBars],
  templateUrl: './sales-report-screen.html',
  styleUrls: ['../report-shared.css', '../purchase-reports/purchase-report-screen.css', './sales-report-screen.css'],
})
export class SalesReportScreen implements OnInit {
  readonly reportId = input.required<string>();

  private readonly svc = inject(SalesReportService);
  private readonly store = inject(SalesReportUiStore);
  private readonly perm = inject(PermissionService);
  private readonly toast = inject(ToastService);
  private readonly hub = inject(SalesHubService);

  protected readonly lookups = this.store.lookups;

  protected readonly config = computed<SalesReportScreenConfig | undefined>(() => getSalesReportConfig(this.reportId()));

  protected readonly canView = signal(false);
  protected readonly loading = signal(false);
  protected readonly result = signal<SalesReportResultDto | null>(null);

  protected readonly groupBy = signal<string | null>(null);
  protected readonly sortBy = signal<string | null>(null);
  protected readonly sortDir = signal<'asc' | 'desc'>('desc');
  protected readonly page = signal(1);
  protected readonly size = signal(50);

  protected dateFrom = '';
  protected dateTo = '';
  protected search = '';
  protected customerId: number | null = null;
  protected productId: number | null = null;
  protected branchId: number | null = null;
  protected warehouseId: number | null = null;
  protected invoiceStatus = '';
  protected sourceType = '';

  async ngOnInit(): Promise<void> {
    const cfg = this.config();
    if (!cfg) return;
    this.canView.set(cfg.permissions.some((p) => this.perm.has(p)));
    if (!this.canView()) return;
    this.size.set(cfg.defaultSize ?? 50);
    this.store.ensureLookups();
    await this.load();
  }

  protected readonly groupOptions = computed(() => this.config()?.groupByOptions ?? []);

  protected readonly sortOptions = computed(() => this.config()?.sortOptions ?? []);

  protected readonly columns = computed(() => {
    const cfg = this.config();
    return cfg ? resolveSalesColumns(cfg, this.groupBy()) : [];
  });

  protected readonly kpis = computed(() => this.result()?.kpis ?? []);

  protected async load(): Promise<void> {
    const cfg = this.config();
    if (!cfg || !this.canView()) return;
    this.loading.set(true);
    try {
      const res = await this.svc.run({
        report: cfg.id,
        dateFrom: this.dateFrom || null,
        dateTo: this.dateTo || null,
        search: this.search || null,
        customerId: this.customerId,
        productId: this.productId,
        branchId: this.branchId,
        warehouseId: this.warehouseId,
        invoiceStatus: this.invoiceStatus || null,
        sourceType: this.sourceType || null,
        groupBy: this.groupBy(),
        sortBy: this.sortBy(),
        sortDir: this.sortBy() ? this.sortDir() : null,
        page: this.page(),
        size: this.size(),
      });
      this.result.set(res);
    } catch (e: any) {
      this.toast.error(`Failed to load ${cfg.label}`, e?.error?.message ?? e?.message ?? '');
    } finally {
      this.loading.set(false);
    }
  }

  protected resetAndLoad(): void {
    this.page.set(1);
    this.load();
  }

  protected setPage(p: number): void {
    this.page.set(p);
    this.load();
  }

  protected toggleSort(value: string): void {
    if (this.sortBy() === value) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(value);
      this.sortDir.set('desc');
    }
    this.resetAndLoad();
  }

  /** Maps a column key to its whitelisted sort option, if the report exposes one. */
  protected sortOptionFor(columnKey: string): { value: string; label: string } | null {
    const map: Record<string, string> = {
      salesInvoiceNo: 'invoiceNo',
      invoiceDate: 'invoiceDate',
      customer: 'customer',
      grandTotal: 'grandTotal',
      paid: 'paid',
      balance: 'balance',
      paymentNo: 'paymentNo',
      paymentDate: 'paymentDate',
      amount: 'amount',
      allocatedAmount: 'allocated',
    };
    const sortValue = map[columnKey];
    if (!sortValue) return null;
    return this.sortOptions().find((o) => o.value === sortValue) ?? null;
  }

  protected openInvoice(row: Record<string, unknown>): void {
    const cfg = this.config();
    if (!cfg?.drill) return;
    const id = row['salesInvoiceId'];
    if (typeof id === 'number' && id > 0) this.hub.requestEdit(id);
  }

  protected cell(row: Record<string, unknown>, col: SalesReportColumn): string {
    const v = row[col.key];
    if (v === null || v === undefined || v === '') return '';
    switch (col.type) {
      case 'amount':
        return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v));
      case 'number':
        return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(v));
      case 'percent':
        return `${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(Number(v))}%`;
      case 'date':
        return String(v).slice(0, 10);
      default:
        return String(v);
    }
  }

  protected cellRaw(row: Record<string, unknown>, col: SalesReportColumn): unknown {
    return row[col.key];
  }

  protected totals(col: SalesReportColumn): string {
    if (!col.total) return '';
    let sum = 0;
    for (const row of this.result()?.rows ?? []) {
      const v = row[col.key];
      if (typeof v === 'number') sum += v;
    }
    if (col.type === 'amount') return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(sum);
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(sum);
  }

  protected get totalPages(): number {
    const total = this.result()?.totalCount ?? 0;
    const size = this.size();
    return Math.max(1, Math.ceil(total / size));
  }

  protected get hasTableData(): boolean {
    return (this.result()?.rows.length ?? 0) > 0;
  }

  protected onGroupChange(): void {
    this.resetAndLoad();
  }

  protected onSizeChange(): void {
    this.resetAndLoad();
  }

  // ============================================================
  // Export — exports exactly the rows/columns currently on screen
  // (the same server-side filtered + paged result the user sees),
  // so an export can never leak unfiltered data.
  // ============================================================
  protected exportCsv(): void {
    const cfg = this.config();
    const result = this.result();
    if (!cfg || !result || result.rows.length === 0) return;
    const cols = this.columns();
    if (cols.length === 0) return;

    const esc = (v: unknown): string => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const lines: string[] = [];
    lines.push(cols.map((c) => esc(c.label)).join(','));
    for (const row of result.rows) {
      lines.push(
        cols
          .map((c) => {
            const v = this.cellRaw(row, c);
            return esc(c.type === 'date' ? (v !== null && v !== undefined ? String(v).slice(0, 10) : '') : v);
          })
          .join(','),
      );
    }

    const blob = new Blob(['\\uFEFF' + lines.join('\\r\\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${cfg.id}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  protected fmtKpiValue(value: number | null | undefined): string {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  }

  protected isNum(type: string): boolean {
    return type === 'number' || type === 'amount' || type === 'percent';
  }

  protected isDrillable(row: Record<string, unknown>): boolean {
    const id = row['salesInvoiceId'];
    return typeof id === 'number' && id > 0;
  }

  protected hasTotals(): boolean {
    return this.columns().some((c) => c.total);
  }

  protected pageList(): number[] {
    const total = this.totalPages;
    const cur = this.page();
    const start = Math.max(1, cur - 2);
    const end = Math.min(total, cur + 2);
    const out: number[] = [];
    for (let p = start; p <= end; p++) out.push(p);
    return out;
  }

  protected chart(r: SalesReportResultDto, key: 'trend' | 'customerRanking' | 'productRanking' | 'branchBreakdown' | 'warehouseBreakdown' | 'paymentStatus' | 'gstSummary' | 'sourceBreakdown'): SalesReportChartDto[] {
    return r[key] ?? [];
  }
}
