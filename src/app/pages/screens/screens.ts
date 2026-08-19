import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component, computed, inject, model, signal, WritableSignal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { BaseEmpty, BasePill } from '../../shared/base-data';
import { BaseButton } from '../../shared/base-button';
import { BaseDialog } from '../../shared/base-feedback';
import { BaseInput, BaseDropdown, BaseSearch } from '../../shared/base-controls';
import { BasePermission } from '../../shared/base-permission';
import { Screen, Module, Domain, SubModule } from '../../core/models';
import { PermissionService } from '../../core/services/permission.service';
import { ToastService } from '../../core/services/toast.service';
import { DropdownOption } from '../../shared/base-controls';

interface ScreenForm {
  subModuleIdStr: WritableSignal<string | number>;
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
export class ScreensPage implements AfterViewInit {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  protected readonly perms = inject(PermissionService);

  protected readonly rows = signal<Screen[]>([]);
  protected readonly modules = signal<Module[]>([]);
  protected readonly subModules = signal<SubModule[]>([]);
  protected readonly domains = signal<Domain[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<Screen | null>(null);
  protected readonly search = signal('');
  protected readonly filterDomainId = model<string | number>('');
  protected readonly filterModuleId = model<string | number>('');
  protected readonly filterSubModuleId = model<string | number>('');
  protected readonly formDomainId = model<string | number>('');
  protected readonly formModuleId = model<string | number>('');

  protected readonly form: ScreenForm = {
    subModuleIdStr: signal(''),
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
    const ms = this.modules();
    return (domainId ? ms.filter((m) => m.domainId === +domainId) : ms).map((m) => ({ value: m.id, label: m.moduleName }));
  });

  protected readonly subModuleOptions = computed<DropdownOption[]>(() => {
    const domainId = this.filterDomainId();
    const moduleId = this.filterModuleId();
    let ms = this.modules();
    if (domainId) ms = ms.filter((m) => m.domainId === +domainId);
    if (moduleId) ms = ms.filter((m) => m.id === +moduleId);
    const modIds = new Set(ms.map((m) => m.id));
    return this.subModules().filter((sm) => modIds.has(sm.moduleId)).map((sm) => ({ value: sm.id, label: sm.subModuleName }));
  });

  protected readonly formModuleOptions = computed<DropdownOption[]>(() => {
    const domainId = this.formDomainId();
    const ms = this.modules();
    return (domainId ? ms.filter((m) => m.domainId === +domainId) : ms).map((m) => ({ value: m.id, label: m.moduleName }));
  });

  protected readonly formSubModuleOptions = computed<DropdownOption[]>(() => {
    const moduleId = this.formModuleId();
    const sms = this.subModules();
    return (moduleId ? sms.filter((sm) => sm.moduleId === +moduleId) : sms).map((sm) => ({ value: sm.id, label: sm.subModuleName }));
  });

  protected readonly filteredRows = computed(() => {
    let list = this.rows();
    const domainId = this.filterDomainId();
    const subModuleId = this.filterSubModuleId();
    const q = this.search().toLowerCase();

    if (domainId) {
      const modIds = new Set(this.modules().filter((m) => m.domainId === +domainId).map((m) => m.id));
      const smIds = new Set(this.subModules().filter((sm) => modIds.has(sm.moduleId)).map((sm) => sm.id));
      list = list.filter((s) => smIds.has(s.subModuleId));
    }
    if (subModuleId) {
      list = list.filter((s) => s.subModuleId === +subModuleId);
    }
    if (q) {
      list = list.filter(
        (s) =>
          s.screenCode.toLowerCase().includes(q) ||
          s.screenName.toLowerCase().includes(q) ||
          s.subModuleName?.toLowerCase().includes(q),
      );
    }
    return list;
  });

  protected readonly subModuleMap = computed(() => {
    const map = new Map<number, SubModule>();
    this.subModules().forEach((sm) => map.set(sm.id, sm));
    return map;
  });

  constructor() {}

  ngAfterViewInit(): void {
    void this.load();
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.formDomainId.set('');
    this.formModuleId.set('');
    this.form.subModuleIdStr.set('');
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
    const sm = this.subModules().find((s) => s.id === item.subModuleId);
    const mod = sm ? this.modules().find((m) => m.id === sm.moduleId) : undefined;
    this.formDomainId.set(mod ? mod.domainId : '');
    this.formModuleId.set(sm ? sm.moduleId : '');
    this.form.subModuleIdStr.set(item.subModuleId.toString());
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
        subModuleId: parseInt(String(this.form.subModuleIdStr()), 10),
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
      const [screens, modules, subModules, domains] = await Promise.all([
        firstValueFrom(this.http.get<Screen[]>('/api/screens')),
        firstValueFrom(this.http.get<Module[]>('/api/modules')),
        firstValueFrom(this.http.get<SubModule[]>('/api/submodules')),
        firstValueFrom(this.http.get<Domain[]>('/api/domains')),
      ]);
      this.rows.set(screens);
      this.modules.set(modules);
      this.subModules.set(subModules);
      this.domains.set(domains);
    } catch {
      this.toast.error('Failed to load screens');
    } finally {
      this.loading.set(false);
    }
  }

  protected getSubModuleName(subModuleId: number): string {
    return this.subModuleMap().get(subModuleId)?.subModuleName ?? 'Unknown';
  }
}
