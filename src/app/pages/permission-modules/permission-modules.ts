import { HttpClient } from '@angular/common/http';
import { Component, inject, signal, WritableSignal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { BaseEmpty, BasePill } from '../../shared/base-data';
import { BaseButton } from '../../shared/base-button';
import { BaseDialog } from '../../shared/base-feedback';
import { BaseInput, BaseDropdown } from '../../shared/base-controls';
import { BasePermission } from '../../shared/base-permission';
import { PermissionModule } from '../../core/models';
import { PermissionService } from '../../core/services/permission.service';
import { ToastService } from '../../core/services/toast.service';

interface PermissionModuleForm {
[x: string]: any;
  code: WritableSignal<string>;
  name: WritableSignal<string>;
  parentIdStr: WritableSignal<string>;
  level: WritableSignal<string>;
  sortOrderStr: WritableSignal<string>;
  isVisible: WritableSignal<boolean>;
  icon: WritableSignal<string>;
  routePath: WritableSignal<string>;
}

const LEVEL_OPTIONS = [
  { value: 'Platform', label: 'Platform' },
  { value: 'Tenant', label: 'Tenant' },
  { value: 'Company', label: 'Company' },
  { value: 'Branch', label: 'Branch' },
  { value: 'User', label: 'User' },
  { value: 'RoleProfile', label: 'Role Profile' },
  { value: 'Role', label: 'Role' },
  { value: 'Workspace', label: 'Workspace' },
  { value: 'Domain', label: 'Domain' },
  { value: 'Module', label: 'Module' },
  { value: 'Screen', label: 'Screen' },
  { value: 'Action', label: 'Action' },
  { value: 'Field', label: 'Field' },
  { value: 'DataScope', label: 'Data Scope' },
  { value: 'Workflow', label: 'Workflow' },
  { value: 'Approval', label: 'Approval' },
  { value: 'Audit', label: 'Audit' },
];

@Component({
  selector: 'app-permission-modules',
  standalone: true,
  imports: [LucideAngularModule, BaseEmpty, BasePill, BaseButton, BaseDialog, BaseInput, BaseDropdown, BasePermission],
  template: `
    <div class="page-header">
      <div>
        <h1>Permission Modules</h1>
        <div class="page-sub">Define hierarchical permission modules.</div>
      </div>
      <div class="page-actions">
        <base-button *basePermission="'permission-modules.manage'" icon="plus" (click)="openCreate()">New Module</base-button>
      </div>
    </div>

    @if (loading()) {
      <div class="card flex" style="justify-content:center; padding: 44px">
        <span class="spinner spinner-lg" style="color: var(--accent)"></span>
      </div>
    } @else if (rows().length === 0) {
      <div class="card"><base-empty icon="shield" title="No permission modules found" subtitle="Create a module to get started."></base-empty></div>
    } @else {
      <div class="grid grid-2" style="align-items: stretch; gap: 20px">
        @for (item of rows(); track item.id) {
          <div class="card">
            <div class="card-header">
              <span class="avatar" style="background: var(--accent-soft); color: var(--accent)">
                <i-lucide [name]="item.icon || 'layers'" [size]="17"></i-lucide>
              </span>
              <div style="flex:1">
                <div style="display:flex; align-items:center; gap:8px">
                  <h3>{{ item.name }}</h3>
                  <span class="badge badge-soft">{{ item.level }}</span>
                </div>
                <div class="card-sub">{{ item.code }}</div>
              </div>
              <base-pill [status]="item.isVisible ? 'Visible' : 'Hidden'" [label]="item.isVisible ? 'Visible' : 'Hidden'"></base-pill>
            </div>
            <div class="card-body">
              <p style="margin:0 0 12px; color: var(--text-2); font-size:13.5px">
                {{ item.routePath || 'No route defined' }}
              </p>
              @if (item.parentName) {
                <p style="margin:0; color: var(--text-2); font-size:13px">
                  Parent: <span class="text-muted">{{ item.parentName }}</span>
                </p>
              }
            </div>
            <div class="card-footer" style="display:flex; justify-content:flex-end; gap:8px" *basePermission="'permission-modules.manage'">
              <base-button variant="secondary" size="sm" icon="square-pen" label="Edit" (click)="openEdit(item)"></base-button>
              <base-button variant="danger" size="sm" icon="trash-2" label="Delete" (click)="remove(item)"></base-button>
            </div>
          </div>
        }
      </div>
    }

    <base-dialog [open]="dialogOpen()" [title]="editing() ? 'Edit Module' : 'Create Module'" (closeRequest)="dialogOpen.set(false)">
      <base-input label="Code" icon="tag" [(value)]="form.code"></base-input>
      <base-input label="Name" icon="layers" [(value)]="form.name"></base-input>
      <base-dropdown label="Level" icon="Layers" [options]="LEVEL_OPTIONS" [(value)]="form.level"></base-dropdown>
      <base-input label="Parent Module" icon="git-branch" type="number" [(value)]="form.parentIdStr"></base-input>
      <base-input label="Route Path" icon="navigation" [(value)]="form.routePath"></base-input>
      <base-input label="Icon" icon="smile" [(value)]="form.icon"></base-input>
      <base-input label="Sort Order" icon="list-ordered" type="number" [(value)]="form.sortOrderStr"></base-input>
      <div class="field">
        <label class="field-label">Visible</label>
        <div class="flex" style="gap: 16px">
          <label class="radio-item">
            <input type="radio" name="isVisible" [value]="true" [checked]="form.isVisible()" (change)="form.isVisible.set($any($event.target).value === 'true')"/>
            <span>Yes</span>
          </label>
          <label class="radio-item">
            <input type="radio" name="isVisible" [value]="false" [checked]="!form.isVisible()" (change)="form.isVisible.set($any($event.target).value === 'true')"/>
            <span>No</span>
          </label>
        </div>
      </div>
      <div class="dialog-inner-footer">
        <base-button variant="secondary" (click)="dialogOpen.set(false)">Cancel</base-button>
        <base-button [loading]="saving()" [disabled]="!form.code() || !form.name() || !form.level()" (click)="save()">
          {{ editing() ? 'Save Changes' : 'Create Module' }}
        </base-button>
      </div>
    </base-dialog>
  `,
  styleUrl: './permission-modules.css',
})
export class PermissionModulesPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  protected readonly perms = inject(PermissionService);

  protected readonly rows = signal<PermissionModule[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<PermissionModule | null>(null);
  protected readonly LEVEL_OPTIONS = LEVEL_OPTIONS;

  protected readonly form: PermissionModuleForm = {
    code: signal(''),
    name: signal(''),
    parentIdStr: signal(''),
    level: signal(''),
    sortOrderStr: signal('0'),
    isVisible: signal(true),
    icon: signal(''),
    routePath: signal(''),
  };

  constructor() {
    void this.load();
  }

  protected async openCreate(): Promise<void> {
    this.editing.set(null);
    this.form.code.set('');
    this.form.name.set('');
    this.form.parentIdStr.set('');
    this.form.level.set('');
    this.form.sortOrderStr.set('0');
    this.form.isVisible.set(true);
    this.form.icon.set('');
    this.form.routePath.set('');
    this.dialogOpen.set(true);
  }

  protected async openEdit(item: PermissionModule): Promise<void> {
    this.editing.set(item);
    this.form.code.set(item.code);
    this.form.name.set(item.name);
    this.form.parentIdStr.set(item.parentId ? item.parentId.toString() : '');
    this.form.level.set(item.level);
    this.form.sortOrderStr.set(item.sortOrder.toString());
    this.form.isVisible.set(item.isVisible);
    this.form.icon.set(item.icon ?? '');
    this.form.routePath.set(item.routePath ?? '');
    this.dialogOpen.set(true);
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const parentIdStr = this.form.parentIdStr();
      const sortOrderStr = this.form.sortOrderStr();

      const payload = {
        code: this.form.code(),
        name: this.form.name(),
        parentId: parentIdStr ? parseInt(parentIdStr, 10) : null,
        level: this.form.level(),
        sortOrder: sortOrderStr ? parseInt(sortOrderStr, 10) : 0,
        isVisible: this.form.isVisible(),
        icon: this.form.icon(),
        routePath: this.form.routePath(),
      };

      if (this.editing()) {
        await firstValueFrom(this.http.put(`/api/permission-modules/${this.editing()!.id}`, payload));
        this.toast.success('Permission module updated');
      } else {
        await firstValueFrom(this.http.post('/api/permission-modules', payload));
        this.toast.success('Permission module created');
      }
      this.dialogOpen.set(false);
      await this.load();
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(item: PermissionModule): Promise<void> {
    if (!confirm(`Delete permission module ${item.name}?`)) return;
    try {
      await firstValueFrom(this.http.delete(`/api/permission-modules/${item.id}`));
      this.toast.success('Permission module deleted');
      await this.load();
    } catch {
      /* handled by interceptor */
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(this.http.get<PermissionModule[]>('/api/permission-modules'));
      this.rows.set(res);
    } catch {
      this.toast.error('Failed to load permission modules');
    } finally {
      this.loading.set(false);
    }
  }
}
