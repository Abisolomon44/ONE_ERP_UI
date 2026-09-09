import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MasterPage, MasterConfig } from '../shared/master-page/master-page';
import { MasterRow } from '../shared/master.model';
import {
  AdministrationService,
  BillingMasterService,
  PriceListDto,
  PriceListDetailDto,
  CreatePriceListRequest,
  UpdatePriceListRequest,
  CreatePriceListDetailRequest,
} from '../../core/services/master_service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionService } from '../../core/services/permission.service';

export interface DropdownOption {
  value: any;
  label: string;
}

export interface PriceListDetailRow {
  key: string;
  priceListDetailId: number;
  productId: number | null;
  unitId: number | null;
  price: number;
  minimumQuantity: number;
  maximumQuantity: number | null;
}

@Component({
  selector: 'app-price-list',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, MasterPage],
  templateUrl: './price-list.html',
  styleUrl: './price-list.css',
})
export class PriceListPage implements OnInit {
  private readonly admin = inject(AdministrationService);
  private readonly billing = inject(BillingMasterService);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showEntry = signal(false);
  protected readonly rows = signal<MasterRow[]>([]);
  protected readonly editing = signal<PriceListDto | null>(null);

  protected readonly detailRows = signal<PriceListDetailRow[]>([]);
  protected readonly detailSaving = signal(false);

  protected productOptions: DropdownOption[] = [];
  protected unitOptions: DropdownOption[] = [];

  protected userModel: Record<string, any> = {};

  protected config: MasterConfig = {
    title: 'Price Lists',
    description: 'Manage price lists and their pricing details',
    icon: 'List',
    api: '/api/price-lists',
    permissionName: 'price-lists',
    createLabel: 'New Price List',
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    allowImport: false,
    allowExport: false,
    allowRefresh: true,
    tabs: [
      { name: 'General', fields: ['code', 'name', 'priceTypeId', 'currencyId', 'effectiveFrom', 'effectiveTo', 'isDefault'] },
      { name: 'Status', fields: ['description', 'isActive'] },
    ],
    columns: [
      { field: 'code', header: 'Code', width: '110px' },
      { field: 'name', header: 'Name' },
      { field: 'priceTypeName', header: 'Price Type' },
      { field: 'currencyName', header: 'Currency' },
      { field: 'effectiveFrom', header: 'Valid From', type: 'date', width: '120px' },
      { field: 'isDefault', header: 'Default', type: 'checkbox', width: '90px' },
      { field: 'isActive', header: 'Active', type: 'checkbox', width: '90px' },
    ],
    fields: [
      { name: 'code', label: 'Price List Code', type: 'text', required: true, maxLength: 30, readonly: true },
      { name: 'name', label: 'Price List Name', type: 'text', required: true, maxLength: 100 },
      { name: 'priceTypeId', label: 'Price Type', type: 'dropdown', required: true, options: [] },
      { name: 'currencyId', label: 'Currency', type: 'dropdown', required: true, options: [] },
      { name: 'effectiveFrom', label: 'Valid From', type: 'date' },
      { name: 'effectiveTo', label: 'Valid To', type: 'date' },
      { name: 'description', label: 'Description', type: 'textarea', maxLength: 300 },
      { name: 'isDefault', label: 'Default', type: 'checkbox' },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  };

  ngOnInit(): void {
    if (!this.perm.has('price-lists.view')) {
      this.loading.set(false);
      return;
    }
    void this.loadDropdowns();
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      if (!this.perm.has('price-lists.view')) {
        this.rows.set([]);
        return;
      }
      const res = await this.billing.priceLists.getPaged(1, 100, '');
      this.rows.set((res.items ?? []).map((x) => ({ ...x, id: x.priceListId }) as MasterRow));
    } catch {
    } finally {
      this.loading.set(false);
    }
  }

  private async loadDropdowns(): Promise<void> {
    try {
      const [priceTypes, products, units] = await Promise.all([
        this.billing.priceTypes.getAll(true),
        this.admin.products.getPaged(1, 1000, ''),
        this.admin.productUnits.getPaged(1, 1000, ''),
      ]);
      this.setOptions('priceTypeId', (priceTypes ?? []).map((p) => ({ value: p.priceTypeId, label: p.name })));
      this.productOptions = (products.items ?? []).map((p) => ({ value: p.id, label: p.productName }));
      this.unitOptions = (units.items ?? []).map((u) => ({ value: u.id, label: u.unitName }));
    } catch {
    }
    try {
      const currencies = await this.admin.currency.getAll(false);
      this.setOptions('currencyId', (currencies ?? []).map((c: any) => ({ value: c.id, label: c.currencyName || c.currencyCode })));
    } catch {
    }
  }

