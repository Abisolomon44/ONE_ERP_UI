import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MasterPage, MasterConfig } from '../shared/master-page/master-page';
import { MasterRow } from '../shared/master.model';
import {
  BillingMasterService,
  CouponDto,
  CreateCouponRequest,
  UpdateCouponRequest,
} from '../../core/services/master_service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionService } from '../../core/services/permission.service';

@Component({
  selector: 'app-coupon',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, MasterPage],
  templateUrl: './coupon.html',
  styleUrl: './coupon.css',
})
export class CouponPage implements OnInit {
  private readonly billing = inject(BillingMasterService);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showEntry = signal(false);
  protected readonly rows = signal<MasterRow[]>([]);
  protected readonly editing = signal<CouponDto | null>(null);

  protected userModel: Record<string, any> = {};

  protected config: MasterConfig = {
    title: 'Coupons',
    description: 'Manage promotional coupon codes linked to offers',
    icon: 'Ticket',
    api: '/api/coupons',
    permissionName: 'coupons',
    createLabel: 'New Coupon',
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    allowImport: false,
    allowExport: false,
    allowRefresh: true,
    tabs: [
      { name: 'General', fields: ['code', 'offerId', 'name', 'startDate', 'endDate'] },
      { name: 'Usage', fields: ['usageLimit', 'usagePerCustomer'] },
      { name: 'Status', fields: ['isActive'] },
    ],
    columns: [
      { field: 'code', header: 'Code', width: '130px' },
      { field: 'offerName', header: 'Offer' },
      { field: 'name', header: 'Name' },
      { field: 'usageLimit', header: 'Usage Limit', type: 'number', width: '110px' },
      { field: 'startDate', header: 'Starts', type: 'date', width: '120px' },
      { field: 'endDate', header: 'Ends', type: 'date', width: '120px' },
      { field: 'isActive', header: 'Active', type: 'checkbox', width: '90px' },
    ],
    fields: [
      { name: 'code', label: 'Coupon Code', type: 'text', required: true, maxLength: 50, readonly: true },
      { name: 'offerId', label: 'Offer', type: 'dropdown', required: true, options: [] },
      { name: 'name', label: 'Name', type: 'text', maxLength: 150 },
      { name: 'startDate', label: 'Start Date', type: 'date', required: true },
      { name: 'endDate', label: 'End Date', type: 'date' },
      { name: 'usageLimit', label: 'Usage Limit', type: 'number' },
      { name: 'usagePerCustomer', label: 'Usage Per Customer', type: 'number' },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  };

  ngOnInit(): void {
    if (!this.perm.has('coupons.view')) {
      this.loading.set(false);
      return;
    }
    void this.loadDropdowns();
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      if (!this.perm.has('coupons.view')) {
        this.rows.set([]);
        return;
      }
      const res = await this.billing.coupons.getPaged(1, 100, '');
      this.rows.set((res.items ?? []).map((x) => ({ ...x, id: x.couponId }) as MasterRow));
    } catch {
    } finally {
      this.loading.set(false);
    }
  }

  private async loadDropdowns(): Promise<void> {
    try {
      const offers = await this.billing.offers.getPaged(1, 1000, '');
      const field = this.config.fields.find((f) => f.name === 'offerId');
      if (field) {
        field.options = (offers.items ?? []).map((o) => ({ value: o.offerId, label: `${o.code} - ${o.name}` }));
      }
    } catch {
    }
  }

  protected async createRow(): Promise<void> {
    this.editing.set(null);
    let nextCode = '';
    try {
      nextCode = await this.billing.coupons.getNextCode();
    } catch {
      /* code will be generated server-side on save */
    }
    this.userModel = {
      code: nextCode,
      offerId: null,
      name: '',
      startDate: '',
      endDate: '',
      usageLimit: null,
      usagePerCustomer: null,
      isActive: true,
    };
    this.showEntry.set(true);
  }

  protected editRow(row: Record<string, any>): void {
    this.editing.set(row as CouponDto);
    this.userModel = { ...row };
    this.showEntry.set(true);
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const editing = this.editing();
      const payload: CreateCouponRequest = {
        code: this.userModel['code']?.trim().toUpperCase(),
        offerId: this.userModel['offerId'],
        startDate: this.userModel['startDate'],
        name: this.userModel['name']?.trim() || null,
        usageLimit: this.userModel['usageLimit'] ?? null,
        usagePerCustomer: this.userModel['usagePerCustomer'] ?? null,
        endDate: this.userModel['endDate'] || null,
      };
      if (editing) {
        const updatePayload: UpdateCouponRequest = {
          ...payload,
          endDate: this.userModel['endDate'] || null,
          isActive: this.userModel['isActive'],
        };
        await this.billing.coupons.update(editing.couponId, updatePayload);
      } else {
        await this.billing.coupons.create(payload);
      }
      this.showEntry.set(false);
      await this.load();
    } catch {
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteRow(row: Record<string, any>): Promise<void> {
    if (!confirm(`Delete coupon "${row['code']}"? This cannot be undone.`)) return;
    try {
      await this.billing.coupons.delete(row['couponId']);
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