import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MasterPage, MasterConfig, DropdownOption } from '../shared/master-page/master-page';
import { MasterRow } from '../shared/master.model';
import {
  AdministrationService,
  BillingMasterService,
  OfferDto,
  OfferDetailDto,
  CreateOfferRequest,
  UpdateOfferRequest,
  CreateOfferDetailRequest,
} from '../../core/services/master_service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionService } from '../../core/services/permission.service';

export interface OfferDetailRow {
  key: string;
  offerDetailId: number;
  productId: number | null;
  serviceId: number | null;
  productCategoryId: number | null;
  minimumQuantity: number | null;
  freeQuantity: number | null;
}

@Component({
  selector: 'app-offer',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, MasterPage],
  templateUrl: './offer.html',
  styleUrl: './offer.css',
})
export class OfferPage implements OnInit {
  private readonly admin = inject(AdministrationService);
  private readonly billing = inject(BillingMasterService);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showEntry = signal(false);
  protected readonly rows = signal<MasterRow[]>([]);
  protected readonly editing = signal<OfferDto | null>(null);

  protected readonly detailRows = signal<OfferDetailRow[]>([]);
  protected readonly detailSaving = signal(false);

  protected productOptions: DropdownOption[] = [];
  protected serviceOptions: DropdownOption[] = [];
  protected categoryOptions: DropdownOption[] = [];

  protected userModel: Record<string, any> = {};

  protected config: MasterConfig = {
    title: 'Offers',
    description: 'Manage promotional offers and the products, services, or categories they apply to',
    icon: 'Tags',
    api: '/api/offers',
    permissionName: 'offers',
    createLabel: 'New Offer',
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    allowImport: false,
    allowExport: false,
    allowRefresh: true,
    tabs: [
      { name: 'General', fields: ['code', 'name', 'offerType', 'discountType', 'discountValue', 'minimumQuantity', 'minimumAmount', 'maximumDiscount'] },
      { name: 'Schedule', fields: ['startDate', 'endDate'] },
      { name: 'Status', fields: ['description', 'isActive'] },
    ],
    columns: [
      { field: 'code', header: 'Code', width: '110px' },
      { field: 'name', header: 'Name' },
      { field: 'offerType', header: 'Type' },
      { field: 'discountType', header: 'Discount', width: '100px' },
      { field: 'discountValue', header: 'Value', type: 'number', width: '100px' },
      { field: 'startDate', header: 'Starts', type: 'date', width: '120px' },
      { field: 'endDate', header: 'Ends', type: 'date', width: '120px' },
      { field: 'isActive', header: 'Active', type: 'checkbox', width: '90px' },
    ],
    fields: [
      { name: 'code', label: 'Offer Code', type: 'text', required: true, maxLength: 30, readonly: true },
      { name: 'name', label: 'Offer Name', type: 'text', required: true, maxLength: 150 },
      { name: 'offerType', label: 'Offer Type', type: 'text', required: true, maxLength: 30 },
      { name: 'discountType', label: 'Discount Type', type: 'dropdown', options: [
        { value: 'PERCENTAGE', label: 'Percentage (%)' },
        { value: 'AMOUNT', label: 'Amount' },
      ] },
      { name: 'discountValue', label: 'Discount Value', type: 'number' },
      { name: 'minimumQuantity', label: 'Min Quantity', type: 'number' },
      { name: 'minimumAmount', label: 'Min Amount', type: 'number' },
      { name: 'maximumDiscount', label: 'Max Discount', type: 'number' },
      { name: 'startDate', label: 'Start Date', type: 'date', required: true },
      { name: 'endDate', label: 'End Date', type: 'date' },
      { name: 'description', label: 'Description', type: 'textarea', maxLength: 500 },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  };

  ngOnInit(): void {
    if (!this.perm.has('offers.view')) {
      this.loading.set(false);
      return;
    }
    void this.loadDropdowns();
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      if (!this.perm.has('offers.view')) {
        this.rows.set([]);
        return;
      }
      const res = await this.billing.offers.getPaged(1, 100, '');
      this.rows.set((res.items ?? []).map((x) => ({ ...x, id: x.offerId }) as MasterRow));
    } catch {
    } finally {
      this.loading.set(false);
    }
  }

