import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { MasterPage, MasterConfig, MasterToolbarAction } from '../shared/master-page/master-page';
import { AdministrationService, CompanyDto, CreateCompanyRequest, UpdateCompanyRequest } 
from '../../core/services/master_service';
import { ToastService } from '../../core/services/toast.service';
import { Action } from '../../core/models';
import { PermissionService } from '../../core/services/permission.service';

@Component({
  selector: 'app-company',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, MasterPage],
  templateUrl: './company.html',
  styleUrl: './company.css',
})
export class CompanyPage implements OnInit {
  private readonly admin = inject(AdministrationService);
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showEntry = signal(false);
  protected readonly companies = signal<CompanyDto[]>([]);
  protected readonly editing = signal<CompanyDto | null>(null);

  protected userModel: Record<string, any> = {};

  protected config: MasterConfig = {
    title: 'Company Master',
    description: 'Manage companies registered in the system',
    icon: 'Building2',
    api: '/api/companies',
    permissionName: 'Companies',
    createLabel: 'New Company',

    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    allowImport: false,
    allowExport: true,
    allowRefresh: true,

    columns: [
      { field: 'companyCode', header: 'Code', width: '100px' },
      { field: 'companyName', header: 'Company Name' },
      { field: 'gstNumber', header: 'GST No.' },
      { field: 'registrationNumber', header: 'Reg. No.' },
      { field: 'isActive', header: 'Active', type: 'checkbox', width: '90px' },
      { field: 'isBlocked', header: 'Blocked', type: 'checkbox', width: '90px' },
    ],

    tabs: [
      { name: 'General', fields: ['companyCode', 'companyName', 'shortName', 'abbreviation'] },
      { name: 'Classification', fields: ['businessTypeId', 'industryTypeId'] },
      { name: 'Statutory', fields: ['gstRegistrationTypeId', 'gstNumber', 'panNumber', 'tanNumber', 'cinNumber', 'registrationNumber'] },
      { name: 'Localization', fields: ['currencyId', 'languageId', 'timeZoneId'] },
      { name: 'Status', fields: ['isActive', 'isBlocked'] },
    ],

    fields: [
      { name: 'companyCode', label: 'Company Code', type: 'text', required: true, maxLength: 20, readonly: true },
      { name: 'companyName', label: 'Company Name', type: 'text', required: true, maxLength: 200 },
      { name: 'shortName', label: 'Short Name', type: 'text', maxLength: 50 },
      { name: 'abbreviation', label: 'Abbreviation', type: 'text', maxLength: 20 },

      { name: 'businessTypeId', label: 'Business Type', type: 'dropdown', required: true, options: [] },
      { name: 'industryTypeId', label: 'Industry Type', type: 'dropdown', required: true, options: [] },

      { name: 'gstRegistrationTypeId', label: 'GST Registration Type', type: 'dropdown', options: [] },
      { name: 'gstNumber', label: 'GST Number', type: 'text', maxLength: 15 },
      { name: 'panNumber', label: 'PAN Number', type: 'text', maxLength: 10 },
      { name: 'tanNumber', label: 'TAN Number', type: 'text', maxLength: 10 },
      { name: 'cinNumber', label: 'CIN Number', type: 'text', maxLength: 21 },
      { name: 'registrationNumber', label: 'Registration Number', type: 'text' },

      { name: 'currencyId', label: 'Base Currency', type: 'dropdown', required: true, options: [] },
      { name: 'languageId', label: 'Default Language', type: 'dropdown', required: true, options: [] },
      { name: 'timeZoneId', label: 'Time Zone', type: 'dropdown', required: true, options: [] },

      { name: 'isActive', label: 'Active', type: 'checkbox' },
      { name: 'isBlocked', label: 'Blocked', type: 'checkbox' },
    ],
  };

  ngOnInit(): void {
    if (!this.perm.has('companies.view')) {
      this.loading.set(false);
      return;
    }
    void this.loadDropdowns();
    void this.load();
    void this.loadToolbarActions();
  }

