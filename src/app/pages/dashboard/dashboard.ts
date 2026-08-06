import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { BasePill } from '../../shared/base-data';
import { DashboardData } from '../../core/models';
import { PermissionService } from '../../core/services/permission.service';
import { ToastService } from '../../core/services/toast.service';

interface QuickAction {
  route: string;
  label: string;
  icon: string;
  permission?: string;
}

interface AccessItem {
  code: string;
  name: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { route: '/users', label: 'Manage Users', icon: 'users', permission: 'users.view' },
  { route: '/roles', label: 'Manage Roles', icon: 'shield', permission: 'roles.view' },
  { route: '/company', label: 'Company Profile', icon: 'building-2', permission: 'companies.view' },
  { route: '/settings', label: 'Workspace Settings', icon: 'settings' },
];

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  users: 'Users',
  roles: 'Roles',
  companies: 'Company',
  settings: 'Settings',
  profile: 'Profile',
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  protected readonly perms = inject(PermissionService);

  protected readonly greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  });

  protected readonly data = signal<DashboardData | null>(null);

  protected readonly quickActions = computed(() =>
    QUICK_ACTIONS.filter((a) => !a.permission || this.perms.has(a.permission)),
  );

  protected readonly permissionGroups = computed(() => {
    const codes = this.data()?.permissions ?? [];
    const map = new Map<string, AccessItem[]>();
    for (const code of codes) {
      const module = this.moduleLabel(code);
      const list = map.get(module) ?? [];
      list.push({ code, name: code.split('.').slice(1).join(' ').replace(/^./, (c) => c.toUpperCase()) });
      map.set(module, list);
    }
    return [...map.entries()].map(([module, items]) => ({ module, items }));
  });

  constructor() {
    void this.load();
  }

  protected initials(name: string): string {
    const parts = (name || 'A').trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'A';
  }

  protected go(route: string): void {
    void this.router.navigate([route]);
  }

  private moduleLabel(code: string): string {
    const prefix = code.split('.')[0] ?? 'other';
    return MODULE_LABELS[prefix] ?? prefix.charAt(0).toUpperCase() + prefix.slice(1);
  }

  private async load(): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<DashboardData>('/api/dashboard'));
      this.data.set(res);
    } catch {
      this.toast.error('Failed to load dashboard');
    }
  }
}