  private setOptions(fieldName: string, options: DropdownOption[]): void {
    const field = this.config.fields.find((f) => f.name === fieldName);
    if (field) field.options = options;
  }

  protected async createRow(): Promise<void> {
    this.editing.set(null);
    this.detailRows.set([]);
    let nextCode = '';
    try {
      nextCode = await this.billing.priceLists.getNextCode();
    } catch {
      /* code will be generated server-side on save */
    }
    this.userModel = {
      code: nextCode,
      name: '',
      priceTypeId: null,
      currencyId: null,
      description: '',
      effectiveFrom: '',
      effectiveTo: '',
      isDefault: false,
      isActive: true,
    };
    this.showEntry.set(true);
  }

  protected async editRow(row: Record<string, any>): Promise<void> {
    this.editing.set(row as PriceListDto);
    this.userModel = { ...row };
    this.showEntry.set(true);
    await this.loadDetails(row['priceListId']);
  }

  protected async loadDetails(priceListId: number): Promise<void> {
    try {
      const details = await this.billing.priceLists.getDetails(priceListId);
      this.detailRows.set(
        (details ?? []).map<PriceListDetailRow>((d) => ({
          key: crypto.randomUUID(),
          priceListDetailId: d.priceListDetailId,
          productId: d.productId,
          unitId: d.unitId ?? null,
          price: d.price,
          minimumQuantity: d.minimumQuantity,
          maximumQuantity: d.maximumQuantity ?? null,
        })),
      );
    } catch {
      this.detailRows.set([]);
    }
  }

  protected addDetailRow(): void {
    this.detailRows.update((rows) => [
      ...rows,
      { key: crypto.randomUUID(), priceListDetailId: 0, productId: null, unitId: null, price: 0, minimumQuantity: 1, maximumQuantity: null },
    ]);
  }

  protected removeDetailRow(row: PriceListDetailRow): void {
    this.detailRows.update((rows) => rows.filter((r) => r.key !== row.key));
  }

  protected async saveDetails(): Promise<void> {
    const editing = this.editing();
    if (!editing || this.detailSaving()) return;
    if (!this.perm.has('price-lists.edit')) return;
    this.detailSaving.set(true);
    try {
      const items: CreatePriceListDetailRequest[] = this.detailRows()
        .filter((r): r is PriceListDetailRow & { productId: number } => r.productId != null)
        .map((r) => ({
          priceListId: editing.priceListId,
          productId: r.productId,
          unitId: r.unitId ?? null,
          price: r.price ?? 0,
          minimumQuantity: r.minimumQuantity ?? 1,
          maximumQuantity: r.maximumQuantity ?? null,
        }));
      await this.billing.priceLists.replaceDetails(editing.priceListId, items);
      this.toast.success(`Saved ${items.length} detail line${items.length === 1 ? '' : 's'}`);
      await this.loadDetails(editing.priceListId);
    } catch (e: any) {
      this.toast.error('Failed to save details', e?.error?.message ?? e?.message ?? '');
    } finally {
      this.detailSaving.set(false);
    }
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const editing = this.editing();
      const payload: CreatePriceListRequest = {
        code: this.userModel['code']?.trim().toUpperCase(),
        name: this.userModel['name']?.trim(),
        priceTypeId: this.userModel['priceTypeId'],
        currencyId: this.userModel['currencyId'],
        description: this.userModel['description'] || null,
        effectiveFrom: this.userModel['effectiveFrom'] || null,
        effectiveTo: this.userModel['effectiveTo'] || null,
        isDefault: this.userModel['isDefault'] ?? false,
      };
      if (editing) {
        const updatePayload: UpdatePriceListRequest = {
          ...payload,
          effectiveFrom: this.userModel['effectiveFrom'] || null,
          effectiveTo: this.userModel['effectiveTo'] || null,
          isDefault: this.userModel['isDefault'] ?? false,
          isActive: this.userModel['isActive'],
        };
        await this.billing.priceLists.update(editing.priceListId, updatePayload);
      } else {
        await this.billing.priceLists.create(payload);
      }
      this.showEntry.set(false);
      await this.load();
    } catch {
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteRow(row: Record<string, any>): Promise<void> {
    if (!confirm(`Delete price list "${row['name']}"? This cannot be undone.`)) return;
    try {
      await this.billing.priceLists.delete(row['priceListId']);
      await this.load();
    } catch {
    }
  }

  protected cancel(): void {
    this.showEntry.set(false);
    this.detailRows.set([]);
  }

  protected refresh(): void {
    void this.load();
  }
}