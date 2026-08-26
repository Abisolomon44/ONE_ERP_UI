import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { MasterPage, MasterConfig, MasterToolbarAction } from '../shared/master-page/master-page';
import {
  AdministrationService,
  ProductDto,
  CreateProductRequest,
  UpdateProductRequest,
} from '../../core/services/master_service';
import { ToastService } from '../../core/services/toast.service';
import { Action } from '../../core/models';
import { PermissionService } from '../../core/services/permission.service';

@Component({
  selector: 'app-product',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, MasterPage],
  templateUrl: './product.html',
  styleUrl: './product.css',
})
export class ProductPage implements OnInit {
  private readonly admin = inject(AdministrationService);
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showEntry = signal(false);
  protected readonly rows = signal<ProductDto[]>([]);
  protected readonly editing = signal<ProductDto | null>(null);

  protected userModel: Record<string, any> = {};

  protected config: MasterConfig = {
    title: 'Products',
    description: 'Manage products and their attributes',
    icon: 'Package',
    api: '/api/products',
    permissionName: 'products',
    createLabel: 'New Product',
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    allowImport: false,
    allowExport: true,
    allowRefresh: true,
    tabs: [
      { name: 'General', fields: ['productCode', 'productName', 'categoryId', 'subCategoryId', 'brandId', 'uomId', 'branchId', 'sku', 'barcode'] },
      { name: 'Pricing', fields: ['mrp', 'purchasePrice', 'salesPrice'] },
      { name: 'Classification', fields: ['isStockItem', 'isSaleable', 'isPurchaseable'] },
      { name: 'Status', fields: ['description', 'isActive'] },
    ],
    columns: [
      { field: 'productCode', header: 'Code', width: '110px' },
      { field: 'productName', header: 'Name' },
      { field: 'categoryName', header: 'Category' },
      { field: 'subCategoryName', header: 'Sub Category' },
      { field: 'brandName', header: 'Brand' },
      { field: 'uomName', header: 'UOM' },
      { field: 'salesPrice', header: 'Sales Price', width: '110px' },
      { field: 'isActive', header: 'Active', type: 'checkbox', width: '90px' },
    ],
    fields: [
      { name: 'productCode', label: 'Product Code', type: 'text', required: true, maxLength: 30 },
      { name: 'productName', label: 'Product Name', type: 'text', required: true, maxLength: 200 },
      { name: 'categoryId', label: 'Category', type: 'dropdown', options: [] },
      { name: 'subCategoryId', label: 'Sub Category', type: 'dropdown', options: [] },
      { name: 'brandId', label: 'Brand', type: 'dropdown', options: [] },
      { name: 'uomId', label: 'UOM', type: 'dropdown', required: true, options: [] },
      { name: 'branchId', label: 'Branch', type: 'dropdown', options: [] },
      { name: 'sku', label: 'SKU', type: 'text', maxLength: 50 },
      { name: 'barcode', label: 'Barcode', type: 'text', maxLength: 100 },
      { name: 'mrp', label: 'MRP', type: 'number' },
      { name: 'purchasePrice', label: 'Purchase Price', type: 'number' },
      { name: 'salesPrice', label: 'Sales Price', type: 'number' },
      { name: 'isStockItem', label: 'Stock Item', type: 'checkbox' },
      { name: 'isSaleable', label: 'Saleable', type: 'checkbox' },
      { name: 'isPurchaseable', label: 'Purchaseable', type: 'checkbox' },
      { name: 'description', label: 'Description', type: 'textarea', maxLength: 500 },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  };

  ngOnInit(): void {
    if (!this.perm.has('products.view')) {
      this.loading.set(false);
      return;
    }
    void this.loadDropdowns();
    void this.load();
    void this.loadToolbarActions();
  }

  private async loadToolbarActions(): Promise<void> {
    try {
      const actions = await firstValueFrom(this.http.get<Action[]>('/api/actions'));
      const wanted = ['export', 'print'];
      const mapping: Record<string, { label: string; variant: MasterToolbarAction['variant'] }> = {
        export: { label: 'Export', variant: 'warning' },
        print: { label: 'Print', variant: 'secondary' },
      };
      const toolbar = (actions ?? [])
        .filter((a) => a.isActive && wanted.includes(a.actionCode))
        .map<MasterToolbarAction>((a) => ({
          code: a.actionCode,
          label: mapping[a.actionCode]?.label ?? a.actionName,
          variant: mapping[a.actionCode]?.variant ?? 'secondary',
        }));
      this.config = { ...this.config, toolbarActions: toolbar };
    } catch {
      /* actions are optional */
    }
  }

  protected onAction(code: string): void {
    if (code === 'export') this.exportCsv();
    else if (code === 'print') this.print();
  }

  private exportCsv(): void {
    const rows = this.rows();
    if (!rows.length) {
      this.toast.info('No records to export');
      return;
    }
    const headers = ['productCode', 'productName', 'categoryName', 'subCategoryName', 'brandName', 'uomName', 'salesPrice', 'isActive'];
    const lines = [headers.join(',')];
    for (const r of rows) {
      lines.push(
        headers
          .map((h) => {
            const v = (r as any)[h];
            const s = v == null ? '' : String(v);
            return `"${s.replace(/"/g, '""')}"`;
          })
          .join(','),
      );
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products.csv';
    a.click();
    URL.revokeObjectURL(url);
    this.toast.success('Exported products.csv');
  }

  private print(): void {
    window.print();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      if (!this.perm.has('products.view')) {
        this.rows.set([]);
        return;
      }
      const res = await this.admin.products.getPaged(1, 100, '');
      this.rows.set(res.items ?? []);
    } catch {
    } finally {
      this.loading.set(false);
    }
  }

  private async loadDropdowns(): Promise<void> {
    try {
      const [cats, subs, brands, units] = await Promise.all([
        this.admin.productCategories.getPaged(1, 1000, ''),
        this.admin.productSubCategories.getPaged(1, 1000, ''),
        this.admin.productBrands.getPaged(1, 1000, ''),
        this.admin.productUnits.getPaged(1, 1000, ''),
      ]);
      this.setOptions('categoryId', (cats.items ?? []).map((c: any) => ({ value: c.id, label: c.categoryName })));
      this.setOptions('subCategoryId', (subs.items ?? []).map((s: any) => ({ value: s.id, label: s.subCategoryName })));
      this.setOptions('brandId', (brands.items ?? []).map((b: any) => ({ value: b.id, label: b.brandName })));
      this.setOptions('uomId', (units.items ?? []).map((u: any) => ({ value: u.id, label: u.unitName })));
    } catch {
    }
    try {
      const branchRes: any = await firstValueFrom(
        this.http.get('/api/organization/branches?page=1&size=1000'),
      );
      const branches: any[] = branchRes?.items ?? [];
      this.setOptions('branchId', branches.map((b: any) => ({ value: b.id, label: b.branchName })));
    } catch {
    }
  }

  private setOptions(fieldName: string, options: { value: any; label: string }[]): void {
    const field = this.config.fields.find((f) => f.name === fieldName);
    if (field) field.options = options;
  }

  protected createRow(): void {
    this.editing.set(null);
    this.userModel = {
      productCode: '',
      productName: '',
      categoryId: null,
      subCategoryId: null,
      brandId: null,
      uomId: null,
      branchId: null,
      sku: '',
      barcode: '',
      mrp: null,
      purchasePrice: null,
      salesPrice: null,
      isStockItem: true,
      isSaleable: true,
      isPurchaseable: true,
      description: '',
      isActive: true,
    };
    this.showEntry.set(true);
  }

  protected editRow(row: Record<string, any>): void {
    this.editing.set(row as ProductDto);
    this.userModel = { ...row };
    this.showEntry.set(true);
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const editing = this.editing();
      const payload: CreateProductRequest = {
        productCode: this.userModel['productCode']?.trim().toUpperCase(),
        productName: this.userModel['productName']?.trim(),
        categoryId: this.userModel['categoryId'] || null,
        subCategoryId: this.userModel['subCategoryId'] || null,
        brandId: this.userModel['brandId'] || null,
        uomId: this.userModel['uomId'],
        branchId: this.userModel['branchId'] || null,
        sku: this.userModel['sku'] || null,
        barcode: this.userModel['barcode'] || null,
        mrp: this.userModel['mrp'] ?? null,
        purchasePrice: this.userModel['purchasePrice'] ?? null,
        salesPrice: this.userModel['salesPrice'] ?? null,
        isStockItem: this.userModel['isStockItem'] ?? true,
        isSaleable: this.userModel['isSaleable'] ?? true,
        isPurchaseable: this.userModel['isPurchaseable'] ?? true,
        description: this.userModel['description'] || null,
      };
      if (editing) {
        const updatePayload: UpdateProductRequest = { ...payload, isActive: this.userModel['isActive'] };
        await this.admin.products.update(editing.id, updatePayload);
      } else {
        await this.admin.products.create(payload);
      }
      this.showEntry.set(false);
      await this.load();
    } catch {
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteRow(row: Record<string, any>): Promise<void> {
    if (!confirm(`Delete product "${row['productName']}"? This cannot be undone.`)) return;
    try {
      await this.admin.products.delete(row['id']);
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