  //===========================
  // Permission-based toolbar actions (loaded from the Actions master)
  //===========================

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
        .filter(a => a.isActive && wanted.includes(a.actionCode))
        .map<MasterToolbarAction>(a => ({
          code: a.actionCode,
          label: mapping[a.actionCode]?.label ?? a.actionName,
          variant: mapping[a.actionCode]?.variant ?? 'secondary',
        }));
      this.config = { ...this.config, toolbarActions: toolbar };
    } catch {
      /* actions are optional; toolbar simply stays empty */
    }
  }

  protected onAction(code: string): void {
    if (code === 'export') this.exportCsv();
    else if (code === 'print') this.print();
    else if (code === 'import') this.importFile();
  }

  private exportCsv(): void {
    const rows = this.companies();
    if (!rows.length) {
      this.toast.info('No records to export');
      return;
    }
    const headers = ['companyCode', 'companyName', 'gstNumber', 'registrationNumber', 'isActive', 'isBlocked'];
    const lines = [headers.join(',')];
    for (const r of rows) {
      lines.push(
        headers
          .map(h => {
            const v = (r as any)[h];
            const s = v == null ? '' : String(v);
            return `"${s.replace(/"/g, '""')}"`;
          })
          .join(',')
      );
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'companies.csv';
    a.click();
    URL.revokeObjectURL(url);
    this.toast.success('Exported companies.csv');
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
      const lines = csv.split(/\r?\n/).filter(l => l.trim());
      if (!lines.length) return;
      const headers = lines[0].split(',').map(h => h.trim());
      let ok = 0;
      let fail = 0;
      for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        const row: Record<string, any> = {};
        headers.forEach((h, idx) => (row[h] = cells[idx]));
        if (!row['companyCode'] || !row['companyName']) {
          fail++;
          continue;
        }
        const payload: any = {
          companyCode: String(row['companyCode']).toUpperCase(),
          companyName: row['companyName'],
          shortName: row['shortName'] || null,
          abbreviation: row['abbreviation'] || null,
          businessTypeId: row['businessTypeId'] ? +row['businessTypeId'] : null,
          industryTypeId: row['industryTypeId'] ? +row['industryTypeId'] : null,
          gstRegistrationTypeId: row['gstRegistrationTypeId'] ? +row['gstRegistrationTypeId'] : null,
          gstNumber: row['gstNumber'] || null,
          panNumber: row['panNumber'] || null,
          tanNumber: row['tanNumber'] || null,
          cinNumber: row['cinNumber'] || null,
          registrationNumber: row['registrationNumber'] || null,
          currencyId: row['currencyId'] ? +row['currencyId'] : null,
          languageId: row['languageId'] ? +row['languageId'] : null,
          timeZoneId: row['timeZoneId'] ? +row['timeZoneId'] : null,
        };
        try {
          await this.admin.company.create(payload);
          ok++;
        } catch {
          fail++;
        }
      }
      this.toast.success(`Imported ${ok} compan(ies)${fail ? `, ${fail} failed` : ''}`);
      await this.load();
    } catch {
      this.toast.error('Failed to process import file');
    }
  }

  //===========================
  // Data load
  //===========================

 private async load(): Promise<void> {
  this.loading.set(true);
  try {
    if (!this.perm.has('companies.view')) {
      this.companies.set([]);
      return;
    }
    console.log('[CompanyPage] fetching companies...');
    const res = await this.admin.company.getPaged(1, 100, '');
    console.log('[CompanyPage] raw response:', res);
    console.log('[CompanyPage] items:', res?.items);
    this.companies.set(res.items ?? []);
  } catch (err) {
    console.error('[CompanyPage] load failed:', err);
  } finally {
    this.loading.set(false);
    console.log('[CompanyPage] loading finished, companies count:', this.companies().length);
  }
}
  private async loadDropdowns(): Promise<void> {
    const load = async (
      field: string,
      url: string,
      labelFn: (x: any) => string,
      valueFn: (x: any) => any
    ): Promise<void> => {
      try {
        const res: any = await firstValueFrom(this.http.get(url));
        const list: any[] = Array.isArray(res) ? res : (res?.items ?? res?.data ?? []);
        this.setOptions(field, list.map((x: any) => ({ value: valueFn(x), label: labelFn(x) })));
      } catch {
        this.setOptions(field, []);
      }
    };

    await Promise.all([
      load('currencyId', '/api/Administration/currencies?includeInactive=false', c => `${c.currencyCode} - ${c.currencyName}`, c => c.id),
      load('languageId', '/api/languages', l => l.name, l => l.languageId),
      load('timeZoneId', '/api/timezones', t => t.name, t => t.timeZoneId),
      load('industryTypeId', '/api/industry-types', i => i.name, i => i.industryTypeId),
      load('gstRegistrationTypeId', '/api/gst-registration-types', g => g.name, g => g.gstRegistrationTypeId),
      load('businessTypeId', '/api/business-types', b => b.name ?? b.businessTypeName, b => b.id ?? b.businessTypeId)
    ]);
  }

  private setOptions(fieldName: string, options: { value: any; label: string }[]): void {
    const field = this.config.fields.find((f) => f.name === fieldName);
    if (field) field.options = options;
  }

  //===========================
  // MasterPage event handlers
  //===========================

  protected async createCompany(): Promise<void> {
    this.editing.set(null);
    let nextCode = '';
    try {
      const res: any = await firstValueFrom(this.http.get('/api/companies/next-code'));
      nextCode = res?.code ?? res ?? '';
    } catch {
      nextCode = '';
    }
    this.userModel = {
      companyCode: nextCode,
      companyName: '',
      shortName: '',
      abbreviation: '',
      businessTypeId: null,
      industryTypeId: null,
      gstRegistrationTypeId: null,
      gstNumber: '',
      panNumber: '',
      tanNumber: '',
      cinNumber: '',
      registrationNumber: '',
      currencyId: null,
      languageId: null,
      timeZoneId: null,
      isActive: true,
      isBlocked: false,
    };
    this.showEntry.set(true);
  }

  protected editCompany(row: Record<string, any>): void {
    this.editing.set(row as CompanyDto);
    this.userModel = { ...row };
    this.showEntry.set(true);
  }

  protected async saveCompany(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const editing = this.editing();
      if (editing) {
        const payload: UpdateCompanyRequest = {
          companyName: this.userModel['companyName']?.trim(),
          shortName: this.userModel['shortName'] || null,
          abbreviation: this.userModel['abbreviation'] || null,
          businessTypeId: this.userModel['businessTypeId'],
          industryTypeId: this.userModel['industryTypeId'],
          gstRegistrationTypeId: this.userModel['gstRegistrationTypeId'] || null,
          gstNumber: this.userModel['gstNumber'] || null,
          panNumber: this.userModel['panNumber'] || null,
          tanNumber: this.userModel['tanNumber'] || null,
          cinNumber: this.userModel['cinNumber'] || null,
          registrationNumber: this.userModel['registrationNumber'] || null,
          currencyId: this.userModel['currencyId'],
          languageId: this.userModel['languageId'],
          timeZoneId: this.userModel['timeZoneId'],
          isActive: this.userModel['isActive'],
          isBlocked: this.userModel['isBlocked'],
        };
        await this.admin.company.update(editing.id, payload);
      } else {
        const payload: CreateCompanyRequest = {
          companyCode: this.userModel['companyCode']?.trim().toUpperCase(),
          companyName: this.userModel['companyName']?.trim(),
          shortName: this.userModel['shortName'] || null,
          abbreviation: this.userModel['abbreviation'] || null,
          businessTypeId: this.userModel['businessTypeId'],
          industryTypeId: this.userModel['industryTypeId'],
          gstRegistrationTypeId: this.userModel['gstRegistrationTypeId'] || null,
          gstNumber: this.userModel['gstNumber'] || null,
          panNumber: this.userModel['panNumber'] || null,
          tanNumber: this.userModel['tanNumber'] || null,
          cinNumber: this.userModel['cinNumber'] || null,
          registrationNumber: this.userModel['registrationNumber'] || null,
          currencyId: this.userModel['currencyId'],
          languageId: this.userModel['languageId'],
          timeZoneId: this.userModel['timeZoneId'],
        };
        await this.admin.company.create(payload);
      }
      this.showEntry.set(false);
      await this.load();
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteCompany(row: Record<string, any>): Promise<void> {
    if (!confirm(`Delete company "${row['companyName']}"? This cannot be undone.`)) return;
    try {
      await this.admin.company.delete(row['id']);
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