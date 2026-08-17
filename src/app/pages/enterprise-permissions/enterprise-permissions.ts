import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LucideAngularModule } from 'lucide-angular';

import { WorkspacesPage } from '../workspaces/workspaces';
import { DomainsPage } from '../domains/domains';
import { ModulesPage } from '../modules/modules';
import { SubModulesPage } from '../submodules/submodules';
import { ScreensPage } from '../screens/screens';
import { FieldsPage } from '../fields/fields';
import { ActionsPage } from '../actions/actions';
import { RolePermissionMatrixPage } from '../role-permission-matrix/role-permission-matrix';
import { UserPermissionOverridesPage } from '../user-permission-overrides/user-permission-overrides';
import { RoleFieldPermissionsPage } from '../role-field-permissions/role-field-permissions';
import { DataScopesPage } from '../data-scopes/data-scopes';
import { UserDataScopeOverridesPage } from '../user-data-scope-overrides/user-data-scope-overrides';
import { WorkflowPermissionsPage } from '../workflow-permissions/workflow-permissions';

type EnterpriseTab =
  | 'workspaces'
  | 'domains'
  | 'modules'
  | 'submodules'
  | 'screens'
  | 'fields'
  | 'actions'
  | 'role-permission-matrix'
  | 'user-permission-overrides'
  | 'role-field-permissions'
  | 'data-scopes'
  | 'user-data-scope-overrides'
  | 'workflow-permissions';

const TABS: { id: EnterpriseTab; label: string; icon: string }[] = [
  { id: 'workspaces', label: 'Workspaces', icon: 'layout-grid' },
  { id: 'domains', label: 'Domains', icon: 'layers' },
  { id: 'modules', label: 'Modules', icon: 'box' },
  { id: 'submodules', label: 'Sub Modules', icon: 'puzzle' },
  { id: 'screens', label: 'Screens', icon: 'monitor' },
  { id: 'fields', label: 'Fields', icon: 'text-cursor-input' },
  { id: 'actions', label: 'Actions', icon: 'zap' },
  { id: 'role-permission-matrix', label: 'Role Permission Matrix', icon: 'grid-3x3' },
  { id: 'user-permission-overrides', label: 'User Overrides', icon: 'user-cog' },
  { id: 'role-field-permissions', label: 'Field Permissions', icon: 'list' },
  { id: 'data-scopes', label: 'Data Scopes', icon: 'database' },
  { id: 'user-data-scope-overrides', label: 'User Data Overrides', icon: 'shield-off' },
  { id: 'workflow-permissions', label: 'Workflow Permissions', icon: 'git-branch' },
];

@Component({
  selector: 'app-enterprise-permissions',
  standalone: true,
  imports: [
    LucideAngularModule,
    WorkspacesPage,
    DomainsPage,
    ModulesPage,
    SubModulesPage,
    ScreensPage,
    FieldsPage,
    ActionsPage,
    RolePermissionMatrixPage,
    UserPermissionOverridesPage,
    RoleFieldPermissionsPage,
    DataScopesPage,
    UserDataScopeOverridesPage,
    WorkflowPermissionsPage,
  ],
  templateUrl: './enterprise-permissions.html',
  styleUrl: './enterprise-permissions.css',
})
export class EnterprisePermissionsPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  protected readonly tabs = TABS;
  protected readonly tab = signal<EnterpriseTab>('workspaces');

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const t = params.get('tab') as EnterpriseTab | null;
      if (t && TABS.some((x) => x.id === t)) this.tab.set(t);
    });

    if (!this.auth.user()?.isSuperAdmin) {
      this.router.navigate(['/dashboard']);
    }
  }

  protected setTab(t: EnterpriseTab): void {
    this.tab.set(t);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: t },
      queryParamsHandling: 'merge',
    });
  }
}