  private async loadDropdowns(): Promise<void> {
    try {
      const [products, services, categories] = await Promise.all([
        this.admin.products.getPaged(1, 1000, ''),
        this.billing.services.getPaged(1, 1000, ''),
        this.admin.productCategories.getPaged(1, 1000, ''),
      ]);
      this.productOptions = (products.items ?? []).map((p) => ({ value: p.id, label: p.productName }));
      this.serviceOptions = (services.items ?? []).map((s) => ({ value: s.serviceId, label: s.name }));
      this.categoryOptions = (categories.items ?? []).map((c) => ({ value: c.id, label: c.categoryName }));
    } catch {
    }
  }

  protected async createRow(): Promise<void> {
    this.editing.set(null);
    this.detailRows.set([]);
    let nextCode = '';
    try {
      nextCode = await this.billing.offers.getNextCode();
    } catch {
      /* code will be generated server-side on save */
    }
    this.userModel = {
      code: nextCode,
      name: '',
      offerType: '',
      discountType: null,
      discountValue: null,
      minimumQuantity: null,
      minimumAmount: null,
      maximumDiscount: null,
      startDate: '',
      endDate: '',
      description: '',
      isActive: true,
    };
    this.showEntry.set(true);
  }

  protected async editRow(row: Record<string, any>): Promise<void> {
    this.editing.set(row as OfferDto);
    this.userModel = { ...row };
    this.showEntry.set(true);
    await this.loadDetails(row['offerId']);
  }

  protected async loadDetails(offerId: number): Promise<void> {
    try {
      const details = await this.billing.offers.getDetails(offerId);
      this.detailRows.set(
        (details ?? []).map<OfferDetailRow>((d: OfferDetailDto) => ({
          key: crypto.randomUUID(),
          offerDetailId: d.offerDetailId,
          productId: d.productId ?? null,
          serviceId: d.serviceId ?? null,
          productCategoryId: d.productCategoryId ?? null,
          minimumQuantity: d.minimumQuantity ?? null,
          freeQuantity: d.freeQuantity ?? null,
        })),
      );
    } catch {
      this.detailRows.set([]);
    }
  }

  protected addDetailRow(): void {
    this.detailRows.update((rows) => [
      ...rows,
      { key: crypto.randomUUID(), offerDetailId: 0, productId: null, serviceId: null, productCategoryId: null, minimumQuantity: null, freeQuantity: null },
    ]);
  }

  protected removeDetailRow(row: OfferDetailRow): void {
    this.detailRows.update((rows) => rows.filter((r) => r.key !== row.key));
  }

  protected async saveDetails(): Promise<void> {
    const editing = this.editing();
    if (!editing || this.detailSaving()) return;
    if (!this.perm.has('offers.edit')) return;
    this.detailSaving.set(true);
    try {
      const items: CreateOfferDetailRequest[] = this.detailRows()
        .filter((r) => r.productId != null || r.serviceId != null || r.productCategoryId != null)
        .map((r) => ({
          offerId: editing.offerId,
          productId: r.productId ?? null,
          serviceId: r.serviceId ?? null,
          productCategoryId: r.productCategoryId ?? null,
          minimumQuantity: r.minimumQuantity ?? null,
          freeQuantity: r.freeQuantity ?? null,
        }));
      await this.billing.offers.replaceDetails(editing.offerId, items);
      this.toast.success(`Saved ${items.length} detail line${items.length === 1 ? '' : 's'}`);
      await this.loadDetails(editing.offerId);
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
      const payload: CreateOfferRequest = {
        code: this.userModel['code']?.trim().toUpperCase(),
        name: this.userModel['name']?.trim(),
        offerType: this.userModel['offerType']?.trim(),
        startDate: this.userModel['startDate'],
        discountType: this.userModel['discountType'] || null,
        discountValue: this.userModel['discountValue'] ?? null,
        minimumQuantity: this.userModel['minimumQuantity'] ?? null,
        minimumAmount: this.userModel['minimumAmount'] ?? null,
        maximumDiscount: this.userModel['maximumDiscount'] ?? null,
        endDate: this.userModel['endDate'] || null,
        description: this.userModel['description'] || null,
      };
      if (editing) {
        const updatePayload: UpdateOfferRequest = {
          ...payload,
          endDate: this.userModel['endDate'] || null,
          description: this.userModel['description'] || null,
          isActive: this.userModel['isActive'],
        };
        await this.billing.offers.update(editing.offerId, updatePayload);
      } else {
        await this.billing.offers.create(payload);
      }
      this.showEntry.set(false);
      await this.load();
    } catch {
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteRow(row: Record<string, any>): Promise<void> {
    if (!confirm(`Delete offer "${row['name']}"? This cannot be undone.`)) return;
    try {
      await this.billing.offers.delete(row['offerId']);
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