import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MasterPage, MasterConfig } from '../shared/master-page/master-page';
import { MasterRow } from '../shared/master.model';
import {
  BillingMasterService,
  ServiceCategoryDto,
  CreateServiceCategoryRequest,
  UpdateServiceCategoryRequest,
} from '../../core/services/master_service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionService } from '../../core/services/permission.service';

@Component({
  selector: 'app-service-category',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, MasterPage],
  templateUrl: './service-category.html',
  styleUrl: './service-category.css',
})
export class ServiceCategoryPage implements OnInit {
  private readonly billing = inject(BillingMasterService);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showEntry = signal(false);
  protected readonly rows = signal<MasterRow[]>([]);
  protected readonly editing = signal<ServiceCategoryDto | null>(null);

  protected userModel: Record<string, any> = {};

  protected config: MasterConfig = {
    title: 'Service Categories',
    description: 'Manage categories for services',
    icon: 'FolderTree',
    api: '/api/service-categories',
    permissionName: 'service-categories',
    createLabel: 'New Category',
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    allowImport: false,
    allowExport: false,
    allowRefresh: true,
    tabs: [],
    columns: [
      { field: 'code', header: 'Code', width: '130px' },
      { field: 'name', header: 'Name' },
      { field: 'displayOrder', header: 'Order', width: '90px' },
      { field: 'isActive', header: 'Active', type: 'checkbox', width: '90px' },
    ],
    fields: [
      { name: 'code', label: 'Code', type: 'text', required: true, maxLength: 30, readonly: true },
      { name: 'name', label: 'Name', type: 'text', required: true, maxLength: 100 },
      { name: 'description', label: 'Description', type: 'textarea', maxLength: 300 },
      { name: 'displayOrder', label: 'Display Order', type: 'number' },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  };

  ngOnInit(): void {
    if (!this.perm.has('service-categories.view')) {
      this.loading.set(false);
      return;
    }
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      if (!this.perm.has('service-categories.view')) {
        this.rows.set([]);
        return;
      }
      const res = await this.billing.serviceCategories.getPaged(1, 100, '');
      this.rows.set((res.items ?? []).map((x) => ({ ...x, id: x.serviceCategoryId }) as MasterRow));
    } catch {
    } finally {
      this.loading.set(false);
    }
  }

  protected async createRow(): Promise<void> {
    this.editing.set(null);
    let nextCode = '';
    try {
      nextCode = await this.billing.serviceCategories.getNextCode();
    } catch {
      /* code will be generated server-side on save */
    }
    this.userModel = { code: nextCode, name: '', description: '', displayOrder: 0, isActive: true };
    this.showEntry.set(true);
  }

  protected editRow(row: Record<string, any>): void {
    this.editing.set(row as ServiceCategoryDto);
    this.userModel = { ...row };
    this.showEntry.set(true);
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const editing = this.editing();
      const payload: CreateServiceCategoryRequest = {
        code: this.userModel['code']?.trim().toUpperCase(),
        name: this.userModel['name']?.trim(),
        description: this.userModel['description'] || null,
        displayOrder: this.userModel['displayOrder'] ?? 0,
      };
      if (editing) {
        const updatePayload: UpdateServiceCategoryRequest = {
          ...payload,
          description: this.userModel['description'] || null,
          displayOrder: this.userModel['displayOrder'] ?? 0,
          isActive: this.userModel['isActive'],
        };
        await this.billing.serviceCategories.update(editing.serviceCategoryId, updatePayload);
      } else {
        await this.billing.serviceCategories.create(payload);
      }
      this.showEntry.set(false);
      await this.load();
    } catch {
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteRow(row: Record<string, any>): Promise<void> {
    if (!confirm(`Delete category "${row['name']}"? This cannot be undone.`)) return;
    try {
      await this.billing.serviceCategories.delete(row['serviceCategoryId']);
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