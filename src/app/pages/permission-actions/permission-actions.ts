import { HttpClient } from '@angular/common/http';
import { Component, inject, signal, WritableSignal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { BaseEmpty, BasePill } from '../../shared/base-data';
import { BaseButton } from '../../shared/base-button';
import { BaseDialog } from '../../shared/base-feedback';
import { BaseInput } from '../../shared/base-controls';
import { BasePermission } from '../../shared/base-permission';
import { PermissionAction } from '../../core/models';
import { PermissionService } from '../../core/services/permission.service';
import { ToastService } from '../../core/services/toast.service';

interface PermissionActionForm {
  code: WritableSignal<string>;
  name: WritableSignal<string>;
  sortOrderStr: WritableSignal<string>;
  isActive: WritableSignal<boolean>;
}

@Component({
  selector: 'app-permission-actions',
  standalone: true,
  imports: [LucideAngularModule, BaseEmpty, BasePill, BaseButton, BaseDialog, BaseInput, BasePermission],
  template: `
    <div class="page-header">
      <div>
        <h1>Permission Actions</h1>
        <div class="page-sub">Manage available actions for permission modules (view, create, edit, delete, manage).</div>
      </div>
      <div class="page-actions">
        <base-button *basePermission="'permission-actions.manage'" icon="plus" (click)="openCreate()">New Action</base-button>
      </div>
    </div>

    @if (loading()) {
      <div class="card flex" style="justify-content:center; padding: 44px">
        <span class="spinner spinner-lg" style="color: var(--accent)"></span>
      </div>
    } @else if (rows().length === 0) {
      <div class="card"><base-empty icon="bolt" title="No permission actions found" subtitle="Create an action to get started."></base-empty></div>
    } @else {
      <div class="table-card">
        <table class="table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Sort Order</th>
              <th>Status</th>
              <th style="text-align:right">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (item of rows(); track item.id) {
              <tr>
                <td><code>{{ item.code }}</code></td>
                <td>{{ item.name }}</td>
                <td>{{ item.sortOrder }}</td>
                <td>
                  <base-pill [status]="item.isActive ? 'Active' : 'Inactive'" [label]="item.isActive ? 'Active' : 'Inactive'"></base-pill>
                </td>
                <td style="text-align:right" *basePermission="'permission-actions.manage'">
                  <base-button variant="secondary" size="sm" icon="square-pen" (click)="openEdit(item)"></base-button>
                  <base-button variant="danger" size="sm" icon="trash-2" (click)="remove(item)"></base-button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    <base-dialog [open]="dialogOpen()" [title]="editing() ? 'Edit Action' : 'Create Action'" (closeRequest)="dialogOpen.set(false)">
      <base-input label="Code" icon="tag" [(value)]="form.code" [disabled]="!!editing()" hint="e.g. view, create, edit"></base-input>
      <base-input label="Name" icon="type" [(value)]="form.name"></base-input>
      <base-input label="Sort Order" icon="list-ordered" type="number" [(value)]="form.sortOrderStr"></base-input>
      <div class="field">
        <label class="field-label">Active</label>
        <div class="flex" style="gap: 16px">
          <label class="radio-item">
            <input type="radio" name="isActive" [value]="true" [checked]="form.isActive()" (change)="form.isActive.set($any($event.target).value === 'true')"/>
            <span>Yes</span>
          </label>
          <label class="radio-item">
            <input type="radio" name="isActive" [value]="false" [checked]="!form.isActive()" (change)="form.isActive.set($any($event.target).value === 'true')"/>
            <span>No</span>
          </label>
        </div>
      </div>
      <div class="dialog-inner-footer">
        <base-button variant="secondary" (click)="dialogOpen.set(false)">Cancel</base-button>
        <base-button [loading]="saving()" [disabled]="!form.code() || !form.name()" (click)="save()">
          {{ editing() ? 'Save Changes' : 'Create Action' }}
        </base-button>
      </div>
    </base-dialog>
  `,
  styleUrl: './permission-actions.css',
})
export class PermissionActionsPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  protected readonly perms = inject(PermissionService);

  protected readonly rows = signal<PermissionAction[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<PermissionAction | null>(null);

  protected readonly form: PermissionActionForm = {
    code: signal(''),
    name: signal(''),
    sortOrderStr: signal('0'),
    isActive: signal(true),
  };

  constructor() {
    void this.load();
  }

  protected async openCreate(): Promise<void> {
    this.editing.set(null);
    this.form.code.set('');
    this.form.name.set('');
    this.form.sortOrderStr.set('0');
    this.form.isActive.set(true);
    this.dialogOpen.set(true);
  }

  protected async openEdit(item: PermissionAction): Promise<void> {
    this.editing.set(item);
    this.form.code.set(item.code);
    this.form.name.set(item.name);
    this.form.sortOrderStr.set(item.sortOrder.toString());
    this.form.isActive.set(item.isActive);
    this.dialogOpen.set(true);
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const sortOrderStr = this.form.sortOrderStr();
      const payload = {
        code: this.form.code(),
        name: this.form.name(),
        sortOrder: sortOrderStr ? parseInt(sortOrderStr, 10) : 0,
        isActive: this.form.isActive(),
      };

      if (this.editing()) {
        await firstValueFrom(this.http.put(`/api/permission-actions/${this.editing()!.id}`, payload));
        this.toast.success('Permission action updated');
      } else {
        await firstValueFrom(this.http.post('/api/permission-actions', payload));
        this.toast.success('Permission action created');
      }
      this.dialogOpen.set(false);
      await this.load();
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(item: PermissionAction): Promise<void> {
    if (!confirm(`Delete permission action ${item.name}?`)) return;
    try {
      await firstValueFrom(this.http.delete(`/api/permission-actions/${item.id}`));
      this.toast.success('Permission action deleted');
      await this.load();
    } catch {
      /* handled by interceptor */
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(this.http.get<PermissionAction[]>('/api/permission-actions'));
      this.rows.set(res);
    } catch {
      this.toast.error('Failed to load permission actions');
    } finally {
      this.loading.set(false);
    }
  }
}
