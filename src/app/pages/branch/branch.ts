import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { MasterPage, MasterConfig, MasterToolbarAction } from '../shared/master-page/master-page';
import { OrganizationService, BranchDto, CreateBranchRequest, UpdateBranchRequest } from '../../core/services/organization_service';
import { AdministrationService } from '../../core/services/master_service';
import { ToastService } from '../../core/services/toast.service';
import { Action } from '../../core/models';

@Component({
  selector: 'app-branch',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, MasterPage],
  templateUrl: './branch.html',
  styleUrl: './branch.css',
})
export class BranchPage implements OnInit {
  private readonly org = inject(OrganizationService);
  private readonly admin = inject(AdministrationService);
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showEntry = signal(false);
  protected readonly branches = signal<BranchDto[]>([]);
  protected readonly editing = signal<BranchDto | null>(null);

  protected userModel: Record<string, any> = {};

  protected config: MasterConfig = {
    title: 'Branch Master',
    description: 'Manage branches under each company',
    icon: 'GitBranch',
    api: '/api/organization/branches',
    permissionName: 'Branches',
    createLabel: 'New Branch',

    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    allowImport: false,
    allowExport: true,
    allowRefresh: true,

    columns: [
      { field: 'branchCode', header: 'Code', width: '100px' },
      { field: 'branchName', header: 'Branch Name' },
      { field: 'companyId', header: 'Company', width: '100px' },
      { field: 'gstNumber', header: 'GST No.' },
      { field: 'isActive', header: 'Active', type: 'checkbox', width: '90px' },
      { field: 'isBlocked', header: 'Blocked', type: 'checkbox', width: '90px' },
    ],

    tabs: [
      { name: 'General', fields: ['companyId', 'branchCode', 'branchName', 'branchTypeId', 'parentBranchId'] },
      { name: 'Tax', fields: ['gstNumber', 'registrationNumber'] },
      { name: 'Flags', fields: ['isHeadOffice', 'isSalesBranch', 'isPurchaseBranch', 'isServiceBranch'] },
      { name: 'Status', fields: ['isActive', 'isBlocked', 'sortOrder'] },
    ],

    fields: [
      { name: 'companyId', label: 'Company', type: 'dropdown', required: true, options: [] },
      { name: 'branchCode', label: 'Branch Code', type: 'text', required: true, maxLength: 20 },
      { name: 'branchName', label: 'Branch Name', type: 'text', required: true, maxLength: 200 },
      { name: 'branchTypeId', label: 'Branch Type', type: 'dropdown', options: [] },
      { name: 'parentBranchId', label: 'Parent Branch', type: 'dropdown', options: [] },

      { name: 'gstNumber', label: 'GST Number', type: 'text', maxLength: 15 },
      { name: 'registrationNumber', label: 'Registration No.', type: 'text' },

      { name: 'isHeadOffice', label: 'Head Office', type: 'checkbox' },
      { name: 'isSalesBranch', label: 'Sales Branch', type: 'checkbox' },
      { name: 'isPurchaseBranch', label: 'Purchase Branch', type: 'checkbox' },
      { name: 'isServiceBranch', label: 'Service Branch', type: 'checkbox' },

      { name: 'sortOrder', label: 'Sort Order', type: 'number' },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
      { name: 'isBlocked', label: 'Blocked', type: 'checkbox' },
    ],
  };

  ngOnInit(): void {
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
    const rows = this.branches();
    if (!rows.length) {
      this.toast.info('No records to export');
      return;
    }
    const headers = ['branchCode', 'branchName', 'companyId', 'gstNumber', 'isActive', 'isBlocked'];
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
    a.download = 'branches.csv';
    a.click();
    URL.revokeObjectURL(url);
    this.toast.success('Exported branches.csv');
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
        if (!row['branchCode'] || !row['branchName']) {
          fail++;
          continue;
        }
        const payload: CreateBranchRequest = {
          companyId: +(row['companyId'] ?? localStorage.getItem('companyId') ?? '1'),
          branchCode: String(row['branchCode']).toUpperCase(),
          branchName: row['branchName'],
          shortName: row['shortName'] || null,
          branchTypeId: row['branchTypeId'] ? +row['branchTypeId'] : null,
          parentBranchId: row['parentBranchId'] ? +row['parentBranchId'] : null,
          gstNumber: row['gstNumber'] || null,
          registrationNumber: row['registrationNumber'] || null,
          isHeadOffice: row['isHeadOffice'] === 'true',
          isSalesBranch: row['isSalesBranch'] === 'true',
          isPurchaseBranch: row['isPurchaseBranch'] === 'true',
          isServiceBranch: row['isServiceBranch'] === 'true',
          sortOrder: row['sortOrder'] ? +row['sortOrder'] : 0,
          isActive: row['isActive'] !== 'false',
        };
        try {
          await this.org.branches.create(payload);
          ok++;
        } catch {
          fail++;
        }
      }
      this.toast.success(`Imported ${ok} branch(es)${fail ? `, ${fail} failed` : ''}`);
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
      const companyId = this.userModel['companyId'] ?? +(localStorage.getItem('companyId') ?? '1');
      const res = await this.org.branches.getPaged({ companyId, page: 1, size: 100, search: '' });
      this.branches.set(res.items ?? []);
    } catch (err) {
      console.error('[BranchPage] load failed:', err);
    } finally {
      this.loading.set(false);
    }
  }
