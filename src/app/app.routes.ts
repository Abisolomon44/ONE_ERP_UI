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
                                                      path: 'system-master',
                                                      title: 'System Master',
                                                      loadComponent: () =>
                                                        import('./pages/system-master/system-master').then((m) => m.SystemMasterPage),
                                                    },
                                                    {
                                                      path: 'business-types',
                                                      redirectTo: 'system-master?tab=business-types',
                                                      pathMatch: 'full',
                                                    },
                                                    {
                                                      path: 'industry-types',
                                                      redirectTo: 'system-master?tab=industry-types',
                                                      pathMatch: 'full',
                                                    },
                                                    {
                                                      path: 'company-groups',
                                                      redirectTo: 'system-master?tab=company-groups',
                                                      pathMatch: 'full',
                                                    },
                                                    {
                                                      path: 'locations',
                                                      redirectTo: 'system-master?tab=locations',
                                                      pathMatch: 'full',
                                                    },
                                                    {
                                                      path: 'languages',
                                               redirectTo: 'system-master?tab=languages',
                                                       pathMatch: 'full',
                                                     },
                                                     {
                                                       path: 'time-zones',
                                                       redirectTo: 'system-master?tab=time-zones',
                                                       pathMatch: 'full',
                                                     },
                                                     {
                                                       path: 'gst-registration-types',
                                                       redirectTo: 'system-master?tab=gst-registration-types',
                                                       pathMatch: 'full',
                                                     },
                                                     {
                                                       path: 'address-types',
                                                       redirectTo: 'system-master?tab=address-types',
                                                       pathMatch: 'full',
                                                     },
                                                     {
                                                       path: 'contact-types',
                                                       redirectTo: 'system-master?tab=contact-types',
                                                       pathMatch: 'full',
                                                     },
                                                     {
                                                       path: 'document-types',
                                                       redirectTo: 'system-master?tab=document-types',
                                                       pathMatch: 'full',
                                                     },
                                                     {
                                                       path: 'organization-types',
                                                       redirectTo: 'system-master?tab=organization-types',
                                                       pathMatch: 'full',
                                                     },
                                                     {
                                                       path: 'currencies',
                                                       redirectTo: 'system-master?tab=currencies',
                                                       pathMatch: 'full',
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