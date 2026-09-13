import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { BaseEmpty } from '../../shared/base-data';
import { BaseButton } from '../../shared/base-button';
import { BasePermission } from '../../shared/base-permission';
import { User, Paginated } from '../../core/models';
import { OrganizationService } from '../../core/services/organization_service';
import { AdministrationService } from '../../core/services/master_service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

interface ScopeOption {
  id: number;
  label: string;
}

interface OverrideSelection {
  hasScope: boolean;
  companyIds: number[];
  allCompanies: boolean;
  branchIds: number[];
  allBranches: boolean;
  warehouseIds: number[];
  allWarehouses: boolean;
  permissionType: string;
  allow: boolean;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  remarks: string | null;
  isActive: boolean;
}

type ScopeLevel = 'company' | 'branch' | 'warehouse';

@Component({
  selector: 'app-user-data-scope-overrides',
  standalone: true,
  imports: [DatePipe, LucideAngularModule, BaseEmpty, BaseButton, BasePermission],
  templateUrl: './user-data-scope-overrides.html',
  styleUrl: './user-data-scope-overrides.css',
})
export class UserDataScopeOverridesPage {
  private readonly http = inject(HttpClient);
  private readonly org = inject(OrganizationService);
  private readonly admin = inject(AdministrationService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);

  protected readonly selectedUserId = signal<string>('');

  protected readonly userOptions = signal<{ value: number; label: string }[]>([]);

  protected readonly companyOptions = signal<ScopeOption[]>([]);
  protected readonly branchOptions = signal<ScopeOption[]>([]);
  protected readonly warehouseOptions = signal<ScopeOption[]>([]);

  protected readonly companyIds = signal<number[]>([]);
  protected readonly allCompanies = signal(false);
  protected readonly branchIds = signal<number[]>([]);
  protected readonly allBranches = signal(false);
  protected readonly warehouseIds = signal<number[]>([]);
  protected readonly allWarehouses = signal(false);

  protected readonly permissionType = signal('Grant');
  protected readonly allow = signal(true);
  protected readonly effectiveFrom = signal('');
  protected readonly effectiveTo = signal('');
  protected readonly remarks = signal('');
  protected readonly isActive = signal(true);

  constructor() {
    void this.loadUsers();
  }

  protected async onUserChange(): Promise<void> {
    const userId = this.selectedUserId();
    if (!userId) return;
    this.loading.set(true);
    try {
      await Promise.all([this.loadSelection(+userId), this.loadOptions()]);
    } finally {
      this.loading.set(false);
    }
  }

  protected onPermissionTypeChange(): void {
    this.allow.set(this.permissionType() === 'Grant');
  }

