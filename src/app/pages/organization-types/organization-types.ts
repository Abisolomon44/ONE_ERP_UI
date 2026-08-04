import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { BaseEmpty, BasePill } from '../../shared/base-data';
import { BaseButton } from '../../shared/base-button';
import { BaseDialog } from '../../shared/base-feedback';
import { BaseInput, BaseSearch } from '../../shared/base-controls';
import { BasePermission } from '../../shared/base-permission';
import { OrganizationType } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-organization-types',
  standalone: true,
  imports: [LucideAngularModule, BaseEmpty, BasePill, BaseButton, BaseDialog, BaseInput, BaseSearch, BasePermission],
  templateUrl: './organization-types.html',
  styleUrl: './organization-types.css',
})
export class OrganizationTypesPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  protected readonly rows = signal<OrganizationType[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly search = signal('');
  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<OrganizationType | null>(null);

  protected readonly form = {
    name: signal(''),
    code: signal(''),
    description: signal(''),
    sortOrder: signal('1'),
    isActive: signal(true),
  };

  protected readonly filtered = computed(() => {
    const q = this.search().toLowerCase();
    const list = this.rows();
    if (!q) return list;
    return list.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q),
    );
  });

  constructor() {
    void this.load();
  }

  protected async openCreate(): Promise<void> {
    this.editing.set(null);
    this.form.name.set('');
    this.form.code.set('');
    this.form.description.set('');
    this.form.sortOrder.set(String(this.nextSortOrder()));
    this.form.isActive.set(true);
    this.dialogOpen.set(true);
  }

  protected async openEdit(item: OrganizationType): Promise<void> {
    this.editing.set(item);
    this.form.name.set(item.name);
    this.form.code.set(item.code);
    this.form.description.set(item.description ?? '');
    this.form.sortOrder.set(String(item.sortOrder));
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
        code: this.form.code().trim().toUpperCase(),
        description: this.form.description() || null,
        sortOrder: parseInt(this.form.sortOrder(), 10) || 1,
        isActive: this.editing()?.isActive ?? true,
      };
      if (this.editing()) {
        await firstValueFrom(
          this.http.put('/api/organization-types/' + this.editing()!.organizationTypeId, payload),
        );
        this.toast.success('Organization type updated');
      } else {
        await firstValueFrom(this.http.post('/api/organization-types', payload));
        this.toast.success('Organization type created');
      }
      this.dialogOpen.set(false);
      await this.load();
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(item: OrganizationType): Promise<void> {
    if (!confirm('Delete organization type "' + item.name + '"? This cannot be undone.')) return;
    try {
      await firstValueFrom(this.http.delete('/api/organization-types/' + item.organizationTypeId));
      this.toast.success('Organization type deleted');
      await this.load();
    } catch {
      /* handled by interceptor */
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(this.http.get<OrganizationType[]>('/api/organization-types?includeInactive=true'));
      this.rows.set(res);
    } catch {
      this.toast.error('Failed to load organization types');
    } finally {
      this.loading.set(false);
    }
  }

  private nextSortOrder(): number {
    return this.rows().length === 0 ? 1 : Math.max(...this.rows().map((t) => t.sortOrder)) + 1;
  }
}
