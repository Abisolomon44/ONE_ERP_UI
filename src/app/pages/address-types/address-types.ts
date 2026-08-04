import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { BaseEmpty, BasePill } from '../../shared/base-data';
import { BaseButton } from '../../shared/base-button';
import { BaseDialog } from '../../shared/base-feedback';
import { BaseInput, BaseSearch } from '../../shared/base-controls';
import { BasePermission } from '../../shared/base-permission';
import { AddressType } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-address-types',
  standalone: true,
  imports: [LucideAngularModule, BaseEmpty, BasePill, BaseButton, BaseDialog, BaseInput, BaseSearch, BasePermission],
  templateUrl: './address-types.html',
  styleUrl: './address-types.css',
})
export class AddressTypesPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  protected readonly rows = signal<AddressType[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly search = signal('');
  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<AddressType | null>(null);

  protected readonly form = {
    name: signal(''),
    description: signal(''),
    isActive: signal(true),
  };

  protected readonly filtered = computed(() => {
    const q = this.search().toLowerCase();
    const list = this.rows();
    if (!q) return list;
    return list.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q),
    );
  });

  constructor() {
    void this.load();
  }

  protected async openCreate(): Promise<void> {
    this.editing.set(null);
    this.form.name.set('');
    this.form.description.set('');
    this.form.isActive.set(true);
    this.dialogOpen.set(true);
  }

  protected async openEdit(item: AddressType): Promise<void> {
    this.editing.set(item);
    this.form.name.set(item.name);
    this.form.description.set(item.description ?? '');
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
        description: this.form.description() || null,
        isActive: this.editing()?.isActive ?? true,
      };
      if (this.editing()) {
        await firstValueFrom(
          this.http.put(`/api/address-types/${this.editing()!.addressTypeId}`, payload),
        );
        this.toast.success('Address type updated');
      } else {
        await firstValueFrom(this.http.post('/api/address-types', payload));
        this.toast.success('Address type created');
      }
      this.dialogOpen.set(false);
      await this.load();
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(item: AddressType): Promise<void> {
    if (!confirm(`Delete address type "${item.name}"? This cannot be undone.`)) return;
    try {
      await firstValueFrom(this.http.delete(`/api/address-types/${item.addressTypeId}`));
      this.toast.success('Address type deleted');
      await this.load();
    } catch {
      /* handled by interceptor */
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(this.http.get<AddressType[]>('/api/address-types?includeInactive=true'));
      this.rows.set(res);
    } catch {
      this.toast.error('Failed to load address types');
    } finally {
      this.loading.set(false);
    }
  }
}
