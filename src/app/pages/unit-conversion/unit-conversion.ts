import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MasterPage, MasterConfig } from '../shared/master-page/master-page';
import { MasterRow } from '../shared/master.model';
import {
  AdministrationService,
  BillingMasterService,
  UnitConversionDto,
  CreateUnitConversionRequest,
  UpdateUnitConversionRequest,
} from '../../core/services/master_service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionService } from '../../core/services/permission.service';

@Component({
  selector: 'app-unit-conversion',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, MasterPage],
  templateUrl: './unit-conversion.html',
  styleUrl: './unit-conversion.css',
})
export class UnitConversionPage implements OnInit {
  private readonly admin = inject(AdministrationService);
  private readonly billing = inject(BillingMasterService);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showEntry = signal(false);
  protected readonly rows = signal<MasterRow[]>([]);
  protected readonly editing = signal<UnitConversionDto | null>(null);

  protected userModel: Record<string, any> = {};

  protected config: MasterConfig = {
    title: 'Unit Conversions',
    description: 'Manage conversion factors between units',
    icon: 'ArrowLeftRight',
    api: '/api/unit-conversions',
    permissionName: 'unit-conversions',
    createLabel: 'New Conversion',
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    allowImport: false,
    allowExport: false,
    allowRefresh: true,
    tabs: [],
    columns: [
      { field: 'productName', header: 'Product' },
      { field: 'fromUnitName', header: 'From Unit' },
      { field: 'toUnitName', header: 'To Unit' },
      { field: 'conversionFactor', header: 'Factor', width: '100px' },
      { field: 'isDefault', header: 'Default', type: 'checkbox', width: '90px' },
      { field: 'isActive', header: 'Active', type: 'checkbox', width: '90px' },
    ],
    fields: [
      { name: 'productId', label: 'Product', type: 'dropdown', options: [] },
      { name: 'fromUnitId', label: 'From Unit', type: 'dropdown', required: true, options: [] },
      { name: 'toUnitId', label: 'To Unit', type: 'dropdown', required: true, options: [] },
      { name: 'conversionFactor', label: 'Conversion Factor', type: 'number', required: true },
      { name: 'isDefault', label: 'Default', type: 'checkbox' },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  };

  ngOnInit(): void {
    if (!this.perm.has('unit-conversions.view')) {
      this.loading.set(false);
      return;
    }
    void this.loadDropdowns();
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      if (!this.perm.has('unit-conversions.view')) {
        this.rows.set([]);
        return;
      }
      const res = await this.billing.unitConversions.getPaged(1, 100, '');
      this.rows.set((res.items ?? []).map((x) => ({ ...x, id: x.unitConversionId }) as MasterRow));
    } catch {
    } finally {
      this.loading.set(false);
    }
  }

  private async loadDropdowns(): Promise<void> {
    try {
      const [products, units] = await Promise.all([
        this.admin.products.getPaged(1, 1000, ''),
        this.admin.productUnits.getPaged(1, 1000, ''),
      ]);
      this.setOptions('productId', (products.items ?? []).map((p) => ({ value: p.id, label: p.productName })));
      const unitOptions = (units.items ?? []).map((u) => ({ value: u.id, label: u.unitName }));
      this.setOptions('fromUnitId', unitOptions);
      this.setOptions('toUnitId', unitOptions);
    } catch {
    }
  }

  private setOptions(fieldName: string, options: { value: any; label: string }[]): void {
    const field = this.config.fields.find((f) => f.name === fieldName);
    if (field) field.options = options;
  }

  protected async createRow(): Promise<void> {
    this.editing.set(null);
    this.userModel = { productId: null, fromUnitId: null, toUnitId: null, conversionFactor: 1, isDefault: false, isActive: true };
    this.showEntry.set(true);
  }

  protected editRow(row: Record<string, any>): void {
    this.editing.set(row as UnitConversionDto);
    this.userModel = { ...row };
    this.showEntry.set(true);
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const editing = this.editing();
      const payload: CreateUnitConversionRequest = {
        productId: this.userModel['productId'] || null,
        fromUnitId: this.userModel['fromUnitId'],
        toUnitId: this.userModel['toUnitId'],
        conversionFactor: this.userModel['conversionFactor'] ?? 1,
        isDefault: this.userModel['isDefault'] ?? false,
      };
      if (editing) {
        const updatePayload: UpdateUnitConversionRequest = {
          ...payload,
          fromUnitId: this.userModel['fromUnitId'],
          toUnitId: this.userModel['toUnitId'],
          conversionFactor: this.userModel['conversionFactor'] ?? 1,
          isDefault: this.userModel['isDefault'] ?? false,
          isActive: this.userModel['isActive'],
        };
        await this.billing.unitConversions.update(editing.unitConversionId, updatePayload);
      } else {
        await this.billing.unitConversions.create(payload);
      }
      this.showEntry.set(false);
      await this.load();
    } catch {
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteRow(row: Record<string, any>): Promise<void> {
    if (!confirm(`Delete conversion to "${row['toUnitName']}"? This cannot be undone.`)) return;
    try {
      await this.billing.unitConversions.delete(row['unitConversionId']);
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