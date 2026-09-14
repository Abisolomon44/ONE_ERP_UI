import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { MasterPage, MasterConfig } from '../../../shared/master-page/master-page';
import {
  OrganizationService,
  EmployeeDto,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
} from '../../../../core/services/organization_service';
import { AuthService } from '../../../../core/services/auth.service';
import { PermissionService } from '../../../../core/services/permission.service';
import { buildScopeLabel } from '../../../shared/scope-label';

@Component({
  selector: 'app-employee',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, MasterPage],
  templateUrl: './employee.html',
  styleUrl: './employee.css',
})
export class Employee implements OnInit {
  private readonly org = inject(OrganizationService);
  private readonly auth = inject(AuthService);
  private readonly perms = inject(PermissionService);
  private readonly http = inject(HttpClient);
  private defaultCompanyId = 0;

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showEntry = signal(false);
  protected readonly employees = signal<EmployeeDto[]>([]);
  protected readonly editing = signal<EmployeeDto | null>(null);

  protected userModel: Record<string, any> = {};

  protected config: MasterConfig = {
    title: 'Employees',
    description: 'Manage employee profiles under each branch',
    icon: 'Users',
    api: '/api/organization/employees',
    permissionName: 'Employees',
    createLabel: 'New Employee',

    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    allowImport: false,
    allowExport: true,
    allowRefresh: true,

    columns: [
      { field: 'employeeCode', header: 'Code', width: '110px' },
      { field: 'firstName', header: 'First Name' },
      { field: 'lastName', header: 'Last Name' },
      { field: 'departmentId', header: 'Department' },
      { field: 'designationId', header: 'Designation' },
      { field: 'mobileNo', header: 'Mobile' },
      { field: 'officialEmail', header: 'Email' },
      { field: 'isActive', header: 'Active', type: 'checkbox', width: '90px' },
    ],

    tabs: [
      {
        name: 'General',
        fields: [
          'companyId', 'branchId', 'employeeCode', 'employeeNumber', 'firstName', 'middleName',
          'lastName', 'displayName', 'departmentId', 'designationId', 'employmentTypeId',
          'reportingManagerId',
        ],
      },
      {
        name: 'Personal',
        fields: ['genderId', 'maritalStatusId', 'dateOfBirth', 'dateOfJoining', 'dateOfLeaving', 'remarks'],
      },
      {
        name: 'Contact',
        fields: ['officialEmail', 'personalEmail', 'mobileNo', 'alternateMobileNo'],
      },
      { name: 'Status', fields: ['isActive', 'isBlocked'] },
    ],

    fields: [
      { name: 'companyId', label: 'Company', type: 'dropdown', required: true, options: [] },
      { name: 'branchId', label: 'Branch', type: 'dropdown', options: [] },
      { name: 'employeeCode', label: 'Employee Code', type: 'text', required: true, maxLength: 30 },
      { name: 'employeeNumber', label: 'Employee Number', type: 'text', maxLength: 30 },
      { name: 'firstName', label: 'First Name', type: 'text', required: true, maxLength: 100 },
      { name: 'middleName', label: 'Middle Name', type: 'text', maxLength: 100 },
      { name: 'lastName', label: 'Last Name', type: 'text', maxLength: 100 },
      { name: 'displayName', label: 'Display Name', type: 'text', maxLength: 150 },
      { name: 'departmentId', label: 'Department', type: 'dropdown', options: [] },
      { name: 'designationId', label: 'Designation', type: 'dropdown', options: [] },
      { name: 'employmentTypeId', label: 'Employment Type', type: 'dropdown', options: [] },
      { name: 'reportingManagerId', label: 'Reporting Manager', type: 'dropdown', options: [] },
      { name: 'genderId', label: 'Gender', type: 'dropdown', options: [] },
      { name: 'maritalStatusId', label: 'Marital Status', type: 'dropdown', options: [] },
      { name: 'dateOfBirth', label: 'Date of Birth', type: 'date' },
      { name: 'dateOfJoining', label: 'Date of Joining', type: 'date' },
      { name: 'dateOfLeaving', label: 'Date of Leaving', type: 'date' },
      { name: 'officialEmail', label: 'Official Email', type: 'email', maxLength: 150 },
      { name: 'personalEmail', label: 'Personal Email', type: 'email', maxLength: 150 },
      { name: 'mobileNo', label: 'Mobile Number', type: 'text', maxLength: 30 },
      { name: 'alternateMobileNo', label: 'Alternate Mobile', type: 'text', maxLength: 30 },
      { name: 'remarks', label: 'Remarks', type: 'textarea', maxLength: 500 },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
      { name: 'isBlocked', label: 'Blocked', type: 'checkbox' },
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
        this.employees.set([]);
        return;
      }
      const branchId = this.userModel['branchId'] ?? null;
      const res = await this.org.employees.getPaged({ companyId, branchId, page: 1, size: 100, search: '' });
      this.employees.set(res.items ?? []);
    } catch (err) {
      console.error('[EmployeePage] load failed:', err);
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
      this.setOptions('branchId', branches.map((b) => ({ value: b.id, label: b.name })));

      const companyId = this.userModel['companyId'] ?? this.defaultCompanyId;
      try {
        const departmentsRes = await this.org.departments.getPaged({
          companyId,
          branchId: null,
          page: 1,
          size: 200,
          search: '',
        });
        this.setOptions(
          'departmentId',
          (departmentsRes.items ?? []).map((d: any) => ({ value: d.id, label: d.departmentName })),
        );
      } catch {
        this.setOptions('departmentId', []);
      }

      try {
        const designationsRes = await this.org.designations.getPaged({
          companyId,
          branchId: null,
          page: 1,
          size: 200,
          search: '',
        });
        this.setOptions(
          'designationId',
          (designationsRes.items ?? []).map((d: any) => ({ value: d.id, label: d.designationName })),
        );
      } catch {
        this.setOptions('designationId', []);
      }

      try {
        const employeesRes = await this.org.employees.getPaged({
          companyId,
          branchId: null,
          page: 1,
          size: 200,
          search: '',
        });
        this.setOptions(
          'reportingManagerId',
          (employeesRes.items ?? []).map((e: any) => ({ value: e.id, label: `${e.firstName} ${e.lastName ?? ''}`.trim() })),
        );
      } catch {
        this.setOptions('reportingManagerId', []);
      }

      try {
        const employmentTypesRes = await this.org.employmentTypes.getAll(false);
        this.setOptions(
          'employmentTypeId',
          (employmentTypesRes ?? []).map((t: any) => ({ value: t.id, label: t.name })),
        );
      } catch {
        this.setOptions('employmentTypeId', []);
      }
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

  protected createEmployee(): void {
    this.editing.set(null);
    this.userModel = {
      companyId: this.defaultCompanyId || null,
      branchId: null,
      employeeCode: '',
      employeeNumber: '',
      firstName: '',
      middleName: '',
      lastName: '',
      displayName: '',
      departmentId: null,
      designationId: null,
      employmentTypeId: null,
      reportingManagerId: null,
      genderId: null,
      maritalStatusId: null,
      dateOfBirth: null,
      dateOfJoining: null,
      dateOfLeaving: null,
      officialEmail: '',
      personalEmail: '',
      mobileNo: '',
      alternateMobileNo: '',
      remarks: '',
      isActive: true,
      isBlocked: false,
      addresses: [],
      contacts: [],
      files: [],
      notes: [],
      tags: [],
    };
    this.config = { ...this.config, tabs: this.withEntityTab() };
    this.showEntry.set(true);
  }

  protected async editEmployee(row: Record<string, any>): Promise<void> {
    this.editing.set(row as EmployeeDto);
    this.userModel = {
      ...row,
      addresses: [],
      contacts: [],
      files: [],
      notes: [],
      tags: [],
    };
    this.config = { ...this.config, tabs: this.withEntityTab() };
    this.showEntry.set(true);

    const entityId = row['entityId'] ?? row['EntityId'];
    if (entityId == null) return;
    try {
      const entity = await this.loadEntity(entityId);
      if (entity) {
        this.userModel['addresses'] = entity.addresses ?? [];
        this.userModel['contacts'] = entity.contacts ?? [];
        this.userModel['files'] = entity.files ?? [];
        this.userModel['notes'] = entity.notes ?? [];
        this.userModel['tags'] = entity.tags ?? [];
      }
    } catch {
      /* entity fetch is optional; tab stays empty */
    }
  }

  private async loadEntity(entityId: number): Promise<any | null> {
    const res: any = await firstValueFrom(this.http.get(`/api/entities/${entityId}`));
    return res ?? null;
  }

  private withEntityTab() {
    const tabs = this.config.tabs;
    if (tabs.some(t => t.entity)) return tabs;
    return [...tabs, { name: 'Address & Contacts', fields: [] as string[], entity: true as const }];
  }

  protected async saveEmployee(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const editing = this.editing();
      if (editing) {
        const payload: UpdateEmployeeRequest = {
          branchId: this.userModel['branchId'] || null,
          departmentId: this.userModel['departmentId'] || null,
          designationId: this.userModel['designationId'] || null,
          employeeNumber: this.userModel['employeeNumber'] || null,
          firstName: this.userModel['firstName']?.trim(),
          middleName: this.userModel['middleName'] || null,
          lastName: this.userModel['lastName'] || null,
          displayName: this.userModel['displayName'] || null,
          genderId: this.userModel['genderId'] || null,
          maritalStatusId: this.userModel['maritalStatusId'] || null,
          dateOfBirth: this.userModel['dateOfBirth'] || null,
          dateOfJoining: this.userModel['dateOfJoining'] || null,
          dateOfLeaving: this.userModel['dateOfLeaving'] || null,
          officialEmail: this.userModel['officialEmail'] || null,
          personalEmail: this.userModel['personalEmail'] || null,
          mobileNo: this.userModel['mobileNo'] || null,
          alternateMobileNo: this.userModel['alternateMobileNo'] || null,
          reportingManagerId: this.userModel['reportingManagerId'] || null,
          employmentTypeId: this.userModel['employmentTypeId'] || null,
          remarks: this.userModel['remarks'] || null,
          isActive: this.userModel['isActive'],
          isBlocked: this.userModel['isBlocked'] ?? false,
          entityId: this.userModel['entityId'] ?? this.userModel['EntityId'] ?? null,
        };
        await this.org.employees.update(editing.id, payload);
      } else {
        const hasEntityData =
          (this.userModel['addresses']?.length > 0) ||
          (this.userModel['contacts']?.length > 0) ||
          (this.userModel['files']?.length > 0) ||
          (this.userModel['notes']?.length > 0) ||
          (this.userModel['tags']?.length > 0);

        let entityId: number | null = this.userModel['entityId'] as number | null ?? null;
        if (entityId == null && hasEntityData) {
          const entityPayload: any = {
            entityType: 'EMPLOYEE',
            entityCode: this.userModel['employeeCode']?.trim().toUpperCase(),
            entityName: this.userModel['displayName']?.trim() || `${this.userModel['firstName'] ?? ''} ${this.userModel['lastName'] ?? ''}`.trim(),
            isActive: true,
            addresses: this.userModel['addresses'] ?? [],
            contacts: this.userModel['contacts'] ?? [],
            files: this.userModel['files'] ?? [],
            notes: this.userModel['notes'] ?? [],
            tags: this.userModel['tags'] ?? [],
          };
          const entity: any = await firstValueFrom(this.http.post('/api/entities', entityPayload));
          entityId = entity?.entityId ?? entity?.EntityId ?? null;
        }

        const payload: CreateEmployeeRequest = {
          companyId: this.userModel['companyId'],
          branchId: this.userModel['branchId'] || null,
          departmentId: this.userModel['departmentId'] || null,
          designationId: this.userModel['designationId'] || null,
          employeeCode: this.userModel['employeeCode']?.trim().toUpperCase(),
          employeeNumber: this.userModel['employeeNumber'] || null,
          firstName: this.userModel['firstName']?.trim(),
          middleName: this.userModel['middleName'] || null,
          lastName: this.userModel['lastName'] || null,
          displayName: this.userModel['displayName'] || null,
          genderId: this.userModel['genderId'] || null,
          maritalStatusId: this.userModel['maritalStatusId'] || null,
          dateOfBirth: this.userModel['dateOfBirth'] || null,
          dateOfJoining: this.userModel['dateOfJoining'] || null,
          dateOfLeaving: this.userModel['dateOfLeaving'] || null,
          officialEmail: this.userModel['officialEmail'] || null,
          personalEmail: this.userModel['personalEmail'] || null,
          mobileNo: this.userModel['mobileNo'] || null,
          alternateMobileNo: this.userModel['alternateMobileNo'] || null,
          reportingManagerId: this.userModel['reportingManagerId'] || null,
          employmentTypeId: this.userModel['employmentTypeId'] || null,
          remarks: this.userModel['remarks'] || null,
          entityId,
        };
        await this.org.employees.create(payload);
      }
      this.showEntry.set(false);
      await this.load();
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteEmployee(row: Record<string, any>): Promise<void> {
    if (!confirm(`Delete employee "${row['firstName'] ?? ''} ${row['lastName'] ?? ''}"? This cannot be undone.`)) return;
    try {
      await this.org.employees.delete(row['id']);
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