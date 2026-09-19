import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { PurchaseHubService } from '../../../core/purchase-hub.service';
import { PermissionService } from '../../../core/services/permission.service';
import { PurchaseReportChartDto, PurchaseReportResultDto, PurchaseReportService } from '../../../core/services/purchase-report.service';
import { PurchaseReportUiStore } from '../../../core/services/purchase-report-ui.store';
import { ToastService } from '../../../core/services/toast.service';
import { PrsBars } from './prs-bars';
import {
  PurchaseReportScreenConfig,
  ReportColumn,
  getReportConfig,
  resolveColumns,
  resolveGroupOptions,
  resolveModeOptions,
} from './purchase-reports-config';

@Component({
  selector: 'app-purchase-report-screen',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, PrsBars],
  templateUrl: './purchase-report-screen.html',
  styleUrls: ['./purchase-report-screen.css', '../report-shared.css'],
})
export class PurchaseReportScreen implements OnInit {
  readonly reportId = input.required<string>();

  private readonly svc = inject(PurchaseReportService);
  private readonly store = inject(PurchaseReportUiStore);
  private readonly perm = inject(PermissionService);
  private readonly toast = inject(ToastService);
  private readonly hub = inject(PurchaseHubService);

  protected readonly lookups = this.store.lookups;

  protected readonly config = computed<PurchaseReportScreenConfig | undefined>(() => getReportConfig(this.reportId()));

  protected readonly canView = signal(false);
  protected readonly loading = signal(false);
  protected readonly result = signal<PurchaseReportResultDto | null>(null);

  protected readonly mode = signal<string | null>(null);
  protected readonly groupBy = signal<string | null>(null);
  protected readonly page = signal(1);
  protected readonly size = signal(50);

  protected dateFrom = '';
  protected dateTo = '';
  protected search = '';
  protected supplierId: number | null = null;
  protected productId: number | null = null;
  protected branchId: number | null = null;
  protected warehouseId: number | null = null;
  protected unitId: number | null = null;

  async ngOnInit(): Promise<void> {
    const cfg = this.config();
    if (!cfg) return;
    this.canView.set(cfg.permissions.some((p) => this.perm.has(p)));
    if (!this.canView()) return;
    this.size.set(cfg.defaultSize ?? 50);
    if (cfg.defaultMode) this.mode.set(cfg.defaultMode);
    this.store.ensureLookups();
    await this.load();
  }

  protected readonly modeOptions = computed(() => {
    const cfg = this.config();
    return cfg ? resolveModeOptions(cfg) : [];
  });

  protected readonly groupOptions = computed(() => {
    const cfg = this.config();
    return cfg ? resolveGroupOptions(cfg, this.mode()) : [];
  });

  protected readonly columns = computed(() => {
    const cfg = this.config();
    return cfg ? resolveColumns(cfg, this.mode(), this.groupBy()) : [];
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
        supplierId: this.supplierId,
        productId: this.productId,
        branchId: this.branchId,
        warehouseId: this.warehouseId,
        unitId: this.unitId,
        groupBy: this.groupBy(),
        mode: this.mode(),
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

  protected openPurchase(row: Record<string, unknown>): void {
    const cfg = this.config();
    if (!cfg?.drill) return;
    const id = row['purchaseId'];
    if (typeof id === 'number' && id > 0) this.hub.requestEdit(id);
  }

  protected cell(row: Record<string, unknown>, col: ReportColumn): string {
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

  protected cellRaw(row: Record<string, unknown>, col: ReportColumn): unknown {
    return row[col.key];
  }

  protected totals(col: ReportColumn): string {
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

  protected onModeChange(): void {
    this.groupBy.set(null);
    this.resetAndLoad();
  }

  protected onSizeChange(): void {
    this.resetAndLoad();
  }

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

    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
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
    const id = row['purchaseId'];
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

  protected chart(r: PurchaseReportResultDto, key: 'trend' | 'supplierRanking' | 'productRanking' | 'categoryBreakdown' | 'branchBreakdown' | 'warehouseBreakdown' | 'paymentStatus' | 'gstSummary' | 'returnsBreakdown'): PurchaseReportChartDto[] {
    return r[key] ?? [];
  }
}