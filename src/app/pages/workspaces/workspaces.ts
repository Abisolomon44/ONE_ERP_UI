import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { BaseEmpty, BasePill } from '../../shared/base-data';
import { BaseButton } from '../../shared/base-button';
import { BaseDialog } from '../../shared/base-feedback';
import { BaseInput } from '../../shared/base-controls';
import { BasePermission } from '../../shared/base-permission';
import { Workspace } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-workspaces',
  standalone: true,
  imports: [DatePipe, LucideAngularModule, BaseEmpty, BasePill, BaseButton, BaseDialog, BaseInput, BasePermission],
  templateUrl: './workspaces.html',
  styleUrl: './workspaces.css',
})
export class WorkspacesPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  protected readonly rows = signal<Workspace[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<Workspace | null>(null);
  private codeTouched = false;

  protected readonly form = {
    workspaceCode: signal(''),
    workspaceName: signal(''),
    icon: signal(''),
    route: signal(''),
    sortOrder: signal(0),
    isActive: signal(true),
  };

  constructor() {
    void this.load();
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.codeTouched = false;
    this.form.workspaceCode.set('');
    this.form.workspaceName.set('');
    this.form.icon.set('');
    this.form.route.set('');
    this.form.sortOrder.set(0);
    this.form.isActive.set(true);
    this.dialogOpen.set(true);
  }

  protected openEdit(ws: Workspace): void {
    this.editing.set(ws);
    this.codeTouched = true;
    this.form.workspaceCode.set(ws.workspaceCode);
    this.form.workspaceName.set(ws.workspaceName);
    this.form.icon.set(ws.icon ?? '');
    this.form.route.set(ws.route ?? '');
    this.form.sortOrder.set(ws.sortOrder);
    this.form.isActive.set(ws.isActive);
    this.dialogOpen.set(true);
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const payload = {
        workspaceCode: this.formatCode(this.form.workspaceCode()),
        workspaceName: this.form.workspaceName().trim(),
        icon: this.form.icon() || null,
        route: this.form.route() || null,
        sortOrder: this.form.sortOrder(),
        isActive: this.form.isActive(),
      };
      if (this.editing()) {
        await firstValueFrom(
          this.http.put(`/api/workspaces/${this.editing()!.id}`, payload),
        );
        this.toast.success('Workspace updated');
      } else {
        await firstValueFrom(this.http.post('/api/workspaces', payload));
        this.toast.success('Workspace created');
      }
      this.dialogOpen.set(false);
      await this.load();
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  protected onNameChange(value: string): void {
    this.form.workspaceName.set(value);
    if (!this.editing() && !this.codeTouched) {
      this.form.workspaceCode.set(this.suggestCode(value));
    }
  }

  protected onCodeChange(value: string): void {
    this.codeTouched = true;
    this.form.workspaceCode.set(value.toUpperCase());
  }

  private suggestCode(name: string): string {
    const prefix = this.formatPrefix(name);
    return `${prefix}--${this.nextSequence()}`;
  }

  private formatPrefix(name: string): string {
    const cleaned = name.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return cleaned || 'WS';
  }

  private nextSequence(): string {
    return (this.rows().length + 1).toString().padStart(3, '0');
  }

  private formatCode(code: string): string {
    return code.toUpperCase().replace(/\s+/g, '').replace(/-{2,}/g, '--');
  }

  protected async remove(ws: Workspace): Promise<void> {
    if (!confirm(`Delete workspace ${ws.workspaceName}?`)) return;
    try {
      await firstValueFrom(this.http.delete(`/api/workspaces/${ws.id}`));
      this.toast.success('Workspace deleted');
      await this.load();
    } catch {
      /* handled by interceptor */
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(this.http.get<Workspace[]>('/api/workspaces'));
      this.rows.set(res);
    } catch {
      this.toast.error('Failed to load workspaces');
    } finally {
      this.loading.set(false);
    }
  }
}
