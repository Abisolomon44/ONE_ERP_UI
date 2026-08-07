import { HttpClient } from '@angular/common/http';
import { Component, inject, signal, WritableSignal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { BaseEmpty, BasePill } from '../../shared/base-data';
import { BaseButton } from '../../shared/base-button';
import { BaseDialog } from '../../shared/base-feedback';
import { BaseDropdown, DropdownOption } from '../../shared/base-controls';
import { BasePermission } from '../../shared/base-permission';
import { WorkflowPermissionEntry, Role, Module, Screen } from '../../core/models';
import { PermissionService } from '../../core/services/permission.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-workflow-permissions',
  standalone: true,
  imports: [LucideAngularModule, BaseEmpty, BasePill, BaseButton, BaseDialog, BaseDropdown, BasePermission],
  templateUrl: './workflow-permissions.html',
  styleUrl: './workflow-permissions.css',
})
export class WorkflowPermissionsPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  protected readonly perms = inject(PermissionService);

  protected readonly rows = signal<WorkflowPermissionEntry[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<WorkflowPermissionEntry | null>(null);

  protected readonly selectedRoleId = signal<string>('');

  protected readonly roleOptions = signal<DropdownOption[]>([]);
  protected readonly moduleOptions = signal<DropdownOption[]>([]);
  protected readonly screenOptions = signal<DropdownOption[]>([]);

  protected readonly form: {
    moduleId: WritableSignal<string>;
    screenId: WritableSignal<string>;
    canSubmit: WritableSignal<boolean>;
    canApprove: WritableSignal<boolean>;
    canReject: WritableSignal<boolean>;
    canCancel: WritableSignal<boolean>;
    canClose: WritableSignal<boolean>;
  } = {
    moduleId: signal(''),
    screenId: signal(''),
    canSubmit: signal(true),
    canApprove: signal(false),
    canReject: signal(false),
    canCancel: signal(false),
    canClose: signal(false),
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
    await this.loadWorkflowPermissions(roleId);
  }

  protected async openCreate(): Promise<void> {
    this.editing.set(null);
    this.form.moduleId.set('');
    this.form.screenId.set('');
    this.form.canSubmit.set(true);
    this.form.canApprove.set(false);
    this.form.canReject.set(false);
    this.form.canCancel.set(false);
    this.form.canClose.set(false);
    this.screenOptions.set([]);
    await this.loadModules();
    this.dialogOpen.set(true);
  }

  protected async openEdit(item: WorkflowPermissionEntry): Promise<void> {
    this.editing.set(item);
    this.form.moduleId.set(item.moduleId.toString());
    this.form.screenId.set(item.screenId.toString());
    this.form.canSubmit.set(item.canSubmit);
    this.form.canApprove.set(item.canApprove);
    this.form.canReject.set(item.canReject);
    this.form.canCancel.set(item.canCancel);
    this.form.canClose.set(item.canClose);
    await this.loadModules();
    await this.loadScreens(item.moduleId.toString());
    this.dialogOpen.set(true);
  }

  protected async onModuleChange(): Promise<void> {
    this.form.screenId.set('');
    this.screenOptions.set([]);
    const moduleId = this.form.moduleId();
    if (moduleId) {
      await this.loadScreens(moduleId);
    }
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const payload = {
        roleId: parseInt(this.selectedRoleId(), 10),
        moduleId: parseInt(this.form.moduleId(), 10),
        screenId: parseInt(this.form.screenId(), 10),
        canSubmit: this.form.canSubmit(),
        canApprove: this.form.canApprove(),
        canReject: this.form.canReject(),
        canCancel: this.form.canCancel(),
        canClose: this.form.canClose(),
        isActive: true,
      };

      if (this.editing()) {
        await firstValueFrom(this.http.post('/api/workflow-permissions', {
          ...payload,
          id: this.editing()!.id,
        }));
        this.toast.success('Workflow permission updated');
      } else {
        await firstValueFrom(this.http.post('/api/workflow-permissions', payload));
        this.toast.success('Workflow permission created');
      }
      this.dialogOpen.set(false);
      await this.loadWorkflowPermissions(this.selectedRoleId());
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(item: WorkflowPermissionEntry): Promise<void> {
    if (!confirm(`Remove workflow permission for "${item.screenName || item.screenId}"?`)) return;
    try {
      await firstValueFrom(this.http.delete(`/api/workflow-permissions/${item.id}`));
      this.toast.success('Workflow permission removed');
      await this.loadWorkflowPermissions(this.selectedRoleId());
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

  private async loadModules(): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<Module[]>('/api/modules'));
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

  private async loadWorkflowPermissions(roleId: string): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(
        this.http.get<WorkflowPermissionEntry[]>(`/api/workflow-permissions/role/${roleId}`),
      );
      this.rows.set(res);
    } catch {
      this.toast.error('Failed to load workflow permissions');
    } finally {
      this.loading.set(false);
    }
  }
}
