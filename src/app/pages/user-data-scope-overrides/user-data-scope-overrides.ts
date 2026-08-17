import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { BaseEmpty, BasePill } from '../../shared/base-data';
import { BaseButton } from '../../shared/base-button';
import { BaseDialog } from '../../shared/base-feedback';
import { BaseInput, DropdownOption } from '../../shared/base-controls';
import { BasePermission } from '../../shared/base-permission';
import { UserDataScopeOverride, User, Module, Screen } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-user-data-scope-overrides',
  standalone: true,
  imports: [DatePipe, LucideAngularModule, BaseEmpty, BasePill, BaseButton, BaseDialog, BaseInput, BasePermission],
  templateUrl: './user-data-scope-overrides.html',
  styleUrl: './user-data-scope-overrides.css',
})
export class UserDataScopeOverridesPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  protected readonly rows = signal<UserDataScopeOverride[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<UserDataScopeOverride | null>(null);

  protected readonly selectedUserId = signal<string>('');

  protected readonly userOptions = signal<DropdownOption[]>([]);
  protected readonly moduleOptions = signal<DropdownOption[]>([]);
  protected readonly screenOptions = signal<DropdownOption[]>([]);

  protected readonly scopeTypes = ['Company', 'Branch', 'Department', 'Warehouse', 'BusinessUnit', 'CostCenter', 'ProfitCenter'];
  protected readonly permissionTypes = ['Grant', 'Deny'];

  protected readonly form = {
    moduleId: signal<string>(''),
    screenId: signal<string>(''),
    scopeType: signal('Branch'),
    scopeValue: signal(''),
    permissionType: signal('Deny'),
    allow: signal(false),
    effectiveFrom: signal(''),
    effectiveTo: signal(''),
    remarks: signal(''),
    isActive: signal(true),
  };

  constructor() {
    void this.loadUsers();
  }

  protected async onUserChange(): Promise<void> {
    const userId = this.selectedUserId();
    if (!userId) {
      this.rows.set([]);
      return;
    }
    await this.loadRows(userId);
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.form.moduleId.set('');
    this.form.screenId.set('');
    this.form.scopeType.set('Branch');
    this.form.scopeValue.set('');
    this.form.permissionType.set('Deny');
    this.form.allow.set(false);
    this.form.effectiveFrom.set(new Date().toISOString().slice(0, 16));
    this.form.effectiveTo.set('');
    this.form.remarks.set('');
    this.form.isActive.set(true);
    this.dialogOpen.set(true);
  }

  protected openEdit(item: UserDataScopeOverride): void {
    this.editing.set(item);
    this.form.moduleId.set(item.moduleId?.toString() ?? '');
    this.form.screenId.set(item.screenId?.toString() ?? '');
    this.form.scopeType.set(item.scopeType);
    this.form.scopeValue.set(item.scopeValue);
    this.form.permissionType.set(item.permissionType);
    this.form.allow.set(item.allow);
    this.form.effectiveFrom.set(item.effectiveFrom?.slice(0, 16) ?? '');
    this.form.effectiveTo.set(item.effectiveTo?.slice(0, 16) ?? '');
    this.form.remarks.set(item.remarks ?? '');
    this.form.isActive.set(item.isActive);
    this.dialogOpen.set(true);
  }

  protected closeDialog(): void {
    this.dialogOpen.set(false);
  }

  protected async save(): Promise<void> {
    const userId = parseInt(this.selectedUserId(), 10);
    if (!userId) return;

    this.saving.set(true);
    try {
      const payload = {
        userId,
        moduleId: this.form.moduleId() ? parseInt(this.form.moduleId(), 10) : null,
        screenId: this.form.screenId() ? parseInt(this.form.screenId(), 10) : null,
        scopeType: this.form.scopeType(),
        scopeValue: this.form.scopeValue(),
        permissionType: this.form.permissionType(),
        allow: this.form.allow(),
        effectiveFrom: this.form.effectiveFrom() || null,
        effectiveTo: this.form.effectiveTo() || null,
        remarks: this.form.remarks() || null,
        isActive: this.form.isActive(),
      };

      const editingId = this.editing()?.id;
      if (editingId) {
        await firstValueFrom(this.http.put(`/api/user-data-scope-overrides/${editingId}`, payload));
        this.toast.success('Override updated');
      } else {
        await firstValueFrom(this.http.post('/api/user-data-scope-overrides', payload));
        this.toast.success('Override created');
      }
      this.dialogOpen.set(false);
      await this.loadRows(this.selectedUserId());
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(id: number): Promise<void> {
    if (!confirm('Delete this override?')) return;

    this.saving.set(true);
    try {
      await firstValueFrom(this.http.delete(`/api/user-data-scope-overrides/${id}`));
      this.toast.success('Override deleted');
      await this.loadRows(this.selectedUserId());
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  private async loadUsers(): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<User[]>('/api/users'));
      this.userOptions.set(res.map((u) => ({ value: u.userId, label: `${u.fullName} (${u.username})` })));
    } catch {
      /* handled by interceptor */
    }
  }

  private async loadRows(userId: string): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(this.http.get<UserDataScopeOverride[]>(`/api/user-data-scope-overrides/user/${userId}`));
      this.rows.set(res ?? []);
      await this.loadDropdowns();
    } catch {
      this.rows.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadDropdowns(): Promise<void> {
    const [modules, screens] = await Promise.all([
      firstValueFrom(this.http.get<Module[]>('/api/modules')).catch(() => [] as Module[]),
      firstValueFrom(this.http.get<Screen[]>('/api/screens')).catch(() => [] as Screen[]),
    ]);
    this.moduleOptions.set(modules.map((m) => ({ value: m.id, label: m.moduleName })));
    this.screenOptions.set(screens.map((s: any) => ({ value: s.id, label: s.screenName })));
  }
}
