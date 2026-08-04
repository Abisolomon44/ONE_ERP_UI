import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { BaseEmpty, BasePill } from '../../shared/base-data';
import { BaseButton } from '../../shared/base-button';
import { BaseDialog } from '../../shared/base-feedback';
import { BaseInput, BaseSearch } from '../../shared/base-controls';
import { BasePermission } from '../../shared/base-permission';
import { TimeZone } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-time-zones',
  standalone: true,
  imports: [LucideAngularModule, BaseEmpty, BasePill, BaseButton, BaseDialog, BaseInput, BaseSearch, BasePermission],
  templateUrl: './time-zones.html',
  styleUrl: './time-zones.css',
})
export class TimeZonesPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  protected readonly rows = signal<TimeZone[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly search = signal('');
  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<TimeZone | null>(null);

  protected readonly form = {
    name: signal(''),
    timeZoneName: signal(''),
    utcOffset: signal(''),
    isActive: signal(true),
  };

  protected readonly filtered = computed(() => {
    const q = this.search().toLowerCase();
    const list = this.rows();
    if (!q) return list;
    return list.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.timeZoneName.toLowerCase().includes(q) ||
        (t.utcOffset ?? '').toLowerCase().includes(q),
    );
  });

  constructor() {
    void this.load();
  }

  protected async openCreate(): Promise<void> {
    this.editing.set(null);
    this.form.name.set('');
    this.form.timeZoneName.set('');
    this.form.utcOffset.set('');
    this.form.isActive.set(true);
    this.dialogOpen.set(true);
  }

  protected async openEdit(item: TimeZone): Promise<void> {
    this.editing.set(item);
    this.form.name.set(item.name);
    this.form.timeZoneName.set(item.timeZoneName);
    this.form.utcOffset.set(item.utcOffset ?? '');
    this.form.isActive.set(item.isActive);
    this.dialogOpen.set(true);
  }

  protected onActiveChange(event: Event): void {
    this.form.isActive.set((event.target as HTMLInputElement).checked);
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const payload = {
        name: this.form.name().trim(),
        timeZoneName: this.form.timeZoneName().trim(),
        utcOffset: this.form.utcOffset().trim() || null,
        isActive: this.editing()?.isActive ?? true,
      };
      if (this.editing()) {
        await firstValueFrom(
          this.http.put(`/api/timezones/${this.editing()!.timeZoneId}`, payload),
        );
        this.toast.success('Time zone updated');
      } else {
        await firstValueFrom(this.http.post('/api/timezones', payload));
        this.toast.success('Time zone created');
      }
      this.dialogOpen.set(false);
      await this.load();
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(item: TimeZone): Promise<void> {
    if (!confirm(`Delete time zone "${item.name}"? This cannot be undone.`)) return;
    try {
      await firstValueFrom(this.http.delete(`/api/timezones/${item.timeZoneId}`));
      this.toast.success('Time zone deleted');
      await this.load();
    } catch {
      /* handled by interceptor */
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(this.http.get<TimeZone[]>('/api/timezones?includeInactive=true'));
      this.rows.set(res);
    } catch {
      this.toast.error('Failed to load time zones');
    } finally {
      this.loading.set(false);
    }
  }
}
