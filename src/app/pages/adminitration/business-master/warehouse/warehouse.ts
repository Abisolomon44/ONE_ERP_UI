import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { MasterPage, MasterConfig } from '../../../shared/master-page/master-page';
import {
  OrganizationService,
  WarehouseDto,
  CreateWarehouseRequest,
  UpdateWarehouseRequest,
} from '../../../../core/services/organization_service';
import { AuthService } from '../../../../core/services/auth.service';
import { PermissionService } from '../../../../core/services/permission.service';
import { buildScopeLabel } from '../../../shared/scope-label';

@Component({
  selector: 'app-warehouse',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, MasterPage],
  templateUrl: './warehouse.html',
  styleUrl: './warehouse.css',
})
export class Warehouse implements OnInit {
  private readonly org = inject(OrganizationService);
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly perms = inject(PermissionService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showEntry = signal(false);
  protected readonly warehouses = signal<WarehouseDto[]>([]);
  protected readonly editing = signal<WarehouseDto | null>(null);

  private defaultCompanyId = 0;

  protected userModel: Record<string, any> = {};

  protected config: MasterConfig = {
    title: 'Warehouse Master',
    description: 'Manage warehouses under each branch',
    icon: 'Package',
    api: '/api/organization/warehouses',
    permissionName: 'Warehouses',
    createLabel: 'New Warehouse',

    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    allowImport: false,
    allowExport: true,
    allowRefresh: true,

    columns: [
      { field: 'warehouseCode', header: 'Code', width: '100px' },
      { field: 'warehouseName', header: 'Warehouse Name' },
      { field: 'companyId', header: 'Company', width: '100px' },
      { field: 'branchId', header: 'Branch', width: '100px' },
      { field: 'isActive', header: 'Active', type: 'checkbox', width: '90px' },
    ],

    tabs: [
      {
        name: 'General',
        fields: [
          'companyId',
          'branchId',
          'warehouseTypeId',
          'warehouseCode',
          'warehouseName',
          'address',
          'city',
        ],
      },
      { name: 'Status', fields: ['isActive'] },
    ],

    fields: [
      { name: 'companyId', label: 'Company', type: 'dropdown', required: true, options: [] },
      { name: 'branchId', label: 'Branch', type: 'dropdown', options: [] },
      {
        name: 'warehouseTypeId',
        label: 'Warehouse Type',
        type: 'dropdown',
        required: true,
        options: [],
      },
      {
        name: 'warehouseCode',
        label: 'Warehouse Code',
        type: 'text',
        required: true,
        maxLength: 20,
        readonly: true,
        placeholder: 'Auto-generated',
      },
      {
        name: 'warehouseName',
        label: 'Warehouse Name',
        type: 'text',
        required: true,
        maxLength: 200,
      },
      { name: 'address', label: 'Address', type: 'textarea' },
      { name: 'city', label: 'City', type: 'text' },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  };

  ngOnInit(): void {
    void this.loadDropdowns().then(() => this.load());
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const companyId = this.userModel['companyId'] ?? this.defaultCompanyId;
      if (!companyId) {
        this.warehouses.set([]);
        return;
      }
      const branchId = this.userModel['branchId'] ?? null;
      const res = await this.org.warehouses.getPaged({
        companyId,
        branchId,
        page: 1,
        size: 100,
        search: '',
      });
      this.warehouses.set(res.items ?? []);
    } catch (err) {
      console.error('[WarehousePage] load failed:', err);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadDropdowns(): Promise<void> {
    // Company/Branch options come from the current user's role-based Data Scope
    // entries (not /api/companies or /api/organization/branches), so this doesn't
    // need separate Companies.View/Branches.View permissions.
    const roleNames = this.auth.user()?.roles ?? [];
    const { companies, branches } = await this.perms.loadMyDataScopeOptions(roleNames);

    if (companies.length > 0) {
      this.setOptions('companyId', companies.map((c) => ({ value: c.id, label: c.name })));
      this.defaultCompanyId = companies[0].id;
    } else {
      this.setOptions('companyId', []);
    }

      const { scopeLabel, noAccess } = buildScopeLabel({ companies, branches });
      this.config = { ...this.config, scopeLabel, noAccess };

    this.setOptions('branchId', branches.map((b) => ({ value: b.id, label: b.name })));

    try {
      const warehouseTypesRes = await this.org.warehouseTypes.getAll(false);
      this.setOptions(
        'warehouseTypeId',
        (warehouseTypesRes ?? []).map((w: any) => ({ value: w.warehouseTypeId, label: w.name })),
      );
    } catch (err) {
      console.error('loadDropdowns: warehouse types failed:', err);
      this.setOptions('warehouseTypeId', []);
    }
  }

  private setOptions(fieldName: string, options: { value: any; label: string }[]): void {
    this.config = {
      ...this.config,
      fields: this.config.fields.map((f) =>
        f.name === fieldName ? { ...f, options } : f
      ),
    };
  }

  protected async createWarehouse(): Promise<void> {
    this.editing.set(null);
    this.userModel = {
      companyId: this.defaultCompanyId || null,
      branchId: null,
      warehouseTypeId: null,
      warehouseCode: '',
      warehouseName: '',
      address: '',
      city: '',
      isActive: true,
      addresses: [],
      contacts: [],
      files: [],
      notes: [],
      tags: [],
    };
    this.config = { ...this.config, tabs: this.withEntityTab() };
    this.showEntry.set(true);
    await this.loadNextCode();
  }

  private async loadNextCode(): Promise<void> {
    const companyId = this.userModel['companyId'];
    if (!companyId) return;
    try {
      const code = await firstValueFrom(
        this.http.get<string>(`/api/organization/warehouses/next-code`, {
          params: { companyId },
        }),
      );
      this.userModel['warehouseCode'] = code;
    } catch {
      /* best-effort; backend still auto-generates on save */
    }
  }

  protected async editWarehouse(row: Record<string, any>): Promise<void> {
    this.editing.set(row as WarehouseDto);
    this.userModel = {
      ...row,
      addresses: [],
      contacts: [],
      files: [],
      notes: [],
      tags: [],
    };
    this.config = { ...this.config, tabs: this.withEntityTab() };
    this.showEntry.set(true);

    const entityId = row['entityId'] ?? row['EntityId'];
    if (entityId == null) return;
    try {
      const entity = await this.loadEntity(entityId);
      if (entity) {
        this.userModel['addresses'] = entity.addresses ?? [];
        this.userModel['contacts'] = entity.contacts ?? [];
        this.userModel['files'] = entity.files ?? [];
        this.userModel['notes'] = entity.notes ?? [];
        this.userModel['tags'] = entity.tags ?? [];
      }
    } catch {
      /* entity fetch is optional; tab stays empty */
    }
  }

  private async loadEntity(entityId: number): Promise<any | null> {
    const res: any = await firstValueFrom(this.http.get(`/api/entities/${entityId}`));
    return res ?? null;
  }

  private withEntityTab() {
    const tabs = this.config.tabs;
    if (tabs.some(t => t.entity)) return tabs;
    return [...tabs, { name: 'Address & Contacts', fields: [] as string[], entity: true as const }];
  }

  protected async saveWarehouse(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const editing = this.editing();
      if (editing) {
        const payload: UpdateWarehouseRequest = {
          warehouseName: this.userModel['warehouseName']?.trim(),
          branchId: this.userModel['branchId'] || null,
          entityId: this.userModel['entityId'] ?? this.userModel['EntityId'] ?? null,
          warehouseTypeId: this.userModel['warehouseTypeId'] || null,
          address: this.userModel['address'] || null,
          city: this.userModel['city'] || null,
          isActive: this.userModel['isActive'],
        };
        await this.org.warehouses.update(editing.id, payload);
      } else {
        const hasEntityData =
          (this.userModel['addresses']?.length > 0) ||
          (this.userModel['contacts']?.length > 0) ||
          (this.userModel['files']?.length > 0) ||
          (this.userModel['notes']?.length > 0) ||
          (this.userModel['tags']?.length > 0);

        let entityId: number | null = this.userModel['entityId'] as number | null ?? null;
        if (entityId == null && hasEntityData) {
          const entityPayload: any = {
            entityType: 'WAREHOUSE',
            entityCode: this.userModel['warehouseCode']?.trim().toUpperCase(),
            entityName: this.userModel['warehouseName']?.trim(),
            isActive: true,
            addresses: this.userModel['addresses'] ?? [],
            contacts: this.userModel['contacts'] ?? [],
            files: this.userModel['files'] ?? [],
            notes: this.userModel['notes'] ?? [],
            tags: this.userModel['tags'] ?? [],
          };
          const entity: any = await firstValueFrom(this.http.post('/api/entities', entityPayload));
          entityId = entity?.entityId ?? entity?.EntityId ?? null;
        }

        const payload: CreateWarehouseRequest = {
          companyId: this.userModel['companyId'],
          branchId: this.userModel['branchId'] || null,
          entityId,
          warehouseTypeId: this.userModel['warehouseTypeId'] || null,
          warehouseCode: this.userModel['warehouseCode']?.trim().toUpperCase(),
          warehouseName: this.userModel['warehouseName']?.trim(),
          address: this.userModel['address'] || null,
          city: this.userModel['city'] || null,
        };
        await this.org.warehouses.create(payload);
      }
      this.showEntry.set(false);
      await this.load();
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteWarehouse(row: Record<string, any>): Promise<void> {
    if (!confirm(`Delete warehouse "${row['warehouseName']}"? This cannot be undone.`)) return;
    try {
      await this.org.warehouses.delete(row['id']);
      await this.load();
    } catch {
      /* handled by interceptor */
    }
  }

  protected cancel(): void {
    this.showEntry.set(false);
  }

  protected refresh(): void {
    void this.load();
  }
}