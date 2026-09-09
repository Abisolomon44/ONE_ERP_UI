import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MasterPage, MasterConfig } from '../shared/master-page/master-page';
import { MasterRow } from '../shared/master.model';
import {
  AdministrationService,
  BillingMasterService,
  ServiceDto,
  CreateServiceRequest,
  UpdateServiceRequest,
} from '../../core/services/master_service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionService } from '../../core/services/permission.service';

@Component({
  selector: 'app-service',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, MasterPage],
  templateUrl: './service.html',
  styleUrl: './service.css',
})
export class ServicePage implements OnInit {
  private readonly admin = inject(AdministrationService);
  private readonly billing = inject(BillingMasterService);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showEntry = signal(false);
  protected readonly rows = signal<MasterRow[]>([]);
  protected readonly editing = signal<ServiceDto | null>(null);

  protected userModel: Record<string, any> = {};

  protected config: MasterConfig = {
    title: 'Services',
    description: 'Manage services offered by the company',
    icon: 'Service',
    api: '/api/services',
    permissionName: 'services',
    createLabel: 'New Service',
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    allowImport: false,
    allowExport: false,
    allowRefresh: true,
    tabs: [
      { name: 'General', fields: ['code', 'name', 'serviceCategoryId', 'unitId', 'hsnSacId', 'defaultTaxId', 'standardRate', 'isTaxInclusive'] },
      { name: 'Status', fields: ['description', 'isActive'] },
    ],
    columns: [
      { field: 'code', header: 'Code', width: '110px' },
      { field: 'name', header: 'Name' },
      { field: 'serviceCategoryName', header: 'Category' },
      { field: 'unitName', header: 'Unit' },
      { field: 'hsnSacCode', header: 'HSN/SAC' },
      { field: 'standardRate', header: 'Rate', type: 'currency', width: '110px' },
      { field: 'isActive', header: 'Active', type: 'checkbox', width: '90px' },
    ],
    fields: [
      { name: 'code', label: 'Service Code', type: 'text', required: true, maxLength: 30, readonly: true },
      { name: 'name', label: 'Service Name', type: 'text', required: true, maxLength: 200 },
      { name: 'serviceCategoryId', label: 'Category', type: 'dropdown', options: [] },
      { name: 'unitId', label: 'Unit', type: 'dropdown', options: [] },
      { name: 'hsnSacId', label: 'HSN/SAC', type: 'dropdown', options: [] },
      { name: 'defaultTaxId', label: 'Default Tax', type: 'dropdown', options: [] },
      { name: 'standardRate', label: 'Standard Rate', type: 'number' },
      { name: 'isTaxInclusive', label: 'Tax Inclusive', type: 'checkbox' },
      { name: 'description', label: 'Description', type: 'textarea', maxLength: 500 },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  };

  ngOnInit(): void {
    if (!this.perm.has('services.view')) {
      this.loading.set(false);
      return;
    }
    void this.loadDropdowns();
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      if (!this.perm.has('services.view')) {
        this.rows.set([]);
        return;
      }
      const res = await this.billing.services.getPaged(1, 100, '');
      this.rows.set((res.items ?? []).map((x) => ({ ...x, id: x.serviceId }) as MasterRow));
    } catch {
    } finally {
      this.loading.set(false);
    }
  }

  private async loadDropdowns(): Promise<void> {
    try {
      const [categories, units, hsnSacs] = await Promise.all([
        this.billing.serviceCategories.getPaged(1, 1000, ''),
        this.admin.productUnits.getPaged(1, 1000, ''),
        this.billing.hsnSacs.getPaged(1, 1000, ''),
      ]);
      this.setOptions('serviceCategoryId', (categories.items ?? []).map((c) => ({ value: c.serviceCategoryId, label: c.name })));
      this.setOptions('unitId', (units.items ?? []).map((u) => ({ value: u.id, label: u.unitName })));
      this.setOptions('hsnSacId', (hsnSacs.items ?? []).map((h) => ({ value: h.hsnSacId, label: `${h.code} - ${h.name}` })));
    } catch {
    }
    try {
      const taxes = await this.admin.taxes.getPaged(1, 1000, '');
      this.setOptions('defaultTaxId', (taxes.items ?? []).map((t) => ({ value: t.id, label: t.taxName })));
    } catch {
    }
  }

  private setOptions(fieldName: string, options: { value: any; label: string }[]): void {
    const field = this.config.fields.find((f) => f.name === fieldName);
    if (field) field.options = options;
  }

  protected async createRow(): Promise<void> {
    this.editing.set(null);
    let nextCode = '';
    try {
      nextCode = await this.billing.services.getNextCode();
    } catch {
      /* code will be generated server-side on save */
    }
    this.userModel = {
      code: nextCode,
      name: '',
      serviceCategoryId: null,
      unitId: null,
      hsnSacId: null,
      defaultTaxId: null,
      standardRate: 0,
      isTaxInclusive: false,
      description: '',
      isActive: true,
    };
    this.showEntry.set(true);
  }

  protected editRow(row: Record<string, any>): void {
    this.editing.set(row as ServiceDto);
    this.userModel = { ...row };
    this.showEntry.set(true);
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const editing = this.editing();
      const payload: CreateServiceRequest = {
        code: this.userModel['code']?.trim().toUpperCase(),
        name: this.userModel['name']?.trim(),
        serviceCategoryId: this.userModel['serviceCategoryId'] || null,
        unitId: this.userModel['unitId'] || null,
        hsnSacId: this.userModel['hsnSacId'] || null,
        defaultTaxId: this.userModel['defaultTaxId'] || null,
        standardRate: this.userModel['standardRate'] ?? 0,
        isTaxInclusive: this.userModel['isTaxInclusive'] ?? false,
        description: this.userModel['description'] || null,
      };
      if (editing) {
        const updatePayload: UpdateServiceRequest = {
          ...payload,
          standardRate: this.userModel['standardRate'] ?? 0,
          isTaxInclusive: this.userModel['isTaxInclusive'] ?? false,
          description: this.userModel['description'] || null,
          isActive: this.userModel['isActive'],
        };
        await this.billing.services.update(editing.serviceId, updatePayload);
      } else {
        await this.billing.services.create(payload);
      }
      this.showEntry.set(false);
      await this.load();
    } catch {
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteRow(row: Record<string, any>): Promise<void> {
    if (!confirm(`Delete service "${row['name']}"? This cannot be undone.`)) return;
    try {
      await this.billing.services.delete(row['serviceId']);
      await this.load();
    } catch {
    }
  }

  protected cancel(): void {
    this.showEntry.set(false);
  }

  protected refresh(): void {
    void this.load();
  }
}