import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, signal, WritableSignal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { BaseEmpty, BasePill } from '../../shared/base-data';
import { BaseButton } from '../../shared/base-button';
import { BaseDialog } from '../../shared/base-feedback';
import { BaseInput, BaseDropdown, DropdownOption } from '../../shared/base-controls';
import { BasePermission } from '../../shared/base-permission';
import { UserPermissionOverride, Workspace, Domain, Module, Screen, Action, ErpUser } from '../../core/models';
import { PermissionService } from '../../core/services/permission.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-user-permission-overrides',
  standalone: true,
  imports: [DatePipe, LucideAngularModule, BaseEmpty, BasePill, BaseButton, BaseDialog, BaseInput, BaseDropdown, BasePermission],
  templateUrl: './user-permission-overrides.html',
  styleUrl: './user-permission-overrides.css',
})
export class UserPermissionOverridesPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  protected readonly perms = inject(PermissionService);

  protected readonly rows = signal<UserPermissionOverride[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<UserPermissionOverride | null>(null);

  protected readonly selectedUserId = signal<string>('');

  protected readonly userOptions = signal<DropdownOption[]>([]);
  protected readonly workspaceOptions = signal<DropdownOption[]>([]);
  protected readonly domainOptions = signal<DropdownOption[]>([]);
  protected readonly moduleOptions = signal<DropdownOption[]>([]);
  protected readonly screenOptions = signal<DropdownOption[]>([]);
  protected readonly actionOptions = signal<DropdownOption[]>([]);

  protected readonly permissionTypeOptions: DropdownOption[] = [
    { value: 'Grant', label: 'Grant' },
    { value: 'Deny', label: 'Deny' },
  ];

  protected readonly form: {
    userId: WritableSignal<string>;
    workspaceId: WritableSignal<string>;
    domainId: WritableSignal<string>;
    moduleId: WritableSignal<string>;
    screenId: WritableSignal<string>;
    actionId: WritableSignal<string>;
    permissionType: WritableSignal<string>;
    allow: WritableSignal<boolean>;
    effectiveFrom: WritableSignal<string>;
    effectiveTo: WritableSignal<string>;
    remarks: WritableSignal<string>;
  } = {
    userId: signal(''),
    workspaceId: signal(''),
    domainId: signal(''),
    moduleId: signal(''),
    screenId: signal(''),
    actionId: signal(''),
    permissionType: signal('Grant'),
    allow: signal(true),
    effectiveFrom: signal(''),
    effectiveTo: signal(''),
    remarks: signal(''),
  };

  constructor() {
    void this.loadUsers();
    void this.loadWorkspaces();
  }

  protected async onUserChange(): Promise<void> {
    const userId = this.selectedUserId();
    if (!userId) {
      this.rows.set([]);
      return;
    }
    await this.loadOverrides(userId);
  }

  protected async openCreate(): Promise<void> {
    this.editing.set(null);
    this.form.userId.set(this.selectedUserId());
    this.form.workspaceId.set('');
    this.form.domainId.set('');
    this.form.moduleId.set('');
    this.form.screenId.set('');
    this.form.actionId.set('');
    this.form.permissionType.set('Grant');
    this.form.allow.set(true);
    this.form.effectiveFrom.set(new Date().toISOString().split('T')[0]);
    this.form.effectiveTo.set('');
    this.form.remarks.set('');
    this.domainOptions.set([]);
    this.moduleOptions.set([]);
    this.screenOptions.set([]);
    this.actionOptions.set([]);
    this.dialogOpen.set(true);
  }

  protected async openEdit(item: UserPermissionOverride): Promise<void> {
    this.editing.set(item);
    this.form.userId.set(item.userId.toString());
    this.form.workspaceId.set(item.workspaceId.toString());
    this.form.domainId.set(item.domainId.toString());
    this.form.moduleId.set(item.moduleId.toString());
    this.form.screenId.set(item.screenId.toString());
    this.form.actionId.set(item.actionId.toString());
    this.form.permissionType.set(item.permissionType);
    this.form.allow.set(item.allow);
    this.form.effectiveFrom.set(item.effectiveFrom ? item.effectiveFrom.split('T')[0] : '');
    this.form.effectiveTo.set(item.effectiveTo ? item.effectiveTo.split('T')[0] : '');
    this.form.remarks.set(item.remarks ?? '');
    await this.loadDomains(item.workspaceId.toString());
    await this.loadModules(item.domainId.toString());
    await this.loadScreens(item.moduleId.toString());
    await this.loadActions();
    this.dialogOpen.set(true);
  }

  protected async onWorkspaceChange(): Promise<void> {
    this.form.domainId.set('');
    this.form.moduleId.set('');
    this.form.screenId.set('');
    this.form.actionId.set('');
    this.domainOptions.set([]);
    this.moduleOptions.set([]);
    this.screenOptions.set([]);
    this.actionOptions.set([]);
    const workspaceId = this.form.workspaceId();
    if (workspaceId) {
      await this.loadDomains(workspaceId);
    }
  }

  protected async onDomainChange(): Promise<void> {
    this.form.moduleId.set('');
    this.form.screenId.set('');
    this.form.actionId.set('');
    this.moduleOptions.set([]);
    this.screenOptions.set([]);
    this.actionOptions.set([]);
    const domainId = this.form.domainId();
    if (domainId) {
      await this.loadModules(domainId);
    }
  }

  protected async onModuleChange(): Promise<void> {
    this.form.screenId.set('');
    this.form.actionId.set('');
    this.screenOptions.set([]);
    this.actionOptions.set([]);
    const moduleId = this.form.moduleId();
    if (moduleId) {
      await this.loadScreens(moduleId);
    }
  }

  protected async onScreenChange(): Promise<void> {
    this.form.actionId.set('');
    this.actionOptions.set([]);
    await this.loadActions();
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const payload: Record<string, unknown> = {
        userId: parseInt(this.form.userId(), 10),
        workspaceId: parseInt(this.form.workspaceId(), 10),
        domainId: parseInt(this.form.domainId(), 10),
        moduleId: parseInt(this.form.moduleId(), 10),
        screenId: parseInt(this.form.screenId(), 10),
        actionId: parseInt(this.form.actionId(), 10),
        permissionType: this.form.permissionType(),
        allow: this.form.allow(),
        effectiveFrom: this.form.effectiveFrom() || null,
        effectiveTo: this.form.effectiveTo() || null,
        remarks: this.form.remarks() || null,
      };

      if (this.editing()) {
        await firstValueFrom(
          this.http.put(`/api/user-permission-overrides/${this.editing()!.id}`, {
            permissionType: this.form.permissionType(),
            allow: this.form.allow(),
            effectiveFrom: this.form.effectiveFrom() || null,
            effectiveTo: this.form.effectiveTo() || null,
            remarks: this.form.remarks() || null,
            isActive: this.editing()!.isActive,
          }),
        );
        this.toast.success('Override updated');
      } else {
        await firstValueFrom(this.http.post('/api/user-permission-overrides', payload));
        this.toast.success('Override created');
      }
      this.dialogOpen.set(false);
      await this.loadOverrides(this.selectedUserId());
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(item: UserPermissionOverride): Promise<void> {
    if (!confirm('Delete this permission override?')) return;
    try {
      await firstValueFrom(this.http.delete(`/api/user-permission-overrides/${item.id}`));
      this.toast.success('Override deleted');
      await this.loadOverrides(this.selectedUserId());
    } catch {
      /* handled by interceptor */
    }
  }

  private async loadUsers(): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<ErpUser[]>('/api/users'));
      this.userOptions.set(res.map((u) => ({ value: u.userId, label: `${u.fullName} (${u.username})` })));
    } catch {
      /* handled by interceptor */
    }
  }

  private async loadWorkspaces(): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<Workspace[]>('/api/workspaces'));
      this.workspaceOptions.set(res.map((w) => ({ value: w.id, label: w.workspaceName })));
    } catch {
      /* handled by interceptor */
    }
  }

  private async loadDomains(workspaceId: string): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<Domain[]>(`/api/domains?workspaceId=${workspaceId}`));
      this.domainOptions.set(res.map((d) => ({ value: d.id, label: d.domainName })));
    } catch {
      /* handled by interceptor */
    }
  }

  private async loadModules(domainId: string): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<Module[]>(`/api/modules?domainId=${domainId}`));
      this.moduleOptions.set(res.map((m) => ({ value: m.id, label: m.moduleName })));
    } catch {
      /* handled by interceptor */
    }
  }

  private async loadScreens(moduleId: string): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<Screen[]>(`/api/screens?moduleId=${moduleId}`));
      this.screenOptions.set(res.map((s) => ({ value: s.id, label: s.screenName })));
    } catch {
      /* handled by interceptor */
    }
  }

  private async loadActions(): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<Action[]>('/api/actions'));
      this.actionOptions.set(res.map((a) => ({ value: a.id, label: a.actionName })));
    } catch {
      /* handled by interceptor */
    }
  }

  private async loadOverrides(userId: string): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(
        this.http.get<UserPermissionOverride[]>(`/api/user-permission-overrides/user/${userId}`),
      );
      this.rows.set(res);
    } catch {
      this.toast.error('Failed to load overrides');
    } finally {
      this.loading.set(false);
    }
  }
}
