import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { ThemeService } from '../core/services/theme.service';
import { Workspace, Domain, Module, SubModule } from '../core/models';
import { BaseButton } from '../shared/base-button';
import { BaseToast } from '../shared/base-feedback';

interface NavItem {
  route: string;
  label: string;
  icon: string;
  section?: string;
  adminOnly?: boolean;
}

interface WorkspaceNode {
  workspace: Workspace;
  domains: DomainNode[];
  open: boolean;
}

interface DomainNode {
  domain: Domain;
  modules: ModuleWithSubModules[];
  open: boolean;
}

interface ModuleWithSubModules {
  module: Module;
  subModules: SubModule[];
  open: boolean;
}

const SECTION_ORDER = ['Business Master', 'Enterprise Permissions'];

const ADMIN_NAV: NavItem[] = [
  { route: 'business-master', label: 'Business Master', icon: 'briefcase', section: 'Business Master', adminOnly: true },
  { route: 'master-import', label: 'Master Import', icon: 'upload', section: 'Business Master' },
  { route: 'import-logs', label: 'Import Logs', icon: 'history', section: 'Business Master' },
  { route: 'enterprise-permissions', label: 'Enterprise Permissions', icon: 'shield-check', section: 'Enterprise Permissions', adminOnly: true },
  { route: 'system-master', label: 'System Master', icon: 'settings', section: 'Enterprise Permissions', adminOnly: true },
];

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule, BaseButton, BaseToast],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css',
})
export class AppShell {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  protected readonly collapsed = signal(false);
  protected readonly mobileOpen = signal(false);
  protected readonly isMobile = signal(this.initIsMobile());

  protected readonly workspaces = signal<WorkspaceNode[]>([]);

  constructor() {
    const mq =
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(max-width: 1024px)')
        : null;
    mq?.addEventListener?.('change', (e: MediaQueryListEvent) => {
      this.isMobile.set(e.matches);
      if (e.matches) {
        this.mobileOpen.set(false);
        this.collapsed.set(false);
      }
    });

    void this.loadWorkspaces();
  }

  protected readonly adminNavItems = computed(() => {
    const isSuperAdmin = this.auth.user()?.isSuperAdmin ?? false;
    return ADMIN_NAV.filter((item) => !item.adminOnly || isSuperAdmin);
  });

  protected readonly adminSections = computed(() => {
    const groups = new Map<string, NavItem[]>();
    for (const item of this.adminNavItems()) {
      const key = item.section ?? 'Admin';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }
    return SECTION_ORDER.filter((name) => groups.has(name)).map((name) => ({
      name,
      items: groups.get(name)!,
    }));
  });

  protected toggleWorkspace(ws: WorkspaceNode): void {
    ws.open = !ws.open;
    this.workspaces.update((list) => [...list]);
  }

  protected toggleDomain(dn: DomainNode): void {
    dn.open = !dn.open;
    this.workspaces.update((list) => [...list]);
  }

  protected toggleModule(mw: ModuleWithSubModules): void {
    mw.open = !mw.open;
    this.workspaces.update((list) => [...list]);
  }

  private initIsMobile(): boolean {
    return (
      typeof window !== 'undefined' &&
      !!window.matchMedia &&
      window.matchMedia('(max-width: 1024px)').matches
    );
  }

  protected toggleSidebar(): void {
    if (this.isMobile()) this.mobileOpen.update((v) => !v);
    else this.collapsed.update((v) => !v);
  }

  protected closeMobile(): void {
    if (this.isMobile()) this.mobileOpen.set(false);
  }

  protected onWorkspaceClick(ws: WorkspaceNode): void {
    console.log('[sidebar] workspace clicked:', {
      id: ws.workspace.id,
      name: ws.workspace.workspaceName,
      route: `/workspace/${ws.workspace.id}`,
    });
    this.closeMobile();
  }

  protected readonly tenantLabel = computed(() => {
    const raw = localStorage.getItem('oneerp-erp-tenant');
    return raw ? `Tenant \u00B7 ${raw.toUpperCase()}` : 'Tenant Workspace';
  });

  protected readonly roleLabel = computed(() => {
    const roles = JSON.parse(localStorage.getItem('oneerp-erp-user') ?? '{}')?.roles;
    return Array.isArray(roles) && roles.length ? roles[0] : 'Member';
  });

  protected readonly pageTitle = computed(() => {
    const url = this.router.url.split('?')[0];
    const parts = url.split('/').filter(Boolean);
    const top = parts[0] ?? '';
    const map: Record<string, string> = {
      dashboard: 'Dashboard',
      workspace: 'Workspace',
      workspaces: 'Workspaces',
      domains: 'Domains',
      modules: 'Modules',
      submodules: 'Sub Modules',
      screens: 'Screens',
      fields: 'Fields',
      settings: 'Settings',
      'enterprise-permissions': 'Enterprise Permissions',
      'business-master': 'Business Master',
    };
    return map[top] ?? 'ONE ERP';
  });

  protected readonly initials = computed(() => {
    const name = this.auth.user()?.fullName || this.auth.user()?.username || 'A';
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'A';
  });

  protected async loadWorkspaces(): Promise<void> {
    try {
      const nav = await firstValueFrom(this.http.get<{ workspaces: WorkspaceNode[]; permissionVersion: number }>('/api/navigation'));
      const nodes: WorkspaceNode[] = (nav.workspaces ?? []).map((ws: any) => ({
        workspace: { id: ws.id, workspaceCode: ws.code, workspaceName: ws.name, icon: ws.icon, isActive: true, createdDate: '', sortOrder: 0 } as Workspace,
        open: false,
        domains: (ws.domains ?? []).map((dom: any) => ({
          domain: { id: dom.id, domainCode: dom.code, domainName: dom.name, icon: dom.icon, workspaceId: ws.id, isActive: true, createdDate: '', sortOrder: 0 } as Domain,
          open: false,
          modules: (dom.modules ?? []).map((mod: any) => ({
            module: { id: mod.id, moduleCode: mod.code, moduleName: mod.name, icon: mod.icon, domainId: dom.id, isActive: true, createdDate: '', sortOrder: 0 } as Module,
            open: false,
            subModules: (mod.subModules ?? []).map((sm: any) => ({
              id: sm.id, subModuleCode: sm.code, subModuleName: sm.name, icon: sm.icon, moduleId: mod.id, isActive: true, createdDate: '', sortOrder: 0,
            } as SubModule)),
          })),
        })),
      }));

      this.workspaces.set(nodes);
    } catch {
      /* handled by interceptor */
    }
  }

  protected logout(): void {
    void this.auth.logout().then(() => this.router.navigate(['/login']));
  }
}
