import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { MasterPage, MasterConfig, MasterToolbarAction } from '../shared/master-page/master-page';
import {
  AdministrationService,
  TaxDto,
  CreateTaxRequest,
  UpdateTaxRequest,
} from '../../core/services/master_service';
import { ToastService } from '../../core/services/toast.service';
import { Action } from '../../core/models';
import { PermissionService } from '../../core/services/permission.service';

@Component({
  selector: 'app-tax',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, MasterPage],
  templateUrl: './tax.html',
  styleUrl: './tax.css',
})
export class TaxPage implements OnInit {
  private readonly admin = inject(AdministrationService);
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showEntry = signal(false);
  protected readonly rows = signal<TaxDto[]>([]);
  protected readonly editing = signal<TaxDto | null>(null);

  protected userModel: Record<string, any> = {};

  protected config: MasterConfig = {
    title: 'Taxes',
    description: 'Define the actual tax rates (GST/VAT slabs) used by products and transactions',
    icon: 'Percent',
    api: '/api/taxes',
    permissionName: 'taxes',
    createLabel: 'New Tax',
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    allowImport: false,
    allowExport: true,
    allowRefresh: true,
    tabs: [
      { name: 'General', fields: ['taxCode', 'taxName', 'taxTypeSystemId', 'taxRate', 'isInclusive', 'branchId'] },
      { name: 'Period', fields: ['effectiveFrom', 'effectiveTo'] },
      { name: 'Status', fields: ['description', 'isActive'] },
    ],
    columns: [
      { field: 'taxCode', header: 'Code', width: '100px' },
      { field: 'taxName', header: 'Name' },
      { field: 'taxTypeSystemName', header: 'Tax System' },
      { field: 'taxRate', header: 'Rate %', width: '100px' },
      { field: 'isInclusive', header: 'Incl.', type: 'checkbox', width: '80px' },
      { field: 'isActive', header: 'Active', type: 'checkbox', width: '90px' },
    ],
    fields: [
      { name: 'taxCode', label: 'Tax Code', type: 'text', required: true, maxLength: 30 },
      { name: 'taxName', label: 'Tax Name', type: 'text', required: true, maxLength: 100 },
      { name: 'taxTypeSystemId', label: 'Tax Type System', type: 'dropdown', required: true, options: [] },
      { name: 'taxRate', label: 'Tax Rate (%)', type: 'number', required: true },
      { name: 'isInclusive', label: 'Inclusive', type: 'checkbox' },
      { name: 'branchId', label: 'Branch', type: 'dropdown', options: [] },
      { name: 'effectiveFrom', label: 'Effective From', type: 'date' },
      { name: 'effectiveTo', label: 'Effective To', type: 'date' },
      { name: 'description', label: 'Description', type: 'textarea', maxLength: 300 },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  };

  ngOnInit(): void {
    if (!this.perm.has('taxes.view')) {
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
    const headers = ['taxCode', 'taxName', 'taxTypeSystemName', 'taxRate', 'isInclusive', 'isActive'];
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
    a.download = 'taxes.csv';
    a.click();
    URL.revokeObjectURL(url);
    this.toast.success('Exported taxes.csv');
  }

  private print(): void {
    window.print();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      if (!this.perm.has('taxes.view')) {
        this.rows.set([]);
        return;
      }
      const res = await this.admin.taxes.getPaged(1, 100, '');
      this.rows.set(res.items ?? []);
    } catch {
    } finally {
      this.loading.set(false);
    }
  }

  private async loadDropdowns(): Promise<void> {
    try {
      const taxTypes = await this.admin.taxTypeSystems.getPaged(1, 100, '');
      this.setOptions('taxTypeSystemId', (taxTypes.items ?? []).map((t: any) => ({ value: t.id, label: t.name })));
    } catch {
    }
    try {
      const branchRes: any = await firstValueFrom(this.http.get('/api/organization/branches?page=1&size=1000'));
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
      taxCode: '',
      taxName: '',
      taxTypeSystemId: null,
      taxRate: 0,
      isInclusive: false,
      branchId: null,
      effectiveFrom: null,
      effectiveTo: null,
      description: '',
      isActive: true,
    };
    this.showEntry.set(true);
  }

  protected editRow(row: Record<string, any>): void {
    this.editing.set(row as TaxDto);
    this.userModel = { ...row };
    this.showEntry.set(true);
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const editing = this.editing();
      const payload: CreateTaxRequest = {
        taxCode: this.userModel['taxCode']?.trim().toUpperCase(),
        taxName: this.userModel['taxName']?.trim(),
        taxTypeSystemId: this.userModel['taxTypeSystemId'],
        taxRate: this.userModel['taxRate'] ?? 0,
        isInclusive: this.userModel['isInclusive'] ?? false,
        branchId: this.userModel['branchId'] || null,
        effectiveFrom: this.userModel['effectiveFrom'] || null,
        effectiveTo: this.userModel['effectiveTo'] || null,
        description: this.userModel['description'] || null,
      };
      if (editing) {
        const updatePayload: UpdateTaxRequest = { ...payload, isActive: this.userModel['isActive'] };
        await this.admin.taxes.update(editing.id, updatePayload);
      } else {
        await this.admin.taxes.create(payload);
      }
      this.showEntry.set(false);
      await this.load();
    } catch {
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteRow(row: Record<string, any>): Promise<void> {
    if (!confirm(`Delete tax "${row['taxName']}"? This cannot be undone.`)) return;
    try {
      await this.admin.taxes.delete(row['id']);
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
