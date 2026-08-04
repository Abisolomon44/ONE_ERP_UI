import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';

export const routes: Routes = [

  // Authentication
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Login',
    loadComponent: () =>
      import('./pages/login/login').then(m => m.LoginPage),
  },

  // Main Layout
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/app-shell').then(m => m.AppShell),

    children: [

      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },

      // Dashboard
      {
        path: 'dashboard',
        title: 'Dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard').then(m => m.DashboardPage),
      },

      // Users
      {
        path: 'users',
        title: 'Users',
        loadComponent: () =>
          import('./pages/users/users').then(m => m.UsersPage),
      },

      // Roles
      {
        path: 'roles',
        title: 'Roles',
        loadComponent: () =>
          import('./pages/roles/roles').then(m => m.RolesPage),
      },

      // ===========================
      // Administration Workspace
      // ===========================

      {
        path: 'administration',
        title: 'Administration',
        loadComponent: () =>
          import('./pages/adminitration/administration-workspace/administration-workspace')
            .then(m => m.AdministrationWorkspace),
      },

      // ===========================
      // Business Masters
      // ===========================

  
      {
        path: 'branch',
        title: 'Branch',
        loadComponent: () =>
          import('./pages/adminitration/business-master/branch/branch')
            .then(m => m.Branch),
      },

      // ===========================
      // System Master
      // ===========================

      {
        path: 'system-master',
        title: 'System Master',
        loadComponent: () =>
          import('./pages/system-master/system-master')
            .then(m => m.SystemMasterPage),
      },

      // ===========================
      // Settings
      // ===========================

      {
        path: 'settings',
        title: 'Settings',
        loadComponent: () =>
          import('./pages/settings/settings')
            .then(m => m.SettingsPage),
      }

    ]
  },

  {
    path: '**',
    redirectTo: 'dashboard'
  }

];