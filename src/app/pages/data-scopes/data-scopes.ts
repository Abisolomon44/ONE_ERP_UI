import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { BaseEmpty } from '../../shared/base-data';
import { BaseButton } from '../../shared/base-button';
import { BasePermission } from '../../shared/base-permission';
import { Role } from '../../core/models';
import { OrganizationService } from '../../core/services/organization_service';
import { AdministrationService } from '../../core/services/master_service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

interface ScopeOption {
  id: number;
  label: string;
}

interface ScopeSelection {
  hasScope: boolean;
  companyIds: number[];
  allCompanies: boolean;
  branchIds: number[];
  allBranches: boolean;
  warehouseIds: number[];
  allWarehouses: boolean;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isActive: boolean;
}

type ScopeLevel = 'company' | 'branch' | 'warehouse';

@Component({
  selector: 'app-data-scopes',
  standalone: true,
  imports: [LucideAngularModule, BaseEmpty, BaseButton, BasePermission],
  templateUrl: './data-scopes.html',
  styleUrl: './data-scopes.css',
})
export class DataScopesPage {
  private readonly http = inject(HttpClient);
  private readonly org = inject(OrganizationService);
  private readonly admin = inject(AdministrationService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);

  protected readonly selectedRoleId = signal<string>('');

  protected readonly roleOptions = signal<{ value: number; label: string }[]>([]);

  protected readonly companyOptions = signal<ScopeOption[]>([]);
  protected readonly branchOptions = signal<ScopeOption[]>([]);
  protected readonly warehouseOptions = signal<ScopeOption[]>([]);

  /** Company whose branches/warehouses the lists currently show. */
  protected readonly activeCompanyId = signal<number | null>(null);

  protected readonly companyIds = signal<number[]>([]);
  protected readonly allCompanies = signal(false);
  protected readonly branchIds = signal<number[]>([]);
  protected readonly allBranches = signal(false);
  protected readonly warehouseIds = signal<number[]>([]);
  protected readonly allWarehouses = signal(false);

  protected readonly canView = signal(true);
  protected readonly canCreate = signal(false);
  protected readonly canEdit = signal(false);
  protected readonly canDelete = signal(false);
  protected readonly isActive = signal(true);

  constructor() {
    void this.loadRoles();
  }

  protected async onRoleChange(): Promise<void> {
    const roleId = this.selectedRoleId();
    if (!roleId) return;
    this.loading.set(true);
    try {
      await Promise.all([this.loadSelection(+roleId), this.loadOptions()]);
    } finally {
      this.loading.set(false);
    }
  }

  protected async save(): Promise<void> {
    const roleId = parseInt(this.selectedRoleId(), 10);
    if (!roleId) return;

    this.saving.set(true);
    try {
      await firstValueFrom(
        this.http.post(`/api/data-scopes/role/${roleId}/replace`, {
          companyIds: this.companyIds(),
          allCompanies: this.allCompanies(),
          branchIds: this.branchIds(),
          allBranches: this.allBranches(),
          warehouseIds: this.warehouseIds(),
          allWarehouses: this.allWarehouses(),
          canView: this.canView(),
          canCreate: this.canCreate(),
          canEdit: this.canEdit(),
          canDelete: this.canDelete(),
          isActive: this.isActive(),
        }),
      );
      this.toast.success('Data scope saved');
      await this.loadSelection(roleId);
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  //===========================
  // Checkbox list helpers
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
      this.activeCompanyId.set(null);
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
      this.activeCompanyId.set(this.companyIds()[0] ?? null);
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

  private async loadRoles(): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<Role[]>('/api/roles'));
      this.roleOptions.set(res.map((r) => ({ value: r.roleId, label: r.name })));
    } catch {
      /* handled by interceptor */
    }
  }

  private async loadSelection(roleId: number): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<ScopeSelection>(`/api/data-scopes/role/${roleId}/selection`));
      this.companyIds.set(res.companyIds ?? []);
      this.allCompanies.set(res.allCompanies ?? !res.hasScope);
      this.branchIds.set(res.branchIds ?? []);
      this.allBranches.set(res.allBranches ?? !res.hasScope);
      this.warehouseIds.set(res.warehouseIds ?? []);
      this.allWarehouses.set(res.allWarehouses ?? !res.hasScope);
      this.canView.set(res.canView ?? true);
      this.canCreate.set(res.canCreate ?? false);
      this.canEdit.set(res.canEdit ?? false);
      this.canDelete.set(res.canDelete ?? false);
      this.isActive.set(res.isActive ?? true);
    } catch {
      /* handled by interceptor */
    }
  }

  private async loadOptions(): Promise<void> {
    // Prefer the full company list; fall back to the logged-in user's own company.
    try {
      const companies = await this.admin.company.getPaged(1, 1000);
      this.companyOptions.set(companies.items.map((c) => ({ id: c.id, label: c.companyName })));
    } catch {
      const myCompany = this.auth.company();
      this.companyOptions.set(myCompany ? [{ id: myCompany.id, label: myCompany.companyName }] : []);
    }

    // Branch/Warehouse lists follow the selected companies (union). All Companies
    // -> child lists stay empty until specific companies are picked.
    if (this.allCompanies()) {
      this.activeCompanyId.set(null);
      this.branchOptions.set([]);
      this.warehouseOptions.set([]);
      return;
    }
    const targetIds = this.companyIds().length > 0
      ? this.companyIds()
      : [this.companyOptions()[0]?.id].filter((x): x is number => x != null);
    this.activeCompanyId.set(targetIds[0] ?? null);
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