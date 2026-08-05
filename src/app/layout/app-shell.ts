import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../core/services/auth.service';
import { ThemeService } from '../core/services/theme.service';
import { BaseButton } from '../shared/base-button';
import { BaseToast } from '../shared/base-feedback';

interface NavItem {
  route: string;
  label: string;
  icon: string;
  section?: string;
}

const SECTION_ORDER = ['Workspace'];

const NAV: NavItem[] = [
  { route: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard', section: 'Workspace' },
  { route: 'administration', label: 'Administration', icon: 'shield', section: 'Workspace' },

  { route: 'system-master', label: 'System Master', icon: 'folder', section: 'Workspace' },
  { route: 'settings', label: 'Settings', icon: 'settings', section: 'Workspace' },
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
  private readonly router = inject(Router);

  protected readonly collapsed = signal(false);
  protected readonly mobileOpen = signal(false);
  protected readonly isMobile = signal(this.initIsMobile());

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
  }

  protected readonly navItems = computed(() => NAV);

  protected readonly navSections = computed(() => {
    const groups = new Map<string, NavItem[]>();
    for (const item of this.navItems()) {
      const key = item.section ?? 'Workspace';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }
    return SECTION_ORDER.filter((name) => groups.has(name)).map((name) => ({
      name,
      items: groups.get(name)!,
    }));
  });

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
    return raw ? `Tenant Â· ${raw.toUpperCase()}` : 'Tenant Workspace';
  });

  protected readonly roleLabel = computed(() => {
    const roles = JSON.parse(localStorage.getItem('oneerp-erp-user') ?? '{}')?.roles;
    return Array.isArray(roles) && roles.length ? roles[0] : 'Member';
  });

  protected readonly pageTitle = computed(() => {
    const url = this.router.url.split('?')[0];
    const item = this.navItems().find((i) => url.startsWith('/' + i.route));
    return item?.label ?? 'ONE ERP';
  });

  protected readonly initials = computed(() => {
    const name = this.auth.user()?.fullName || this.auth.user()?.username || 'A';
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'A';
  });

  protected logout(): void {
    void this.auth.logout().then(() => this.router.navigate(['/login']));
  }
}
