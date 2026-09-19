import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MasterPage, MasterConfig } from '../shared/master-page/master-page';
import { MasterRow } from '../shared/master.model';
import {
  AdministrationService,
  BillingMasterService,
  HsnSacDto,
  CreateHsnSacRequest,
  UpdateHsnSacRequest,
} from '../../core/services/master_service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionService } from '../../core/services/permission.service';

@Component({
  selector: 'app-hsn-sac',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, MasterPage],
  templateUrl: './hsn-sac.html',
  styleUrl: './hsn-sac.css',
})
export class HsnSacPage implements OnInit {
  private readonly billing = inject(BillingMasterService);
  private readonly admin = inject(AdministrationService);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showEntry = signal(false);
  protected readonly rows = signal<MasterRow[]>([]);
  protected readonly editing = signal<HsnSacDto | null>(null);

  protected userModel: Record<string, any> = {};

  protected config: MasterConfig = {
    title: 'HSN / SAC Codes',
    description: 'Manage HSN and SAC codes for goods and services',
    icon: 'Hash',
    api: '/api/hsn-sacs',
    permissionName: 'hsn-sacs',
    createLabel: 'New HSN/SAC',
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    allowImport: false,
    allowExport: false,
    allowRefresh: true,
    tabs: [],
    columns: [
      { field: 'code', header: 'Code', width: '120px' },
      { field: 'governmentCode', header: 'Govt. Code', width: '120px' },
      { field: 'name', header: 'Name' },
      { field: 'hsnSacType', header: 'Type', type: 'badge', width: '90px' },
      { field: 'taxName', header: 'Tax' },
      { field: 'isActive', header: 'Active', type: 'checkbox', width: '90px' },
    ],
    fields: [
      { name: 'code', label: 'Code', type: 'text', required: true, maxLength: 20, readonly: true },
      { name: 'governmentCode', label: 'Government Code', type: 'text', required: true, maxLength: 20 },
      { name: 'name', label: 'Name', type: 'text', required: true, maxLength: 200 },
      {
        name: 'hsnSacType', label: 'Type', type: 'dropdown', required: true,
        options: [
          { value: 'HSN', label: 'HSN' },
          { value: 'SAC', label: 'SAC' },
        ],
      },
      { name: 'taxId', label: 'Tax', type: 'dropdown', options: [] },
      { name: 'description', label: 'Description', type: 'textarea', maxLength: 500 },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  };

  ngOnInit(): void {
    if (!this.perm.has('hsn-sacs.view')) {
      this.loading.set(false);
      return;
    }
    void this.loadTaxes();
    void this.load();
  }

  private async loadTaxes(): Promise<void> {
    try {
      const taxes = await this.admin.taxes.getPaged(1, 1000, '');
      this.setOptions('taxId', (taxes.items ?? []).map((t: any) => ({ value: t.id, label: t.taxName })));
    } catch {
    }
  }

  private setOptions(fieldName: string, options: { value: any; label: string }[]): void {
    const field = this.config.fields.find((f) => f.name === fieldName);
    if (field) field.options = options;
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      if (!this.perm.has('hsn-sacs.view')) {
        this.rows.set([]);
        return;
      }
      const res = await this.billing.hsnSacs.getPaged(1, 100, '');
      this.rows.set((res.items ?? []).map((x) => ({ ...x, id: x.hsnSacId }) as MasterRow));
    } catch {
    } finally {
      this.loading.set(false);
    }
  }

  protected async createRow(): Promise<void> {
    this.editing.set(null);
    let nextCode = '';
    try {
      nextCode = await this.billing.hsnSacs.getNextCode();
    } catch {
      /* code will be generated server-side on save */
    }
    this.userModel = { code: nextCode, governmentCode: nextCode, name: '', hsnSacType: 'HSN', taxId: null, description: '', isActive: true };
    this.showEntry.set(true);
  }

  protected editRow(row: Record<string, any>): void {
    this.editing.set(row as HsnSacDto);
    this.userModel = { ...row };
    this.showEntry.set(true);
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const editing = this.editing();
      const payload: CreateHsnSacRequest = {
        code: this.userModel['code']?.trim().toUpperCase(),
        governmentCode: this.userModel['governmentCode']?.trim().toUpperCase(),
        name: this.userModel['name']?.trim(),
        hsnSacType: this.userModel['hsnSacType'],
        taxId: this.userModel['taxId'] || null,
        description: this.userModel['description'] || null,
      };
      if (editing) {
        const updatePayload: UpdateHsnSacRequest = {
          ...payload,
          description: this.userModel['description'] || null,
          isActive: this.userModel['isActive'],
        };
        await this.billing.hsnSacs.update(editing.hsnSacId, updatePayload);
      } else {
        await this.billing.hsnSacs.create(payload);
      }
      this.showEntry.set(false);
      await this.load();
    } catch {
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteRow(row: Record<string, any>): Promise<void> {
    if (!confirm(`Delete HSN/SAC "${row['code']}"? This cannot be undone.`)) return;
    try {
      await this.billing.hsnSacs.delete(row['hsnSacId']);
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