import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, effect, inject, model, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { BaseEmpty, BasePill } from '../../shared/base-data';
import { BaseButton } from '../../shared/base-button';
import { BaseDialog } from '../../shared/base-feedback';
import { BaseInput, BaseDropdown, DropdownOption } from '../../shared/base-controls';
import { BasePermission } from '../../shared/base-permission';
import { Domain, Workspace } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-domains',
  standalone: true,
  imports: [DatePipe, LucideAngularModule, BaseEmpty, BasePill, BaseButton, BaseDialog, BaseInput, BaseDropdown, BasePermission],
  templateUrl: './domains.html',
  styleUrl: './domains.css',
})
export class DomainsPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  protected readonly rows = signal<Domain[]>([]);
  protected readonly workspaces = signal<Workspace[]>([]);
  protected readonly filterWorkspaceId = signal<string>('');
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<Domain | null>(null);

  protected readonly workspaceId = model<string | number>('');
  protected readonly domainCode = model('');
  protected readonly domainName = model('');
  protected readonly icon = model('');
  protected readonly sortOrder = model(0);
  protected readonly isActive = model(true);

  protected readonly workspaceOptions = signal<DropdownOption[]>([]);

  constructor() {
    effect(() => {
      console.log('[Domains] workspaceId changed', this.workspaceId(), 'type:', typeof this.workspaceId());
    });
    void this.init();
  }

  private async init(): Promise<void> {
    await Promise.all([this.loadWorkspaces(), this.load()]);
  }

  protected onFilterWorkspaceChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.filterWorkspaceId.set(val);
    void this.load();
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.workspaceId.set(this.filterWorkspaceId() || '');
    this.domainCode.set('');
    this.domainName.set('');
    this.icon.set('');
    this.sortOrder.set(0);
    this.isActive.set(true);
    this.dialogOpen.set(true);
  }

  protected openEdit(d: Domain): void {
    this.editing.set(d);
    this.workspaceId.set(d.workspaceId);
    this.domainCode.set(d.domainCode);
    this.domainName.set(d.domainName);
    this.icon.set(d.icon ?? '');
    this.sortOrder.set(d.sortOrder);
    this.isActive.set(d.isActive);
    this.dialogOpen.set(true);
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;

    const workspaceId = this.workspaceId();
    const domainCode = this.domainCode().trim();
    const domainName = this.domainName().trim();

    if (!workspaceId || !domainCode || !domainName) {
      this.toast.error('Workspace, Domain Code and Domain Name are required.');
      return;
    }

    this.saving.set(true);
    try {
      if (this.editing()) {
        await firstValueFrom(
          this.http.put(`/api/domains/${this.editing()!.id}`, {
            domainCode: this.domainCode(),
            domainName: this.domainName(),
            icon: this.icon() || null,
            sortOrder: this.sortOrder(),
            isActive: this.isActive(),
          }),
        );
        this.toast.success('Domain updated');
      } else {
        const payload = {
          workspaceId: Number(workspaceId),
          domainCode,
          domainName,
          icon: this.icon() || null,
          sortOrder: this.sortOrder(),
          isActive: this.isActive(),
        };
        await firstValueFrom(this.http.post('/api/domains', payload));
        this.toast.success('Domain created');
      }
      this.dialogOpen.set(false);
      await this.load();
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(d: Domain): Promise<void> {
    if (!confirm(`Delete domain ${d.domainName}?`)) return;
    try {
      await firstValueFrom(this.http.delete(`/api/domains/${d.id}`));
      this.toast.success('Domain deleted');
      await this.load();
    } catch {
      /* handled by interceptor */
    }
  }

  protected getWorkspaceName(id: number): string {
    return this.workspaces().find((w) => w.id === id)?.workspaceName ?? '';
  }

  private async loadWorkspaces(): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<Workspace[]>('/api/workspaces'));
      this.workspaces.set(res);
      this.workspaceOptions.set(res.map((w) => ({ value: w.id, label: w.workspaceName })));
    } catch {
      this.toast.error('Failed to load workspaces');
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const wid = this.filterWorkspaceId();
      const url = wid ? `/api/domains/workspace/${wid}` : '/api/domains';
      const res = await firstValueFrom(this.http.get<Domain[]>(url));
      this.rows.set(res);
    } catch {
      this.toast.error('Failed to load domains');
    } finally {
      this.loading.set(false);
    }
  }
}
