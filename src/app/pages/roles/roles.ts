import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { BaseEmpty, BasePill } from '../../shared/base-data';
import { BaseButton } from '../../shared/base-button';
import { BaseDialog } from '../../shared/base-feedback';
import { BaseInput } from '../../shared/base-controls';
import { BasePermission } from '../../shared/base-permission';
import { Permission, Role } from '../../core/models';
import { PermissionService } from '../../core/services/permission.service';
import { ToastService } from '../../core/services/toast.service';

interface PermissionToggle {
  code: string;
  name: string;
  module: string;
  checked: boolean;
}

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [LucideAngularModule, BaseEmpty, BasePill, BaseButton, BaseDialog, BaseInput, BasePermission],
  templateUrl: './roles.html',
  styleUrl: './roles.css',
})
export class RolesPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  protected readonly perms = inject(PermissionService);

  protected readonly rows = signal<Role[]>([]);
  protected readonly allPermissions = signal<Permission[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<Role | null>(null);
  protected readonly selectedCodes = signal<string[]>([]);

  protected readonly form = {
    name: signal(''),
    code: signal(''),
    description: signal(''),
  };

  protected readonly permissionGroups = signal<{ module: string; items: PermissionToggle[] }[]>([]);

  constructor() {
    void this.load();
  }

  protected async openCreate(): Promise<void> {
    this.editing.set(null);
    this.form.name.set('');
    this.form.code.set('');
    this.form.description.set('');
    await this.ensurePermissions();
    this.setSelected([]);
    this.dialogOpen.set(true);
  }

  protected async openEdit(role: Role): Promise<void> {
    this.editing.set(role);
    this.form.name.set(role.name);
    this.form.code.set(role.code);
    this.form.description.set(role.description ?? '');
    await this.ensurePermissions();
    this.setSelected(role.permissions);
    this.dialogOpen.set(true);
  }

  protected togglePermission(code: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedCodes.update((list) => (checked ? [...list, code] : list.filter((c) => c !== code)));
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const payload = {
        name: this.form.name(),
        description: this.form.description() || null,
        isActive: this.editing()?.isActive ?? true,
        permissions: this.selectedCodes(),
      };
      if (this.editing()) {
        await firstValueFrom(this.http.put(`/api/roles/${this.editing()!.roleId}`, payload));
        this.toast.success('Role updated');
      } else {
        await firstValueFrom(
          this.http.post('/api/roles', {
            name: this.form.name(),
            code: this.form.code(),
            description: this.form.description() || null,
            permissions: this.selectedCodes(),
          }),
        );
        this.toast.success('Role created');
      }
      this.dialogOpen.set(false);
      await this.load();
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(role: Role): Promise<void> {
    if (!confirm(`Delete role ${role.name}?`)) return;
    try {
      await firstValueFrom(this.http.delete(`/api/roles/${role.roleId}`));
      this.toast.success('Role deleted');
      await this.load();
    } catch {
      /* handled by interceptor */
    }
  }

  private async ensurePermissions(): Promise<void> {
    if (this.allPermissions().length > 0) return;
    try {
      const res = await firstValueFrom(this.http.get<Permission[]>('/api/roles/permissions'));
      this.allPermissions.set(res);
    } catch {
      /* ignored */
    }
  }

  private setSelected(codes: string[]): void {
    this.selectedCodes.set(codes);
    const map = new Map<string, PermissionToggle[]>();
    for (const perm of this.allPermissions()) {
      const list = map.get(perm.module) ?? [];
      list.push({ code: perm.code, name: perm.name, module: perm.module, checked: codes.includes(perm.code) });
      map.set(perm.module, list);
    }
    this.permissionGroups.set(
      [...map.entries()].map(([module, items]) => ({ module, items })),
    );
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(this.http.get<Role[]>('/api/roles'));
      this.rows.set(res);
    } catch {
      this.toast.error('Failed to load roles');
    } finally {
      this.loading.set(false);
    }
  }
}
