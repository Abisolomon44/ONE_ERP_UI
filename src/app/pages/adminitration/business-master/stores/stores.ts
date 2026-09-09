import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MasterPage, MasterConfig } from '../../../shared/master-page/master-page';
import {
  PosService,
  StoreDto,
  CreateStoreRequest,
  UpdateStoreRequest,
} from '../../../../core/services/pos_service';
import { AdministrationService } from '../../../../core/services/master_service';
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
  private readonly admin = inject(AdministrationService);
  private readonly org = inject(OrganizationService);

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
    void this.loadDropdowns();
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const companyId = this.userModel['companyId'] ?? +(localStorage.getItem('companyId') ?? '1');
      const branchId = this.userModel['branchId'] ?? null;
      const res = await this.pos.stores.getPaged({
        companyId,
        branchId,
        page: 1,
        size: 100,
        search: '',
      });
      this.stores.set(res.items ?? []);
    } catch (err) {
      console.error('[StoresPage] load failed:', err);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadDropdowns(): Promise<void> {
    try {
      const companyId = +(localStorage.getItem('companyId') ?? '1');

      const [companiesRes, branchesRes] = await Promise.all([
        this.admin.company.getPaged(1, 200, ''),
        this.org.branches.getPaged({
          companyId,
          page: 1,
          size: 200,
          search: '',
        }),
      ]);

      this.setOptions(
        'companyId',
        (companiesRes.items ?? []).map((c: any) => ({
          value: c.id,
          label: c.companyName,
        })),
      );

      this.setOptions(
        'branchId',
        (branchesRes.items ?? []).map((b: any) => ({
          value: b.id,
          label: b.branchName,
        })),
      );
    } catch (err) {
      console.error('loadDropdowns failed:', err);
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
      companyId: +(localStorage.getItem('companyId') ?? '1'),
      branchId: null,
      storeCode: '',
      storeName: '',
      storeType: '',
      address: '',
      phone: '',
      email: '',
      isActive: true,
    };
    this.showEntry.set(true);
  }

  protected editStore(row: Record<string, any>): void {
    this.editing.set(row as StoreDto);
    this.userModel = { ...row };
    this.showEntry.set(true);
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
        };
        await this.pos.stores.update(editing.id, payload);
      } else {
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