import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MasterPage, MasterConfig } from '../../../shared/master-page/master-page';
import {
  PosService,
  CounterOperatorAssignmentDto,
  CreateCounterAssignmentRequest,
  UpdateCounterAssignmentRequest,
  CounterDto,
  OperatorDto,
  StoreDto,
} from '../../../../core/services/pos_service';

@Component({
  selector: 'app-counter-assignments',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, MasterPage],
  templateUrl: './counter-assignments.html',
  styleUrl: './counter-assignments.css',
})
export class CounterAssignmentsPage implements OnInit {
  private readonly pos = inject(PosService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showEntry = signal(false);
  protected readonly assignments = signal<CounterOperatorAssignmentDto[]>([]);
  protected readonly stores = signal<StoreDto[]>([]);
  protected readonly counters = signal<CounterDto[]>([]);
  protected readonly operators = signal<OperatorDto[]>([]);
  protected readonly editing = signal<CounterOperatorAssignmentDto | null>(null);

  protected userModel: Record<string, any> = {};

  protected config: MasterConfig = {
    title: 'Counter Assignments',
    description: 'Manage operator assignments to store counters',
    icon: 'Users',
    api: '/api/counter-assignments',
    permissionName: 'CounterAssignments',
    createLabel: 'New Assignment',

    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    allowImport: false,
    allowExport: true,
    allowRefresh: true,

    columns: [
      { field: 'storeName', header: 'Store', width: '150px' },
      { field: 'counterCode', header: 'Counter', width: '100px' },
      { field: 'operatorCode', header: 'Operator Code', width: '120px' },
      { field: 'operatorName', header: 'Operator Name' },
      { field: 'isPrimary', header: 'Primary', type: 'checkbox', width: '80px' },
      { field: 'validFrom', header: 'Valid From', type: 'date', width: '110px' },
      { field: 'validTo', header: 'Valid To', type: 'date', width: '110px' },
      { field: 'isActive', header: 'Active', type: 'checkbox', width: '80px' },
    ],

    tabs: [
      { name: 'Assignment', fields: ['storeId', 'counterId', 'operatorId', 'isPrimary'] },
      { name: 'Validity', fields: ['validFrom', 'validTo', 'isActive'] },
    ],

    fields: [
      { name: 'storeId', label: 'Store', type: 'dropdown', required: true, options: [] },
      { name: 'counterId', label: 'Counter', type: 'dropdown', required: true, options: [], disabled: true },
      { name: 'operatorId', label: 'Operator', type: 'dropdown', required: true, options: [] },
      { name: 'isPrimary', label: 'Primary Operator', type: 'checkbox' },
      { name: 'validFrom', label: 'Valid From', type: 'date' },
      { name: 'validTo', label: 'Valid To', type: 'date' },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  };

  ngOnInit(): void {
    void this.loadStores();
    void this.loadOperators();
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const storeId = this.userModel['storeId'] ?? null;
      const res = await this.pos.counterAssignments.getPaged({
        storeId,
        page: 1,
        size: 100,
        search: '',
      });
      this.assignments.set(res.items ?? []);
    } catch (err) {
      console.error('[CounterAssignmentsPage] load failed:', err);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadStores(): Promise<void> {
    try {
      const companyId = +(localStorage.getItem('companyId') ?? '1');
      const res = await this.pos.stores.getPaged({
        companyId,
        page: 1,
        size: 200,
        search: '',
      });
      this.stores.set(res.items ?? []);
      this.setOptions(
        'storeId',
        (res.items ?? []).map((s: any) => ({
          value: s.id,
          label: s.storeName,
        })),
      );
    } catch (err) {
      console.error('loadStores failed:', err);
    }
  }

  private async loadOperators(): Promise<void> {
    try {
      const companyId = +(localStorage.getItem('companyId') ?? '1');
      const res = await this.pos.operators.getPaged({
        companyId,
        page: 1,
        size: 200,
        search: '',
      });
      this.operators.set(res.items ?? []);
      this.setOptions(
        'operatorId',
        (res.items ?? []).map((o: any) => ({
          value: o.id,
          label: `${o.operatorCode} - ${o.operatorName}`,
        })),
      );
    } catch (err) {
      console.error('loadOperators failed:', err);
    }
  }

  private async loadCounters(storeId: number): Promise<void> {
    try {
      const res = await this.pos.counters.getPaged({
        storeId,
        page: 1,
        size: 200,
        search: '',
      });
      this.counters.set(res.items ?? []);
      this.setOptions(
        'counterId',
        (res.items ?? []).map((c: any) => ({
          value: c.id,
          label: `${c.counterCode} - ${c.counterName}`,
        })),
      );
      // Enable counter dropdown
      this.setFieldDisabled('counterId', false);
    } catch (err) {
      console.error('loadCounters failed:', err);
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

  private setFieldDisabled(fieldName: string, disabled: boolean): void {
    this.config = {
      ...this.config,
      fields: this.config.fields.map((f) =>
        f.name === fieldName ? { ...f, disabled } : f
      ),
    };
  }

  protected onFieldChange(event: { name: string; value: any }): void {
    this.userModel[event.name] = event.value;
    if (event.name === 'storeId' && !this.editing()) {
      this.userModel['counterId'] = null;
      if (event.value) {
        this.loadCounters(event.value);
      } else {
        this.counters.set([]);
        this.setOptions('counterId', []);
        this.setFieldDisabled('counterId', true);
      }
    }
  }

  protected async createAssignment(): Promise<void> {
    this.editing.set(null);
    this.userModel = {
      storeId: this.stores()[0]?.id ?? null,
      counterId: null,
      operatorId: null,
      isPrimary: false,
      validFrom: null,
      validTo: null,
      isActive: true,
    };
    // Reset counter dropdown
    this.counters.set([]);
    this.setOptions('counterId', []);
    this.setFieldDisabled('counterId', true);
    // Load counters for default store
    if (this.userModel['storeId']) {
      await this.loadCounters(this.userModel['storeId']);
    }
    this.showEntry.set(true);
  }

  protected editAssignment(row: Record<string, any>): void {
    this.editing.set(row as CounterOperatorAssignmentDto);
    this.userModel = { ...row };
    // Load counters for the store
    if (this.userModel['storeId']) {
      this.loadCounters(this.userModel['storeId']);
    }
    this.showEntry.set(true);
  }

  protected async saveAssignment(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const editing = this.editing();
      if (editing) {
        const payload: UpdateCounterAssignmentRequest = {
          isPrimary: this.userModel['isPrimary'],
          validFrom: this.userModel['validFrom'] || null,
          validTo: this.userModel['validTo'] || null,
          isActive: this.userModel['isActive'],
        };
        await this.pos.counterAssignments.update(editing.id, payload);
      } else {
        const companyId = +(localStorage.getItem('companyId') ?? '1');
        const payload: CreateCounterAssignmentRequest = {
          companyId,
          storeId: this.userModel['storeId'],
          counterId: this.userModel['counterId'],
          operatorId: this.userModel['operatorId'],
          isPrimary: this.userModel['isPrimary'],
          validFrom: this.userModel['validFrom'] || null,
          validTo: this.userModel['validTo'] || null,
          isActive: this.userModel['isActive'],
        };
        await this.pos.counterAssignments.create(payload);
      }
      this.showEntry.set(false);
      await this.load();
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteAssignment(row: Record<string, any>): Promise<void> {
    if (!confirm(`Delete assignment for "${row['operatorName']}" at "${row['storeName']}"? This cannot be undone.`)) return;
    try {
      await this.pos.counterAssignments.delete(row['id']);
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