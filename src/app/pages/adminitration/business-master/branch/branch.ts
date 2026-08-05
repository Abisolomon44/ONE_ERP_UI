import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MasterPage, MasterConfig } from '../../../shared/master-page/master-page';
import { OrganizationService, BranchDto, CreateBranchRequest, UpdateBranchRequest } 
from '../../../../core/services/organization_service';
import { AdministrationService } from '../../../../core/services/master_service';

@Component({
  selector: 'app-branch',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, MasterPage],
  templateUrl: './branch.html',
  styleUrl: './branch.css',
})
export class Branch implements OnInit {
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
      { field: 'city', header: 'City' },
      { field: 'managerName', header: 'Manager' },
      { field: 'phone', header: 'Phone', width: '130px' },
      { field: 'isActive', header: 'Active', type: 'checkbox', width: '90px' },
    ],

    tabs: [
      { name: 'General', fields: ['companyId', 'branchCode', 'branchName', 'branchTypeId'] },
      { name: 'Location', fields: ['city', 'address'] },
      { name: 'Contact', fields: ['managerName', 'phone', 'email'] },
      { name: 'Status', fields: ['isActive'] },
    ],

    fields: [
      { name: 'companyId', label: 'Company', type: 'dropdown', required: true, options: [] },
      { name: 'branchCode', label: 'Branch Code', type: 'text', required: true, maxLength: 20 },
      { name: 'branchName', label: 'Branch Name', type: 'text', required: true, maxLength: 200 },
      { name: 'branchTypeId', label: 'Branch Type', type: 'dropdown', options: [] },

      { name: 'city', label: 'City', type: 'text', maxLength: 100 },
      { name: 'address', label: 'Address', type: 'textarea', maxLength: 500 },

      { name: 'managerName', label: 'Manager Name', type: 'text', maxLength: 100 },
      { name: 'phone', label: 'Phone', type: 'text', maxLength: 20 },
      { name: 'email', label: 'Email', type: 'text', maxLength: 100 },

      { name: 'isActive', label: 'Active', type: 'checkbox' },
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
      const res = await this.org.branches.getPaged({ page: 1, size: 100, search: '' });
      this.branches.set(res.items ?? []);
    } catch (err) {
      console.error('[Branch] load failed:', err);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadDropdowns(): Promise<void> {
    try {
      const [companiesRes, branchTypes] = await Promise.all([
        this.admin.company.getPaged(1, 200, ''),
        this.org.branchTypes.getAll(false),
      ]);

      this.setOptions(
        'companyId',
        (companiesRes.items ?? []).map((c: any) => ({ value: c.id, label: c.companyName })),
      );
      this.setOptions(
        'branchTypeId',
        branchTypes.map((t: any) => ({ value: t.id, label: t.name })),
      );
    } catch {
      /* handled by interceptor */
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
      city: '',
      address: '',
      managerName: '',
      phone: '',
      email: '',
      isActive: true,
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
          branchName: this.userModel['branchName']?.trim(),
          branchTypeId: this.userModel['branchTypeId'] || null,
          city: this.userModel['city'] || null,
          address: this.userModel['address'] || null,
          managerName: this.userModel['managerName'] || null,
          phone: this.userModel['phone'] || null,
          email: this.userModel['email'] || null,
          isActive: this.userModel['isActive'],
        };
        await this.org.branches.update(editing.id, payload);
      } else {
        const payload: CreateBranchRequest = {
          companyId: this.userModel['companyId'],
          branchCode: this.userModel['branchCode']?.trim().toUpperCase(),
          branchName: this.userModel['branchName']?.trim(),
          branchTypeId: this.userModel['branchTypeId'] || null,
          city: this.userModel['city'] || null,
          address: this.userModel['address'] || null,
          managerName: this.userModel['managerName'] || null,
          phone: this.userModel['phone'] || null,
          email: this.userModel['email'] || null,
        };
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