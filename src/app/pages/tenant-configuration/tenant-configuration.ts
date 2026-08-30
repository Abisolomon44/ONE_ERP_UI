import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import {
  TenantConfigurationService,
  TenantConfigurationDto,
  UpdateTenantConfigurationRequest,
  CreateTenantConfigurationRequest,
} from '../../core/services/master_service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionService } from '../../core/services/permission.service';

@Component({
  selector: 'app-tenant-configuration',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  templateUrl: './tenant-configuration.html',
  styleUrl: './tenant-configuration.css',
})
export class TenantConfigurationPage implements OnInit {
  private readonly svc = inject(TenantConfigurationService);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);

  protected readonly loading = signal(false);
  protected readonly canView = signal(false);
  protected readonly canManage = signal(false);
  protected readonly rows = signal<TenantConfigurationDto[]>([]);
  protected readonly savingId = signal<number | null>(null);
  protected readonly newRow = signal<Partial<TenantConfigurationDto> | null>(null);

  async ngOnInit(): Promise<void> {
    this.canView.set(this.perm.has('tenant-config.view'));
    this.canManage.set(this.perm.has('tenant-config.manage'));
    if (this.canView()) await this.load();
  }

  private async load(): Promise<void> {
    try {
      this.loading.set(true);
      const list = await this.svc.getAll();
      this.rows.set(list ?? []);
    } catch (e: any) {
      this.toast.error('Failed to load configuration', e?.error?.message ?? e?.message ?? '');
    } finally {
      this.loading.set(false);
    }
  }

  protected async save(r: TenantConfigurationDto): Promise<void> {
    if (r.id == null) return;
    const req: UpdateTenantConfigurationRequest = {
      applicationType: r.applicationType,
      transactionType: r.transactionType ?? null,
      flowType: r.flowType ?? null,
      pageCode: r.pageCode ?? null,
      fieldCode: r.fieldCode ?? null,
      sequenceNo: r.sequenceNo ?? null,
      isPageEnabled: r.isPageEnabled,
      isVisible: r.isVisible,
      isRequired: r.isRequired,
      isReadonly: r.isReadonly,
      displayOrder: r.displayOrder ?? null,
      defaultValue: r.defaultValue ?? null,
      isActive: r.isActive,
    };
    try {
      this.savingId.set(r.id);
      await this.svc.update(r.id, req);
      this.toast.success('Saved', `${r.fieldCode ?? r.pageCode} updated`);
      await this.load();
    } catch (e: any) {
      this.toast.error('Save failed', e?.error?.message ?? e?.message ?? '');
    } finally {
      this.savingId.set(null);
    }
  }

  protected async remove(r: TenantConfigurationDto): Promise<void> {
    if (r.id == null) return;
    try {
      this.savingId.set(r.id);
      await this.svc.delete(r.id);
      this.toast.success('Deleted', `${r.fieldCode ?? r.pageCode} removed`);
      await this.load();
    } catch (e: any) {
      this.toast.error('Delete failed', e?.error?.message ?? e?.message ?? '');
    } finally {
      this.savingId.set(null);
    }
  }

  protected startAdd(): void {
    this.newRow.set({
      applicationType: 'ERP_BILLING',
      transactionType: '',
      flowType: '',
      pageCode: '',
      fieldCode: '',
      sequenceNo: null,
      isPageEnabled: true,
      isVisible: true,
      isRequired: false,
      isReadonly: false,
      displayOrder: null,
      defaultValue: '',
      isActive: true,
    });
  }

  protected cancelAdd(): void {
    this.newRow.set(null);
  }

  protected async saveNew(): Promise<void> {
    const nr = this.newRow();
    if (!nr || !nr.applicationType) {
      this.toast.error('Missing data', 'Application type is required');
      return;
    }
    const req: CreateTenantConfigurationRequest = {
      applicationType: nr.applicationType!,
      transactionType: nr.transactionType ?? null,
      flowType: nr.flowType ?? null,
      pageCode: nr.pageCode ?? null,
      fieldCode: nr.fieldCode ?? null,
      sequenceNo: nr.sequenceNo ?? null,
      isPageEnabled: nr.isPageEnabled ?? true,
      isVisible: nr.isVisible ?? true,
      isRequired: nr.isRequired ?? false,
      isReadonly: nr.isReadonly ?? false,
      displayOrder: nr.displayOrder ?? null,
      defaultValue: nr.defaultValue ?? null,
      isActive: nr.isActive ?? true,
    };
    try {
      this.savingId.set(-1);
      await this.svc.create(req);
      this.toast.success('Created', `${nr.fieldCode ?? nr.pageCode} added`);
      this.newRow.set(null);
      await this.load();
    } catch (e: any) {
      this.toast.error('Create failed', e?.error?.message ?? e?.message ?? '');
    } finally {
      this.savingId.set(null);
    }
  }

  protected trackById(_: number, r: TenantConfigurationDto): number {
    return r.id;
  }
}
