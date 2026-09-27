import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MasterPage, MasterConfig } from '../../../shared/master-page/master-page';
import {
  PosService,
  POSSessionDto,
  CounterOperatorAssignmentDto,
  CreatePOSSessionRequest,
  UpdatePOSSessionRequest,
} from '../../../../core/services/pos_service';

type POSSessionRow = POSSessionDto & { status: string };

const STATUS_OPEN = 1;
const STATUS_CLOSED = 2;
const STATUS_VOID = 3;

@Component({
  selector: 'app-pos-sessions',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, MasterPage],
  templateUrl: './pos-sessions.html',
  styleUrl: './pos-sessions.css',
})
export class PosSessionsPage implements OnInit {
  private readonly pos = inject(PosService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showEntry = signal(false);
  protected readonly sessions = signal<POSSessionRow[]>([]);
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
      { field: 'sessionNumber', header: 'Session No', width: '150px' },
      { field: 'storeName', header: 'Store' },
      { field: 'counterName', header: 'Counter' },
      { field: 'operatorNameSnapshot', header: 'Operator' },
      { field: 'openingCash', header: 'Opening', type: 'currency', width: '110px' },
      { field: 'expectedClosingCash', header: 'Expected', type: 'currency', width: '110px' },
      { field: 'actualClosingCash', header: 'Actual', type: 'currency', width: '110px' },
      { field: 'cashDifference', header: 'Difference', type: 'currency', width: '110px' },
      { field: 'status', header: 'Status', type: 'badge', width: '100px' },
    ],

    tabs: [
      {
        name: 'Session',
        fields: ['storeId', 'counterId', 'operatorId', 'operatorName', 'openingCash', 'closingCash'],
      },
      { name: 'Status', fields: ['status'] },
    ],

