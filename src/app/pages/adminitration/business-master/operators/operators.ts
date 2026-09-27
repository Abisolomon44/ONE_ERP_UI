import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MasterPage, MasterConfig } from '../../../shared/master-page/master-page';
import {
  PosService,
  OperatorDto,
  OperatorTypeDto,
  UserDto,
  CreateOperatorRequest,
  UpdateOperatorRequest,
} from '../../../../core/services/pos_service';
import { AuthService } from '../../../../core/services/auth.service';
import { PermissionService } from '../../../../core/services/permission.service';

@Component({
  selector: 'app-operators',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, MasterPage],
  templateUrl: './operators.html',
  styleUrl: './operators.css',
})
export class OperatorsPage implements OnInit {
  private readonly pos = inject(PosService);
  private readonly auth = inject(AuthService);
  private readonly perms = inject(PermissionService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showEntry = signal(false);
  protected readonly operators = signal<OperatorDto[]>([]);
  protected readonly operatorTypes = signal<OperatorTypeDto[]>([]);
  protected readonly users = signal<UserDto[]>([]);
  protected readonly editing = signal<OperatorDto | null>(null);

  protected userModel: Record<string, any> = {};

  protected config: MasterConfig = {
    title: 'Operators',
    description: 'Manage POS operators/cashiers',
    icon: 'User',
    api: '/api/operators',
    permissionName: 'Operators',
    createLabel: 'New Operator',

    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    allowImport: false,
    allowExport: true,
    allowRefresh: true,

    columns: [
      { field: 'operatorCode', header: 'Code', width: '100px' },
      { field: 'operatorName', header: 'Operator Name' },
      { field: 'userName', header: 'User', width: '150px' },
      { field: 'isActive', header: 'Active', type: 'checkbox', width: '90px' },
    ],

    tabs: [
      { name: 'Details', fields: ['userId', 'operatorTypeId', 'operatorCode', 'operatorName', 'isActive'] },
    ],

    fields: [
      { name: 'userId', label: 'User', type: 'dropdown', required: true, options: [] },
      { name: 'operatorTypeId', label: 'Operator Type', type: 'dropdown', required: true, options: [] },
      {
        name: 'operatorCode',
        label: 'Operator Code',
        type: 'text',
        required: true,
        maxLength: 50,
        readonly: true,
      },
      {
        name: 'operatorName',
        label: 'Operator Name',
        type: 'text',
        required: true,
        maxLength: 150,
      },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  };

  ngOnInit(): void {
    void this.loadOperatorTypes();
    void this.loadUsers();
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const companyId = +(localStorage.getItem('companyId') ?? '1');
      const res = await this.pos.operators.getPaged({
        companyId,
        page: 1,
        size: 100,
        search: '',
      });
      this.operators.set(res.items ?? []);
    } catch (err) {
      console.error('[OperatorsPage] load failed:', err);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadOperatorTypes(): Promise<void> {
    try {
      const res = await this.pos.operatorTypes.getPaged({
        page: 1,
        size: 100,
        search: '',
      });
      const types = (res.items ?? []).filter((t: OperatorTypeDto) => t.isActive);
      this.operatorTypes.set(types);
      this.setOptions(
        'operatorTypeId',
        types.map((t: OperatorTypeDto) => ({
          value: t.id,
          label: t.name,
        })),
      );
    } catch (err) {
      console.error('loadOperatorTypes failed:', err);
    }
  }

  private async loadUsers(): Promise<void> {
    try {
      const companyId = +(localStorage.getItem('companyId') ?? '1');
      const res = await this.pos.users.getPaged({
        companyId,
        page: 1,
        size: 200,
        search: '',
      });
      const userList = (res.items ?? []).filter((u: UserDto) => u.status === 'Active');
      this.users.set(userList);
      this.setOptions(
        'userId',
        userList.map((u: UserDto) => ({
          value: u.userId,
          label: `${u.username} - ${u.fullName}`,
        })),
      );
    } catch (err) {
      console.error('loadUsers failed:', err);
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

  protected generatedCode = '';

  protected onFieldChange(event: { name: string; value: any }): void {
    this.userModel[event.name] = event.value;
  }

  protected async generateOperatorCode(): Promise<void> {
    const companyId = +(localStorage.getItem('companyId') ?? '1');
    this.generatedCode = '';
    try {
      this.generatedCode = await this.pos.operators.getNextCode(companyId);
      this.userModel['operatorCode'] = this.generatedCode;
    } catch {
      this.userModel['operatorCode'] = '';
    }
  }

  protected async createOperator(): Promise<void> {
    this.editing.set(null);
    this.userModel = {
      userId: null,
      operatorTypeId: null,
      operatorCode: '',
      operatorName: '',
      isActive: true,
    };
    this.showEntry.set(true);
    await this.generateOperatorCode();
  }

  protected editOperator(row: Record<string, any>): void {
    this.editing.set(row as OperatorDto);
    this.userModel = { ...row };
    this.showEntry.set(true);
  }

  protected async saveOperator(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const editing = this.editing();
      if (editing) {
        const payload: UpdateOperatorRequest = {
          operatorName: this.userModel['operatorName']?.trim(),
          isActive: this.userModel['isActive'],
        };
        await this.pos.operators.update(editing.id, payload);
      } else {
        const companyId = +(localStorage.getItem('companyId') ?? '1');
        const payload: CreateOperatorRequest = {
          companyId,
          userId: this.userModel['userId'],
          operatorTypeId: this.userModel['operatorTypeId'],
          operatorCode: this.userModel['operatorCode']?.trim().toUpperCase(),
          operatorName: this.userModel['operatorName']?.trim(),
          isActive: this.userModel['isActive'],
        };
        await this.pos.operators.create(payload);
      }
      this.showEntry.set(false);
      await this.load();
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteOperator(row: Record<string, any>): Promise<void> {
    if (!confirm(`Delete operator "${row['operatorName']}"? This cannot be undone.`)) return;
    try {
      await this.pos.operators.delete(row['id']);
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