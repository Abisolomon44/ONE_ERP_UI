import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MasterPage, MasterConfig } from '../../../shared/master-page/master-page';
import {
  PosService,
  StoreTypeDto,
  CreateStoreTypeRequest,
  UpdateStoreTypeRequest,
} from '../../../../core/services/pos_service';

@Component({
  selector: 'app-store-types',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, MasterPage],
  templateUrl: './store-types.html',
  styleUrl: './store-types.css',
})
export class StoreTypesPage implements OnInit {
  private readonly pos = inject(PosService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showEntry = signal(false);
  protected readonly storeTypes = signal<StoreTypeDto[]>([]);
  protected readonly editing = signal<StoreTypeDto | null>(null);

  protected userModel: Record<string, any> = {};

  protected config: MasterConfig = {
    title: 'Store Types',
    description: 'Manage store type classifications (Retail, Wholesale, Warehouse, etc.)',
    icon: 'Tag',
    api: '/api/store-types',
    permissionName: 'StoreTypes',
    createLabel: 'New Store Type',

    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    allowImport: false,
    allowExport: true,
    allowRefresh: true,

    columns: [
      { field: 'code', header: 'Code', width: '100px' },
      { field: 'name', header: 'Name' },
      { field: 'description', header: 'Description' },
      { field: 'isActive', header: 'Active', type: 'checkbox', width: '90px' },
    ],

    tabs: [
      { name: 'Details', fields: ['code', 'name', 'description', 'isActive'] },
    ],

    fields: [
      {
        name: 'code',
        label: 'Code',
        type: 'text',
        required: true,
        maxLength: 50,
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
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  };

  ngOnInit(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await this.pos.storeTypes.getPaged({
        page: 1,
        size: 100,
        search: '',
      });
      this.storeTypes.set(res.items ?? []);
    } catch (err) {
      console.error('[StoreTypesPage] load failed:', err);
    } finally {
      this.loading.set(false);
    }
  }

  protected onFieldChange(event: { name: string; value: any }): void {
    this.userModel[event.name] = event.value;
  }

  protected async createStoreType(): Promise<void> {
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

  protected editStoreType(row: Record<string, any>): void {
    this.editing.set(row as StoreTypeDto);
    this.userModel = { ...row };
    this.showEntry.set(true);
  }

  protected async saveStoreType(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const editing = this.editing();
      if (editing) {
        const payload: UpdateStoreTypeRequest = {
          name: this.userModel['name']?.trim(),
          description: this.userModel['description']?.trim() || null,
          isActive: this.userModel['isActive'],
        };
        await this.pos.storeTypes.update(editing.id, payload);
      } else {
        const payload: CreateStoreTypeRequest = {
          code: this.userModel['code']?.trim().toUpperCase(),
          name: this.userModel['name']?.trim(),
          description: this.userModel['description']?.trim() || null,
          sortOrder: this.userModel['sortOrder'] ?? 1,
          isActive: this.userModel['isActive'],
        };
        await this.pos.storeTypes.create(payload);
      }
      this.showEntry.set(false);
      await this.load();
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteStoreType(row: Record<string, any>): Promise<void> {
    if (!confirm(`Delete store type "${row['name']}"? This cannot be undone.`)) return;
    try {
      await this.pos.storeTypes.delete(row['id']);
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