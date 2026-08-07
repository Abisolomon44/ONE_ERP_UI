import { HttpClient } from '@angular/common/http';
import { Component, inject, signal, WritableSignal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { BaseEmpty, BasePill } from '../../shared/base-data';
import { BaseButton } from '../../shared/base-button';
import { BaseDropdown, DropdownOption } from '../../shared/base-controls';
import { BasePermission } from '../../shared/base-permission';
import { DataScope, Role } from '../../core/models';
import { PermissionService } from '../../core/services/permission.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-data-scopes',
  standalone: true,
  imports: [LucideAngularModule, BaseEmpty, BasePill, BaseButton, BaseDropdown, BasePermission],
  templateUrl: './data-scopes.html',
  styleUrl: './data-scopes.css',
})
export class DataScopesPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  protected readonly perms = inject(PermissionService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);

  protected readonly selectedRoleId = signal<string>('');
  protected readonly currentScope = signal<DataScope | null>(null);
  protected readonly hasScope = signal(false);

  protected readonly roleOptions = signal<DropdownOption[]>([]);
  protected readonly branchOptions = signal<DropdownOption[]>([]);
  protected readonly departmentOptions = signal<DropdownOption[]>([]);
  protected readonly warehouseOptions = signal<DropdownOption[]>([]);

  protected readonly form: {
    branchId: WritableSignal<string>;
    departmentId: WritableSignal<string>;
    warehouseId: WritableSignal<string>;
    canViewAll: WritableSignal<boolean>;
    canEditAll: WritableSignal<boolean>;
  } = {
    branchId: signal(''),
    departmentId: signal(''),
    warehouseId: signal(''),
    canViewAll: signal(false),
    canEditAll: signal(false),
  };

  constructor() {
    void this.loadRoles();
  }

  protected async onRoleChange(): Promise<void> {
    this.currentScope.set(null);
    this.hasScope.set(false);
    const roleId = this.selectedRoleId();
    if (!roleId) return;
    await this.loadScope(roleId);
  }

  protected async save(): Promise<void> {
    const roleId = parseInt(this.selectedRoleId(), 10);
    if (!roleId) return;

    this.saving.set(true);
    try {
      const payload: Record<string, unknown> = {
        roleId,
        branchId: this.form.branchId() ? parseInt(this.form.branchId(), 10) : null,
        departmentId: this.form.departmentId() ? parseInt(this.form.departmentId(), 10) : null,
        warehouseId: this.form.warehouseId() ? parseInt(this.form.warehouseId(), 10) : null,
        canViewAll: this.form.canViewAll(),
        canEditAll: this.form.canEditAll(),
        isActive: true,
      };

      await firstValueFrom(this.http.post('/api/data-scopes', payload));
      this.toast.success('Data scope saved');
      await this.loadScope(roleId.toString());
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(): Promise<void> {
    const roleId = parseInt(this.selectedRoleId(), 10);
    if (!roleId) return;
    if (!confirm('Remove data scope for this role?')) return;

    this.saving.set(true);
    try {
      await firstValueFrom(this.http.delete(`/api/data-scopes/role/${roleId}`));
      this.toast.success('Data scope removed');
      this.currentScope.set(null);
      this.hasScope.set(false);
      this.form.branchId.set('');
      this.form.departmentId.set('');
      this.form.warehouseId.set('');
      this.form.canViewAll.set(false);
      this.form.canEditAll.set(false);
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  protected startEdit(): void {
    const scope = this.currentScope();
    if (!scope) return;
    this.form.branchId.set(scope.branchId?.toString() ?? '');
    this.form.departmentId.set(scope.departmentId?.toString() ?? '');
    this.form.warehouseId.set(scope.warehouseId?.toString() ?? '');
    this.form.canViewAll.set(scope.canViewAll);
    this.form.canEditAll.set(scope.canEditAll);
    this.hasScope.set(false);
  }

  protected cancelEdit(): void {
    const scope = this.currentScope();
    if (scope) {
      this.hasScope.set(true);
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

  private async loadScope(roleId: string): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(
        this.http.get<DataScope>(`/api/data-scopes/role/${roleId}`),
      );
      if (res && res.id) {
        this.currentScope.set(res);
        this.hasScope.set(true);
        await this.loadBranches();
        await this.loadDepartments();
        await this.loadWarehouses();
      } else {
        this.currentScope.set(null);
        this.hasScope.set(false);
        await this.loadBranches();
        await this.loadDepartments();
        await this.loadWarehouses();
      }
    } catch {
      this.currentScope.set(null);
      this.hasScope.set(false);
      await this.loadBranches();
      await this.loadDepartments();
      await this.loadWarehouses();
    } finally {
      this.loading.set(false);
    }
  }

  private async loadBranches(): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<{ id: number; branchName: string }[]>('/api/branches'));
      this.branchOptions.set(res.map((b) => ({ value: b.id, label: b.branchName })));
    } catch {
      /* handled by interceptor */
    }
  }

  private async loadDepartments(): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<{ id: number; departmentName: string }[]>('/api/departments'));
      this.departmentOptions.set(res.map((d) => ({ value: d.id, label: d.departmentName })));
    } catch {
      /* handled by interceptor */
    }
  }

  private async loadWarehouses(): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<{ id: number; warehouseName: string }[]>('/api/warehouses'));
      this.warehouseOptions.set(res.map((w) => ({ value: w.id, label: w.warehouseName })));
    } catch {
      /* handled by interceptor */
    }
  }
}
