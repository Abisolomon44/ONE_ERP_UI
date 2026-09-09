import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MasterPage, MasterConfig } from '../shared/master-page/master-page';
import { MasterRow } from '../shared/master.model';
import {
  AdministrationService,
  BillingMasterService,
  BarcodeDto,
  CreateBarcodeRequest,
  UpdateBarcodeRequest,
} from '../../core/services/master_service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionService } from '../../core/services/permission.service';

@Component({
  selector: 'app-barcode',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, MasterPage],
  templateUrl: './barcode.html',
  styleUrl: './barcode.css',
})
export class BarcodePage implements OnInit {
  private readonly admin = inject(AdministrationService);
  private readonly billing = inject(BillingMasterService);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showEntry = signal(false);
  protected readonly rows = signal<MasterRow[]>([]);
  protected readonly editing = signal<BarcodeDto | null>(null);

  protected userModel: Record<string, any> = {};

  protected config: MasterConfig = {
    title: 'Barcodes',
    description: 'Manage product barcodes',
    icon: 'ScanBarcode',
    api: '/api/barcodes',
    permissionName: 'barcodes',
    createLabel: 'New Barcode',
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    allowImport: false,
    allowExport: false,
    allowRefresh: true,
    tabs: [],
    columns: [
      { field: 'barcode', header: 'Barcode' },
      { field: 'productName', header: 'Product' },
      { field: 'unitName', header: 'Unit' },
      { field: 'barcodeType', header: 'Type', width: '100px' },
      { field: 'isPrimary', header: 'Primary', type: 'checkbox', width: '90px' },
      { field: 'isActive', header: 'Active', type: 'checkbox', width: '90px' },
    ],
    fields: [
      { name: 'barcode', label: 'Barcode', type: 'text', required: true, maxLength: 100 },
      { name: 'productId', label: 'Product', type: 'dropdown', required: true, options: [] },
      { name: 'unitId', label: 'Unit', type: 'dropdown', options: [] },
      { name: 'barcodeType', label: 'Barcode Type', type: 'text', maxLength: 30 },
      { name: 'isPrimary', label: 'Primary', type: 'checkbox' },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  };

  ngOnInit(): void {
    if (!this.perm.has('barcodes.view')) {
      this.loading.set(false);
      return;
    }
    void this.loadDropdowns();
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      if (!this.perm.has('barcodes.view')) {
        this.rows.set([]);
        return;
      }
      const res = await this.billing.barcodes.getPaged(1, 100, '');
      this.rows.set((res.items ?? []).map((x) => ({ ...x, id: x.barcodeId }) as MasterRow));
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
      this.setOptions('unitId', (units.items ?? []).map((u) => ({ value: u.id, label: u.unitName })));
    } catch {
    }
  }

  private setOptions(fieldName: string, options: { value: any; label: string }[]): void {
    const field = this.config.fields.find((f) => f.name === fieldName);
    if (field) field.options = options;
  }

  protected async createRow(): Promise<void> {
    this.editing.set(null);
    this.userModel = { barcode: '', productId: null, unitId: null, barcodeType: '', isPrimary: true, isActive: true };
    this.showEntry.set(true);
  }

  protected editRow(row: Record<string, any>): void {
    this.editing.set(row as BarcodeDto);
    this.userModel = { ...row };
    this.showEntry.set(true);
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const editing = this.editing();
      const payload: CreateBarcodeRequest = {
        barcode: this.userModel['barcode']?.trim(),
        productId: this.userModel['productId'],
        unitId: this.userModel['unitId'] || null,
        barcodeType: this.userModel['barcodeType'] || null,
        isPrimary: this.userModel['isPrimary'] ?? false,
      };
      if (editing) {
        const updatePayload: UpdateBarcodeRequest = {
          ...payload,
          unitId: this.userModel['unitId'] || null,
          isPrimary: this.userModel['isPrimary'] ?? false,
          isActive: this.userModel['isActive'],
        };
        await this.billing.barcodes.update(editing.barcodeId, updatePayload);
      } else {
        await this.billing.barcodes.create(payload);
      }
      this.showEntry.set(false);
      await this.load();
    } catch {
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteRow(row: Record<string, any>): Promise<void> {
    if (!confirm(`Delete barcode "${row['barcode']}"? This cannot be undone.`)) return;
    try {
      await this.billing.barcodes.delete(row['barcodeId']);
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