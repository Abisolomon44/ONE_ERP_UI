import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { BaseEmpty, BasePill } from '../../shared/base-data';
import { BaseButton } from '../../shared/base-button';
import { BaseDialog } from '../../shared/base-feedback';
import { BaseDropdown, BaseInput, BaseSearch, DropdownOption } from '../../shared/base-controls';
import { BasePermission } from '../../shared/base-permission';
import { CompanyGroup } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-company-groups',
  standalone: true,
  imports: [LucideAngularModule, BaseEmpty, BasePill, BaseButton, BaseDialog, BaseInput, BaseSearch, BaseDropdown, BasePermission],
  templateUrl: './company-groups.html',
  styleUrl: './company-groups.css',
})
export class CompanyGroupsPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  protected readonly rows = signal<CompanyGroup[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly search = signal('');
  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<CompanyGroup | null>(null);

  protected readonly form = {
    groupCode: signal(''),
    groupName: signal(''),
    shortName: signal(''),
    description: signal(''),
    parentGroupId: signal(''),
    isActive: signal(true),
  };

  protected readonly filtered = computed(() => {
    const q = this.search().toLowerCase();
    const list = this.rows();
    if (!q) return list;
    return list.filter(
      (g) =>
        g.groupCode.toLowerCase().includes(q) ||
        g.groupName.toLowerCase().includes(q) ||
        (g.shortName ?? '').toLowerCase().includes(q) ||
        (g.description ?? '').toLowerCase().includes(q),
    );
  });

  protected readonly parentOptions = computed<DropdownOption[]>(() => {
    const self = this.editing()?.companyGroupId;
    return this.rows()
      .filter((g) => g.companyGroupId !== self)
      .map((g) => ({ value: String(g.companyGroupId), label: g.groupName }));
  });

  constructor() {
    void this.load();
  }

  protected async openCreate(): Promise<void> {
    this.editing.set(null);
    this.form.groupCode.set('');
    this.form.groupName.set('');
    this.form.shortName.set('');
    this.form.description.set('');
    this.form.parentGroupId.set('');
    this.form.isActive.set(true);
    this.dialogOpen.set(true);
  }

  protected async openEdit(item: CompanyGroup): Promise<void> {
    this.editing.set(item);
    this.form.groupCode.set(item.groupCode);
    this.form.groupName.set(item.groupName);
    this.form.shortName.set(item.shortName ?? '');
    this.form.description.set(item.description ?? '');
    this.form.parentGroupId.set(item.parentGroupId ? String(item.parentGroupId) : '');
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
      const parent = this.form.parentGroupId() ? parseInt(this.form.parentGroupId(), 10) : null;
      const payload = {
        groupCode: this.form.groupCode().trim().toUpperCase(),
        groupName: this.form.groupName().trim(),
        shortName: this.form.shortName() || null,
        description: this.form.description() || null,
        parentGroupId: parent,
        isActive: this.editing()?.isActive ?? true,
      };
      if (this.editing()) {
        await firstValueFrom(this.http.put(`/api/company-groups/${this.editing()!.companyGroupId}`, payload));
        this.toast.success('Company group updated');
      } else {
        await firstValueFrom(this.http.post('/api/company-groups', payload));
        this.toast.success('Company group created');
      }
      this.dialogOpen.set(false);
      await this.load();
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(item: CompanyGroup): Promise<void> {
    if (!confirm(`Delete company group "${item.groupName}"? This cannot be undone.`)) return;
    try {
      await firstValueFrom(this.http.delete(`/api/company-groups/${item.companyGroupId}`));
      this.toast.success('Company group deleted');
      await this.load();
    } catch {
      /* handled by interceptor */
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(this.http.get<CompanyGroup[]>('/api/company-groups?includeInactive=true'));
      this.rows.set(res);
    } catch {
      this.toast.error('Failed to load company groups');
    } finally {
      this.loading.set(false);
    }
  }
}
