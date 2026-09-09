import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MasterPage, MasterConfig } from '../../../shared/master-page/master-page';
import {
  PosService,
  CounterDto,
  CreateCounterRequest,
  UpdateCounterRequest,
} from '../../../../core/services/pos_service';

@Component({
  selector: 'app-counters',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, MasterPage],
  templateUrl: './counters.html',
  styleUrl: './counters.css',
})
export class CountersPage implements OnInit {
  private readonly pos = inject(PosService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showEntry = signal(false);
  protected readonly counters = signal<CounterDto[]>([]);
  protected readonly stores = signal<any[]>([]);
  protected readonly editing = signal<CounterDto | null>(null);

  protected userModel: Record<string, any> = {};

  protected config: MasterConfig = {
    title: 'Counters',
    description: 'Manage POS counters/workstations within stores',
    icon: 'Monitor',
    api: '/api/counters',
    permissionName: 'Counters',
    createLabel: 'New Counter',

    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    allowImport: false,
    allowExport: true,
    allowRefresh: true,

    columns: [
      { field: 'counterCode', header: 'Code', width: '100px' },
      { field: 'counterName', header: 'Counter Name' },
      { field: 'storeId', header: 'Store', width: '110px' },
      { field: 'isActive', header: 'Active', type: 'checkbox', width: '90px' },
    ],

    tabs: [
      { name: 'General', fields: ['storeId', 'counterCode', 'counterName'] },
      { name: 'Status', fields: ['isActive'] },
    ],

    fields: [
      { name: 'storeId', label: 'Store', type: 'dropdown', required: true, options: [] },
      {
        name: 'counterCode',
        label: 'Counter Code',
        type: 'text',
        required: true,
        maxLength: 20,
      },
      {
        name: 'counterName',
        label: 'Counter Name',
        type: 'text',
        required: true,
        maxLength: 200,
      },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  };

  ngOnInit(): void {
    void this.loadStores();
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const storeId = this.userModel['storeId'] ?? null;
      const res = await this.pos.counters.getPaged({
        storeId,
        page: 1,
        size: 100,
        search: '',
      });
      this.counters.set(res.items ?? []);
    } catch (err) {
      console.error('[CountersPage] load failed:', err);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadStores(): Promise<void> {
    try {
      const stores = await this.pos.stores.getPaged({
        companyId: +(localStorage.getItem('companyId') ?? '1'),
        page: 1,
        size: 200,
        search: '',
      });
      this.stores.set(stores.items ?? []);
      this.setOptions(
        'storeId',
        (stores.items ?? []).map((s: any) => ({
          value: s.id,
          label: s.storeName,
        })),
      );
    } catch (err) {
      console.error('loadStores failed:', err);
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

  protected createCounter(): void {
    this.editing.set(null);
    this.userModel = {
      storeId: this.stores()[0]?.id ?? null,
      counterCode: '',
      counterName: '',
      isActive: true,
    };
    this.showEntry.set(true);
  }

  protected editCounter(row: Record<string, any>): void {
    this.editing.set(row as CounterDto);
    this.userModel = { ...row };
    this.showEntry.set(true);
  }

  protected async saveCounter(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const editing = this.editing();
      if (editing) {
        const payload: UpdateCounterRequest = {
          counterName: this.userModel['counterName']?.trim(),
          isActive: this.userModel['isActive'],
        };
        await this.pos.counters.update(editing.id, payload);
      } else {
        const payload: CreateCounterRequest = {
          storeId: this.userModel['storeId'],
          counterCode: this.userModel['counterCode']?.trim().toUpperCase(),
          counterName: this.userModel['counterName']?.trim(),
          isActive: this.userModel['isActive'],
        };
        await this.pos.counters.create(payload);
      }
      this.showEntry.set(false);
      await this.load();
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteCounter(row: Record<string, any>): Promise<void> {
    if (!confirm(`Delete counter "${row['counterName']}"? This cannot be undone.`)) return;
    try {
      await this.pos.counters.delete(row['id']);
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