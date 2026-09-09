import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PermissionService } from './permission.service';

export interface NavScreen {
  id: number;
  code: string;
  name: string;
  routeUrl?: string | null;
  componentName?: string | null;
  screenType: string;
  subModuleId: number;
  permissionCode?: string | null;
  canView: boolean;
}

export interface NavSubModule {
  id: number;
  code: string;
  name: string;
  icon?: string | null;
  screens: NavScreen[];
  moduleId: number;
}

export interface NavModule {
  id: number;
  code: string;
  name: string;
  icon?: string | null;
  subModules: NavSubModule[];
  domainId: number;
}

export interface NavDomain {
  id: number;
  code: string;
  name: string;
  icon?: string | null;
  modules: NavModule[];
  workspaceId: number;
}

export interface NavWorkspace {
  id: number;
  code: string;
  name: string;
  icon?: string | null;
  domains: NavDomain[];
}

export interface NavResponse {
  workspaces: NavWorkspace[];
  permissionVersion: number;
  hasAccess: boolean;
}

/**
 * Single client-side source of truth for the authorized navigation tree.
 * Loaded once from GET /api/permissions/my-navigation. The backend resolves
 * which screens the user can view (any-role "view" grant minus user-level
 * denials) and prunes empty parents, so the client NEVER receives the full
 * master workspace/screen list.
 */
@Injectable({ providedIn: 'root' })
export class NavigationStoreService {
  private readonly http = inject(HttpClient);
  private readonly perm = inject(PermissionService);

  readonly navigation = signal<NavResponse | null>(null);
  readonly loading = signal(false);
  private inflight: Promise<NavResponse> | null = null;

  async ensureLoaded(): Promise<NavResponse> {
    const current = this.navigation();
    if (current) return current;
    if (!this.inflight) {
      this.loading.set(true);
      this.inflight = firstValueFrom(
        this.http.get<NavResponse>('/api/permissions/my-navigation')
      )
        .then((nav) => {
          this.navigation.set(nav);
          return nav;
        })
        .finally(() => {
          this.loading.set(false);
          this.inflight = null;
        });
    }
    return this.inflight;
  }

  /** True when the user can view any screen whose route is `path`. */
  isRouteAuthorized(path: string): boolean {
    const nav = this.navigation();
    if (!nav) return false;
    const target = normalizePath(path);
    if (!target) return false;
    return screenRoutes(nav).has(target);
  }

  /** True when the user has at least one viewable screen in `workspaceId`. */
  hasWorkspace(workspaceId: number): boolean {
    const nav = this.navigation();
    if (!nav) return false;
    return nav.workspaces.some((w) => w.id === workspaceId);
  }

  /** True when the current user is treated as having every permission. */
  isUnrestricted(): boolean {
    return this.perm.permissions().includes('*');
  }

  clear(): void {
    this.navigation.set(null);
  }
}

// Route normalization: '/sales?tab=returns#x' -> '/sales'
function normalizePath(path: string): string {
  let p = path.split('?')[0].split('#')[0];
  if (!p.startsWith('/')) p = `/${p}`;
  p = p.replace(/\/+$/, '');
  return p;
}

function screenRoutes(nav: NavResponse): Set<string> {
  const routes = new Set<string>();
  for (const ws of nav.workspaces) {
    for (const d of ws.domains) {
      for (const m of d.modules) {
        for (const sm of m.subModules) {
          for (const s of sm.screens) {
            if (s.canView && s.routeUrl) routes.add(normalizePath(s.routeUrl));
          }
        }
      }
    }
  }
  return routes;
}