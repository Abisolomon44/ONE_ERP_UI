import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';

export const routes: Routes = [
  // Authentication
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Login',
    loadComponent: () => import('./pages/login/login').then((m) => m.LoginPage),
  },

  // Main Layout
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/app-shell').then((m) => m.AppShell),

    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },

      // Dashboard
      {
        path: 'dashboard',
        title: 'Dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.DashboardPage),
      },

      // Workspace (drill-down template)
      {
        path: 'workspace/:id',
        title: 'Workspace',
        loadComponent: () => import('./pages/workspace/workspace').then((m) => m.WorkspacePage),
      },

      // Users
      {
        path: 'users',
        title: 'Users',
        loadComponent: () => import('./pages/users/users').then((m) => m.UsersPage),
      },

      // Roles
      {
        path: 'roles',
        title: 'Roles',
        loadComponent: () => import('./pages/roles/roles').then((m) => m.RolesPage),
      },

      // ===========================
      // Administration Workspace
      // ===========================

      {
        path: 'administration',
        title: 'Administration',
        loadComponent: () =>
          import('./pages/adminitration/administration-workspace/administration-workspace').then(
            (m) => m.AdministrationWorkspace,
          ),
      },

      // ===========================
      // Business Masters
      // ===========================

      {
        path: 'business-master',
        title: 'Business Master',
        loadComponent: () =>
          import('./pages/business-master/business-master').then(
            (m) => m.BusinessMasterPage
          ),
      },
      {
        path: 'company',
        title: 'Company',
        loadComponent: () => import('./pages/company/company').then((m) => m.CompanyPage),
      },

      {
        path: 'branch',
        title: 'Branch',
        loadComponent: () => import('./pages/branch/branch').then((m) => m.BranchPage),
      },

      {
        path: 'department',
        title: 'Department',
        loadComponent: () =>
          import('./pages/adminitration/business-master/department/department').then(
            (m) => m.Department,
          ),
      },

    
      {
        path: 'warehouse',
        title: 'Warehouse',
        loadComponent: () =>
          import('./pages/adminitration/business-master/warehouse/warehouse').then(
            (m) => m.Warehouse,
          ),
      },

      {
        path: 'designation',
        title: 'Designation',
        loadComponent: () =>
          import('./pages/adminitration/business-master/designation/designation').then(
            (m) => m.Designation,
          ),
        },
  {
  path: 'finance-year',
  title: 'Financial Year',
  loadComponent: () =>
    import('./pages/adminitration/business-master/finance-year/finance-year')
      .then(m => m.FinanceYear),
},
      // ===========================
      // System Master
      // ===========================

      {
        path: 'system-master',
        title: 'System Master',
        loadComponent: () =>
          import('./pages/system-master/system-master').then((m) => m.SystemMasterPage),
      },

      // ===========================
      // Settings
      // ===========================

      {
        path: 'settings',
        title: 'Settings',
        loadComponent: () => import('./pages/settings/settings').then((m) => m.SettingsPage),
      },

      // ===========================
      // Permission System
      // ===========================

      {
        path: 'permission-modules',
        title: 'Permission Modules',
        loadComponent: () =>
          import('./pages/permission-modules/permission-modules').then(
            (m) => m.PermissionModulesPage
          ),
      },
      {
        path: 'permission-actions',
        title: 'Permission Actions',
        loadComponent: () =>
          import('./pages/permission-actions/permission-actions').then(
            (m) => m.PermissionActionsPage
          ),
      },
      {
        path: 'role-permissions',
        title: 'Role Permissions',
        loadComponent: () =>
          import('./pages/role-permissions/role-permissions').then(
            (m) => m.RolePermissionsPage
          ),
      },
      {
        path: 'role-permission-matrix',
        title: 'Role Permission Matrix',
        loadComponent: () =>
          import('./pages/role-permission-matrix/role-permission-matrix').then(
            (m) => m.RolePermissionMatrixPage
          ),
      },

      // ===========================
      // Enterprise Permission Engine
      // ===========================

      {
        path: 'enterprise-permissions',
        title: 'Enterprise Permissions',
        loadComponent: () =>
          import('./pages/enterprise-permissions/enterprise-permissions').then(
            (m) => m.EnterprisePermissionsPage
          ),
      },
      {
        path: 'workspaces',
        title: 'Workspaces',
        loadComponent: () =>
          import('./pages/workspaces/workspaces').then((m) => m.WorkspacesPage),
      },
      {
        path: 'domains',
        title: 'Domains',
        loadComponent: () =>
          import('./pages/domains/domains').then((m) => m.DomainsPage),
      },
      {
        path: 'modules',
        title: 'Modules',
        loadComponent: () =>
          import('./pages/modules/modules').then((m) => m.ModulesPage),
      },
      {
        path: 'submodules',
        title: 'Sub Modules',
        loadComponent: () =>
          import('./pages/submodules/submodules').then((m) => m.SubModulesPage),
      },
      {
        path: 'screens',
        title: 'Screens',
        loadComponent: () =>
          import('./pages/screens/screens').then((m) => m.ScreensPage),
      },
      {
        path: 'fields',
        title: 'Fields',
        loadComponent: () =>
          import('./pages/fields/fields').then((m) => m.FieldsPage),
      },
      {
        path: 'permission-actions-list',
        title: 'Actions',
        loadComponent: () =>
          import('./pages/actions/actions').then((m) => m.ActionsPage),
      },
      {
        path: 'user-permission-overrides',
        title: 'User Permission Overrides',
        loadComponent: () =>
          import('./pages/user-permission-overrides/user-permission-overrides').then(
            (m) => m.UserPermissionOverridesPage
          ),
      },
      {
        path: 'role-field-permissions',
        title: 'Role Field Permissions',
        loadComponent: () =>
          import('./pages/role-field-permissions/role-field-permissions').then(
            (m) => m.RoleFieldPermissionsPage
          ),
      },
      {
        path: 'data-scopes',
        title: 'Data Scopes',
        loadComponent: () =>
          import('./pages/data-scopes/data-scopes').then((m) => m.DataScopesPage),
      },
      {
        path: 'user-data-scope-overrides',
        title: 'User Data Scope Overrides',
        loadComponent: () =>
          import('./pages/user-data-scope-overrides/user-data-scope-overrides').then(
            (m) => m.UserDataScopeOverridesPage
          ),
      },
      {
        path: 'workflow-permissions',
        title: 'Workflow Permissions',
        loadComponent: () =>
          import('./pages/workflow-permissions/workflow-permissions').then(
            (m) => m.WorkflowPermissionsPage
          ),
      },
      {
        path: 'business-partner-roles',
        title: 'Business Partner Roles',
        loadComponent: () =>
          import('./pages/business-partner-roles/business-partner-roles').then(
            (m) => m.BusinessPartnerRolesPage
          ),
      },
      {
        path: 'business-partners',
        title: 'Business Partners',
        loadComponent: () =>
          import('./pages/business-partners/business-partners').then(
            (m) => m.BusinessPartnersPage
          ),
      },
    ],
  },

  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
