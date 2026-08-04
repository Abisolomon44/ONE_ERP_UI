import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { BaseEmpty, BasePill } from '../../shared/base-data';
import { BaseButton } from '../../shared/base-button';
import { BaseDialog } from '../../shared/base-feedback';
import { BaseInput, BaseSearch } from '../../shared/base-controls';
import { BasePermission } from '../../shared/base-permission';
import { Language } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-languages',
  standalone: true,
  imports: [LucideAngularModule, BaseEmpty, BasePill, BaseButton, BaseDialog, BaseInput, BaseSearch, BasePermission],
  templateUrl: './languages.html',
  styleUrl: './languages.css',
})
export class LanguagesPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  protected readonly rows = signal<Language[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly search = signal('');
  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<Language | null>(null);

  protected readonly form = {
    name: signal(''),
    code: signal(''),
    cultureCode: signal(''),
    isRTL: signal(false),
    isDefault: signal(false),
    sortOrder: signal('1'),
    isActive: signal(true),
  };

  protected readonly filtered = computed(() => {
    const q = this.search().toLowerCase();
    const list = this.rows();
    if (!q) return list;
    return list.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q) ||
        (l.cultureCode ?? '').toLowerCase().includes(q),
    );
  });

  constructor() {
    void this.load();
  }

  protected async openCreate(): Promise<void> {
    this.editing.set(null);
    this.form.name.set('');
    this.form.code.set('');
    this.form.cultureCode.set('');
    this.form.isRTL.set(false);
    this.form.isDefault.set(false);
    this.form.sortOrder.set(String(this.nextSortOrder()));
    this.form.isActive.set(true);
    this.dialogOpen.set(true);
  }

  protected async openEdit(item: Language): Promise<void> {
    this.editing.set(item);
    this.form.name.set(item.name);
    this.form.code.set(item.code);
    this.form.cultureCode.set(item.cultureCode ?? '');
    this.form.isRTL.set(item.isRTL);
    this.form.isDefault.set(item.isDefault);
    this.form.sortOrder.set(String(item.sortOrder));
    this.form.isActive.set(item.isActive);
    this.dialogOpen.set(true);
  }

  protected onActiveChange(event: Event): void {
    this.form.isActive.set((event.target as HTMLInputElement).checked);
  }

  protected onDefaultChange(event: Event): void {
    this.form.isDefault.set((event.target as HTMLInputElement).checked);
  }

  protected onRtlChange(event: Event): void {
    this.form.isRTL.set((event.target as HTMLInputElement).checked);
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const payload = {
        name: this.form.name().trim(),
        code: this.form.code().trim(),
        cultureCode: this.form.cultureCode().trim() || null,
        isRTL: this.form.isRTL(),
        isDefault: this.form.isDefault(),
        sortOrder: parseInt(this.form.sortOrder(), 10) || 1,
        isActive: this.editing()?.isActive ?? true,
      };
      if (this.editing()) {
        await firstValueFrom(
          this.http.put(`/api/languages/${this.editing()!.languageId}`, payload),
        );
        this.toast.success('Language updated');
      } else {
        await firstValueFrom(this.http.post('/api/languages', payload));
        this.toast.success('Language created');
      }
      this.dialogOpen.set(false);
      await this.load();
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(item: Language): Promise<void> {
    if (!confirm(`Delete language "${item.name}"? This cannot be undone.`)) return;
    try {
      await firstValueFrom(this.http.delete(`/api/languages/${item.languageId}`));
      this.toast.success('Language deleted');
      await this.load();
    } catch {
      /* handled by interceptor */
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(this.http.get<Language[]>('/api/languages?includeInactive=true'));
      this.rows.set(res);
    } catch {
      this.toast.error('Failed to load languages');
    } finally {
      this.loading.set(false);
    }
  }

  private nextSortOrder(): number {
    return this.rows().length === 0 ? 1 : Math.max(...this.rows().map((l) => l.sortOrder)) + 1;
  }
}