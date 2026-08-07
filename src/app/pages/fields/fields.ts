import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal, WritableSignal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { BaseEmpty, BasePill } from '../../shared/base-data';
import { BaseButton } from '../../shared/base-button';
import { BaseDialog } from '../../shared/base-feedback';
import { BaseInput, BaseDropdown, BaseSearch } from '../../shared/base-controls';
import { BasePermission } from '../../shared/base-permission';
import { Field, Screen, Module, Domain } from '../../core/models';
import { PermissionService } from '../../core/services/permission.service';
import { ToastService } from '../../core/services/toast.service';
import { DropdownOption } from '../../shared/base-controls';

interface FieldForm {
  screenIdStr: WritableSignal<string>;
  fieldCode: WritableSignal<string>;
  fieldName: WritableSignal<string>;
  displayName: WritableSignal<string>;
  dataType: WritableSignal<string>;
  displayOrderStr: WritableSignal<string>;
  defaultValue: WritableSignal<string>;
  isSystemField: WritableSignal<boolean>;
  isRequired: WritableSignal<boolean>;
  isActive: WritableSignal<boolean>;
}

const DATA_TYPE_OPTIONS: DropdownOption[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'currency', label: 'Currency' },
  { value: 'select', label: 'Select' },
];

@Component({
  selector: 'app-fields',
  standalone: true,
  imports: [LucideAngularModule, BaseEmpty, BasePill, BaseButton, BaseDialog, BaseInput, BaseDropdown, BaseSearch, BasePermission],
  templateUrl: './fields.html',
  styleUrl: './fields.css',
})
export class FieldsPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  protected readonly perms = inject(PermissionService);

  protected readonly rows = signal<Field[]>([]);
  protected readonly screens = signal<Screen[]>([]);
  protected readonly modules = signal<Module[]>([]);
  protected readonly domains = signal<Domain[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<Field | null>(null);
  protected readonly search = signal('');
  protected readonly filterDomainId = signal('');
  protected readonly filterModuleId = signal('');
  protected readonly filterScreenId = signal('');

  protected readonly DATA_TYPE_OPTIONS = DATA_TYPE_OPTIONS;

  protected readonly form: FieldForm = {
    screenIdStr: signal(''),
    fieldCode: signal(''),
    fieldName: signal(''),
    displayName: signal(''),
    dataType: signal('text'),
    displayOrderStr: signal('0'),
    defaultValue: signal(''),
    isSystemField: signal(false),
    isRequired: signal(false),
    isActive: signal(true),
  };

  protected readonly domainOptions = computed<DropdownOption[]>(() =>
    this.domains().map((d) => ({ value: d.id, label: d.domainName }))
  );

  protected readonly moduleOptions = computed<DropdownOption[]>(() => {
    const domainId = this.filterDomainId();
    const list = this.modules();
    const filtered = domainId ? list.filter((m) => m.domainId === +domainId) : list;
    return filtered.map((m) => ({ value: m.id, label: m.moduleName }));
  });

  protected readonly screenOptions = computed<DropdownOption[]>(() => {
    const domainId = this.filterDomainId();
    const moduleId = this.filterModuleId();
    let list = this.screens();

    if (domainId) {
      const modIds = new Set(this.modules().filter((m) => m.domainId === +domainId).map((m) => m.id));
      list = list.filter((s) => modIds.has(s.moduleId));
    }
    if (moduleId) {
      list = list.filter((s) => s.moduleId === +moduleId);
    }
    return list.map((s) => ({ value: s.id, label: s.screenName }));
  });

  protected readonly formScreenOptions = computed<DropdownOption[]>(() =>
    this.screens().map((s) => ({ value: s.id, label: s.screenName }))
  );

  protected readonly filteredRows = computed(() => {
    let list = this.rows();
    const domainId = this.filterDomainId();
    const moduleId = this.filterModuleId();
    const screenId = this.filterScreenId();
    const q = this.search().toLowerCase();

    if (domainId) {
      const modIds = new Set(this.modules().filter((m) => m.domainId === +domainId).map((m) => m.id));
      list = list.filter((f) => modIds.has(this.screenMap().get(f.screenId)?.moduleId ?? -1));
    }
    if (moduleId) {
      const scrIds = new Set(this.screens().filter((s) => s.moduleId === +moduleId).map((s) => s.id));
      list = list.filter((f) => scrIds.has(f.screenId));
    }
    if (screenId) {
      list = list.filter((f) => f.screenId === +screenId);
    }
    if (q) {
      list = list.filter(
        (f) =>
          f.fieldCode.toLowerCase().includes(q) ||
          f.fieldName.toLowerCase().includes(q) ||
          f.displayName.toLowerCase().includes(q) ||
          f.screenName?.toLowerCase().includes(q),
      );
    }
    return list;
  });

  protected readonly screenMap = computed(() => {
    const map = new Map<number, Screen>();
    this.screens().forEach((s) => map.set(s.id, s));
    return map;
  });

  constructor() {
    void this.load();
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.form.screenIdStr.set('');
    this.form.fieldCode.set('');
    this.form.fieldName.set('');
    this.form.displayName.set('');
    this.form.dataType.set('text');
    this.form.displayOrderStr.set('0');
    this.form.defaultValue.set('');
    this.form.isSystemField.set(false);
    this.form.isRequired.set(false);
    this.form.isActive.set(true);
    this.dialogOpen.set(true);
  }

  protected openEdit(item: Field): void {
    this.editing.set(item);
    this.form.screenIdStr.set(item.screenId.toString());
    this.form.fieldCode.set(item.fieldCode);
    this.form.fieldName.set(item.fieldName);
    this.form.displayName.set(item.displayName);
    this.form.dataType.set(item.dataType);
    this.form.displayOrderStr.set(item.displayOrder.toString());
    this.form.defaultValue.set(item.defaultValue ?? '');
    this.form.isSystemField.set(item.isSystemField);
    this.form.isRequired.set(item.isRequired);
    this.form.isActive.set(item.isActive);
    this.dialogOpen.set(true);
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const payload = {
        screenId: parseInt(this.form.screenIdStr(), 10),
        fieldCode: this.form.fieldCode(),
        fieldName: this.form.fieldName(),
        displayName: this.form.displayName(),
        dataType: this.form.dataType(),
        displayOrder: this.form.displayOrderStr() ? parseInt(this.form.displayOrderStr(), 10) : 0,
        defaultValue: this.form.defaultValue() || null,
        isSystemField: this.form.isSystemField(),
        isRequired: this.form.isRequired(),
        isActive: this.form.isActive(),
      };

      if (this.editing()) {
        const { fieldCode, fieldName, displayName, dataType, displayOrder, defaultValue, isRequired, isActive } = payload;
        await firstValueFrom(
          this.http.put(`/api/fields/${this.editing()!.id}`, { fieldCode, fieldName, displayName, dataType, displayOrder, defaultValue, isRequired, isActive }),
        );
        this.toast.success('Field updated');
      } else {
        await firstValueFrom(this.http.post('/api/fields', payload));
        this.toast.success('Field created');
      }
      this.dialogOpen.set(false);
      await this.load();
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(item: Field): Promise<void> {
    if (item.isSystemField) {
      this.toast.error('System fields cannot be deleted');
      return;
    }
    if (!confirm(`Delete field ${item.displayName}?`)) return;
    try {
      await firstValueFrom(this.http.delete(`/api/fields/${item.id}`));
      this.toast.success('Field deleted');
      await this.load();
    } catch {
      /* handled by interceptor */
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const [fields, screens, modules, domains] = await Promise.all([
        firstValueFrom(this.http.get<Field[]>('/api/fields')),
        firstValueFrom(this.http.get<Screen[]>('/api/screens')),
        firstValueFrom(this.http.get<Module[]>('/api/modules')),
        firstValueFrom(this.http.get<Domain[]>('/api/domains')),
      ]);
      this.rows.set(fields);
      this.screens.set(screens);
      this.modules.set(modules);
      this.domains.set(domains);
    } catch {
      this.toast.error('Failed to load fields');
    } finally {
      this.loading.set(false);
    }
  }

  protected getScreenName(screenId: number): string {
    return this.screenMap().get(screenId)?.screenName ?? 'Unknown';
  }
}
