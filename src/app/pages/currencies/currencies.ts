import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { BaseEmpty, BasePill } from '../../shared/base-data';
import { BaseButton } from '../../shared/base-button';
import { BaseDialog } from '../../shared/base-feedback';
import { BaseInput, BaseSearch } from '../../shared/base-controls';
import { BasePermission } from '../../shared/base-permission';
import { Currency } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-currencies',
  standalone: true,
  imports: [LucideAngularModule, BaseEmpty, BasePill, BaseButton, BaseDialog, BaseInput, BaseSearch, BasePermission],
  templateUrl: './currencies.html',
  styleUrl: './currencies.css',
})
export class CurrenciesPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  protected readonly rows = signal<Currency[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly search = signal('');
  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<Currency | null>(null);

  protected readonly form = {
    currencyCode: signal(''),
    currencyName: signal(''),
    symbol: signal(''),
    isoCode: signal(''),
    decimalPlaces: signal('2'),
    isBaseCurrency: signal(false),
    isActive: signal(true),
  };

  protected readonly filtered = computed(() => {
    const q = this.search().toLowerCase();
    const list = this.rows();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.currencyCode.toLowerCase().includes(q) ||
        c.currencyName.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q) ||
        (c.isoCode ?? '').toLowerCase().includes(q),
    );
  });

  constructor() {
    void this.load();
  }

  protected async openCreate(): Promise<void> {
    this.editing.set(null);
    this.form.currencyCode.set('');
    this.form.currencyName.set('');
    this.form.symbol.set('');
    this.form.isoCode.set('');
    this.form.decimalPlaces.set('2');
    this.form.isBaseCurrency.set(false);
    this.form.isActive.set(true);
    this.dialogOpen.set(true);
  }

  protected async openEdit(item: Currency): Promise<void> {
    this.editing.set(item);
    this.form.currencyCode.set(item.currencyCode);
    this.form.currencyName.set(item.currencyName);
    this.form.symbol.set(item.symbol);
    this.form.isoCode.set(item.isoCode ?? '');
    this.form.decimalPlaces.set(String(item.decimalPlaces));
    this.form.isBaseCurrency.set(item.isBaseCurrency);
    this.form.isActive.set(item.isActive);
    this.dialogOpen.set(true);
  }

  protected onActiveChange(event: Event): void {
    this.form.isActive.set((event.target as HTMLInputElement).checked);
  }

  protected onBaseChange(event: Event): void {
    this.form.isBaseCurrency.set((event.target as HTMLInputElement).checked);
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const payload = {
        currencyCode: this.form.currencyCode().trim().toUpperCase(),
        currencyName: this.form.currencyName().trim(),
        symbol: this.form.symbol().trim(),
        isoCode: this.form.isoCode().trim() || null,
        decimalPlaces: parseInt(this.form.decimalPlaces(), 10) || 0,
        isBaseCurrency: this.form.isBaseCurrency(),
        isActive: this.editing()?.isActive ?? true,
      };
      if (this.editing()) {
        await firstValueFrom(
          this.http.put('/api/Administration/currency/' + this.editing()!.id, payload),
        );
        this.toast.success('Currency updated');
      } else {
        await firstValueFrom(this.http.post('/api/Administration/currency', payload));
        this.toast.success('Currency created');
      }
      this.dialogOpen.set(false);
      await this.load();
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(item: Currency): Promise<void> {
    if (!confirm('Delete currency "' + item.currencyName + '"? This cannot be undone.')) return;
    try {
      await firstValueFrom(this.http.delete('/api/Administration/currency/' + item.id));
      this.toast.success('Currency deleted');
      await this.load();
    } catch {
      /* handled by interceptor */
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(this.http.get<Currency[]>('/api/Administration/currencies?includeInactive=true'));
      this.rows.set(res);
    } catch {
      this.toast.error('Failed to load currencies');
    } finally {
      this.loading.set(false);
    }
  }
}
