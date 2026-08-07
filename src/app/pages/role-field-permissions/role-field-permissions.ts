import { HttpClient } from '@angular/common/http';
import { Component, inject, signal, WritableSignal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { BaseEmpty } from '../../shared/base-data';
import { BaseButton } from '../../shared/base-button';
import { BaseDropdown, DropdownOption } from '../../shared/base-controls';
import { BasePermission } from '../../shared/base-permission';
import { RoleFieldPermissionEntry, Role, Screen, Field } from '../../core/models';
import { PermissionService } from '../../core/services/permission.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-role-field-permissions',
  standalone: true,
  imports: [LucideAngularModule, BaseEmpty, BaseButton, BaseDropdown, BasePermission],
  templateUrl: './role-field-permissions.html',
  styleUrl: './role-field-permissions.css',
})
export class RoleFieldPermissionsPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  protected readonly perms = inject(PermissionService);

  protected readonly rows = signal<RoleFieldPermissionEntry[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);

  protected readonly selectedRoleId = signal<string>('');
  protected readonly selectedScreenId = signal<string>('');

  protected readonly roleOptions = signal<DropdownOption[]>([]);
  protected readonly screenOptions = signal<DropdownOption[]>([]);
  protected readonly allFields = signal<Field[]>([]);

  protected readonly bulkForm: {
    canView: WritableSignal<boolean>;
    canEdit: WritableSignal<boolean>;
    isHidden: WritableSignal<boolean>;
    isReadOnly: WritableSignal<boolean>;
    isMandatory: WritableSignal<boolean>;
  } = {
    canView: signal(true),
    canEdit: signal(false),
    isHidden: signal(false),
    isReadOnly: signal(false),
    isMandatory: signal(false),
  };

  constructor() {
    void this.loadRoles();
  }

  protected async onRoleChange(): Promise<void> {
    this.selectedScreenId.set('');
    this.rows.set([]);
    this.screenOptions.set([]);
    const roleId = this.selectedRoleId();
    if (!roleId) return;
    await this.loadScreensForRole(roleId);
  }

  protected async onScreenChange(): Promise<void> {
    const roleId = this.selectedRoleId();
    const screenId = this.selectedScreenId();
    if (!roleId || !screenId) {
      this.rows.set([]);
      return;
    }
    await this.loadFieldPermissions(roleId, screenId);
    await this.loadFields(screenId);
  }

  protected async toggleField(fieldId: number, field: string, event: Event): Promise<void> {
    const checked = (event.target as HTMLInputElement).checked;
    const roleId = parseInt(this.selectedRoleId(), 10);
    const screenId = parseInt(this.selectedScreenId(), 10);
    if (!roleId || !screenId) return;

    this.saving.set(true);
    try {
      const existing = this.rows().find((r) => r.fieldId === fieldId);
      if (existing) {
        const payload: Record<string, unknown> = {
          roleId,
          screenId,
          fieldId,
          canView: existing.canView,
          canEdit: existing.canEdit,
          isHidden: existing.isHidden,
          isReadOnly: existing.isReadOnly,
          isMandatory: existing.isMandatory,
          displayOrder: existing.displayOrder,
          isActive: existing.isActive,
        };
        payload[field] = checked;
        await firstValueFrom(
          this.http.post('/api/role-field-permissions', payload),
        );
      } else {
        await firstValueFrom(
          this.http.post('/api/role-field-permissions', {
            roleId,
            screenId,
            fieldId,
            canView: field === 'canView' ? checked : true,
            canEdit: field === 'canEdit' ? checked : false,
            isHidden: field === 'isHidden' ? checked : false,
            isReadOnly: field === 'isReadOnly' ? checked : false,
            isMandatory: field === 'isMandatory' ? checked : false,
            displayOrder: 0,
            isActive: true,
          }),
        );
      }
      await this.loadFieldPermissions(roleId.toString(), screenId.toString());
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  protected async applyBulk(): Promise<void> {
    const roleId = parseInt(this.selectedRoleId(), 10);
    const screenId = parseInt(this.selectedScreenId(), 10);
    if (!roleId || !screenId) return;

    this.saving.set(true);
    try {
      const fields = this.allFields().map((f) => ({
        fieldId: f.id,
        canView: this.bulkForm.canView(),
        canEdit: this.bulkForm.canEdit(),
        isHidden: this.bulkForm.isHidden(),
        isReadOnly: this.bulkForm.isReadOnly(),
        isMandatory: this.bulkForm.isMandatory(),
        displayOrder: f.displayOrder,
      }));

      await firstValueFrom(
        this.http.post('/api/role-field-permissions/bulk', { roleId, screenId, fields }),
      );
      this.toast.success('Bulk permissions applied');
      await this.loadFieldPermissions(roleId.toString(), screenId.toString());
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(entry: RoleFieldPermissionEntry): Promise<void> {
    if (!confirm(`Remove field permission for "${entry.displayName || entry.fieldName}"?`)) return;
    const roleId = this.selectedRoleId();
    const screenId = this.selectedScreenId();
    try {
      await firstValueFrom(this.http.delete(`/api/role-field-permissions/${entry.id}`));
      this.toast.success('Field permission removed');
      if (roleId && screenId) {
        await this.loadFieldPermissions(roleId, screenId);
      }
    } catch {
      /* handled by interceptor */
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

  private async loadScreensForRole(roleId: string): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.get<RoleFieldPermissionEntry[]>(`/api/role-field-permissions/role/${roleId}`),
      );
      const screenIds = new Set(res.map((r) => r.screenId));
      if (screenIds.size > 0) {
        const screens = await firstValueFrom(this.http.get<Screen[]>('/api/screens'));
        const relevant = screens.filter((s) => screenIds.has(s.id));
        this.screenOptions.set(relevant.map((s) => ({ value: s.id, label: s.screenName })));
      } else {
        const screens = await firstValueFrom(this.http.get<Screen[]>('/api/screens'));
        this.screenOptions.set(screens.map((s) => ({ value: s.id, label: s.screenName })));
      }
    } catch {
      /* handled by interceptor */
    }
  }

  private async loadFieldPermissions(roleId: string, screenId: string): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(
        this.http.get<RoleFieldPermissionEntry[]>(
          `/api/role-field-permissions/role/${roleId}/screen/${screenId}`,
        ),
      );
      this.rows.set(res);
    } catch {
      this.toast.error('Failed to load field permissions');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadFields(screenId: string): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<Field[]>(`/api/fields?screenId=${screenId}`));
      this.allFields.set(res);
    } catch {
      /* handled by interceptor */
    }
  }
}
