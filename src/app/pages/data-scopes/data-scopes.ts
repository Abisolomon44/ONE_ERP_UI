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
import { DataScope, Role, Module, Screen } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-data-scopes',
  standalone: true,
  imports: [ LucideAngularModule, BaseEmpty, BaseButton, BaseDialog, BasePermission],
  templateUrl: './data-scopes.html',
  styleUrl: './data-scopes.css',
})
export class DataScopesPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  protected readonly rows = signal<DataScope[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<DataScope | null>(null);

  protected readonly selectedRoleId = signal<string>('');

  protected readonly roleOptions = signal<DropdownOption[]>([]);
  protected readonly moduleOptions = signal<DropdownOption[]>([]);
  protected readonly screenOptions = signal<DropdownOption[]>([]);
  protected readonly branchOptions = signal<DropdownOption[]>([]);
  protected readonly departmentOptions = signal<DropdownOption[]>([]);
  protected readonly warehouseOptions = signal<DropdownOption[]>([]);

  protected readonly form = {
    moduleId: signal<string>(''),
    screenId: signal<string>(''),
    branchId: signal<string>(''),
    departmentId: signal<string>(''),
    warehouseId: signal<string>(''),
    canView: signal(true),
    canCreate: signal(false),
    canEdit: signal(false),
    canDelete: signal(false),
    isActive: signal(true),
  };

  constructor() {
    void this.loadRoles();
  }

  protected async onRoleChange(): Promise<void> {
    const roleId = this.selectedRoleId();
    if (!roleId) {
      this.rows.set([]);
      return;
    }
    await this.loadRows(roleId);
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.form.moduleId.set('');
    this.form.screenId.set('');
    this.form.branchId.set('');
    this.form.departmentId.set('');
    this.form.warehouseId.set('');
    this.form.canView.set(true);
    this.form.canCreate.set(false);
    this.form.canEdit.set(false);
    this.form.canDelete.set(false);
    this.form.isActive.set(true);
    this.dialogOpen.set(true);
  }

  protected openEdit(item: DataScope): void {
    this.editing.set(item);
    this.form.moduleId.set(item.moduleId?.toString() ?? '');
    this.form.screenId.set(item.screenId?.toString() ?? '');
    this.form.branchId.set(item.branchId?.toString() ?? '');
    this.form.departmentId.set(item.departmentId?.toString() ?? '');
    this.form.warehouseId.set(item.warehouseId?.toString() ?? '');
    this.form.canView.set(item.canView);
    this.form.canCreate.set(item.canCreate);
    this.form.canEdit.set(item.canEdit);
    this.form.canDelete.set(item.canDelete);
    this.form.isActive.set(item.isActive);
    this.dialogOpen.set(true);
  }

  protected closeDialog(): void {
    this.dialogOpen.set(false);
  }

  protected async save(): Promise<void> {
    const roleId = parseInt(this.selectedRoleId(), 10);
    if (!roleId) return;

    this.saving.set(true);
    try {
      const payload = {
        roleId,
        moduleId: this.form.moduleId() ? parseInt(this.form.moduleId(), 10) : null,
        screenId: this.form.screenId() ? parseInt(this.form.screenId(), 10) : null,
        branchId: this.form.branchId() ? parseInt(this.form.branchId(), 10) : null,
        departmentId: this.form.departmentId() ? parseInt(this.form.departmentId(), 10) : null,
        warehouseId: this.form.warehouseId() ? parseInt(this.form.warehouseId(), 10) : null,
        canView: this.form.canView(),
        canCreate: this.form.canCreate(),
        canEdit: this.form.canEdit(),
        canDelete: this.form.canDelete(),
        isActive: this.form.isActive(),
      };

      const editingId = this.editing()?.id;
      if (editingId) {
        await firstValueFrom(this.http.put(`/api/data-scopes/${editingId}`, payload));
        this.toast.success('Data scope updated');
      } else {
        await firstValueFrom(this.http.post('/api/data-scopes', payload));
        this.toast.success('Data scope created');
      }
      this.dialogOpen.set(false);
      await this.loadRows(roleId.toString());
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(id: number): Promise<void> {
    if (!confirm('Delete this data scope?')) return;

    this.saving.set(true);
    try {
      await firstValueFrom(this.http.delete(`/api/data-scopes/${id}`));
      this.toast.success('Data scope deleted');
      await this.loadRows(this.selectedRoleId());
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  private async loadRoles(): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<Role[]>('/api/roles'));
      this.roleOptions.set(res.map((r) => ({ value: r.roleId, label: r.name })));
    } catch {
      /* handled by interceptor */
    }
  }

  private async loadRows(roleId: string): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(this.http.get<DataScope[]>(`/api/data-scopes/role/${roleId}`));
      this.rows.set(res ?? []);
      await this.loadDropdowns();
    } catch {
      this.rows.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadDropdowns(): Promise<void> {
    const [modules, screens, branches, departments, warehouses] = await Promise.all([
      firstValueFrom(this.http.get<Module[]>('/api/modules')).catch(() => [] as Module[]),
      firstValueFrom(this.http.get<Screen[]>('/api/screens')).catch(() => [] as Screen[]),
      firstValueFrom(this.http.get<{ id: number; branchName: string }[]>('/api/branches')).catch(() => []),
      firstValueFrom(this.http.get<{ id: number; departmentName: string }[]>('/api/departments')).catch(() => []),
      firstValueFrom(this.http.get<{ id: number; warehouseName: string }[]>('/api/warehouses')).catch(() => []),
    ]);
    this.moduleOptions.set(modules.map((m) => ({ value: m.id, label: m.moduleName })));
    this.screenOptions.set(screens.map((s: any) => ({ value: s.id, label: s.screenName })));
    this.branchOptions.set((branches as any[]).map((b) => ({ value: b.id, label: b.branchName })));
    this.departmentOptions.set((departments as any[]).map((d) => ({ value: d.id, label: d.departmentName })));
    this.warehouseOptions.set((warehouses as any[]).map((w) => ({ value: w.id, label: w.warehouseName })));
  }
}
