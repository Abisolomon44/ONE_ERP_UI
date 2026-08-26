import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { MasterPage, MasterConfig, MasterToolbarAction } from '../shared/master-page/master-page';
import {
  AdministrationService,
  ProductUnitDto,
  CreateProductUnitRequest,
  UpdateProductUnitRequest,
} from '../../core/services/master_service';
import { ToastService } from '../../core/services/toast.service';
import { Action } from '../../core/models';
import { PermissionService } from '../../core/services/permission.service';

@Component({
  selector: 'app-unit',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, MasterPage],
  templateUrl: './unit.html',
  styleUrl: './unit.css',
})
export class UnitPage implements OnInit {
  private readonly admin = inject(AdministrationService);
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showEntry = signal(false);
  protected readonly rows = signal<ProductUnitDto[]>([]);
  protected readonly editing = signal<ProductUnitDto | null>(null);

  protected userModel: Record<string, any> = {};

  protected config: MasterConfig = {
    title: 'Units',
    description: 'Manage measurement units',
    icon: 'Ruler',
    api: '/api/units',
    permissionName: 'units',
    createLabel: 'New Unit',
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    allowImport: false,
    allowExport: true,
    allowRefresh: true,
    tabs: [],
    columns: [
      { field: 'unitCode', header: 'Code', width: '100px' },
      { field: 'unitName', header: 'Name' },
      { field: 'symbol', header: 'Symbol', width: '90px' },
      { field: 'decimalPlaces', header: 'Decimals', width: '90px' },
      { field: 'isActive', header: 'Active', type: 'checkbox', width: '90px' },
    ],
    fields: [
      { name: 'unitCode', label: 'Unit Code', type: 'text', required: true, maxLength: 20, readonly: true },
      { name: 'unitName', label: 'Unit Name', type: 'text', required: true, maxLength: 50 },
      { name: 'symbol', label: 'Symbol', type: 'text', maxLength: 20 },
      { name: 'decimalPlaces', label: 'Decimal Places', type: 'number' },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  };

  ngOnInit(): void {
    if (!this.perm.has('units.view')) {
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
    const headers = ['unitCode', 'unitName', 'symbol', 'decimalPlaces', 'isActive'];
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
    a.download = 'units.csv';
    a.click();
    URL.revokeObjectURL(url);
    this.toast.success('Exported units.csv');
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
        if (!row['unitCode'] || !row['unitName']) {
          fail++;
          continue;
        }
        const payload: CreateProductUnitRequest = {
          unitCode: String(row['unitCode']).toUpperCase(),
          unitName: row['unitName'],
          symbol: row['symbol'] || null,
          decimalPlaces: row['decimalPlaces'] ? +row['decimalPlaces'] : 0,
        };
        try {
          await this.admin.productUnits.create(payload);
          ok++;
        } catch {
          fail++;
        }
      }
      this.toast.success(`Imported ${ok} unit${ok === 1 ? '' : 's'}${fail ? `, ${fail} failed` : ''}`);
      await this.load();
    } catch {
      this.toast.error('Failed to process import file');
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      if (!this.perm.has('units.view')) {
        this.rows.set([]);
        return;
      }
      const res = await this.admin.productUnits.getPaged(1, 100, '');
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
      nextCode = await firstValueFrom(this.http.get<string>('/api/units/next-code'));
    } catch {
      /* code will be generated server-side on save */
    }
    this.userModel = { unitCode: nextCode, unitName: '', symbol: '', decimalPlaces: 0, isActive: true };
    this.showEntry.set(true);
  }

  protected editRow(row: Record<string, any>): void {
    this.editing.set(row as ProductUnitDto);
    this.userModel = { ...row };
    this.showEntry.set(true);
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const editing = this.editing();
      if (editing) {
        const payload: UpdateProductUnitRequest = {
          unitCode: this.userModel['unitCode']?.trim().toUpperCase(),
          unitName: this.userModel['unitName']?.trim(),
          symbol: this.userModel['symbol'] || null,
          decimalPlaces: this.userModel['decimalPlaces'] ?? 0,
          isActive: this.userModel['isActive'],
        };
        await this.admin.productUnits.update(editing.id, payload);
      } else {
        const payload: CreateProductUnitRequest = {
          unitCode: this.userModel['unitCode']?.trim().toUpperCase(),
          unitName: this.userModel['unitName']?.trim(),
          symbol: this.userModel['symbol'] || null,
          decimalPlaces: this.userModel['decimalPlaces'] ?? 0,
        };
        await this.admin.productUnits.create(payload);
      }
      this.showEntry.set(false);
      await this.load();
    } catch {
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteRow(row: Record<string, any>): Promise<void> {
    if (!confirm(`Delete unit "${row['unitName']}"? This cannot be undone.`)) return;
    try {
      await this.admin.productUnits.delete(row['id']);
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
