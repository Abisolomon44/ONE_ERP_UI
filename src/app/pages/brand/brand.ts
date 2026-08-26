import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { MasterPage, MasterConfig, MasterToolbarAction } from '../shared/master-page/master-page';
import {
  AdministrationService,
  ProductBrandDto,
  CreateProductBrandRequest,
  UpdateProductBrandRequest,
} from '../../core/services/master_service';
import { ToastService } from '../../core/services/toast.service';
import { Action } from '../../core/models';
import { PermissionService } from '../../core/services/permission.service';

@Component({
  selector: 'app-brand',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, MasterPage],
  templateUrl: './brand.html',
  styleUrl: './brand.css',
})
export class BrandPage implements OnInit {
  private readonly admin = inject(AdministrationService);
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showEntry = signal(false);
  protected readonly rows = signal<ProductBrandDto[]>([]);
  protected readonly editing = signal<ProductBrandDto | null>(null);

  protected userModel: Record<string, any> = {};

  protected config: MasterConfig = {
    title: 'Brands',
    description: 'Manage product brands',
    icon: 'Tag',
    api: '/api/brands',
    permissionName: 'brands',
    createLabel: 'New Brand',
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    allowImport: false,
    allowExport: true,
    allowRefresh: true,
    tabs: [],
    columns: [
      { field: 'brandCode', header: 'Code', width: '120px' },
      { field: 'brandName', header: 'Name' },
      { field: 'description', header: 'Description' },
      { field: 'isActive', header: 'Active', type: 'checkbox', width: '90px' },
    ],
    fields: [
      { name: 'brandCode', label: 'Brand Code', type: 'text', required: true, maxLength: 30, readonly: true },
      { name: 'brandName', label: 'Brand Name', type: 'text', required: true, maxLength: 100 },
      { name: 'description', label: 'Description', type: 'textarea', maxLength: 500 },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  };

  ngOnInit(): void {
    if (!this.perm.has('brands.view')) {
      this.loading.set(false);
      return;
    }
    void this.load();
    void this.loadToolbarActions();
  }

  private async loadToolbarActions(): Promise<void> {
    try {
      const actions = await firstValueFrom(this.http.get<Action[]>('/api/actions'));
      const wanted = ['export', 'import', 'print'];
      const mapping: Record<string, { label: string; variant: MasterToolbarAction['variant'] }> = {
        export: { label: 'Export', variant: 'warning' },
        import: { label: 'Import', variant: 'success' },
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
    else if (code === 'import') this.importFile();
  }

  private exportCsv(): void {
    const rows = this.rows();
    if (!rows.length) {
      this.toast.info('No records to export');
      return;
    }
    const headers = ['brandCode', 'brandName', 'description', 'isActive'];
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
    a.download = 'brands.csv';
    a.click();
    URL.revokeObjectURL(url);
    this.toast.success('Exported brands.csv');
  }

  private print(): void {
    window.print();
  }

  private importFile(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => this.processImport(reader.result as string);
      reader.readAsText(file);
    };
    input.click();
  }

  private async processImport(csv: string): Promise<void> {
    try {
      const lines = csv.split(/\r?\n/).filter((l) => l.trim());
      if (!lines.length) return;
      const headers = lines[0].split(',').map((h) => h.trim());
      let ok = 0;
      let fail = 0;
      for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        const row: Record<string, any> = {};
        headers.forEach((h, idx) => (row[h] = cells[idx]));
        if (!row['brandCode'] || !row['brandName']) {
          fail++;
          continue;
        }
        const payload: CreateProductBrandRequest = {
          brandCode: String(row['brandCode']).toUpperCase(),
          brandName: row['brandName'],
          description: row['description'] || null,
        };
        try {
          await this.admin.productBrands.create(payload);
          ok++;
        } catch {
          fail++;
        }
      }
      this.toast.success(`Imported ${ok} brand${ok === 1 ? '' : 's'}${fail ? `, ${fail} failed` : ''}`);
      await this.load();
    } catch {
      this.toast.error('Failed to process import file');
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      if (!this.perm.has('brands.view')) {
        this.rows.set([]);
        return;
      }
      const res = await this.admin.productBrands.getPaged(1, 100, '');
      this.rows.set(res.items ?? []);
    } catch {
    } finally {
      this.loading.set(false);
    }
  }

  protected async createRow(): Promise<void> {
    this.editing.set(null);
    let nextCode = '';
    try {
      nextCode = await firstValueFrom(this.http.get<string>('/api/brands/next-code'));
    } catch {
      /* code will be generated server-side on save */
    }
    this.userModel = { brandCode: nextCode, brandName: '', description: '', isActive: true };
    this.showEntry.set(true);
  }

  protected editRow(row: Record<string, any>): void {
    this.editing.set(row as ProductBrandDto);
    this.userModel = { ...row };
    this.showEntry.set(true);
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const editing = this.editing();
      if (editing) {
        const payload: UpdateProductBrandRequest = {
          brandCode: this.userModel['brandCode']?.trim().toUpperCase(),
          brandName: this.userModel['brandName']?.trim(),
          description: this.userModel['description'] || null,
          isActive: this.userModel['isActive'],
        };
        await this.admin.productBrands.update(editing.id, payload);
      } else {
        const payload: CreateProductBrandRequest = {
          brandCode: this.userModel['brandCode']?.trim().toUpperCase(),
          brandName: this.userModel['brandName']?.trim(),
          description: this.userModel['description'] || null,
        };
        await this.admin.productBrands.create(payload);
      }
      this.showEntry.set(false);
      await this.load();
    } catch {
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteRow(row: Record<string, any>): Promise<void> {
    if (!confirm(`Delete brand "${row['brandName']}"? This cannot be undone.`)) return;
    try {
      await this.admin.productBrands.delete(row['id']);
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