    // Company and Branch are context, resolved by the backend from the Store.
    fields: [
      { name: 'storeId', label: 'Store', type: 'dropdown', required: true, options: [] },
      { name: 'counterId', label: 'Counter', type: 'dropdown', required: true, options: [], disabled: true },
      { name: 'operatorId', label: 'Operator', type: 'dropdown', required: true, options: [], disabled: true },
      { name: 'operatorName', label: 'Operator Name', type: 'text', readonly: true },
      { name: 'openingCash', label: 'Opening Cash', type: 'number', required: true },
      { name: 'closingCash', label: 'Closing Cash', type: 'number' },
      {
        name: 'status',
        label: 'Status',
        type: 'dropdown',
        disabled: true,
        options: [
          { value: STATUS_OPEN, label: 'Open' },
          { value: STATUS_CLOSED, label: 'Closed' },
          { value: STATUS_VOID, label: 'Void' },
        ],
      },
    ],
  };

  ngOnInit(): void {
    void this.loadStores();
    void this.load();
  }

  //===========================
  // List
  //===========================

  private statusLabel(status: number): string {
    switch (status) {
      case STATUS_OPEN: return 'Open';
      case STATUS_CLOSED: return 'Closed';
      case STATUS_VOID: return 'Void';
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
      const rows = (res.items ?? []) as POSSessionDto[];
      this.sessions.set(
        rows.map((s) => ({ ...s, status: this.statusLabel(s.status) })) as POSSessionRow[],
      );
    } catch (err) {
      console.error('[PosSessionsPage] load failed:', err);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadStores(): Promise<void> {
    try {
      const companyId = +(localStorage.getItem('companyId') ?? '1');
      const res = await this.pos.stores.getPaged({ companyId, page: 1, size: 200, search: '' });
      this.patchField('storeId', {
        options: (res.items ?? []).map((s) => ({ value: s.id, label: s.storeName })),
      });
    } catch (err) {
      console.error('[PosSessionsPage] loadStores failed:', err);
    }
  }

  //===========================
  // Cascades: Store -> Counter -> Operator
  //===========================

  private async loadCounters(storeId: number): Promise<void> {
    try {
      const res = await this.pos.counters.getPaged({ storeId, page: 1, size: 200, search: '' });
      this.patchField('counterId', {
        options: (res.items ?? []).map((c) => ({ value: c.id, label: c.counterName })),
        disabled: false,
      });
    } catch (err) {
      console.error('[PosSessionsPage] loadCounters failed:', err);
      this.patchField('counterId', { options: [], disabled: true });
    }
  }

  /** Operators are constrained to the counter's active assignments. */
  private async loadOperators(counterId: number): Promise<void> {
    try {
      const assignments = await this.pos.operatorsByCounter(counterId);
      this.patchField('operatorId', {
        options: assignments.map((a: CounterOperatorAssignmentDto) => ({
          value: a.operatorId,
          label: `${a.operatorName} (${a.operatorCode})`,
        })),
        disabled: false,
      });
    } catch (err) {
      console.error('[PosSessionsPage] loadOperators failed:', err);
      this.patchField('operatorId', { options: [], disabled: true });
    }
  }

  protected onFieldChange(event: { name: string; value: any }): void {
    this.userModel[event.name] = event.value;

    if (event.name === 'storeId') {
      this.clearCounterAndOperator();
      if (event.value) void this.loadCounters(event.value);
      return;
    }

    if (event.name === 'counterId') {
      this.clearOperator();
      if (event.value) void this.loadOperators(event.value);
      return;
    }

    if (event.name === 'operatorId') {
      this.userModel['operatorName'] = event.value ? this.operatorName(event.value) : '';
    }
  }

  private operatorName(operatorId: number): string {
    const option = this.fieldByName('operatorId')?.options?.find((o) => o.value === operatorId);
    if (!option) return '';
    const match = option.label.match(/^(.*) \(/);
    return match ? match[1] : option.label;
  }

  /** Counter options are store-scoped, so both are dropped when the store changes. */
  private clearCounterAndOperator(): void {
    this.userModel['counterId'] = null;
    this.userModel['operatorId'] = null;
    this.userModel['operatorName'] = '';
    this.patchField('counterId', { options: [], disabled: true });
    this.patchField('operatorId', { options: [], disabled: true });
  }

  private clearOperator(): void {
    this.userModel['operatorId'] = null;
    this.userModel['operatorName'] = '';
    this.patchField('operatorId', { options: [], disabled: true });
  }

  //===========================
  // Config helpers
  //===========================

  private fieldByName(name: string) {
    return this.config.fields.find((f) => f.name === name);
  }

  private patchField(name: string, patch: Record<string, unknown>): void {
    this.config = {
      ...this.config,
      fields: this.config.fields.map((f) => (f.name === name ? { ...f, ...patch } : f)),
    };
  }

  //===========================
  // Entry lifecycle
  //===========================

  protected createSession(): void {
    this.editing.set(null);
    this.userModel = {
      storeId: null,
      counterId: null,
      operatorId: null,
      operatorName: '',
      openingCash: 0,
      closingCash: null,
      status: STATUS_OPEN,
    };
    this.clearCounterAndOperator();
    // A new session always starts Open and the user cannot choose otherwise.
    this.patchField('status', {
      disabled: true,
      options: [
        { value: STATUS_OPEN, label: 'Open' },
        { value: STATUS_CLOSED, label: 'Closed' },
        { value: STATUS_VOID, label: 'Void' },
      ],
    });
    this.showEntry.set(true);
  }

  protected async editSession(row: Record<string, any>): Promise<void> {
    const session = row as unknown as POSSessionDto;
    this.editing.set(session);
    this.userModel = {
      storeId: session.storeId ?? null,
      counterId: session.counterId ?? null,
      operatorId: session.operatorId ?? null,
      operatorName: session.operatorNameSnapshot ?? '',
      openingCash: session.openingCash ?? 0,
      closingCash: session.actualClosingCash ?? 0,
      status: session.status ?? STATUS_OPEN,
    };

    this.patchField('operatorName', { readonly: true });
    if (session.storeId) await this.loadCounters(session.storeId);
    if (session.counterId) await this.loadOperators(session.counterId);

    // Status is only selectable while the session is still open.
    const closable = session.status === STATUS_OPEN;
    this.patchField('status', {
      disabled: !closable,
      options: closable
        ? [
            { value: STATUS_CLOSED, label: 'Closed' },
            { value: STATUS_VOID, label: 'Void' },
          ]
        : [{ value: session.status, label: this.statusLabel(session.status) }],
    });

    this.showEntry.set(true);
  }

  protected async saveSession(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const editing = this.editing();
      if (editing) {
        const payload: UpdatePOSSessionRequest = {
          actualClosingCash: this.userModel['closingCash'] ?? null,
          status: this.userModel['status'] ?? STATUS_CLOSED,
          version: editing.version ?? null,
        };
        await this.pos.posSessions.update(editing.id, payload);
      } else {
        const payload: CreatePOSSessionRequest = {
          storeId: this.userModel['storeId'],
          counterId: this.userModel['counterId'],
          operatorId: this.userModel['operatorId'],
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
