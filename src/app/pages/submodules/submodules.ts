import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, model, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { BaseEmpty, BasePill } from '../../shared/base-data';
import { BaseButton } from '../../shared/base-button';
import { BaseDialog } from '../../shared/base-feedback';
import { BaseInput, BaseDropdown, DropdownOption } from '../../shared/base-controls';
import { BasePermission } from '../../shared/base-permission';
import { SubModule, Module, Domain, Workspace } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-submodules',
  standalone: true,
  imports: [DatePipe, LucideAngularModule, BaseEmpty, BasePill, BaseButton, BaseDialog, BaseInput, BaseDropdown, BasePermission],
  templateUrl: './submodules.html',
  styleUrl: './submodules.css',
})
export class SubModulesPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  protected readonly rows = signal<SubModule[]>([]);
  protected readonly workspaces = signal<Workspace[]>([]);
  protected readonly domains = signal<Domain[]>([]);
  protected readonly modules = signal<Module[]>([]);
  protected readonly filterWorkspaceId = signal<string>('');
  protected readonly filterDomainId = signal<string>('');
  protected readonly filterModuleId = signal<string>('');
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<SubModule | null>(null);

  protected readonly moduleId = model<string | number>('');

  protected readonly form = {
    subModuleCode: signal(''),
    subModuleName: signal(''),
    icon: signal(''),
    routeUrl: signal(''),
    sortOrder: signal(0),
    isActive: signal(true),
  };

  protected readonly workspaceOptions = signal<DropdownOption[]>([]);
  protected readonly domainOptions = signal<DropdownOption[]>([]);
  protected readonly moduleOptions = signal<DropdownOption[]>([]);

  constructor() {
    void this.init();
  }

  private async init(): Promise<void> {
    await this.loadWorkspaces();
    await this.loadDomains('');
    await this.loadModules('');
    await this.load();
  }

  protected async onFilterWorkspaceChange(event: Event): Promise<void> {
    const val = (event.target as HTMLSelectElement).value;
    this.filterWorkspaceId.set(val);
    this.filterDomainId.set('');
    this.filterModuleId.set('');
    await this.loadDomains(val);
    await this.loadModules('');
    await this.load();
  }

  protected async onFilterDomainChange(event: Event): Promise<void> {
    const val = (event.target as HTMLSelectElement).value;
    this.filterDomainId.set(val);
    this.filterModuleId.set('');
    await this.loadModules(val);
    await this.load();
  }

  protected onFilterModuleChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.filterModuleId.set(val);
    void this.load();
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.moduleId.set(this.filterModuleId() || '');
    this.form.subModuleCode.set('');
    this.form.subModuleName.set('');
    this.form.icon.set('');
    this.form.routeUrl.set('');
    this.form.sortOrder.set(0);
    this.form.isActive.set(true);
    this.dialogOpen.set(true);
  }

  protected openEdit(item: SubModule): void {
    this.editing.set(item);
    this.moduleId.set(String(item.moduleId));
    this.form.subModuleCode.set(item.subModuleCode);
    this.form.subModuleName.set(item.subModuleName);
    this.form.icon.set(item.icon ?? '');
    this.form.routeUrl.set(item.routeUrl ?? '');
    this.form.sortOrder.set(item.sortOrder);
    this.form.isActive.set(item.isActive);
    this.dialogOpen.set(true);
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      if (this.editing()) {
        await firstValueFrom(
          this.http.put(`/api/submodules/${this.editing()!.id}`, {
            subModuleCode: this.form.subModuleCode(),
            subModuleName: this.form.subModuleName(),
            icon: this.form.icon() || null,
            routeUrl: this.form.routeUrl() || null,
            sortOrder: this.form.sortOrder(),
            isActive: this.form.isActive(),
          }),
        );
        this.toast.success('Sub Module updated');
      } else {
        await firstValueFrom(
          this.http.post('/api/submodules', {
            moduleId: Number(this.moduleId()),
            subModuleCode: this.form.subModuleCode(),
            subModuleName: this.form.subModuleName(),
            icon: this.form.icon() || null,
            routeUrl: this.form.routeUrl() || null,
            sortOrder: this.form.sortOrder(),
            isActive: this.form.isActive(),
          }),
        );
        this.toast.success('Sub Module created');
      }
      this.dialogOpen.set(false);
      await this.load();
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(item: SubModule): Promise<void> {
    if (!confirm(`Delete sub module ${item.subModuleName}?`)) return;
    try {
      await firstValueFrom(this.http.delete(`/api/submodules/${item.id}`));
      this.toast.success('Sub Module deleted');
      await this.load();
    } catch {
      /* handled by interceptor */
    }
  }

  protected getModuleName(id: number): string {
    return this.modules().find((m) => m.id === id)?.moduleName ?? '';
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

  private async loadDomains(workspaceId: string): Promise<void> {
    try {
      const url = workspaceId ? `/api/domains/workspace/${workspaceId}` : '/api/domains';
      const res = await firstValueFrom(this.http.get<Domain[]>(url));
      this.domains.set(res);
      this.domainOptions.set(res.map((d) => ({ value: d.id, label: d.domainName })));
    } catch {
      this.toast.error('Failed to load domains');
    }
  }

  private async loadModules(domainId: string): Promise<void> {
    try {
      const url = domainId ? `/api/modules/domain/${domainId}` : '/api/modules';
      const res = await firstValueFrom(this.http.get<Module[]>(url));
      this.modules.set(res);
      this.moduleOptions.set(res.map((m) => ({ value: m.id, label: m.moduleName })));
    } catch {
      this.toast.error('Failed to load modules');
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const mid = this.filterModuleId();
      const url = mid ? `/api/submodules/module/${mid}` : '/api/submodules';
      const res = await firstValueFrom(this.http.get<SubModule[]>(url));
      this.rows.set(res);
    } catch {
      this.toast.error('Failed to load sub modules');
    } finally {
      this.loading.set(false);
    }
  }
}
