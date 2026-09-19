import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PurchaseReportChartDto } from '../../../core/services/purchase-report.service';

@Component({
  selector: 'prs-bars',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="prs-bars">
      @for (p of points(); track $index) {
        <div class="prs-bar-row" title="{{ p.label }}">
          <span class="prs-bar-label">{{ p.label }}</span>
          <div class="prs-bar-track">
            <div class="prs-bar-fill" [style.width.%]="pct(p.value)"></div>
          </div>
          <span class="prs-bar-value">{{ fmt(p.value) }}</span>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .prs-bars {
        display: flex;
        flex-direction: column;
        gap: 0.45rem;
      }
      .prs-bar-row {
        display: grid;
        grid-template-columns: minmax(90px, 30%) 1fr 88px;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.78rem;
      }
      .prs-bar-label {
        color: var(--muted, #64748b);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .prs-bar-track {
        height: 12px;
        background: var(--border, #e2e8f0);
        border-radius: 6px;
        overflow: hidden;
      }
      .prs-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #3b82f6, #6366f1);
        border-radius: 6px;
      }
      .prs-bar-value {
        text-align: right;
        font-variant-numeric: tabular-nums;
        color: var(--text, #0f172a);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrsBars {
  readonly points = input<PurchaseReportChartDto[]>([]);

  protected pct(value: number): number {
    const max = Math.max(...this.points().map((p) => p.value), 0);
    if (max <= 0) return 0;
    return (value / max) * 100;
  }

  protected fmt(value: number): string {
    return Math.abs(value) >= 10000
      ? `${new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 2 }).format(value)}`
      : new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value);
  }
}