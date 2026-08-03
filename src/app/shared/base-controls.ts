import { Component, computed, input, model, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

/* ---------------- BaseInput ---------------- */
@Component({
  selector: 'base-input',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="field">
      @if (label()) {
        <label class="field-label" [for]="id()">{{ label() }}</label>
      }
      <div class="input-wrap">
        @if (icon()) {
          <i-lucide class="input-prefix" [name]="icon()" [size]="16"></i-lucide>
        }
        <input
          class="input"
          [class.has-prefix]="!!icon()"
          [class.has-suffix]="effectiveType() === 'password'"
          [class.invalid]="!!error()"
          [id]="id()"
          [type]="effectiveType()"
          [placeholder]="placeholder()"
          [disabled]="disabled()"
          [value]="value()"
          [autocomplete]="autocomplete()"
          (input)="onInput($event)" />
        @if (effectiveType() === 'password') {
          <i-lucide class="input-suffix" [name]="showPassword() ? 'eye-off' : 'eye'" [size]="16" (click)="togglePassword()"></i-lucide>
        }
      </div>
      @if (error()) {
        <span class="field-error">{{ error() }}</span>
      } @else if (hint()) {
        <span class="field-hint">{{ hint() }}</span>
      }
    </div>
  `,
})
export class BaseInput {
  readonly label = input('');
  readonly type = input<'text' | 'password' | 'email' | 'number' | 'tel' | 'date'>('text');
  readonly placeholder = input('');
  readonly icon = input('');
  readonly error = input('');
  readonly hint = input('');
  readonly value = model('');
  readonly disabled = input(false);
  readonly id = input('');
  readonly autocomplete = input('');

  protected showPassword = signal(false);
  protected isPassword = computed(() => this.type() === 'password');
  protected effectiveType = computed(() => (this.isPassword() && this.showPassword() ? 'text' : this.type()));

  protected togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  protected onInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
  }
}

/* ---------------- BaseDropdown ---------------- */
export interface DropdownOption {
  value: string | number;
  label: string;
}

@Component({
  selector: 'base-dropdown',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="field">
      @if (label()) {
        <label class="field-label" [for]="id()">{{ label() }}</label>
      }
      <div class="input-wrap">
        @if (icon()) {
          <i-lucide class="input-prefix" [name]="icon()" [size]="16"></i-lucide>
        }
        <select
          class="input"
          [class.has-prefix]="!!icon()"
          [class.invalid]="!!error()"
          [id]="id()"
          [disabled]="disabled()"
          [value]="value()"
          (change)="onSelect($event)">
          @if (placeholder()) {
            <option [value]="''" disabled>{{ placeholder() }}</option>
          }
          @for (option of options(); track option.value) {
            <option [value]="option.value">{{ option.label }}</option>
          }
        </select>
      </div>
      @if (error()) {
        <span class="field-error">{{ error() }}</span>
      }
    </div>
  `,
})
export class BaseDropdown {
  readonly label = input('');
  readonly placeholder = input('');
  readonly icon = input('');
  readonly options = input<DropdownOption[]>([]);
  readonly error = input('');
  readonly value = model<string | number>('');
  readonly disabled = input(false);
  readonly id = input('');

  protected onSelect(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.value.set(target.value);
  }
}

/* ---------------- BaseSearch ---------------- */
@Component({
  selector: 'base-search',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="search-box">
      <i-lucide class="input-prefix" name="search" [size]="16"></i-lucide>
      <input
        class="input search-input"
        [placeholder]="placeholder()"
        [value]="value()"
        (input)="onInput($event)" />
    </div>
  `,
})
export class BaseSearch {
  readonly placeholder = input('Search...');
  readonly debounce = input(300);
  readonly value = model('');

  private timer: ReturnType<typeof setTimeout> | null = null;

  protected onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.value.set(value.trim()), this.debounce());
  }
}
