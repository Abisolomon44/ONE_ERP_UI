import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { BaseEmpty, BasePill } from '../../shared/base-data';
import { BaseButton } from '../../shared/base-button';
import { BaseDialog } from '../../shared/base-feedback';
import { BaseInput, BaseDropdown, DropdownOption } from '../../shared/base-controls';
import { BasePermission } from '../../shared/base-permission';
import { Domain, Module, Workspace } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-modules',
  standalone: true,
  imports: [DatePipe, LucideAngularModule, BaseEmpty, BasePill, BaseButton, BaseDialog, BaseInput, BaseDropdown, BasePermission],
  templateUrl: './modules.html',
  styleUrl: './modules.css',
})
export class ModulesPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  protected readonly rows = signal<Module[]>([]);
  protected readonly workspaces = signal<Workspace[]>([]);
  protected readonly domains = signal<Domain[]>([]);
  protected readonly filterWorkspaceId = signal<string>('');
  protected readonly filterDomainId = signal<string>('');
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<Module | null>(null);

  protected readonly form = {
    domainId: signal<string>(''),
    moduleCode: signal(''),
    moduleName: signal(''),
    icon: signal(''),
    routeUrl: signal(''),
    sortOrder: signal(0),
    isActive: signal(true),
  };

  protected readonly workspaceOptions = signal<DropdownOption[]>([]);
  protected readonly domainOptions = signal<DropdownOption[]>([]);

  constructor() {
    void this.init();
  }

  private async init(): Promise<void> {
    await this.loadWorkspaces();
    await this.loadDomains();
    await this.load();
  }

  protected async onFilterWorkspaceChange(event: Event): Promise<void> {
    const val = (event.target as HTMLSelectElement).value;
    this.filterWorkspaceId.set(val);
    this.filterDomainId.set('');
    await this.loadDomains();
    await this.load();
  }

  protected onFilterDomainChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.filterDomainId.set(val);
    void this.load();
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.form.domainId.set(this.filterDomainId() || '');
    this.form.moduleCode.set('');
    this.form.moduleName.set('');
    this.form.icon.set('');
    this.form.routeUrl.set('');
    this.form.sortOrder.set(0);
    this.form.isActive.set(true);
    this.dialogOpen.set(true);
  }

  protected openEdit(m: Module): void {
    this.editing.set(m);
    this.form.domainId.set(String(m.domainId));
    this.form.moduleCode.set(m.moduleCode);
    this.form.moduleName.set(m.moduleName);
    this.form.icon.set(m.icon ?? '');
    this.form.routeUrl.set(m.routeUrl ?? '');
    this.form.sortOrder.set(m.sortOrder);
    this.form.isActive.set(m.isActive);
    this.dialogOpen.set(true);
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      if (this.editing()) {
        await firstValueFrom(
          this.http.put(`/api/modules/${this.editing()!.id}`, {
            moduleCode: this.form.moduleCode(),
            moduleName: this.form.moduleName(),
            icon: this.form.icon() || null,
            routeUrl: this.form.routeUrl() || null,
            sortOrder: this.form.sortOrder(),
            isActive: this.form.isActive(),
          }),
        );
        this.toast.success('Module updated');
      } else {
        await firstValueFrom(
          this.http.post('/api/modules', {
            domainId: Number(this.form.domainId()),
            moduleCode: this.form.moduleCode(),
            moduleName: this.form.moduleName(),
            icon: this.form.icon() || null,
            routeUrl: this.form.routeUrl() || null,
            sortOrder: this.form.sortOrder(),
            isActive: this.form.isActive(),
          }),
        );
        this.toast.success('Module created');
      }
      this.dialogOpen.set(false);
      await this.load();
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(m: Module): Promise<void> {
    if (!confirm(`Delete module ${m.moduleName}?`)) return;
    try {
      await firstValueFrom(this.http.delete(`/api/modules/${m.id}`));
      this.toast.success('Module deleted');
      await this.load();
    } catch {
      /* handled by interceptor */
    }
  }

  protected getDomainName(id: number): string {
    return this.domains().find((d) => d.id === id)?.domainName ?? '';
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

  private async loadDomains(): Promise<void> {
    try {
      const wid = this.filterWorkspaceId();
      const url = wid ? `/api/domains/workspace/${wid}` : '/api/domains';
      const res = await firstValueFrom(this.http.get<Domain[]>(url));
      this.domains.set(res);
      this.domainOptions.set(res.map((d) => ({ value: d.id, label: `${d.domainName} (${d.domainCode})` })));
    } catch {
      this.toast.error('Failed to load domains');
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const did = this.filterDomainId();
      const url = did ? `/api/modules/domain/${did}` : '/api/modules';
      const res = await firstValueFrom(this.http.get<Module[]>(url));
      this.rows.set(res);
    } catch {
      this.toast.error('Failed to load modules');
    } finally {
      this.loading.set(false);
    }
  }
}
