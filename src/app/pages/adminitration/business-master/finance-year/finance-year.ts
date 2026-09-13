import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MasterPage, MasterConfig } from '../../../shared/master-page/master-page';
import { PosService, FinancialYearDto, CreateFinancialYearRequest, UpdateFinancialYearRequest } from '../../../../core/services/pos_service';
import { AuthService } from '../../../../core/services/auth.service';
import { PermissionService } from '../../../../core/services/permission.service';
import { buildScopeLabel } from '../../../shared/scope-label';

@Component({
  selector: 'app-finance-year',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, MasterPage],
  templateUrl: './finance-year.html',
  styleUrl: './finance-year.css',
})
export class FinanceYear implements OnInit {
  private readonly pos = inject(PosService);
  private readonly auth = inject(AuthService);
  private readonly perms = inject(PermissionService);
  private defaultCompanyId = 0;

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showEntry = signal(false);
  protected readonly rows = signal<FinancialYearDto[]>([]);
  protected readonly editing = signal<FinancialYearDto | null>(null);

  protected userModel: Record<string, any> = {};

  protected config: MasterConfig = {
    title: 'Financial Year',
    description: 'Manage company fiscal periods',
    icon: 'Calendar',
    api: '/api/financial-years',
    permissionName: 'Financial-Years',
    createLabel: 'New Financial Year',

    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    allowImport: false,
    allowExport: false,
    allowRefresh: true,

    columns: [
      { field: 'code', header: 'Code', width: '100px' },
      { field: 'name', header: 'Name' },
      { field: 'startDate', header: 'Start Date', type: 'date', width: '120px' },
      { field: 'endDate', header: 'End Date', type: 'date', width: '120px' },
      { field: 'isCurrent', header: 'Current', type: 'checkbox', width: '90px' },
      { field: 'isActive', header: 'Active', type: 'checkbox', width: '90px' },
    ],

    tabs: [
      {
        name: 'General',
        fields: ['companyId', 'code', 'name', 'startDate', 'endDate'],
      },
      { name: 'Status', fields: ['isCurrent', 'isClosed', 'isActive'] },
    ],

    fields: [
      { name: 'companyId', label: 'Company', type: 'dropdown', required: true, options: [] },
      { name: 'code', label: 'Code', type: 'text', required: true, maxLength: 30 },
      { name: 'name', label: 'Name', type: 'text', required: true, maxLength: 100 },
      { name: 'startDate', label: 'Start Date', type: 'date', required: true },
      { name: 'endDate', label: 'End Date', type: 'date', required: true },
      { name: 'isCurrent', label: 'Current', type: 'checkbox' },
      { name: 'isClosed', label: 'Closed', type: 'checkbox' },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  };

  ngOnInit(): void {
    void this.loadDropdowns().then(() => this.load());
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const companyId = this.userModel['companyId'] ?? this.defaultCompanyId;
      if (!companyId) {
        this.rows.set([]);
        return;
      }
      const res = await this.pos.financialYears.getPaged({ companyId, page: 1, size: 200, search: '' });
      this.rows.set(res.items ?? []);
    } catch (err) {
      console.error('[FinanceYear] load failed:', err);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadDropdowns(): Promise<void> {
    try {
      const roleNames = this.auth.user()?.roles ?? [];
      const { companies, branches } = await this.perms.loadMyDataScopeOptions(roleNames);

      const companyOptions = companies.map((c) => ({ value: c.id, label: c.name }));
      if (companies.length > 0) {
        this.defaultCompanyId = companies[0].id;
      }

      const { scopeLabel, noAccess } = buildScopeLabel({ companies, branches });
      this.config = { ...this.config, scopeLabel, noAccess };

      this.setOptions('companyId', companyOptions);
    } catch (err) {
      console.error('loadDropdowns failed:', err);
    }
  }

  private setOptions(fieldName: string, options: { value: any; label: string }[]): void {
    this.config = {
      ...this.config,
      fields: this.config.fields.map((f) => f.name === fieldName ? { ...f, options } : f),
    };
  }

  protected createRow(): void {
    this.editing.set(null);
    this.userModel = {
      companyId: this.defaultCompanyId || null,
      code: '',
      name: '',
      startDate: '',
      endDate: '',
      isCurrent: false,
      isClosed: false,
      isActive: true,
    };
    this.showEntry.set(true);
  }

  protected editRow(row: Record<string, any>): void {
    this.editing.set(row as unknown as FinancialYearDto);
    this.userModel = {
      companyId: row['companyId'],
      code: row['code'],
      name: row['name'],
      startDate: (row['startDate'] ?? '').substring(0, 10),
      endDate: (row['endDate'] ?? '').substring(0, 10),
      isCurrent: row['isCurrent'],
      isClosed: row['isClosed'],
      isActive: row['isActive'],
    };
    this.showEntry.set(true);
  }

  protected async saveRow(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const editing = this.editing();
      if (editing) {
        const payload: UpdateFinancialYearRequest = {
          code: this.userModel['code']?.trim(),
          name: this.userModel['name']?.trim(),
          startDate: this.userModel['startDate'],
          endDate: this.userModel['endDate'],
          isCurrent: this.userModel['isCurrent'],
          isClosed: this.userModel['isClosed'],
          isActive: this.userModel['isActive'],
        } as unknown as UpdateFinancialYearRequest;
        await this.pos.financialYears.update(editing.id, payload);
      } else {
        const payload: CreateFinancialYearRequest = {
          companyId: this.userModel['companyId'],
          code: this.userModel['code']?.trim().toUpperCase(),
          name: this.userModel['name']?.trim(),
          startDate: this.userModel['startDate'],
          endDate: this.userModel['endDate'],
          isCurrent: this.userModel['isCurrent'],
          isClosed: this.userModel['isClosed'],
          isActive: this.userModel['isActive'],
        } as unknown as CreateFinancialYearRequest;
        await this.pos.financialYears.create(payload);
      }
      this.showEntry.set(false);
      await this.load();
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteRow(row: Record<string, any>): Promise<void> {
    if (!confirm(`Delete financial year "${row['name']}"? This cannot be undone.`)) return;
    try {
      await this.pos.financialYears.delete(row['id']);
      await this.load();
    } catch {
      /* handled by interceptor */
    }
  }

  protected cancel(): void {
    this.showEntry.set(false);
  }

  protected refresh(): void {
    void this.load();
  }
}