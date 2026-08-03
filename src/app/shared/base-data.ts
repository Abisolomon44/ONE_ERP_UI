import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input, model, TemplateRef } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { BaseButton } from './base-button';

/* ---------------- BaseCard ---------------- */
@Component({
  selector: 'base-card',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="card" [class.card-pad]="pad() && !title()">
      @if (title() || subtitle()) {
        <div class="card-header">
          <div>
            <h3>{{ title() }}</h3>
            @if (subtitle()) {
              <div class="card-sub">{{ subtitle() }}</div>
            }
          </div>
          <div class="card-actions">
            <ng-content select="[card-actions]"></ng-content>
          </div>
        </div>
      }
      <ng-content></ng-content>
    </div>
  `,
})
export class BaseCard {
  readonly title = input('');
  readonly subtitle = input('');
  readonly pad = input(false);
}

/* ---------------- BaseBadge / status pill ---------------- */
@Component({
  selector: 'base-pill',
  standalone: true,
  template: `
    <span class="pill" [class]="pillClass()">{{ label() }}</span>
  `,
})
export class BasePill {
  readonly status = input('');
  readonly label = input('');

  protected pillClass(): string {
    const s = (this.status() || '').toLowerCase();
    if (s === 'active' || s === 'paid' || s === 'success' || s === 'provisioned' || s === 'enabled')
      return 'success';
    if (s === 'inactive' || s === 'cancelled' || s === 'disabled' || s === 'suspended') return 'warning';
    if (s === 'expired' || s === 'locked' || s === 'failed' || s === 'deleted') return 'danger';
    if (s === 'pending' || s === 'trialing') return 'info';
    return 'neutral';
  }
}

/* ---------------- BaseEmpty ---------------- */
@Component({
  selector: 'base-empty',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="empty-state">
      <i-lucide class="empty-icon" [name]="icon()" [size]="42" [strokeWidth]="1.4"></i-lucide>
      <div class="empty-title">{{ title() }}</div>
      @if (subtitle()) {
        <div style="font-size: 12.5px">{{ subtitle() }}</div>
      }
      <ng-content></ng-content>
    </div>
  `,
})
export class BaseEmpty {
  readonly icon = input('inbox');
  readonly title = input('No data found');
  readonly subtitle = input('');
}

/* ---------------- BasePagination ---------------- */
@Component({
  selector: 'base-pagination',
  standalone: true,
  imports: [LucideAngularModule, BaseButton],
  template: `
    @if (total() > 0) {
      <div class="pagination">
        <span class="page-info">
          Showing {{ rangeStart() }}-{{ rangeEnd() }} of {{ total() }} entries
        </span>
        <base-button variant="secondary" size="sm" icon="chevron-left" [iconOnly]="true" [disabled]="page() <= 1" (click)="go(page() - 1)"></base-button>
        @for (p of pages(); track p) {
          @if (p === '...') {
            <span class="page-dots">…</span>
          } @else {
            <base-button [variant]="p === page() ? 'primary' : 'secondary'" size="sm" [label]="p" (click)="go(p)">{{ p }}</base-button>
          }
        }
        <base-button variant="secondary" size="sm" icon="chevron-right" [iconOnly]="true" [disabled]="page() >= totalPages()" (click)="go(page() + 1)"></base-button>
      </div>
    }
  `,
})
export class BasePagination {
  readonly page = model(1);
  readonly size = input(10);
  readonly total = input(0);

  protected totalPages(): number {
    return Math.max(1, Math.ceil(this.total() / this.size()));
  }

  protected rangeStart(): number {
    return this.total() === 0 ? 0 : (this.page() - 1) * this.size() + 1;
  }

  protected rangeEnd(): number {
    return Math.min(this.page() * this.size(), this.total());
  }

  protected pages(): (number | '...')[] {
    const current = this.page();
    const last = this.totalPages();
    if (last <= 7) return this.range(1, last);
    const set = new Set<number>([1, last, current - 1, current, current + 1]);
    const sorted = [...set].filter((p) => p >= 1 && p <= last).sort((a, b) => a - b);
    const out: (number | '...')[] = [];
    let prev = 0;
    for (const p of sorted) {
      if (p - prev > 1) out.push('...');
      out.push(p);
      prev = p;
    }
    return out;
  }

  private range(from: number, to: number): number[] {
    const out: number[] = [];
    for (let i = from; i <= to; i++) out.push(i);
    return out;
  }

  protected go(p: number): void {
    if (p >= 1 && p <= this.totalPages()) this.page.set(p);
  }
}

/* ---------------- BaseTable ---------------- */
@Component({
  selector: 'base-table',
  standalone: true,
  imports: [NgTemplateOutlet],
  template: `
    @if (loading()) {
      <div class="flex" style="justify-content:center; padding: 40px">
        <span class="spinner spinner-lg" style="color: var(--accent)"></span>
      </div>
    } @else if (rows().length === 0) {
      <ng-content select="[empty]"></ng-content>
    } @else {
      <div class="table-wrap">
        <table class="btable">
          <thead>
            <tr>
              @for (col of columns(); track $index) {
                <th [class.text-right]="col.align === 'right'">{{ col.label }}</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (row of rows(); track $index) {
              <tr>
                @for (col of columns(); track $index) {
                  <td [class.text-right]="col.align === 'right'">
                    @if (col.key) {
                      {{ row[col.key] }}
                    } @else {
                      <ng-container *ngTemplateOutlet="col.template ?? null; context: { $implicit: row }"></ng-container>
                    }
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class BaseTable {
  readonly rows = input<Record<string, unknown>[]>([]);
  readonly columns = input<TableColumn[]>([]);
  readonly loading = input(false);
}

export interface TableColumn {
  label: string;
  key?: string;
  align?: 'left' | 'right';
  template?: TemplateRef<unknown>;
}