  protected async save(): Promise<void> {
    const userId = parseInt(this.selectedUserId(), 10);
    if (!userId) return;

    this.saving.set(true);
    try {
      const payload = {
        companyIds: this.companyIds(),
        allCompanies: this.allCompanies(),
        branchIds: this.branchIds(),
        allBranches: this.allBranches(),
        warehouseIds: this.warehouseIds(),
        allWarehouses: this.allWarehouses(),
        permissionType: this.permissionType(),
        allow: this.allow(),
        effectiveFrom: this.effectiveFrom() || null,
        effectiveTo: this.effectiveTo() || null,
        remarks: this.remarks() || null,
        isActive: this.isActive(),
      };
      await firstValueFrom(
        this.http.post(`/api/user-data-scope-overrides/user/${userId}/replace`, payload),
      );
      this.toast.success('Override saved');
      await this.loadSelection(userId);
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  //===========================
  // Checkbox list helpers (mirror Data Scopes)
  //===========================

  protected isAll(level: ScopeLevel): boolean {
    return level === 'company' ? this.allCompanies() : level === 'branch' ? this.allBranches() : this.allWarehouses();
  }

  protected ids(level: ScopeLevel): number[] {
    return level === 'company' ? this.companyIds() : level === 'branch' ? this.branchIds() : this.warehouseIds();
  }

  protected options(level: ScopeLevel): ScopeOption[] {
    return level === 'company' ? this.companyOptions() : level === 'branch' ? this.branchOptions() : this.warehouseOptions();
  }

  protected isChecked(level: ScopeLevel, id: number): boolean {
    return this.ids(level).includes(id);
  }

  protected selectedCompanyNames(): string {
    const names = this.companyIds().map((id) => this.companyOptions().find((o) => o.id === id)?.label).filter((n): n is string => !!n);
    return names.join(', ');
  }

  protected toggleAll(level: ScopeLevel, checked: boolean): void {
    const all = level === 'company' ? this.allCompanies : level === 'branch' ? this.allBranches : this.allWarehouses;
    const ids = level === 'company' ? this.companyIds : level === 'branch' ? this.branchIds : this.warehouseIds;
    all.set(checked);
    if (checked) ids.set([]);

    if (level === 'company') {
      this.branchOptions.set([]);
      this.warehouseOptions.set([]);
    }
  }

  protected toggleItem(level: ScopeLevel, id: number, checked: boolean): void {
    const all = level === 'company' ? this.allCompanies : level === 'branch' ? this.allBranches : this.allWarehouses;
    const ids = level === 'company' ? this.companyIds : level === 'branch' ? this.branchIds : this.warehouseIds;

    if (checked) {
      if (all()) {
        all.set(false);
        ids.set([id]);
      } else if (!ids().includes(id)) {
        ids.set([...ids(), id]);
      }
    } else {
      ids.set(ids().filter((x) => x !== id));
    }

    if (level === 'company') {
      if (this.allCompanies() || this.companyIds().length === 0) {
        this.branchOptions.set([]);
        this.warehouseOptions.set([]);
      } else {
        void this.loadChildOptions(this.companyIds());
      }
    }
  }

  //===========================
  // Loading
  //===========================

  private async loadUsers(): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<Paginated<User>>('/api/users?page=1&size=1000&search='));
      this.userOptions.set(res.items.map((u) => ({ value: u.userId, label: `${u.fullName} (${u.username})` })));
    } catch {
      /* handled by interceptor */
    }
  }

  private async loadSelection(userId: number): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<OverrideSelection>(`/api/user-data-scope-overrides/user/${userId}/selection`));
      this.companyIds.set(res.companyIds ?? []);
      this.allCompanies.set(res.allCompanies ?? !res.hasScope);
      this.branchIds.set(res.branchIds ?? []);
      this.allBranches.set(res.allBranches ?? !res.hasScope);
      this.warehouseIds.set(res.warehouseIds ?? []);
      this.allWarehouses.set(res.allWarehouses ?? !res.hasScope);
      this.permissionType.set(res.permissionType ?? 'Grant');
      this.allow.set(res.allow ?? true);
      this.effectiveFrom.set(res.effectiveFrom?.toString().slice(0, 16) ?? '');
      this.effectiveTo.set(res.effectiveTo?.toString().slice(0, 16) ?? '');
      this.remarks.set(res.remarks ?? '');
      this.isActive.set(res.isActive ?? true);
    } catch {
      /* handled by interceptor */
    }
  }

  private async loadOptions(): Promise<void> {
    try {
      const companies = await this.admin.company.getPaged(1, 1000);
      this.companyOptions.set(companies.items.map((c) => ({ id: c.id, label: c.companyName })));
    } catch {
      const myCompany = this.auth.company();
      this.companyOptions.set(myCompany ? [{ id: myCompany.id, label: myCompany.companyName }] : []);
    }

    // Branch/Warehouse lists follow the selected companies (union).
    if (this.allCompanies()) {
      this.branchOptions.set([]);
      this.warehouseOptions.set([]);
      return;
    }
    const targetIds = this.companyIds().length > 0
      ? this.companyIds()
      : [this.companyOptions()[0]?.id].filter((x): x is number => x != null);
    await this.loadChildOptions(targetIds);
  }

  private async loadChildOptions(companyIds: number[]): Promise<void> {
    const branchMap = new Map<number, string>();
    const warehouseMap = new Map<number, string>();

    await Promise.all(
      companyIds.map(async (companyId) => {
        try {
          const branches = await this.org.branches.getPaged({ companyId, page: 1, size: 1000 });
          for (const b of branches.items ?? []) branchMap.set(b.id, b.branchName);
        } catch {
          /* skipped */
        }
        try {
          const warehouses = await this.org.warehouses.getPaged({ companyId, page: 1, size: 1000 });
          for (const w of warehouses.items ?? []) warehouseMap.set(w.id, w.warehouseName);
        } catch {
          /* skipped */
        }
      }),
    );

    this.branchOptions.set([...branchMap].map(([id, label]) => ({ id, label })));
    this.warehouseOptions.set([...warehouseMap].map(([id, label]) => ({ id, label })));
  }
}