private async loadDropdowns(): Promise<void> {
  try {
    const companyId =
      this.userModel['companyId'] ??
      +(localStorage.getItem('companyId') ?? '1');

    const [companiesRes, branchTypes] = await Promise.all([
      this.admin.company.getPaged(1, 200, ''),
      this.org.branchTypes.getAll(false),
    ]);

    const companyOptions = (companiesRes.items ?? []).map((c: any) => ({
      value: c.id,
      label: c.companyName,
    }));

    const branchTypeOptions = (branchTypes ?? []).map((t: any) => ({
      value: t.branchTypeId,
      label: t.name,
    }));

    this.setOptions('companyId', companyOptions);
    this.setOptions('branchTypeId', branchTypeOptions);

    const branchesRes = await this.org.branches.getPaged({
      companyId,
      page: 1,
      size: 200,
      search: '',
    });

    const parentBranchOptions = (branchesRes.items ?? []).map((b: any) => ({
      value: b.id,
      label: b.branchName,
    }));

    this.setOptions('parentBranchId', parentBranchOptions);
  } catch (err) {
    console.error('loadDropdowns error:', err);
  }
}

  private setOptions(fieldName: string, options: { value: any; label: string }[]): void {
    const field = this.config.fields.find((f) => f.name === fieldName);
    if (field) field.options = options;
  }

  //===========================
  // MasterPage event handlers
  //===========================

  protected createBranch(): void {
    this.editing.set(null);
    this.userModel = {
      companyId: null,
      branchCode: '',
      branchName: '',
      branchTypeId: null,
      parentBranchId: null,
      gstNumber: '',
      registrationNumber: '',
      isHeadOffice: false,
      isSalesBranch: false,
      isPurchaseBranch: false,
      isServiceBranch: false,
      sortOrder: 0,
      isActive: true,
      isBlocked: false,
    };
    this.showEntry.set(true);
  }

  protected editBranch(row: Record<string, any>): void {
    this.editing.set(row as BranchDto);
    this.userModel = { ...row };
    this.showEntry.set(true);
  }

  protected async saveBranch(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const editing = this.editing();
      if (editing) {
        const payload: UpdateBranchRequest = {
          branchCode: this.userModel['branchCode']?.trim(),
          branchName: this.userModel['branchName']?.trim(),
          shortName: this.userModel['shortName'] || null,
          branchTypeId: this.userModel['branchTypeId'] || null,
          parentBranchId: this.userModel['parentBranchId'] || null,
          gstNumber: this.userModel['gstNumber'] || null,
          registrationNumber: this.userModel['registrationNumber'] || null,
          isHeadOffice: this.userModel['isHeadOffice'],
          isSalesBranch: this.userModel['isSalesBranch'],
          isPurchaseBranch: this.userModel['isPurchaseBranch'],
          isServiceBranch: this.userModel['isServiceBranch'],
          sortOrder: this.userModel['sortOrder'],
          isActive: this.userModel['isActive'],
          isBlocked: this.userModel['isBlocked'],
        };
        await this.org.branches.update(editing.id, payload);
      } else {
        const payload: CreateBranchRequest = {
          companyId: this.userModel['companyId'],
          branchCode: this.userModel['branchCode']?.trim().toUpperCase(),
          branchName: this.userModel['branchName']?.trim(),
          shortName: this.userModel['shortName'] || null,
          branchTypeId: this.userModel['branchTypeId'] || null,
          parentBranchId: this.userModel['parentBranchId'] || null,
          gstNumber: this.userModel['gstNumber'] || null,
          registrationNumber: this.userModel['registrationNumber'] || null,
          isHeadOffice: this.userModel['isHeadOffice'],
          isSalesBranch: this.userModel['isSalesBranch'],
          isPurchaseBranch: this.userModel['isPurchaseBranch'],
          isServiceBranch: this.userModel['isServiceBranch'],
          sortOrder: this.userModel['sortOrder'],
          isActive: this.userModel['isActive'],
        };

        console.log('========== CREATE BRANCH ==========');
console.log(payload);
console.log('CompanyId:', payload.companyId);
console.log('BranchCode:', payload.branchCode);
console.log('BranchName:', payload.branchName);
console.log('BranchTypeId:', payload.branchTypeId);
console.log('ParentBranchId:', payload.parentBranchId);
console.log('===================================');

await this.org.branches.create(payload);
      }
      this.showEntry.set(false);
      await this.load();
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteBranch(row: Record<string, any>): Promise<void> {
    if (!confirm(`Delete branch "${row['branchName']}"? This cannot be undone.`)) return;
    try {
      await this.org.branches.delete(row['id']);
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