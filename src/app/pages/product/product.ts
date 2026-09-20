import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { MasterPage, MasterConfig, MasterToolbarAction } from '../shared/master-page/master-page';
import {
  AdministrationService,
  BillingMasterService,
  ProductDto,
  CreateProductRequest,
  UpdateProductRequest,
} from '../../core/services/master_service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { Action } from '../../core/models';
import { PermissionService } from '../../core/services/permission.service';
import { buildScopeLabel } from '../shared/scope-label';

@Component({
  selector: 'app-product',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, MasterPage],
  templateUrl: './product.html',
  styleUrl: './product.css',
})
export class ProductPage implements OnInit {
  private readonly admin = inject(AdministrationService);
  private readonly billing = inject(BillingMasterService);
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);
  private readonly auth = inject(AuthService);
  private defaultCompanyId = 0;

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showEntry = signal(false);
  protected readonly rows = signal<ProductDto[]>([]);
  protected readonly editing = signal<ProductDto | null>(null);

  protected userModel: Record<string, any> = {};

  /** hsnSacId -> HsnSacDto lookup for auto-loading the tax from the selected HSN/SAC. */
  private readonly hsnMap = new Map<number, any>();

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
      { name: 'General', fields: ['productCode', 'productName', 'categoryId', 'subCategoryId', 'brandId', 'uomId', 'companyId', 'branchId', 'warehouseId', 'sku', 'barcode', 'hsnSacId'] },
      { name: 'Pricing', fields: ['mrp', 'purchasePrice', 'salesPrice', 'taxId'] },
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
      { field: 'warehouseName', header: 'Warehouse' },
      { field: 'salesPrice', header: 'Sales Price', width: '110px' },
      { field: 'isActive', header: 'Active', type: 'checkbox', width: '90px' },
    ],
    fields: [
      { name: 'productCode', label: 'Product Code', type: 'text', required: true, maxLength: 30, readonly: true },
      { name: 'productName', label: 'Product Name', type: 'text', required: true, maxLength: 200 },
      { name: 'categoryId', label: 'Category', type: 'dropdown', options: [] },
      { name: 'subCategoryId', label: 'Sub Category', type: 'dropdown', options: [] },
      { name: 'brandId', label: 'Brand', type: 'dropdown', options: [] },
      { name: 'uomId', label: 'UOM', type: 'dropdown', required: true, options: [] },
      { name: 'companyId', label: 'Company', type: 'dropdown', required: true, options: [] },
      { name: 'branchId', label: 'Branch', type: 'dropdown', options: [] },
      { name: 'warehouseId', label: 'Warehouse', type: 'dropdown', options: [] },
      { name: 'sku', label: 'SKU', type: 'text', maxLength: 50 },
      { name: 'barcode', label: 'Barcode', type: 'text', maxLength: 100 },
      { name: 'hsnSacId', label: 'HSN/SAC', type: 'dropdown', options: [] },
      { name: 'mrp', label: 'MRP', type: 'number' },
      { name: 'purchasePrice', label: 'Purchase Price', type: 'number' },
      { name: 'salesPrice', label: 'Sales Price', type: 'number' },
      { name: 'taxId', label: 'Tax', type: 'dropdown', options: [] },
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
    void this.loadDropdowns().then(() => this.load());
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
    const headers = ['productCode', 'productName', 'categoryName', 'subCategoryName', 'brandName', 'uomName', 'warehouseName', 'salesPrice', 'isActive'];
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
      if (!this.defaultCompanyId) {
        this.rows.set([]);
        return;
      }
      const res = await this.admin.products.getPaged(1, 100, '', this.defaultCompanyId);
      this.rows.set(res.items ?? []);
    } catch {
    } finally {
      this.loading.set(false);
    }
  }

  private async loadDropdowns(): Promise<void> {
    try {
      const [cats, subs, brands, units, hsns, whs] = await Promise.all([
        this.admin.productCategories.getPaged(1, 1000, ''),
        this.admin.productSubCategories.getPaged(1, 1000, ''),
        this.admin.productBrands.getPaged(1, 1000, ''),
        this.admin.productUnits.getPaged(1, 1000, ''),
        this.billing.hsnSacs.getPaged(1, 1000, ''),
        this.admin.warehouses.getAll(),
      ]);
      this.setOptions('categoryId', (cats.items ?? []).map((c: any) => ({ value: c.id, label: c.categoryName })));
      this.setOptions('subCategoryId', (subs.items ?? []).map((s: any) => ({ value: s.id, label: s.subCategoryName })));
      this.setOptions('brandId', (brands.items ?? []).map((b: any) => ({ value: b.id, label: b.brandName })));
      this.setOptions('uomId', (units.items ?? []).map((u: any) => ({ value: u.id, label: u.unitName })));
      this.setOptions('warehouseId', (whs ?? []).map((w: any) => ({ value: w.id, label: w.warehouseName })));
      this.hsnMap.clear();
      (hsns.items ?? []).forEach((h: any) => this.hsnMap.set(h.hsnSacId, h));
      this.setOptions('hsnSacId', (hsns.items ?? []).map((h: any) => ({ value: h.hsnSacId, label: h.code })));
    } catch {
    }
    try {
      // Company options come from the current user's role-based Data Scope.
      const roleNames = this.auth.user()?.roles ?? [];
      const { companies, branches } = await this.perm.loadMyDataScopeOptions(roleNames);

      const companyOptions = companies.map((c) => ({ value: c.id, label: c.name }));
      if (companies.length > 0) {
        this.defaultCompanyId = companies[0].id;
      }

      const { scopeLabel, noAccess } = buildScopeLabel({ companies, branches });
      this.config = { ...this.config, scopeLabel, noAccess };

      this.setOptions('companyId', companyOptions);
    } catch {
    }
    try {
      const taxes = await this.admin.taxes.getPaged(1, 1000, '');
      this.setOptions('taxId', (taxes.items ?? []).map((t: any) => ({ value: t.id, label: t.taxName })));
    } catch {
    }
  }

  protected onFieldChange(evt: { name: string; value: any }): void {
    if (evt.name === 'companyId') {
      void this.loadBranches(evt.value);
    } else if (evt.name === 'hsnSacId') {
      // Auto-load the tax mapped on the HSN/SAC master.
      const hsn = evt.value != null ? this.hsnMap.get(evt.value) : null;
      this.userModel['taxId'] = hsn?.taxId ?? null;
    }
  }

  private async loadBranches(companyId: any): Promise<void> {
    this.setOptions('branchId', []);
    if (!companyId) return;
    try {
      const res: any = await firstValueFrom(
        this.http.get(`/api/organization/branches?companyId=${companyId}&page=1&size=1000`),
      );
      const branches: any[] = res?.items ?? [];
      this.setOptions('branchId', branches.map((b: any) => ({ value: b.id, label: b.branchName })));
    } catch {
      this.setOptions('branchId', []);
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
      nextCode = await firstValueFrom(this.http.get<string>('/api/products/next-code'));
    } catch {
      /* code will be generated server-side on save */
    }
    let companyId: any = this.defaultCompanyId || null;
    this.userModel = {
      productCode: nextCode,
      productName: '',
      categoryId: null,
      subCategoryId: null,
      brandId: null,
      uomId: null,
      companyId,
      branchId: null,
      warehouseId: null,
      sku: '',
      barcode: '',
      mrp: null,
      purchasePrice: null,
      salesPrice: null,
      taxId: null,
      hsnSacId: null,
      isStockItem: true,
      isSaleable: true,
      isPurchaseable: true,
      description: '',
      isActive: true,
      files: [],
    };
    this.config = { ...this.config, tabs: this.withFileTab() };
    this.showEntry.set(true);
    void this.loadBranches(companyId);
  }

  protected async editRow(row: Record<string, any>): Promise<void> {
    this.editing.set(row as ProductDto);
    this.userModel = {
      ...row,
      files: [],
    };
    this.config = { ...this.config, tabs: this.withFileTab() };
    this.showEntry.set(true);
    void this.loadBranches(row['companyId']);

    const entityId = row['entityId'] ?? row['EntityId'];
    if (entityId == null) return;
    try {
      const entity = await this.loadEntity(entityId);
      if (entity) {
        this.userModel['files'] = entity.files ?? [];
      }
    } catch {
      /* entity fetch is optional; tab stays empty */
    }
  }

  private async loadEntity(entityId: number): Promise<any | null> {
    const res: any = await firstValueFrom(this.http.get(`/api/entities/${entityId}`));
    return res ?? null;
  }

  private withFileTab() {
    const tabs = this.config.tabs;
    if (tabs.some(t => t.entity)) return tabs;
    return [...tabs, {
      name: 'File',
      fields: [] as string[],
      entity: true as const,
      entitySections: ['files'],
      entityType: 'PRODUCT',
    }];
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const editing = this.editing();

      let entityId: number | null = this.userModel['entityId'] ?? this.userModel['EntityId'] ?? null;
      if (!editing && entityId == null && (this.userModel['files']?.length > 0)) {
        const entityPayload: any = {
          entityType: 'PRODUCT',
          entityCode: this.userModel['productCode']?.trim().toUpperCase(),
          entityName: this.userModel['productName']?.trim(),
          isActive: true,
          files: this.userModel['files'] ?? [],
        };
        const entity: any = await firstValueFrom(this.http.post('/api/entities', entityPayload));
        entityId = entity?.entityId ?? entity?.EntityId ?? null;
      }

      const payload: CreateProductRequest = {
        productCode: this.userModel['productCode']?.trim().toUpperCase(),
        productName: this.userModel['productName']?.trim(),
        companyId: this.userModel['companyId'] || 0,
        entityId,
        categoryId: this.userModel['categoryId'] || null,
        subCategoryId: this.userModel['subCategoryId'] || null,
        brandId: this.userModel['brandId'] || null,
        uomId: this.userModel['uomId'],
        branchId: this.userModel['branchId'] || null,
        warehouseId: this.userModel['warehouseId'] || null,
        sku: this.userModel['sku'] || null,
        barcode: this.userModel['barcode'] || null,
        mrp: this.userModel['mrp'] ?? null,
        purchasePrice: this.userModel['purchasePrice'] ?? null,
        salesPrice: this.userModel['salesPrice'] ?? null,
        taxId: this.userModel['taxId'] || null,
        hsnSacId: this.userModel['hsnSacId'] || null,
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
