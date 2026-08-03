import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Login',
    loadComponent: () =>
      import('./pages/login/login').then((m) => m.LoginPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/app-shell').then((m) => m.AppShell),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        title: 'Dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard').then(
            (m) => m.DashboardPage
          ),
      },
      {
        path: 'users',
        title: 'Users',
        loadComponent: () =>
          import('./pages/users/users').then((m) => m.UsersPage),
      },
      {
        path: 'roles',
        title: 'Roles',
        loadComponent: () =>
          import('./pages/roles/roles').then((m) => m.RolesPage),
      },
      {
        path: 'company',
        title: 'Company',
        loadComponent: () =>
          import('./pages/company/company').then((m) => m.CompanyPage),
      },
      {
        path: 'settings',
        title: 'Settings',
        loadComponent: () =>
          import('./pages/settings/settings').then((m) => m.SettingsPage),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
];