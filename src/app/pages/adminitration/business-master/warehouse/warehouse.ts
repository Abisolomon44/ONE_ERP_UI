import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MasterPage, MasterConfig } from '../../../shared/master-page/master-page';
import {
  OrganizationService,
  WarehouseDto,
  CreateWarehouseRequest,
  UpdateWarehouseRequest,
} from '../../../../core/services/organization_service';
import { AdministrationService } from '../../../../core/services/master_service';

@Component({
  selector: 'app-warehouse',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, MasterPage],
  templateUrl: './warehouse.html',
  styleUrl: './warehouse.css',
})
export class Warehouse implements OnInit {
  private readonly org = inject(OrganizationService);
  private readonly admin = inject(AdministrationService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showEntry = signal(false);
  protected readonly warehouses = signal<WarehouseDto[]>([]);
  protected readonly editing = signal<WarehouseDto | null>(null);

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
  console.log('===== Warehouse Init =====');

  console.log('LocalStorage CompanyId:', localStorage.getItem('companyId'));

  void this.loadDropdowns();
  void this.load();
}

private async initialize(): Promise<void> {
  this.loading.set(true);

  try {
    await this.loadDropdowns();
    await this.load();
  } finally {
    this.loading.set(false);
  }
}
private async load(): Promise<void> {
  this.loading.set(true);

  try {
    const companyId =
      this.userModel['companyId'] ??
      +(localStorage.getItem('companyId') ?? '1');

    const branchId = this.userModel['branchId'] ?? null;
const res = await this.org.warehouses.getPaged({
  companyId,
  branchId,
  page: 1,
  size: 100,
  search: '',
});

console.log(res);
    console.log('Warehouse Response:', res);
    console.log('Warehouse Items:', res.items);

    this.warehouses.set(res.items ?? []);

    console.log('Warehouse Signal:', this.warehouses());
  } catch (err) {
    console.error('Warehouse load failed:', err);
  } finally {
    this.loading.set(false);
  }
}

  private async loadDropdowns(): Promise<void> {
    try {
      const companyId = +(localStorage.getItem('companyId') ?? '1');

      const [companiesRes, branchesRes, warehouseTypesRes] = await Promise.all([
        this.admin.company.getPaged(1, 200, ''),
        this.org.branches.getPaged({
          companyId,
          page: 1,
          size: 200,
          search: '',
        }),
        this.org.warehouseTypes.getAll(false),
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

      this.setOptions(
        'warehouseTypeId',
        (warehouseTypesRes ?? []).map((w: any) => ({
          value: w.warehouseTypeId,
          label: w.name,
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

  protected createWarehouse(): void {
    this.editing.set(null);
    this.userModel = {
      companyId: +(localStorage.getItem('companyId') ?? '1'),
      branchId: null,
      warehouseTypeId: null,
      warehouseCode: '',
      warehouseName: '',
      address: '',
      city: '',
      isActive: true,
    };
    this.showEntry.set(true);
  }

  protected editWarehouse(row: Record<string, any>): void {
    this.editing.set(row as WarehouseDto);
    this.userModel = { ...row };
    this.showEntry.set(true);
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
          warehouseTypeId: this.userModel['warehouseTypeId'] || null,
          address: this.userModel['address'] || null,
          city: this.userModel['city'] || null,
          isActive: this.userModel['isActive'],
        };
        await this.org.warehouses.update(editing.id, payload);
      } else {
        const payload: CreateWarehouseRequest = {
          companyId: this.userModel['companyId'],
          branchId: this.userModel['branchId'] || null,
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