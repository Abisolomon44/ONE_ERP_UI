import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { MasterPage, MasterConfig, MasterColumn, MasterField, MasterToolbarAction } from '../shared/master-page/master-page';
import {
  InvoiceTemplateService,
  InvoiceTemplateListItem,
  CreateInvoiceTemplateRequest,
  UpdateInvoiceTemplateRequest,
} from '../../core/services/invoice-template.service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionService } from '../../core/services/permission.service';
import { Action } from '../../core/models';

@Component({
  selector: 'app-invoice-template',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, MasterPage],
  templateUrl: './invoice-template.html',
  styleUrl: './invoice-template.css',
})
export class InvoiceTemplatePage implements OnInit {
  private readonly svc = inject(InvoiceTemplateService);
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showEntry = signal(false);
  protected readonly rows = signal<InvoiceTemplateListItem[]>([]);
  protected readonly editing = signal<InvoiceTemplateListItem | null>(null);

  protected userModel: Record<string, any> = {};

  protected config: MasterConfig = {
    title: 'Invoice Design',
    description: 'Design and manage invoice / print templates',
    icon: 'FileText',
    api: '/api/invoice-templates',
    permissionName: 'invoice-templates',
    createLabel: 'New Template',
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    allowImport: false,
    allowExport: true,
    allowRefresh: true,
    tabs: [],
    columns: [
      { field: 'code', header: 'Code', width: '120px' },
      { field: 'name', header: 'Name' },
      { field: 'invoiceTypeName', header: 'Invoice Type', width: '140px' },
      { field: 'paperSizeName', header: 'Paper Size', width: '130px' },
      { field: 'orientationName', header: 'Orientation', width: '120px' },
      { field: 'latestVersionNumber', header: 'Version', width: '90px' },
      { field: 'latestStatus', header: 'Status', width: '110px' },
      { field: 'isDefault', header: 'Default', type: 'checkbox', width: '90px' },
      { field: 'isActive', header: 'Active', type: 'checkbox', width: '90px' },
    ],
    fields: [
      { name: 'code', label: 'Template Code', type: 'text', required: true, maxLength: 30, readonly: true },
      { name: 'name', label: 'Template Name', type: 'text', required: true, maxLength: 100 },
      { name: 'description', label: 'Description', type: 'textarea', maxLength: 500 },
      { name: 'invoiceTypeId', label: 'Invoice Type ID', type: 'number', required: true },
      { name: 'paperSizeId', label: 'Paper Size ID', type: 'number', required: true },
      { name: 'orientationId', label: 'Orientation ID', type: 'number', required: true },
      { name: 'width', label: 'Width (mm)', type: 'number' },
      { name: 'height', label: 'Height (mm)', type: 'number' },
      { name: 'isDefault', label: 'Default Template', type: 'checkbox' },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  };

  ngOnInit(): void {
    if (!this.perm.has('invoice-templates.view')) {
      this.loading.set(false);
      return;
    }
    void this.load();
    void this.loadToolbarActions();
  }

  private async loadToolbarActions(): Promise<void> {
    try {
      const actions = await firstValueFrom(this.http.get<Action[]>('/api/actions'));
      const wanted = ['export', 'print', 'set-default'];
      const mapping: Record<string, { label: string; variant: MasterToolbarAction['variant'] }> = {};
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
    const headers = ['code', 'name', 'invoiceTypeName', 'paperSizeName', 'orientationName', 'isDefault', 'isActive'];
    const lines = [headers.join(',')];
    for (const r of rows) lines.push(headers.map((h) => `"${String((r as any)[h] ?? '').replace(/"/g, '""')}"`).join(','));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'invoice-templates.csv';
    a.click();
    URL.revokeObjectURL(url);
    this.toast.success('Exported invoice-templates.csv');
  }

  private print(): void {
    window.print();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      if (!this.perm.has('invoice-templates.view')) {
        this.rows.set([]);
        return;
      }
      const res = await this.svc.getPaged(1, 100, '');
      this.rows.set((res.items ?? []).map((item) => ({ ...item, id: item.invoiceTemplateId })));
    } catch {
    } finally {
      this.loading.set(false);
    }
  }

  protected createRow(): void {
    this.editing.set(null);
    this.userModel = {};
    this.showEntry.set(true);
  }

  protected editRow(row: Record<string, any>): void {
    this.editing.set(row as InvoiceTemplateListItem);
    this.userModel = { ...row };
    this.showEntry.set(true);
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const editing = this.editing();
      if (editing) {
        const payload: UpdateInvoiceTemplateRequest = {
          companyId: this.userModel['companyId'] ?? null,
          templateCategoryId: this.userModel['templateCategoryId'] ?? null,
          invoiceTypeId: this.userModel['invoiceTypeId'],
          paperSizeId: this.userModel['paperSizeId'],
          orientationId: this.userModel['orientationId'],
          code: this.userModel['code']?.trim().toUpperCase(),
          name: this.userModel['name']?.trim(),
          description: this.userModel['description'] || null,
          width: this.userModel['width'] ?? null,
          height: this.userModel['height'] ?? null,
          isDefault: this.userModel['isDefault'],
          isActive: this.userModel['isActive'],
        };
        await this.svc.update((editing as any)['invoiceTemplateId'], payload);
      } else {
        const payload: CreateInvoiceTemplateRequest = {
          companyId: this.userModel['companyId'] ?? null,
          templateCategoryId: this.userModel['templateCategoryId'] ?? null,
          invoiceTypeId: this.userModel['invoiceTypeId'],
          paperSizeId: this.userModel['paperSizeId'],
          orientationId: this.userModel['orientationId'],
          code: this.userModel['code']?.trim().toUpperCase(),
          name: this.userModel['name']?.trim(),
          description: this.userModel['description'] || null,
          width: this.userModel['width'] ?? null,
          height: this.userModel['height'] ?? null,
          isDefault: this.userModel['isDefault'],
          isActive: this.userModel['isActive'],
        };
        await this.svc.create(payload);
      }
      this.showEntry.set(false);
      await this.load();
    } catch {
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteRow(row: Record<string, any>): Promise<void> {
    const name = row['name'] ?? 'template';
    if (!confirm(`Delete invoice template "${name}"? This cannot be undone.`)) return;
    try {
      await this.svc.remove((row as any)['invoiceTemplateId']);
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