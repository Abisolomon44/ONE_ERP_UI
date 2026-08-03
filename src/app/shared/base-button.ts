import { Component, input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'danger-soft';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'base-button',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <button
      [class]="btnClass()"
      [type]="type()"
      [disabled]="disabled() || loading()"
      (click)="handleClick($event)"
      [attr.aria-label]="iconOnly() ? label() : null">
      @if (loading()) {
        <span class="spinner" [style.width.px]="spinnerSize()" [style.height.px]="spinnerSize()"></span>
      } @else if (icon()) {
        <i-lucide [name]="icon()" [size]="size() === 'sm' ? 14 : 16"></i-lucide>
      }
      @if (!iconOnly()) {
        <ng-content></ng-content>
      }
    </button>
  `,
})
export class BaseButton {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly icon = input('');
  readonly iconOnly = input(false);
  readonly label = input<string | number>('');
  readonly block = input(false);

  protected btnClass(): string {
    return [
      'btn',
      `btn-${this.variant()}`,
      this.size() === 'sm' ? 'btn-sm' : this.size() === 'lg' ? 'btn-lg' : '',
      this.iconOnly() ? 'btn-icon' : '',
      this.block() ? 'btn-block' : '',
    ]
      .filter(Boolean)
      .join(' ');
  }

  protected spinnerSize(): number {
    return this.size() === 'sm' ? 13 : 16;
  }

  protected handleClick(event: MouseEvent): void {
    if (this.disabled() || this.loading()) event.preventDefault();
  }
}
