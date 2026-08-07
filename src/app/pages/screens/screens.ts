import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal, WritableSignal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { BaseEmpty, BasePill } from '../../shared/base-data';
import { BaseButton } from '../../shared/base-button';
import { BaseDialog } from '../../shared/base-feedback';
import { BaseInput, BaseDropdown, BaseSearch } from '../../shared/base-controls';
import { BasePermission } from '../../shared/base-permission';
import { Screen, Module, Domain } from '../../core/models';
import { PermissionService } from '../../core/services/permission.service';
import { ToastService } from '../../core/services/toast.service';
import { DropdownOption } from '../../shared/base-controls';

interface ScreenForm {
  moduleIdStr: WritableSignal<string>;
  screenCode: WritableSignal<string>;
  screenName: WritableSignal<string>;
  routeUrl: WritableSignal<string>;
  componentName: WritableSignal<string>;
  sortOrderStr: WritableSignal<string>;
  isActive: WritableSignal<boolean>;
}

@Component({
  selector: 'app-screens',
  standalone: true,
  imports: [LucideAngularModule, BaseEmpty, BasePill, BaseButton, BaseDialog, BaseInput, BaseDropdown, BaseSearch, BasePermission],
  templateUrl: './screens.html',
  styleUrl: './screens.css',
})
export class ScreensPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  protected readonly perms = inject(PermissionService);

  protected readonly rows = signal<Screen[]>([]);
  protected readonly modules = signal<Module[]>([]);
  protected readonly domains = signal<Domain[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<Screen | null>(null);
  protected readonly search = signal('');
  protected readonly filterModuleId = signal('');
  protected readonly filterDomainId = signal('');

  protected readonly form: ScreenForm = {
    moduleIdStr: signal(''),
    screenCode: signal(''),
    screenName: signal(''),
    routeUrl: signal(''),
    componentName: signal(''),
    sortOrderStr: signal('0'),
    isActive: signal(true),
  };

  protected readonly domainOptions = computed<DropdownOption[]>(() =>
    this.domains().map((d) => ({ value: d.id, label: d.domainName }))
  );

  protected readonly moduleOptions = computed<DropdownOption[]>(() => {
    const domainId = this.filterDomainId();
    const list = this.modules();
    const filtered = domainId ? list.filter((m) => m.domainId === +domainId) : list;
    return filtered.map((m) => ({ value: m.id, label: `${m.moduleName}` }));
  });

  protected readonly formModuleOptions = computed<DropdownOption[]>(() =>
    this.modules().map((m) => ({ value: m.id, label: m.moduleName }))
  );

  protected readonly filteredRows = computed(() => {
    let list = this.rows();
    const domainId = this.filterDomainId();
    const moduleId = this.filterModuleId();
    const q = this.search().toLowerCase();

    if (domainId) {
      const modIds = new Set(this.modules().filter((m) => m.domainId === +domainId).map((m) => m.id));
      list = list.filter((s) => modIds.has(s.moduleId));
    }
    if (moduleId) {
      list = list.filter((s) => s.moduleId === +moduleId);
    }
    if (q) {
      list = list.filter(
        (s) =>
          s.screenCode.toLowerCase().includes(q) ||
          s.screenName.toLowerCase().includes(q) ||
          s.moduleName?.toLowerCase().includes(q),
      );
    }
    return list;
  });

  protected readonly moduleMap = computed(() => {
    const map = new Map<number, Module>();
    this.modules().forEach((m) => map.set(m.id, m));
    return map;
  });

  constructor() {
    void this.load();
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.form.moduleIdStr.set('');
    this.form.screenCode.set('');
    this.form.screenName.set('');
    this.form.routeUrl.set('');
    this.form.componentName.set('');
    this.form.sortOrderStr.set('0');
    this.form.isActive.set(true);
    this.dialogOpen.set(true);
  }

  protected openEdit(item: Screen): void {
    this.editing.set(item);
    this.form.moduleIdStr.set(item.moduleId.toString());
    this.form.screenCode.set(item.screenCode);
    this.form.screenName.set(item.screenName);
    this.form.routeUrl.set(item.routeUrl ?? '');
    this.form.componentName.set(item.componentName ?? '');
    this.form.sortOrderStr.set(item.sortOrder.toString());
    this.form.isActive.set(item.isActive);
    this.dialogOpen.set(true);
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const payload = {
        moduleId: parseInt(this.form.moduleIdStr(), 10),
        screenCode: this.form.screenCode(),
        screenName: this.form.screenName(),
        routeUrl: this.form.routeUrl() || null,
        componentName: this.form.componentName() || null,
        sortOrder: this.form.sortOrderStr() ? parseInt(this.form.sortOrderStr(), 10) : 0,
        isActive: this.form.isActive(),
      };

      if (this.editing()) {
        const { screenCode, screenName, routeUrl, componentName, sortOrder, isActive } = payload;
        await firstValueFrom(
          this.http.put(`/api/screens/${this.editing()!.id}`, { screenCode, screenName, routeUrl, componentName, sortOrder, isActive }),
        );
        this.toast.success('Screen updated');
      } else {
        await firstValueFrom(this.http.post('/api/screens', payload));
        this.toast.success('Screen created');
      }
      this.dialogOpen.set(false);
      await this.load();
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(item: Screen): Promise<void> {
    if (!confirm(`Delete screen ${item.screenName}?`)) return;
    try {
      await firstValueFrom(this.http.delete(`/api/screens/${item.id}`));
      this.toast.success('Screen deleted');
      await this.load();
    } catch {
      /* handled by interceptor */
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const [screens, modules, domains] = await Promise.all([
        firstValueFrom(this.http.get<Screen[]>('/api/screens')),
        firstValueFrom(this.http.get<Module[]>('/api/modules')),
        firstValueFrom(this.http.get<Domain[]>('/api/domains')),
      ]);
      this.rows.set(screens);
      this.modules.set(modules);
      this.domains.set(domains);
    } catch {
      this.toast.error('Failed to load screens');
    } finally {
      this.loading.set(false);
    }
  }

  protected getModuleName(moduleId: number): string {
    return this.moduleMap().get(moduleId)?.moduleName ?? 'Unknown';
  }
}
