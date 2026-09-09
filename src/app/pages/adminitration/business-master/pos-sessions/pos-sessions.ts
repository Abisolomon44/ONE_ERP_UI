import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { MasterPage, MasterConfig } from '../../../shared/master-page/master-page';
import {
  PosService,
  POSSessionDto,
  CreatePOSSessionRequest,
  UpdatePOSSessionRequest,
} from '../../../../core/services/pos_service';

interface UserOption {
  userId: number;
  username: string;
  fullName: string;
}

interface PaginatedUsers {
  items: UserOption[];
}

type POSSessionRow = POSSessionDto & { status: string };

@Component({
  selector: 'app-pos-sessions',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, MasterPage],
  templateUrl: './pos-sessions.html',
  styleUrl: './pos-sessions.css',
})
export class PosSessionsPage implements OnInit {
  private readonly pos = inject(PosService);
  private readonly http = inject(HttpClient);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showEntry = signal(false);
  protected readonly sessions = signal<POSSessionRow[]>([]);
  protected readonly rawSessions = signal<POSSessionDto[]>([]);
  protected readonly stores = signal<any[]>([]);
  protected readonly counters = signal<any[]>([]);
  protected readonly users = signal<UserOption[]>([]);
  protected readonly editing = signal<POSSessionDto | null>(null);

  protected userModel: Record<string, any> = {};

  protected config: MasterConfig = {
    title: 'POS Sessions',
    description: 'Open and close cashier sessions at store counters',
    icon: 'Receipt',
    api: '/api/pos-sessions',
    permissionName: 'Pos-Sessions',
    createLabel: 'Open Session',

    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    allowImport: false,
    allowExport: true,
    allowRefresh: true,

    columns: [
      { field: 'sessionNumber', header: 'Session No' },
      { field: 'storeName', header: 'Store' },
      { field: 'counterName', header: 'Counter' },
      { field: 'cashierUserName', header: 'Cashier' },
      { field: 'openingCash', header: 'Opening', type: 'currency', width: '110px' },
      { field: 'closingCash', header: 'Closing', type: 'currency', width: '110px' },
      { field: 'status', header: 'Status', type: 'badge', width: '100px' },
    ],

    tabs: [
      {
        name: 'Session',
        fields: ['storeId', 'counterId', 'cashierUserId', 'openingCash', 'closingCash'],
      },
      { name: 'Status', fields: ['status'] },
    ],

    fields: [
      { name: 'storeId', label: 'Store', type: 'dropdown', options: [] },
      { name: 'counterId', label: 'Counter', type: 'dropdown', options: [] },
      { name: 'cashierUserId', label: 'Cashier', type: 'dropdown', options: [] },
      { name: 'openingCash', label: 'Opening Cash', type: 'number', required: true },
      { name: 'closingCash', label: 'Closing Cash', type: 'number' },
      { name: 'status', label: 'Status', type: 'dropdown', readonly: true, options: [
        { value: 1, label: 'Open (1)' },
        { value: 2, label: 'Closed (2)' },
        { value: 3, label: 'Void (3)' },
      ] },
    ],
  };

  ngOnInit(): void {
    void this.loadDropdowns();
    void this.load();
  }

  private statusLabel(status: number): string {
    switch (status) {
      case 1: return 'Open';
      case 2: return 'Closed';
      case 3: return 'Void';
      default: return `Unknown (${status})`;
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const companyId = +(localStorage.getItem('companyId') ?? '1');
      const res = await this.pos.posSessions.getPaged({
        companyId,
        branchId: null,
        page: 1,
        size: 100,
        search: '',
      });
      const raw = res.items ?? [];
      this.rawSessions.set(raw);
      this.sessions.set(raw.map((s) => ({ ...s, status: this.statusLabel(s.status) }) as POSSessionRow));
    } catch (err) {
      console.error('[PosSessionsPage] load failed:', err);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadDropdowns(): Promise<void> {
    try {
      const companyId = +(localStorage.getItem('companyId') ?? '1');

      const [storesRes, countersRes, usersRes] = await Promise.all([
        this.pos.stores.getPaged({ companyId, page: 1, size: 200, search: '' }),
        this.pos.counters.getPaged({ page: 1, size: 200, search: '' }),
        firstValueFrom(this.http.get<PaginatedUsers>(`/api/users?page=1&size=200&search=`)),
      ]);

      const stores = storesRes.items ?? [];
      const counters = countersRes.items ?? [];
      this.stores.set(stores);
      this.counters.set(counters);
      const users = usersRes?.items ?? [];
      this.users.set(users);

      this.setOptions(
        'storeId',
        stores.map((s: any) => ({ value: s.id, label: s.storeName })),
      );
      this.setOptions(
        'counterId',
        counters.map((c: any) => ({ value: c.id, label: c.counterName })),
      );
      this.setOptions(
        'cashierUserId',
        users.map((u) => ({ value: u.userId, label: `${u.fullName} (${u.username})` })),
      );
    } catch (err) {
      console.error('loadDropdowns failed:', err);
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

  protected createSession(): void {
    this.editing.set(null);
    this.userModel = {
      storeId: this.stores()[0]?.id ?? null,
      counterId: this.counters().find((c) => c.storeId === this.userModel['storeId'])?.id ?? null,
      cashierUserId: null,
      openingCash: 0,
      closingCash: null,
      status: 1,
    };
    this.showEntry.set(true);
  }

  protected editSession(row: Record<string, any>): void {
    const original = this.rawSessions().find((s) => s.sessionNumber === row['sessionNumber']) ?? null;
    this.editing.set(original ?? (row as POSSessionDto));
    this.userModel = {
      storeId: original?.storeId ?? row['storeId'] ?? null,
      counterId: original?.counterId ?? row['counterId'] ?? null,
      cashierUserId: original?.cashierUserId ?? row['cashierUserId'] ?? null,
      openingCash: original?.openingCash ?? row['openingCash'] ?? 0,
      closingCash: original?.closingCash ?? row['closingCash'] ?? null,
      status: original?.status ?? row['status'] ?? 1,
    };
    this.showEntry.set(true);
  }

  protected async saveSession(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const editing = this.editing();
      if (editing) {
        const payload: UpdatePOSSessionRequest = {
          closingCash: this.userModel['closingCash'] ?? null,
          status: this.userModel['status'] ?? 2,
        };
        await this.pos.posSessions.update(editing.id, payload);
      } else {
        const storeId = this.userModel['storeId'] ?? null;
        const counterId = this.userModel['counterId'] ?? null;
        const store = this.stores().find((s) => s.id === storeId);
        const counter = this.counters().find((c) => c.id === counterId);
        const user = this.users().find((u) => u.userId === this.userModel['cashierUserId']);
        const payload: CreatePOSSessionRequest = {
          companyId: +(localStorage.getItem('companyId') ?? '1'),
          branchId: store?.branchId ?? null,
          storeId,
          counterId,
          cashierUserId: this.userModel['cashierUserId'] ?? null,
          companyName: null,
          branchName: null,
          storeName: store?.storeName ?? null,
          counterName: counter?.counterName ?? null,
          cashierUserName: user ? user.fullName : null,
          openingCash: this.userModel['openingCash'] ?? 0,
        };
        await this.pos.posSessions.create(payload);
      }
      this.showEntry.set(false);
      await this.load();
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteSession(row: Record<string, any>): Promise<void> {
    if (!confirm(`Void session "${row['sessionNumber']}"? This cannot be undone.`)) return;
    try {
      await this.pos.posSessions.delete(row['id']);
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