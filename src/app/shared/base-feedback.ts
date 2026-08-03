import { Component, HostListener, inject, input, output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ToastService } from '../core/services/toast.service';
import { BaseButton } from './base-button';

/* ---------------- BaseDialog ---------------- */
@Component({
  selector: 'base-dialog',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    @if (open()) {
      <div class="dialog-overlay" (click)="backdrop()">
        <div class="dialog" [class.sm]="size() === 'sm'" [class.lg]="size() === 'lg'" role="dialog" (click)="$event.stopPropagation()">
          <div class="dialog-header">
            <h3>{{ title() }}</h3>
            <button class="icon-btn dialog-close" aria-label="Close" (click)="close()">
              <i-lucide name="x" [size]="18"></i-lucide>
            </button>
          </div>
          <div class="dialog-body">
            <ng-content></ng-content>
          </div>
          @if (footer()) {
            <div class="dialog-footer">
              <ng-content select="[dialog-actions]"></ng-content>
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class BaseDialog {
  readonly open = input(false);
  readonly title = input('');
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly footer = input(true);
  readonly closeRequest = output();
  readonly backdropClose = input(true);

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.open()) this.close();
  }

  protected close(): void {
    this.closeRequest.emit();
  }

  protected backdrop(): void {
    if (this.backdropClose()) this.close();
  }
}

/* ---------------- BaseLoader ---------------- */
@Component({
  selector: 'base-loader',
  standalone: true,
  template: `
    @if (loading()) {
      <div class="loader-overlay">
        <div class="loader-box">
          <span class="spinner spinner-lg"></span>
          <span style="font-weight:600; color: var(--text-2)">{{ message() }}</span>
        </div>
      </div>
    }
  `,
})
export class BaseLoader {
  readonly loading = input(false);
  readonly message = input('Please wait...');
}

/* ---------------- BaseToast ---------------- */
@Component({
  selector: 'base-toast',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="toast-stack">
      @for (toast of toasts(); track toast.id) {
        <div class="toast" [class]="toast.type">
          <i-lucide class="toast-icon" [name]="iconFor(toast.type)" [size]="18" [style.color]="colorFor(toast.type)"></i-lucide>
          <div style="flex:1; min-width:0">
            <div class="toast-title">{{ toast.title }}</div>
            @if (toast.message) {
              <div class="toast-msg">{{ toast.message }}</div>
            }
          </div>
          <i-lucide class="toast-close" name="x" [size]="16" (click)="dismiss(toast.id)"></i-lucide>
        </div>
      }
    </div>
  `,
})
export class BaseToast {
  private readonly toastService = inject(ToastService);

  protected toasts = this.toastService.toasts;

  protected dismiss(id: number): void {
    this.toastService.dismiss(id);
  }

  protected iconFor(type: string): string {
    switch (type) {
      case 'success':
        return 'circle-check-big';
      case 'danger':
        return 'circle-alert';
      case 'warning':
        return 'triangle-alert';
      default:
        return 'info';
    }
  }

  protected colorFor(type: string): string {
    switch (type) {
      case 'success':
        return 'var(--success)';
      case 'danger':
        return 'var(--danger)';
      case 'warning':
        return 'var(--warning)';
      default:
        return 'var(--info)';
    }
  }
}
