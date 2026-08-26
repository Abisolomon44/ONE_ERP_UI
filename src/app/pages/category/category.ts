import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { MasterPage, MasterConfig, MasterToolbarAction } from '../shared/master-page/master-page';
import {
  AdministrationService,
  ProductCategoryDto,
  CreateProductCategoryRequest,
  UpdateProductCategoryRequest,
} from '../../core/services/master_service';
import { ToastService } from '../../core/services/toast.service';
import { Action } from '../../core/models';
import { PermissionService } from '../../core/services/permission.service';

@Component({
  selector: 'app-category',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, MasterPage],
  templateUrl: './category.html',
  styleUrl: './category.css',
})
export class CategoryPage implements OnInit {
  private readonly admin = inject(AdministrationService);
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showEntry = signal(false);
  protected readonly rows = signal<ProductCategoryDto[]>([]);
  protected readonly editing = signal<ProductCategoryDto | null>(null);

  protected userModel: Record<string, any> = {};

  protected config: MasterConfig = {
    title: 'Product Categories',
    description: 'Manage product categories',
    icon: 'FolderTree',
    api: '/api/product-categories',
    permissionName: 'product-categories',
    createLabel: 'New Category',
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    allowImport: false,
    allowExport: true,
    allowRefresh: true,
    tabs: [],
    columns: [
      { field: 'categoryCode', header: 'Code', width: '120px' },
      { field: 'categoryName', header: 'Name' },
      { field: 'description', header: 'Description' },
      { field: 'sortOrder', header: 'Order', width: '80px' },
      { field: 'isActive', header: 'Active', type: 'checkbox', width: '90px' },
    ],
    fields: [
      { name: 'categoryCode', label: 'Category Code', type: 'text', required: true, maxLength: 30, readonly: true },
      { name: 'categoryName', label: 'Category Name', type: 'text', required: true, maxLength: 100 },
      { name: 'description', label: 'Description', type: 'textarea', maxLength: 500 },
      { name: 'parentCategoryId', label: 'Parent Category', type: 'dropdown', options: [] },
      { name: 'sortOrder', label: 'Sort Order', type: 'number' },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  };

  ngOnInit(): void {
    if (!this.perm.has('product-categories.view')) {
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
    const headers = ['categoryCode', 'categoryName', 'description', 'sortOrder', 'isActive'];
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
    a.download = 'product-categories.csv';
    a.click();
    URL.revokeObjectURL(url);
    this.toast.success('Exported product-categories.csv');
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
        if (!row['categoryCode'] || !row['categoryName']) {
          fail++;
          continue;
        }
        const payload: CreateProductCategoryRequest = {
          categoryCode: String(row['categoryCode']).toUpperCase(),
          categoryName: row['categoryName'],
          description: row['description'] || null,
          parentCategoryId: row['parentCategoryId'] ? +row['parentCategoryId'] : null,
          sortOrder: row['sortOrder'] ? +row['sortOrder'] : null,
        };
        try {
          await this.admin.productCategories.create(payload);
          ok++;
        } catch {
          fail++;
        }
      }
      this.toast.success(`Imported ${ok} categor${ok === 1 ? 'y' : 'ies'}${fail ? `, ${fail} failed` : ''}`);
      await this.load();
    } catch {
      this.toast.error('Failed to process import file');
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      if (!this.perm.has('product-categories.view')) {
        this.rows.set([]);
        return;
      }
      const res = await this.admin.productCategories.getPaged(1, 100, '');
      this.rows.set(res.items ?? []);
    } catch {
    } finally {
      this.loading.set(false);
    }
  }

  private async loadDropdowns(): Promise<void> {
    try {
      const cats = await this.admin.productCategories.getPaged(1, 1000, '');
      this.setOptions(
        'parentCategoryId',
        (cats.items ?? []).map((c: ProductCategoryDto) => ({ value: c.id, label: c.categoryName })),
      );
    } catch {
    }
  }

  private setOptions(fieldName: string, options: { value: any; label: string }[]): void {
    const field = this.config.fields.find((f) => f.name === fieldName);
    if (field) field.options = options;
  }

  protected async createRow(): Promise<void> {
    this.editing.set(null);
    let nextCode = '';
    try {
      nextCode = await firstValueFrom(this.http.get<string>('/api/product-categories/next-code'));
    } catch {
      /* code will be generated server-side on save */
    }
    this.userModel = {
      categoryCode: nextCode,
      categoryName: '',
      description: '',
      parentCategoryId: null,
      sortOrder: null,
      isActive: true,
    };
    this.showEntry.set(true);
  }

  protected editRow(row: Record<string, any>): void {
    this.editing.set(row as ProductCategoryDto);
    this.userModel = { ...row };
    this.showEntry.set(true);
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const editing = this.editing();
      if (editing) {
        const payload: UpdateProductCategoryRequest = {
          categoryCode: this.userModel['categoryCode']?.trim().toUpperCase(),
          categoryName: this.userModel['categoryName']?.trim(),
          description: this.userModel['description'] || null,
          parentCategoryId: this.userModel['parentCategoryId'] || null,
          sortOrder: this.userModel['sortOrder'] ?? null,
          isActive: this.userModel['isActive'],
        };
        await this.admin.productCategories.update(editing.id, payload);
      } else {
        const payload: CreateProductCategoryRequest = {
          categoryCode: this.userModel['categoryCode']?.trim().toUpperCase(),
          categoryName: this.userModel['categoryName']?.trim(),
          description: this.userModel['description'] || null,
          parentCategoryId: this.userModel['parentCategoryId'] || null,
          sortOrder: this.userModel['sortOrder'] ?? null,
        };
        await this.admin.productCategories.create(payload);
      }
      this.showEntry.set(false);
      await this.load();
    } catch {
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteRow(row: Record<string, any>): Promise<void> {
    if (!confirm(`Delete category "${row['categoryName']}"? This cannot be undone.`)) return;
    try {
      await this.admin.productCategories.delete(row['id']);
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
