import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { MasterPage, MasterConfig } from '../../../shared/master-page/master-page';
import {
  PosService,
  StoreDto,
  CreateStoreRequest,
  UpdateStoreRequest,
} from '../../../../core/services/pos_service';
import { AuthService } from '../../../../core/services/auth.service';
import { PermissionService } from '../../../../core/services/permission.service';
import { buildScopeLabel } from '../../../shared/scope-label';
import { OrganizationService } from '../../../../core/services/organization_service';

@Component({
  selector: 'app-stores',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, MasterPage],
  templateUrl: './stores.html',
  styleUrl: './stores.css',
})
export class StoresPage implements OnInit {
  private readonly pos = inject(PosService);
  private readonly auth = inject(AuthService);
  private readonly perms = inject(PermissionService);
  private readonly org = inject(OrganizationService);
  private readonly http = inject(HttpClient);
  private defaultCompanyId = 0;

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showEntry = signal(false);
  protected readonly stores = signal<StoreDto[]>([]);
  protected readonly editing = signal<StoreDto | null>(null);

  protected userModel: Record<string, any> = {};

  protected config: MasterConfig = {
    title: 'Stores',
    description: 'Manage retail/POS stores under each branch',
    icon: 'Store',
    api: '/api/stores',
    permissionName: 'Stores',
    createLabel: 'New Store',

    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    allowImport: false,
    allowExport: true,
    allowRefresh: true,

    columns: [
      { field: 'storeCode', header: 'Code', width: '100px' },
      { field: 'storeName', header: 'Store Name' },
      { field: 'storeType', header: 'Type' },
      { field: 'phone', header: 'Phone' },
      { field: 'isActive', header: 'Active', type: 'checkbox', width: '90px' },
    ],

    tabs: [
      {
        name: 'General',
        fields: ['companyId', 'branchId', 'storeCode', 'storeName', 'storeType', 'address', 'phone', 'email'],
      },
      { name: 'Status', fields: ['isActive'] },
    ],

    fields: [
      { name: 'companyId', label: 'Company', type: 'dropdown', required: true, options: [] },
      { name: 'branchId', label: 'Branch', type: 'dropdown', options: [] },
      {
        name: 'storeCode',
        label: 'Store Code',
        type: 'text',
        required: true,
        maxLength: 20,
      },
      {
        name: 'storeName',
        label: 'Store Name',
        type: 'text',
        required: true,
        maxLength: 200,
      },
      { name: 'storeType', label: 'Store Type', type: 'text', maxLength: 50 },
      { name: 'address', label: 'Address', type: 'textarea' },
      { name: 'phone', label: 'Phone', type: 'text', maxLength: 30 },
      { name: 'email', label: 'Email', type: 'email', maxLength: 100 },
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
        this.stores.set([]);
        return;
      }
      const branchId = this.userModel['branchId'] ?? null;
      const res = await this.pos.stores.getPaged({ companyId, branchId, page: 1, size: 100, search: '' });
      this.stores.set(res.items ?? []);
    } catch (err) {
      console.error('[StoresPage] load failed:', err);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadDropdowns(): Promise<void> {
    try {
      const roleNames = this.auth.user()?.roles ?? [];
      const { companies, branches } = await this.perms.loadMyDataScopeOptions(roleNames);

      const companyOptions = companies.map((c) => ({ value: c.id, label: c.name }));
      if (companies.length > 0) {
        this.defaultCompanyId = companies[0].id;
      }

      const { scopeLabel, noAccess } = buildScopeLabel({ companies, branches });
      this.config = { ...this.config, scopeLabel, noAccess };

      this.setOptions('companyId', companyOptions);
      this.setOptions('branchId', branches.map((b) => ({ value: b.id, label: b.name })));
    } catch (err) {
      console.error('loadDropdowns error:', err);
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

  protected createStore(): void {
    this.editing.set(null);
    this.userModel = {
      companyId: this.defaultCompanyId || null,
      branchId: null,
      storeCode: '',
      storeName: '',
      storeType: '',
      address: '',
      phone: '',
      email: '',
      isActive: true,
      addresses: [],
      contacts: [],
      files: [],
      notes: [],
      tags: [],
    };
    this.config = { ...this.config, tabs: this.withEntityTab() };
    this.showEntry.set(true);
  }

  protected async editStore(row: Record<string, any>): Promise<void> {
    this.editing.set(row as StoreDto);
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

  protected async saveStore(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const editing = this.editing();
      if (editing) {
        const payload: UpdateStoreRequest = {
          branchId: this.userModel['branchId'] || null,
          storeName: this.userModel['storeName']?.trim(),
          storeType: this.userModel['storeType'] || null,
          address: this.userModel['address'] || null,
          phone: this.userModel['phone'] || null,
          email: this.userModel['email'] || null,
          isActive: this.userModel['isActive'],
          entityId: this.userModel['entityId'] ?? this.userModel['EntityId'] ?? null,
        };
        await this.pos.stores.update(editing.id, payload);
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
            entityType: 'STORE',
            entityCode: this.userModel['storeCode']?.trim().toUpperCase(),
            entityName: this.userModel['storeName']?.trim(),
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

        const payload: CreateStoreRequest = {
          companyId: this.userModel['companyId'],
          branchId: this.userModel['branchId'] || null,
          storeCode: this.userModel['storeCode']?.trim().toUpperCase(),
          storeName: this.userModel['storeName']?.trim(),
          storeType: this.userModel['storeType'] || null,
          address: this.userModel['address'] || null,
          phone: this.userModel['phone'] || null,
          email: this.userModel['email'] || null,
          isActive: this.userModel['isActive'],
          entityId,
        };
        await this.pos.stores.create(payload);
      }
      this.showEntry.set(false);
      await this.load();
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteStore(row: Record<string, any>): Promise<void> {
    if (!confirm(`Delete store "${row['storeName']}"? This cannot be undone.`)) return;
    try {
      await this.pos.stores.delete(row['id']);
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