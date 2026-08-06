import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MasterPage, MasterConfig } from '../../../shared/master-page/master-page';
import { OrganizationService, DepartmentDto, CreateDepartmentRequest, UpdateDepartmentRequest } from '../../../../core/services/organization_service';
import { AdministrationService } from '../../../../core/services/master_service';

@Component({
  selector: 'app-department',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, MasterPage],
  templateUrl: './department.html',
  styleUrl: './department.css',
})
export class Department implements OnInit {
  private readonly org = inject(OrganizationService);
  private readonly admin = inject(AdministrationService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showEntry = signal(false);
  protected readonly departments = signal<DepartmentDto[]>([]);
  protected readonly editing = signal<DepartmentDto | null>(null);

  protected userModel: Record<string, any> = {};

  protected config: MasterConfig = {
    title: 'Department Master',
    description: 'Manage departments under each branch',
    icon: 'Network',
    api: '/api/organization/departments',
    permissionName: 'Departments',
    createLabel: 'New Department',

    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    allowImport: false,
    allowExport: true,
    allowRefresh: true,

    columns: [
      { field: 'departmentCode', header: 'Code', width: '100px' },
      { field: 'departmentName', header: 'Department Name' },
      { field: 'companyId', header: 'Company', width: '100px' },
      { field: 'branchId', header: 'Branch', width: '100px' },
      { field: 'isActive', header: 'Active', type: 'checkbox', width: '90px' },
    ],

    tabs: [
      { name: 'General', fields: ['companyId', 'branchId', 'departmentCode', 'departmentName', 'parentDepartmentId', 'headEmployeeId'] },
      { name: 'Status', fields: ['isActive'] },
    ],

    fields: [
      { name: 'companyId', label: 'Company', type: 'dropdown', required: true, options: [] },
      { name: 'branchId', label: 'Branch', type: 'dropdown', options: [] },
      { name: 'departmentCode', label: 'Department Code', type: 'text', required: true, maxLength: 20 },
      { name: 'departmentName', label: 'Department Name', type: 'text', required: true, maxLength: 200 },
      { name: 'parentDepartmentId', label: 'Parent Department', type: 'dropdown', options: [] },
      { name: 'headEmployeeId', label: 'Head Employee', type: 'dropdown', options: [] },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  };

  ngOnInit(): void {
    void this.loadDropdowns();
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const companyId = this.userModel['companyId'] ?? +(localStorage.getItem('companyId') ?? '1');
      const branchId = this.userModel['branchId'] ?? null;
      const res = await this.org.departments.getPaged({ companyId, branchId, page: 1, size: 100, search: '' });
      this.departments.set(res.items ?? []);
    } catch (err) {
      console.error('[DepartmentPage] load failed:', err);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadDropdowns(): Promise<void> {
    try {
      const companyId =
        this.userModel['companyId'] ??
        +(localStorage.getItem('companyId') ?? '1');

      const [companiesRes, branchesRes] = await Promise.all([
        this.admin.company.getPaged(1, 200, ''),
        this.org.branches.getPaged({ companyId, page: 1, size: 200, search: '' }),
      ]);

      const companyOptions = (companiesRes.items ?? []).map((c: any) => ({
        value: c.id,
        label: c.companyName,
      }));

      const branchOptions = (branchesRes.items ?? []).map((b: any) => ({
        value: b.id,
        label: b.branchName,
      }));

      this.setOptions('companyId', companyOptions);
      this.setOptions('branchId', branchOptions);

      const departmentsRes = await this.org.departments.getPaged({
        companyId,
        branchId: null,
        page: 1,
        size: 200,
        search: '',
      });

      const parentDeptOptions = (departmentsRes.items ?? []).map((d: any) => ({
        value: d.id,
        label: d.departmentName,
      }));

      this.setOptions('parentDepartmentId', parentDeptOptions);

      const employeesRes = await this.org.employees.getPaged({
        companyId,
        branchId: null,
        page: 1,
        size: 200,
        search: '',
      });

      const employeeOptions = (employeesRes.items ?? []).map((e: any) => ({
        value: e.id,
        label: `${e.firstName} ${e.lastName ?? ''}`.trim(),
      }));

      this.setOptions('headEmployeeId', employeeOptions);
    } catch (err) {
      console.error('loadDropdowns error:', err);
    }
  }

  private setOptions(fieldName: string, options: { value: any; label: string }[]): void {
    this.config = {
      ...this.config,
      fields: this.config.fields.map((f) =>
        f.name === fieldName ? { ...f, options } : f
      ),
    };
  }

  protected createDepartment(): void {
    this.editing.set(null);
    this.userModel = {
      companyId: null,
      branchId: null,
      departmentCode: '',
      departmentName: '',
      parentDepartmentId: null,
      headEmployeeId: null,
      isActive: true,
    };
    this.showEntry.set(true);
  }

  protected editDepartment(row: Record<string, any>): void {
    this.editing.set(row as DepartmentDto);
    this.userModel = { ...row };
    this.showEntry.set(true);
  }

  protected async saveDepartment(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const editing = this.editing();
      if (editing) {
        const payload: UpdateDepartmentRequest = {
          departmentName: this.userModel['departmentName']?.trim(),
          branchId: this.userModel['branchId'] || null,
          parentDepartmentId: this.userModel['parentDepartmentId'] || null,
          headEmployeeId: this.userModel['headEmployeeId'] || null,
          isActive: this.userModel['isActive'],
        };
        await this.org.departments.update(editing.id, payload);
      } else {
        const payload: CreateDepartmentRequest = {
          companyId: this.userModel['companyId'],
          branchId: this.userModel['branchId'] || null,
          departmentCode: this.userModel['departmentCode']?.trim().toUpperCase(),
          departmentName: this.userModel['departmentName']?.trim(),
          parentDepartmentId: this.userModel['parentDepartmentId'] || null,
          headEmployeeId: this.userModel['headEmployeeId'] || null,
        };
        await this.org.departments.create(payload);
      }
      this.showEntry.set(false);
      await this.load();
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteDepartment(row: Record<string, any>): Promise<void> {
    if (!confirm(`Delete department "${row['departmentName']}"? This cannot be undone.`)) return;
    try {
      await this.org.departments.delete(row['id']);
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