import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { LoginResponse } from '../models';
import { PermissionService, UserPermission } from './permission.service';

export const TOKEN_KEY = 'oneerp-erp-token';
export const REFRESH_KEY = 'oneerp-erp-refresh';
export const USER_KEY = 'oneerp-erp-user';
export const PERMS_KEY = 'oneerp-erp-permissions';
export const MODULE_PERMS_KEY = 'oneerp-erp-module-permissions';
export const TENANT_KEY = 'oneerp-erp-tenant';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly token = signal<string | null>(localStorage.getItem(TOKEN_KEY));

  readonly isAuthenticated = computed(() => !!this.token());

  readonly user = signal<LoginResponse['user'] | null>(this.readUser());

  constructor(
    private http: HttpClient,
    private perms: PermissionService
  ) {
    const permissions = localStorage.getItem(PERMS_KEY);

    if (permissions) {
      try {
        this.perms.permissions.set(JSON.parse(permissions));
      } catch {
        this.perms.permissions.set([]);
      }
    }

    const modulePerms = localStorage.getItem(MODULE_PERMS_KEY);
    if (modulePerms) {
      try {
        this.perms.userPermissions.set(JSON.parse(modulePerms));
      } catch {
        this.perms.userPermissions.set([]);
      }
    }
  }

  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await firstValueFrom(
      this.http.post<LoginResponse>('/api/auth/login', {
        username,
        password,
      })
    );

    this.persist(response);

    return response;
  }

  async refresh(): Promise<boolean> {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    const username = this.currentUsername();

    if (!refreshToken || !username) {
      return false;
    }

    try {
      const response = await firstValueFrom(
        this.http.post<LoginResponse>('/api/auth/refresh', {
          username,
          refreshToken,
        })
      );

      this.persist(response);

      return true;
    } catch {
      await this.logout();
      return false;
    }
  }

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    const username = this.currentUsername();

    try {
      if (refreshToken) {
        await firstValueFrom(
          this.http.post('/api/auth/logout', {
            username,
            refreshToken,
          })
        );
      }
    } catch {}

    localStorage.clear();

    this.token.set(null);
    this.user.set(null);
    this.perms.permissions.set([]);
    this.perms.userPermissions.set([]);
  }

  private currentUsername(): string | null {
    return this.user()?.username ?? null;
  }

  private persist(data: LoginResponse): void {

  localStorage.setItem(TOKEN_KEY, data.accessToken);
  localStorage.setItem(REFRESH_KEY, data.refreshToken);
  localStorage.setItem(TENANT_KEY, data.tenantCode);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  localStorage.setItem(PERMS_KEY, JSON.stringify(data.permissions));
  localStorage.setItem('companyId', data.user.companyId.toString());
  localStorage.setItem('userId', data.user.userId.toString());

  console.log('CompanyId Saved:', localStorage.getItem('companyId'));

  this.token.set(data.accessToken);
  this.user.set(data.user);
  this.perms.permissions.set(data.permissions);

  // Load module-scoped permissions
  this.loadModulePermissions();
}
  private readUser(): LoginResponse['user'] | null {
    const raw = localStorage.getItem(USER_KEY);

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private async loadModulePermissions(): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.get<UserPermission[]>('/api/permission/modules/user-permissions')
      );
      this.perms.userPermissions.set(res);
      localStorage.setItem(MODULE_PERMS_KEY, JSON.stringify(res));
    } catch {
      this.perms.userPermissions.set([]);
    }
  }
}