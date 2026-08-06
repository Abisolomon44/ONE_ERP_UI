import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MasterPage, MasterConfig } from '../shared/master-page/master-page';
import { OrganizationService, BranchDto, CreateBranchRequest, UpdateBranchRequest } from '../../core/services/organization_service';
import { AdministrationService } from '../../core/services/master_service';

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