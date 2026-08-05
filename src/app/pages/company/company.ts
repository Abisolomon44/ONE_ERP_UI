import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MasterPage, MasterConfig } from '../shared/master-page/master-page';
import { AdministrationService, CompanyDto, CreateCompanyRequest, UpdateCompanyRequest } 
from '../../core/services/master_service';

@Component({
  selector: 'app-company',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, MasterPage],
  templateUrl: './company.html',
  styleUrl: './company.css',
})
export class CompanyPage implements OnInit {
  private readonly admin = inject(AdministrationService);

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
      { name: 'companyCode', label: 'Company Code', type: 'text', required: true, maxLength: 20 },
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
    void this.loadDropdowns();
    void this.load();
  }

  //===========================
  // Data load
  //===========================

private async load(): Promise<void> {
  this.loading.set(true);
  try {
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
    try {
      const [currencies, languages, timeZones, industryTypes, gstTypes] = await Promise.all([
        this.admin.currency.getAll(false),
        this.admin.languages.getAll(false),
        this.admin.timeZones.getAll(false),
        this.admin.industryTypes.getAll(false),
        this.admin.gstRegistrationTypes.getAll(false),
      ]);

      this.setOptions('currencyId', currencies.map((c: any) => ({ value: c.id, label: `${c.currencyCode} - ${c.currencyName}` })));
      this.setOptions('languageId', languages.map((l: any) => ({ value: l.languageId, label: l.name })));
      this.setOptions('timeZoneId', timeZones.map((t: any) => ({ value: t.timeZoneId, label: t.name })));
      this.setOptions('industryTypeId', industryTypes.map((i: any) => ({ value: i.industryTypeId, label: i.name })));
      this.setOptions('gstRegistrationTypeId', gstTypes.map((g: any) => ({ value: g.gstRegistrationTypeId, label: g.name })));

      // Business Type has no dedicated lookup service yet — placeholder until one exists.
      this.setOptions('businessTypeId', [
        { value: 1, label: 'Manufacturing' },
        { value: 2, label: 'Trading' },
        { value: 3, label: 'Services' },
      ]);
    } catch {
    }
  }

  private setOptions(fieldName: string, options: { value: any; label: string }[]): void {
    const field = this.config.fields.find((f) => f.name === fieldName);
    if (field) field.options = options;
  }

  //===========================
  // MasterPage event handlers
  //===========================

  protected createCompany(): void {
    this.editing.set(null);
    this.userModel = {
      companyCode: '',
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