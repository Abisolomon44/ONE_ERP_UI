import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { ThemeService } from '../core/services/theme.service';
import { Workspace, Domain, Module } from '../core/models';
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
  modules: Module[];
  open: boolean;
}

const SECTION_ORDER = ['Enterprise Permissions'];

const ADMIN_NAV: NavItem[] = [
  { route: 'workspaces', label: 'Workspaces', icon: 'layout-grid', section: 'Enterprise Permissions', adminOnly: true },
  { route: 'domains', label: 'Domains', icon: 'layers', section: 'Enterprise Permissions', adminOnly: true },
  { route: 'modules', label: 'Modules', icon: 'box', section: 'Enterprise Permissions', adminOnly: true },
  { route: 'screens', label: 'Screens', icon: 'monitor', section: 'Enterprise Permissions', adminOnly: true },
  { route: 'fields', label: 'Fields', icon: 'text-cursor-input', section: 'Enterprise Permissions', adminOnly: true },
  { route: 'permission-actions-list', label: 'Actions', icon: 'zap', section: 'Enterprise Permissions', adminOnly: true },
  { route: 'role-permission-matrix', label: 'Role Permission Matrix', icon: 'grid-3x3', section: 'Enterprise Permissions', adminOnly: true },
  { route: 'user-permission-overrides', label: 'User Overrides', icon: 'user-cog', section: 'Enterprise Permissions', adminOnly: true },
  { route: 'role-field-permissions', label: 'Field Permissions', icon: 'list', section: 'Enterprise Permissions', adminOnly: true },
  { route: 'data-scopes', label: 'Data Scopes', icon: 'database', section: 'Enterprise Permissions', adminOnly: true },
  { route: 'workflow-permissions', label: 'Workflow Permissions', icon: 'git-branch', section: 'Enterprise Permissions', adminOnly: true },
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
      workspaces: 'Workspaces',
      domains: 'Domains',
      modules: 'Modules',
      screens: 'Screens',
      fields: 'Fields',
      settings: 'Settings',
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
      const wsList = await firstValueFrom(this.http.get<Workspace[]>('/api/workspaces'));
      const nodes: WorkspaceNode[] = [];

      for (const ws of wsList.filter((w) => w.isActive)) {
        const domains = await firstValueFrom(
          this.http.get<Domain[]>(`/api/domains/workspace/${ws.id}`),
        );
        const domainNodes: DomainNode[] = [];

        for (const dom of domains.filter((d) => d.isActive)) {
          const modules = await firstValueFrom(
            this.http.get<Module[]>(`/api/modules/domain/${dom.id}`),
          );
          domainNodes.push({ domain: dom, modules: modules.filter((m) => m.isActive), open: false });
        }

        nodes.push({ workspace: ws, domains: domainNodes, open: false });
      }

      this.workspaces.set(nodes);
    } catch {
      /* handled by interceptor */
    }
  }

  protected logout(): void {
    void this.auth.logout().then(() => this.router.navigate(['/login']));
  }
}
