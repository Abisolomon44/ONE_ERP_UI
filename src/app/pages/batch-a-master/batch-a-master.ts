import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  MasterPage,
  MasterConfig,
  DropdownOption,
} from '../shared/master-page/master-page';
import { MasterRow } from '../shared/master.model';
import { ToastService } from '../../core/services/toast.service';

type BatchAKey = 'variants' | 'models' | 'specifications' | 'unit-mappings' | 'serials' | 'batches' | 'warranties';

interface BatchAConfig {
  title: string;
  endpoint: string;
  permissionName: string;
  columns: MasterConfig['columns'];
  fields: MasterConfig['fields'];
}

const configs: Record<BatchAKey, BatchAConfig> = {
  variants: {
    title: 'Product Variants',
    endpoint: '/api/product-variants',
    permissionName: 'product-variants',
    columns: [
      { field: 'variantCode', header: 'Variant Code', width: '140px' },
      { field: 'variantName', header: 'Variant Name' },
      { field: 'sku', header: 'SKU', width: '140px' },
      { field: 'productId', header: 'Product' },
      { field: 'isActive', header: 'Active', type: 'checkbox', width: '90px' },
    ],
    fields: [
      { name: 'productId', label: 'Product', type: 'dropdown', required: true, options: [] },
      { name: 'variantCode', label: 'Variant Code', type: 'text', required: true, maxLength: 50 },
      { name: 'variantName', label: 'Variant Name', type: 'text', required: true, maxLength: 200 },
      { name: 'sku', label: 'SKU', type: 'text', maxLength: 100 },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  },
  models: {
    title: 'Product Models',
    endpoint: '/api/product-models',
    permissionName: 'product-models',
    columns: [
      { field: 'modelCode', header: 'Model Code', width: '140px' },
      { field: 'modelName', header: 'Model Name' },
      { field: 'description', header: 'Description' },
      { field: 'productId', header: 'Product' },
      { field: 'isActive', header: 'Active', type: 'checkbox', width: '90px' },
    ],
    fields: [
      { name: 'modelCode', label: 'Model Code', type: 'text', required: true, maxLength: 50 },
      { name: 'modelName', label: 'Model Name', type: 'text', required: true, maxLength: 200 },
      { name: 'description', label: 'Description', type: 'textarea', maxLength: 500 },
      { name: 'productId', label: 'Product', type: 'dropdown', options: [] },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  },
  specifications: {
    title: 'Product Specifications',
    endpoint: '/api/product-specifications',
    permissionName: 'product-specifications',
    columns: [
      { field: 'specificationName', header: 'Name', width: '200px' },
      { field: 'specificationValue', header: 'Value' },
      { field: 'productId', header: 'Product' },
      { field: 'variantId', header: 'Variant' },
      { field: 'isActive', header: 'Active', type: 'checkbox', width: '90px' },
    ],
    fields: [
      { name: 'productId', label: 'Product', type: 'dropdown', options: [] },
      { name: 'variantId', label: 'Variant', type: 'dropdown', options: [] },
      { name: 'specificationName', label: 'Specification Name', type: 'text', required: true, maxLength: 100 },
      { name: 'specificationValue', label: 'Specification Value', type: 'text', required: true, maxLength: 500 },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  },
  'unit-mappings': {
    title: 'Product Unit Mappings',
    endpoint: '/api/product-unit-mappings',
    permissionName: 'product-unit-mappings',
    columns: [
      { field: 'productId', header: 'Product' },
      { field: 'unitId', header: 'Unit' },
      { field: 'conversionFactor', header: 'Factor', type: 'number', width: '120px' },
      { field: 'isDefault', header: 'Default', type: 'checkbox', width: '90px' },
      { field: 'isActive', header: 'Active', type: 'checkbox', width: '90px' },
    ],
    fields: [
      { name: 'productId', label: 'Product', type: 'dropdown', required: true, options: [] },
      { name: 'unitId', label: 'Unit', type: 'dropdown', required: true, options: [] },
      { name: 'conversionFactor', label: 'Conversion Factor', type: 'number', required: true },
      { name: 'isDefault', label: 'Is Default', type: 'checkbox' },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  },
  serials: {
    title: 'Serial / IMEI Management',
    endpoint: '/api/product-serials',
    permissionName: 'product-serials',
    columns: [
      { field: 'serialNumber', header: 'Serial Number', width: '200px' },
      { field: 'imei', header: 'IMEI', width: '160px' },
      { field: 'status', header: 'Status', width: '120px' },
      { field: 'productId', header: 'Product' },
    ],
    fields: [
      { name: 'productId', label: 'Product', type: 'dropdown', required: true, options: [] },
      { name: 'serialNumber', label: 'Serial Number', type: 'text', required: true, maxLength: 150 },
      { name: 'imei', label: 'IMEI', type: 'text', maxLength: 50 },
      { name: 'status', label: 'Status', type: 'text', required: true },
    ],
  },
  batches: {
    title: 'Batch / Expiry Management',
    endpoint: '/api/product-batches',
    permissionName: 'product-batches',
    columns: [
      { field: 'batchNumber', header: 'Batch Number', width: '160px' },
      { field: 'manufactureDate', header: 'Manufacture Date', type: 'date', width: '160px' },
      { field: 'expiryDate', header: 'Expiry Date', type: 'date', width: '160px' },
      { field: 'quantity', header: 'Quantity', type: 'number', width: '110px' },
      { field: 'status', header: 'Status', width: '110px' },
      { field: 'productId', header: 'Product' },
    ],
    fields: [
      { name: 'productId', label: 'Product', type: 'dropdown', required: true, options: [] },
      { name: 'batchNumber', label: 'Batch Number', type: 'text', required: true, maxLength: 100 },
      { name: 'manufactureDate', label: 'Manufacture Date', type: 'date' },
      { name: 'expiryDate', label: 'Expiry Date', type: 'date' },
      { name: 'quantity', label: 'Quantity', type: 'number' },
      { name: 'status', label: 'Status', type: 'text', required: true },
    ],
  },
  warranties: {
    title: 'Warranty Management',
    endpoint: '/api/product-warranties',
    permissionName: 'product-warranties',
    columns: [
      { field: 'warrantyCode', header: 'Warranty Code', width: '140px' },
      { field: 'warrantyMonths', header: 'Months', type: 'number', width: '90px' },
      { field: 'startDate', header: 'Start Date', type: 'date', width: '140px' },
      { field: 'endDate', header: 'End Date', type: 'date', width: '140px' },
      { field: 'status', header: 'Status', width: '110px' },
      { field: 'productId', header: 'Product' },
    ],
    fields: [
      { name: 'warrantyCode', label: 'Warranty Code', type: 'text', required: true, maxLength: 50 },
      { name: 'productId', label: 'Product', type: 'dropdown', options: [] },
      { name: 'serialNumberId', label: 'Serial Number', type: 'dropdown', options: [] },
      { name: 'warrantyMonths', label: 'Warranty Months', type: 'number', required: true },
      { name: 'startDate', label: 'Start Date', type: 'date', required: true },
      { name: 'endDate', label: 'End Date', type: 'date', required: true },
      { name: 'terms', label: 'Terms', type: 'textarea', maxLength: 1000 },
      { name: 'status', label: 'Status', type: 'text', required: true },
    ],
  },
};

@Component({
  selector: 'app-batch-a-master',
  standalone: true,
  imports: [FormsModule, CommonModule, MasterPage],
  templateUrl: './batch-a-master.html',
  styleUrl: './batch-a-master.css',
})
export class BatchAMasterPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  protected batchConfig!: BatchAConfig;
  protected config!: MasterConfig;

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showEntry = signal(false);
  protected readonly rows = signal<MasterRow[]>([]);
  protected readonly editing = signal<Record<string, any> | null>(null);
  protected userModel: Record<string, any> = {};

  ngOnInit(): void {
    const key = (this.route.snapshot.data['batchAKey'] as BatchAKey) ?? 'variants';
    this.batchConfig = configs[key] ?? configs['variants'];
    this.config = {
      title: this.batchConfig.title,
      description: 'Batch A product foundation',
      icon: 'Package',
      api: this.batchConfig.endpoint,
      permissionName: this.batchConfig.permissionName,
      createLabel: `New ${this.batchConfig.title.replace(/^(Product|Batch)\s/, '')}`,
      allowCreate: true,
      allowEdit: true,
      allowDelete: true,
      allowImport: false,
      allowExport: false,
      allowRefresh: true,
      tabs: [],
      columns: this.batchConfig.columns,
      fields: this.batchConfig.fields,
    };
    void this.loadDropdowns();
    void this.load();
  }

  private async loadDropdowns(): Promise<void> {
    const [products, units, variants, serials] = await Promise.all([
      this.safeList('/api/products?page=1&size=1000', 'items'),
      this.safeList('/api/units?page=1&size=1000', 'items'),
      this.safeList('/api/product-variants'),
      this.safeList('/api/product-serials'),
    ]);
    const productOptions = products.map((p: any) => ({ value: p.id, label: p.productName ?? p.productCode }));
    const unitOptions = units.map((u: any) => ({ value: u.id, label: u.unitName ?? u.unitCode }));
    const variantOptions = variants.map((v: any) => ({ value: v.id, label: v.variantName ?? v.variantCode }));
    const serialOptions = serials.map((s: any) => ({ value: s.id, label: s.serialNumber }));
    this.setOptions('productId', productOptions);
    this.setOptions('unitId', unitOptions);
    this.setOptions('variantId', variantOptions);
    this.setOptions('serialNumberId', serialOptions);
  }

  private async safeList(url: string, itemsKey?: string): Promise<any[]> {
    try {
      const res: any = await firstValueFrom(this.http.get(url));
      return itemsKey ? (res?.items ?? []) : (res ?? []);
    } catch {
      return [];
    }
  }

  private setOptions(fieldName: string, options: DropdownOption[]): void {
    const field = this.config.fields.find((f) => f.name === fieldName);
    if (field) field.options = options;
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(this.http.get<any[]>(this.batchConfig.endpoint));
      this.rows.set((res ?? []) as MasterRow[]);
    } catch {
      this.toast.error('Failed to load records');
    } finally {
      this.loading.set(false);
    }
  }

  protected createRow(): void {
    this.editing.set(null);
    this.userModel = { isActive: true, status: 'ACTIVE', conversionFactor: 1 };
    this.showEntry.set(true);
  }

  protected editRow(row: Record<string, any>): void {
    this.editing.set(row as MasterRow);
    this.userModel = { ...row };
    this.showEntry.set(true);
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const payload: Record<string, any> = { ...this.userModel };
      delete payload['id'];
      delete payload['companyId'];
      delete payload['createdBy'];
      delete payload['createdAt'];
      delete payload['modifiedBy'];
      delete payload['modifiedAt'];
      if (this.editing()) {
        payload['isActive'] = payload['isActive'] ?? true;
        await firstValueFrom(this.http.put(`${this.batchConfig.endpoint}/${this.editing()!['id']}`, payload));
        this.toast.success('Record updated successfully');
      } else {
        delete payload['isActive'];
        await firstValueFrom(this.http.post(this.batchConfig.endpoint, payload));
        this.toast.success('Record created successfully');
      }
      this.showEntry.set(false);
      await this.load();
    } catch {
      this.toast.error('Save failed');
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteRow(row: Record<string, any>): Promise<void> {
    if (!confirm(`Delete record ${row['id']}? This cannot be undone.`)) return;
    try {
      await firstValueFrom(this.http.delete(`${this.batchConfig.endpoint}/${row['id']}`));
      this.toast.success('Record deleted successfully');
      await this.load();
    } catch {
      this.toast.error('Delete failed');
    }
  }

  protected cancel(): void {
    this.showEntry.set(false);
  }

  protected refresh(): void {
    void this.load();
  }
}
