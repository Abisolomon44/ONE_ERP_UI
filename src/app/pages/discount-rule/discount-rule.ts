import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MasterPage, MasterConfig, DropdownOption } from '../shared/master-page/master-page';
import { MasterRow } from '../shared/master.model';
import {
  AdministrationService,
  BillingMasterService,
  DiscountRuleDto,
  CreateDiscountRuleRequest,
  UpdateDiscountRuleRequest,
} from '../../core/services/master_service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionService } from '../../core/services/permission.service';

@Component({
  selector: 'app-discount-rule',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, MasterPage],
  templateUrl: './discount-rule.html',
  styleUrl: './discount-rule.css',
})
export class DiscountRulePage implements OnInit {
  private readonly admin = inject(AdministrationService);
  private readonly billing = inject(BillingMasterService);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showEntry = signal(false);
  protected readonly rows = signal<MasterRow[]>([]);
  protected readonly editing = signal<DiscountRuleDto | null>(null);

  protected userModel: Record<string, any> = {};

  protected config: MasterConfig = {
    title: 'Discount Rules',
    description: 'Manage discount rules applied to products, services, or categories',
    icon: 'Percent',
    api: '/api/discount-rules',
    permissionName: 'discount-rules',
    createLabel: 'New Discount Rule',
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    allowImport: false,
    allowExport: false,
    allowRefresh: true,
    tabs: [
      { name: 'General', fields: ['code', 'name', 'discountType', 'discountValue', 'productId', 'serviceId', 'productCategoryId', 'priceListId'] },
      { name: 'Conditions', fields: ['minimumQuantity', 'minimumAmount', 'maximumDiscount', 'effectiveFrom', 'effectiveTo'] },
      { name: 'Status', fields: ['isActive'] },
    ],
    columns: [
      { field: 'code', header: 'Code', width: '110px' },
      { field: 'name', header: 'Name' },
      { field: 'productName', header: 'Product' },
      { field: 'serviceName', header: 'Service' },
      { field: 'productCategoryName', header: 'Category' },
      { field: 'discountType', header: 'Type', width: '120px' },
      { field: 'discountValue', header: 'Value', type: 'number', width: '100px' },
      { field: 'effectiveFrom', header: 'Valid From', type: 'date', width: '120px' },
      { field: 'isActive', header: 'Active', type: 'checkbox', width: '90px' },
    ],
    fields: [
      { name: 'code', label: 'Rule Code', type: 'text', required: true, maxLength: 30, readonly: true },
      { name: 'name', label: 'Rule Name', type: 'text', required: true, maxLength: 150 },
      { name: 'discountType', label: 'Discount Type', type: 'dropdown', required: true, options: [
        { value: 'PERCENTAGE', label: 'Percentage (%)' },
        { value: 'AMOUNT', label: 'Amount' },
      ] },
      { name: 'discountValue', label: 'Discount Value', type: 'number', required: true },
      { name: 'productId', label: 'Product', type: 'dropdown', options: [] },
      { name: 'serviceId', label: 'Service', type: 'dropdown', options: [] },
      { name: 'productCategoryId', label: 'Product Category', type: 'dropdown', options: [] },
      { name: 'priceListId', label: 'Price List', type: 'dropdown', options: [] },
      { name: 'minimumQuantity', label: 'Min Quantity', type: 'number' },
      { name: 'minimumAmount', label: 'Min Amount', type: 'number' },
      { name: 'maximumDiscount', label: 'Max Discount', type: 'number' },
      { name: 'effectiveFrom', label: 'Valid From', type: 'date' },
      { name: 'effectiveTo', label: 'Valid To', type: 'date' },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  };

  ngOnInit(): void {
    if (!this.perm.has('discount-rules.view')) {
      this.loading.set(false);
      return;
    }
    void this.loadDropdowns();
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      if (!this.perm.has('discount-rules.view')) {
        this.rows.set([]);
        return;
      }
      const res = await this.billing.discountRules.getPaged(1, 100, '');
      this.rows.set((res.items ?? []).map((x) => ({ ...x, id: x.discountRuleId }) as MasterRow));
    } catch {
    } finally {
      this.loading.set(false);
    }
  }

  private async loadDropdowns(): Promise<void> {
    try {
      const [products, services, categories, priceLists] = await Promise.all([
        this.admin.products.getPaged(1, 1000, ''),
        this.billing.services.getPaged(1, 1000, ''),
        this.admin.productCategories.getPaged(1, 1000, ''),
        this.billing.priceLists.getPaged(1, 1000, ''),
      ]);
      this.setOptions('productId', (products.items ?? []).map((p) => ({ value: p.id, label: p.productName })));
      this.setOptions('serviceId', (services.items ?? []).map((s) => ({ value: s.serviceId, label: s.name })));
      this.setOptions('productCategoryId', (categories.items ?? []).map((c) => ({ value: c.id, label: c.categoryName })));
      this.setOptions('priceListId', (priceLists.items ?? []).map((p) => ({ value: p.priceListId, label: p.name })));
    } catch {
    }
  }

  private setOptions(fieldName: string, options: DropdownOption[]): void {
    const field = this.config.fields.find((f) => f.name === fieldName);
    if (field) field.options = options;
  }

  protected async createRow(): Promise<void> {
    this.editing.set(null);
    let nextCode = '';
    try {
      nextCode = await this.billing.discountRules.getNextCode();
    } catch {
      /* code will be generated server-side on save */
    }
    this.userModel = {
      code: nextCode,
      name: '',
      discountType: 'PERCENTAGE',
      discountValue: 0,
      productId: null,
      serviceId: null,
      productCategoryId: null,
      priceListId: null,
      minimumQuantity: null,
      minimumAmount: null,
      maximumDiscount: null,
      effectiveFrom: '',
      effectiveTo: '',
      isActive: true,
    };
    this.showEntry.set(true);
  }

  protected editRow(row: Record<string, any>): void {
    this.editing.set(row as DiscountRuleDto);
    this.userModel = { ...row };
    this.showEntry.set(true);
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const editing = this.editing();
      const payload: CreateDiscountRuleRequest = {
        code: this.userModel['code']?.trim().toUpperCase(),
        name: this.userModel['name']?.trim(),
        discountType: this.userModel['discountType'],
        discountValue: this.userModel['discountValue'] ?? 0,
        productId: this.userModel['productId'] ?? null,
        serviceId: this.userModel['serviceId'] ?? null,
        productCategoryId: this.userModel['productCategoryId'] ?? null,
        priceListId: this.userModel['priceListId'] ?? null,
        minimumQuantity: this.userModel['minimumQuantity'] ?? null,
        minimumAmount: this.userModel['minimumAmount'] ?? null,
        maximumDiscount: this.userModel['maximumDiscount'] ?? null,
        effectiveFrom: this.userModel['effectiveFrom'] || null,
        effectiveTo: this.userModel['effectiveTo'] || null,
      };
      if (editing) {
        const updatePayload: UpdateDiscountRuleRequest = {
          ...payload,
          effectiveFrom: this.userModel['effectiveFrom'] || null,
          effectiveTo: this.userModel['effectiveTo'] || null,
          isActive: this.userModel['isActive'],
        };
        await this.billing.discountRules.update(editing.discountRuleId, updatePayload);
      } else {
        await this.billing.discountRules.create(payload);
      }
      this.showEntry.set(false);
      await this.load();
    } catch {
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteRow(row: Record<string, any>): Promise<void> {
    if (!confirm(`Delete discount rule "${row['name']}"? This cannot be undone.`)) return;
    try {
      await this.billing.discountRules.delete(row['discountRuleId']);
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