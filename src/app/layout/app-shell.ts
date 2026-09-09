import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../core/services/auth.service';
import { ThemeService } from '../core/services/theme.service';
import { NavigationStoreService } from '../core/services/navigation-store.service';
import { BaseButton } from '../shared/base-button';
import { BaseToast } from '../shared/base-feedback';

interface WorkspaceNode {
  workspace: { id: number; code: string; name: string; icon?: string | null };
}

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
  private readonly router = inject(Router);
  private readonly nav = inject(NavigationStoreService);

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
      const nav = await this.nav.ensureLoaded();

      const nodes: WorkspaceNode[] = (nav.workspaces ?? []).map((ws) => ({
        workspace: { id: ws.id, code: ws.code, name: ws.name, icon: ws.icon },
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