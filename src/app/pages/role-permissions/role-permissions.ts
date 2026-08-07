import { HttpClient } from '@angular/common/http';
import { Component, inject, signal, computed, Signal, WritableSignal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { BaseButton } from '../../shared/base-button';
import { BaseDropdown } from '../../shared/base-controls';
import { PermissionModule, PermissionAction, ModulePermission } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-role-permissions',
  standalone: true,
  imports: [LucideAngularModule, BaseButton, BaseDropdown],
  template: `
    <div class="page-header">
      <div>
        <h1>Role Permission Matrix</h1>
        <div class="page-sub">Assign module-level permissions to roles across all scopes.</div>
      </div>
    </div>

    <div class="card" style="margin-bottom: 20px">
      <div class="flex" style="gap: 16px; align-items: flex-end">
        <base-dropdown label="Select Role" icon="shield" placeholder="Choose a role" [options]="roleOptions()" [(value)]="selectedRoleId">
        </base-dropdown>
        <base-button icon="refresh-cw" size="sm" (click)="onRefresh()" [disabled]="!selectedRoleId()">Refresh</base-button>
      </div>
    </div>

    @if (!selectedRoleId()) {
      <div class="card">
        <div class="flex" style="justify-content: center; padding: 40px; color: var(--text-2)">
          Select a role to view and manage permissions.
        </div>
      </div>
    } @else if (loading()) {
      <div class="card flex" style="justify-content:center; padding: 44px">
        <span class="spinner spinner-lg" style="color: var(--accent)"></span>
      </div>
    } @else {
      <div class="table-card">
        <table class="table">
          <thead>
            <tr>
              <th>Module</th>
              @for (action of actions(); track action.code) {
                <th class="text-center">{{ action.name }}</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (module of visibleModulesList(); track module.id) {
              <tr>
                <td>
                  <div style="display:flex; align-items:center; gap:8px">
                    <i-lucide [name]="module.icon || 'cube'" [size]="16"></i-lucide>
                    <span>{{ module.name }}</span>
                  </div>
                </td>
                @for (action of actions(); track action.id) {
                  <td class="text-center">
                    <button class="perm-toggle" [class.active]="hasPermission(module.id, action.id)" (click)="togglePermission(module.id, action.id)">
                      @if (hasPermission(module.id, action.id)) {
                        <i-lucide name="check" [size]="18"></i-lucide>
                      } @else {
                        <i-lucide name="minus" [size]="18"></i-lucide>
                      }
                    </button>
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styleUrl: './role-permissions.css',
})
export class RolePermissionsPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(false);
  protected readonly selectedRoleId: WritableSignal<string> = signal('');
  protected readonly selectedModule: WritableSignal<PermissionModule | null> = signal(null);

  protected readonly modules = signal<PermissionModule[]>([]);
  protected readonly actions = signal<PermissionAction[]>([]);
  protected readonly roleOptions = signal<{ value: number; label: string }[]>([]);
  protected readonly permissions = signal<ModulePermission[]>([]);

  protected readonly visibleModulesList = computed(() =>
    this.modules().filter((m) => m.isVisible)
  );

  constructor() {
    void this.loadModules();
    void this.loadActions();
    void this.loadRoles();
  }

  protected async onRefresh(): Promise<void> {
    await this.loadPermissions();
  }

  protected hasPermission(moduleId: number, actionId: number): boolean {
    const roleId = parseInt(this.selectedRoleId(), 10);
    if (!roleId) return false;
    return this.permissions().some(
      (p) => p.permissionModuleId === moduleId && p.permissionActionId === actionId
    );
  }

  protected async togglePermission(moduleId: number, actionId: number): Promise<void> {
    const roleId = parseInt(this.selectedRoleId(), 10);
    if (!roleId) return;

    try {
      if (this.hasPermission(moduleId, actionId)) {
        await firstValueFrom(
          this.http.post('/api/module-permissions/revoke', {
            roleId,
            permissionModuleId: moduleId,
            permissionActionId: actionId,
            scope: 'Company',
            scopeId: null,
          })
        );
      } else {
        await firstValueFrom(
          this.http.post('/api/module-permissions/assign', {
            roleId,
            permissionModuleId: moduleId,
            permissionActionId: actionId,
            scope: 'Company',
            scopeId: null,
          })
        );
      }
      await this.loadPermissions();
    } catch {
      /* handled by interceptor */
    }
  }

  private async loadModules(): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<PermissionModule[]>('/api/permission-modules'));
      this.modules.set(res);
    } catch {
      /* handled by interceptor */
    }
  }

  private async loadActions(): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<PermissionAction[]>('/api/permission-actions'));
      this.actions.set(res);
    } catch {
      /* handled by interceptor */
    }
  }

  private async loadRoles(): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<any[]>('/api/roles'));
      this.roleOptions.set(res.map((r) => ({ value: r.roleId, label: r.name })));
    } catch {
      /* handled by interceptor */
    }
  }

  private async loadPermissions(): Promise<void> {
    const roleId = parseInt(this.selectedRoleId(), 10);
    if (!roleId) return;
    this.loading.set(true);
    try {
      const res = await firstValueFrom(
        this.http.get<ModulePermission[]>(`/api/module-permissions/role/${roleId}`)
      );
      this.permissions.set(res);
    } catch {
      /* handled by interceptor */
    } finally {
      this.loading.set(false);
    }
  }
}
