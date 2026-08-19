import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { CompanyPage } from '../company/company';
import { UsersPage } from '../users/users';
import { Department } from '../adminitration/business-master/department/department';
import { Warehouse } from '../adminitration/business-master/warehouse/warehouse';
import { Designation } from '../adminitration/business-master/designation/designation';
import { BranchPage } from '../branch/branch';
import { RolesPage } from '../roles/roles';
import { BusinessPartnersPage } from '../business-partners/business-partners';

type BusinessMasterTab = 'company' | 'users' | 'department' | 'warehouse' | 'designation' | 'branch' | 'roles' | 'business-partners';

const TABS: { id: BusinessMasterTab; label: string; icon: string }[] = [
  { id: 'company', label: 'Company Master', icon: 'building-2' },
  { id: 'users', label: 'User Master', icon: 'users' },
  { id: 'roles', label: 'Role Master', icon: 'shield' },
  { id: 'department', label: 'Department', icon: 'users-round' },
  { id: 'warehouse', label: 'Warehouse', icon: 'warehouse' },
  { id: 'designation', label: 'Designation', icon: 'badge' },
  { id: 'branch', label: 'Branch Master', icon: 'git-branch' },
  { id: 'business-partners', label: 'Business Partners', icon: 'users' },
];

@Component({
  selector: 'app-business-master',
  standalone: true,
  imports: [
    LucideAngularModule,
    CompanyPage,
    UsersPage,
    Department,
    Warehouse,
    Designation,
    BranchPage,
    RolesPage,
    BusinessPartnersPage,
  ],
  templateUrl: './business-master.html',
  styleUrl: './business-master.css',
})
export class BusinessMasterPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly tabs = TABS;
  protected readonly tab = signal<BusinessMasterTab>('company');

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const t = params.get('tab') as BusinessMasterTab | null;
      if (t && TABS.some((x) => x.id === t)) this.tab.set(t);
    });
  }

  protected setTab(t: BusinessMasterTab): void {
    this.tab.set(t);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: t },
      queryParamsHandling: 'merge',
    });
  }
}
