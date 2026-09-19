import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MasterPage, MasterConfig } from '../../../shared/master-page/master-page';
import { OrganizationService, DesignationDto, CreateDesignationRequest, UpdateDesignationRequest } from '../../../../core/services/organization_service';
import { AuthService } from '../../../../core/services/auth.service';
import { PermissionService } from '../../../../core/services/permission.service';
import { buildScopeLabel } from '../../../shared/scope-label';

@Component({
  selector: 'app-designation',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, MasterPage],
  templateUrl: './designation.html',
  styleUrl: './designation.css',
})
export class Designation implements OnInit {
  private readonly org = inject(OrganizationService);
  private readonly auth = inject(AuthService);
  private readonly perms = inject(PermissionService);
  private defaultCompanyId = 0;

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showEntry = signal(false);
  protected readonly designations = signal<DesignationDto[]>([]);
  protected readonly editing = signal<DesignationDto | null>(null);

  protected userModel: Record<string, any> = {};

  protected config: MasterConfig = {
    title: 'Designation Master',
    description: 'Manage employee designations',
    icon: 'Award',
    api: '/api/organization/designations',
    permissionName: 'Designations',
    createLabel: 'New Designation',

    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    allowImport: false,
    allowExport: true,
    allowRefresh: true,

    columns: [
      { field: 'designationCode', header: 'Code', width: '100px' },
      { field: 'designationName', header: 'Designation Name' },
      { field: 'companyId', header: 'Company', width: '100px' },
      { field: 'isActive', header: 'Active', type: 'checkbox', width: '90px' },
    ],

    tabs: [
      { name: 'General', fields: ['companyId', 'designationCode', 'designationName', 'level'] },
      { name: 'Status', fields: ['isActive'] },
    ],

    fields: [
      { name: 'companyId', label: 'Company', type: 'dropdown', required: true, options: [] },
      { name: 'designationCode', label: 'Designation Code', type: 'text', required: true, maxLength: 20, readonly: true },
      { name: 'designationName', label: 'Designation Name', type: 'text', required: true, maxLength: 200 },
      { name: 'level', label: 'Level', type: 'number' },
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
        this.designations.set([]);
        return;
      }
      const res = await this.org.designations.getPaged({ companyId, page: 1, size: 100, search: '' });
      this.designations.set(res.items ?? []);
    } catch (err) {
      console.error('[DesignationPage] load failed:', err);
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

  protected async createDesignation(): Promise<void> {
    this.editing.set(null);
    let nextCode = '';
    if (this.defaultCompanyId) {
      try {
        nextCode = await this.org.designations.getNextCode(this.defaultCompanyId);
      } catch {
        nextCode = '';
      }
    }
    this.userModel = {
      companyId: this.defaultCompanyId || null,
      designationCode: nextCode,
      designationName: '',
      level: 0,
      isActive: true,
    };
    this.showEntry.set(true);
  }

  protected editDesignation(row: Record<string, any>): void {
    this.editing.set(row as DesignationDto);
    this.userModel = { ...row };
    this.showEntry.set(true);
  }

  protected async saveDesignation(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const editing = this.editing();
      if (editing) {
        const payload: UpdateDesignationRequest = {
          designationName: this.userModel['designationName']?.trim(),
          level: this.userModel['level'],
          isActive: this.userModel['isActive'],
        };
        await this.org.designations.update(editing.id, payload);
      } else {
        const payload: CreateDesignationRequest = {
          companyId: this.userModel['companyId'],
          designationCode: this.userModel['designationCode']?.trim().toUpperCase(),
          designationName: this.userModel['designationName']?.trim(),
          level: this.userModel['level'],
        };
        await this.org.designations.create(payload);
      }
      this.showEntry.set(false);
      await this.load();
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteDesignation(row: Record<string, any>): Promise<void> {
    if (!confirm(`Delete designation "${row['designationName']}"? This cannot be undone.`)) return;
    try {
      await this.org.designations.delete(row['id']);
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