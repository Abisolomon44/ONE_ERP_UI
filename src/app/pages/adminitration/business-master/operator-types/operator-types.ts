import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MasterPage, MasterConfig } from '../../../shared/master-page/master-page';
import {
  PosService,
  OperatorTypeDto,
  CreateOperatorTypeRequest,
  UpdateOperatorTypeRequest,
} from '../../../../core/services/pos_service';
import { AuthService } from '../../../../core/services/auth.service';
import { PermissionService } from '../../../../core/services/permission.service';

@Component({
  selector: 'app-operator-types',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, MasterPage],
  templateUrl: './operator-types.html',
  styleUrl: './operator-types.css',
})
export class OperatorTypesPage implements OnInit {
  private readonly pos = inject(PosService);
  private readonly auth = inject(AuthService);
  private readonly perms = inject(PermissionService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showEntry = signal(false);
  protected readonly operatorTypes = signal<OperatorTypeDto[]>([]);
  protected readonly editing = signal<OperatorTypeDto | null>(null);

  protected userModel: Record<string, any> = {};

  protected config: MasterConfig = {
    title: 'Operator Types',
    description: 'Manage POS operator type classifications',
    icon: 'UserCog',
    api: '/api/operator-types',
    permissionName: 'Operator Types',
    createLabel: 'New Operator Type',

    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    allowImport: false,
    allowExport: true,
    allowRefresh: true,

    columns: [
      { field: 'code', header: 'Code', width: '120px' },
      { field: 'name', header: 'Name' },
      { field: 'description', header: 'Description' },
      { field: 'sortOrder', header: 'Sort Order', type: 'number', width: '100px' },
      { field: 'isActive', header: 'Active', type: 'checkbox', width: '90px' },
    ],

    tabs: [
      { name: 'Details', fields: ['code', 'name', 'description', 'sortOrder', 'isActive'] },
    ],

    fields: [
      {
        name: 'code',
        label: 'Code',
        type: 'text',
        required: true,
        maxLength: 50,
        readonly: false,
      },
      {
        name: 'name',
        label: 'Name',
        type: 'text',
        required: true,
        maxLength: 100,
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        maxLength: 250,
      },
      {
        name: 'sortOrder',
        label: 'Sort Order',
        type: 'number',
        required: true,
      },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  };

  ngOnInit(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await this.pos.operatorTypes.getPaged({
        page: 1,
        size: 100,
        search: '',
      });
      this.operatorTypes.set(res.items ?? []);
    } catch (err) {
      console.error('[OperatorTypesPage] load failed:', err);
    } finally {
      this.loading.set(false);
    }
  }

  protected onFieldChange(event: { name: string; value: any }): void {
    this.userModel[event.name] = event.value;
  }

  protected async createOperatorType(): Promise<void> {
    this.editing.set(null);
    this.userModel = {
      code: '',
      name: '',
      description: '',
      sortOrder: 1,
      isActive: true,
    };
    this.showEntry.set(true);
  }

  protected editOperatorType(row: Record<string, any>): void {
    this.editing.set(row as OperatorTypeDto);
    this.userModel = { ...row };
    this.showEntry.set(true);
  }

  protected async saveOperatorType(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const editing = this.editing();
      if (editing) {
        const payload: UpdateOperatorTypeRequest = {
          code: this.userModel['code']?.trim().toUpperCase(),
          name: this.userModel['name']?.trim(),
          description: this.userModel['description']?.trim(),
          sortOrder: this.userModel['sortOrder'],
          isActive: this.userModel['isActive'],
        };
        await this.pos.operatorTypes.update(editing.id, payload);
      } else {
        const payload: CreateOperatorTypeRequest = {
          code: this.userModel['code']?.trim().toUpperCase(),
          name: this.userModel['name']?.trim(),
          description: this.userModel['description']?.trim(),
          sortOrder: this.userModel['sortOrder'],
          isActive: this.userModel['isActive'],
        };
        await this.pos.operatorTypes.create(payload);
      }
      this.showEntry.set(false);
      await this.load();
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteOperatorType(row: Record<string, any>): Promise<void> {
    if (!confirm(`Delete operator type "${row['name']}"? This cannot be undone.`)) return;
    try {
      await this.pos.operatorTypes.delete(row['id']);
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