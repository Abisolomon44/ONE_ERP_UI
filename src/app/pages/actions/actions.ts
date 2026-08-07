import { HttpClient } from '@angular/common/http';
import { Component, inject, signal, WritableSignal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { BaseEmpty, BasePill } from '../../shared/base-data';
import { BaseButton } from '../../shared/base-button';
import { BaseDialog } from '../../shared/base-feedback';
import { BaseInput } from '../../shared/base-controls';
import { BasePermission } from '../../shared/base-permission';
import { Action } from '../../core/models';
import { PermissionService } from '../../core/services/permission.service';
import { ToastService } from '../../core/services/toast.service';

interface ActionForm {
  actionCode: WritableSignal<string>;
  actionName: WritableSignal<string>;
  displayOrderStr: WritableSignal<string>;
  isActive: WritableSignal<boolean>;
}

@Component({
  selector: 'app-actions',
  standalone: true,
  imports: [LucideAngularModule, BaseEmpty, BasePill, BaseButton, BaseDialog, BaseInput, BasePermission],
  templateUrl: './actions.html',
  styleUrl: './actions.css',
})
export class ActionsPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  protected readonly perms = inject(PermissionService);

  protected readonly rows = signal<Action[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<Action | null>(null);

  protected readonly form: ActionForm = {
    actionCode: signal(''),
    actionName: signal(''),
    displayOrderStr: signal('0'),
    isActive: signal(true),
  };

  constructor() {
    void this.load();
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.form.actionCode.set('');
    this.form.actionName.set('');
    this.form.displayOrderStr.set('0');
    this.form.isActive.set(true);
    this.dialogOpen.set(true);
  }

  protected openEdit(item: Action): void {
    this.editing.set(item);
    this.form.actionCode.set(item.actionCode);
    this.form.actionName.set(item.actionName);
    this.form.displayOrderStr.set(item.displayOrder.toString());
    this.form.isActive.set(item.isActive);
    this.dialogOpen.set(true);
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const payload = {
        actionCode: this.form.actionCode(),
        actionName: this.form.actionName(),
        displayOrder: this.form.displayOrderStr() ? parseInt(this.form.displayOrderStr(), 10) : 0,
        isActive: this.form.isActive(),
      };

      if (this.editing()) {
        await firstValueFrom(this.http.put(`/api/actions/${this.editing()!.id}`, payload));
        this.toast.success('Action updated');
      } else {
        await firstValueFrom(this.http.post('/api/actions', payload));
        this.toast.success('Action created');
      }
      this.dialogOpen.set(false);
      await this.load();
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(item: Action): Promise<void> {
    if (!confirm(`Delete action ${item.actionName}?`)) return;
    try {
      await firstValueFrom(this.http.delete(`/api/actions/${item.id}`));
      this.toast.success('Action deleted');
      await this.load();
    } catch {
      /* handled by interceptor */
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(this.http.get<Action[]>('/api/actions'));
      this.rows.set(res);
    } catch {
      this.toast.error('Failed to load actions');
    } finally {
      this.loading.set(false);
    }
  }
}
