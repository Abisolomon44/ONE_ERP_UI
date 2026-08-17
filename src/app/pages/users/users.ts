import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { BaseEmpty, BasePagination, BasePill } from '../../shared/base-data';
import { BaseButton } from '../../shared/base-button';
import { BaseDialog } from '../../shared/base-feedback';
import { BaseInput, BaseSearch } from '../../shared/base-controls';
import { BasePermission } from '../../shared/base-permission';
import { Paginated, Role, UserWithRoles } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

interface RoleToggle {
  roleId: number;
  name: string;
  checked: boolean;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [DatePipe, LucideAngularModule, BaseEmpty, BasePagination, BasePill, BaseButton, BaseDialog, BaseInput, BaseSearch, BasePermission],
  templateUrl: './users.html',
  styleUrl: './users.css',
})
export class UsersPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  protected readonly canViewAllUsers = computed(() => {
    const roles = this.auth.user()?.roles ?? [];
    return roles.some((r) => r.toLowerCase() === 'super admin' || r.toLowerCase() === 'administrator');
  });

  protected readonly rows = signal<UserWithRoles[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly page = signal(1);
  protected readonly size = signal(10);
  protected readonly search = signal('');
  protected readonly roles = signal<Role[]>([]);
  protected readonly roleToggles = signal<RoleToggle[]>([]);
  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<UserWithRoles | null>(null);
  protected readonly resetOpen = signal(false);
  protected readonly resetUser = signal<UserWithRoles | null>(null);
  protected readonly resetPassword = signal('');
  protected readonly resetSaving = signal(false);

  protected readonly form = {
    username: signal(''),
    fullName: signal(''),
    email: signal(''),
    mobile: signal(''),
    password: signal(''),
  };

  protected readonly selectedRoleIds = signal<number[]>([]);

  constructor() {
    effect(() => {
      this.page();
      this.search();
      void this.load();
    });
  }

  protected initials(name: string): string {
    const parts = (name || 'A').trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'A';
  }

  protected async openCreate(): Promise<void> {
    this.editing.set(null);
    this.form.username.set('');
    this.form.fullName.set('');
    this.form.email.set('');
    this.form.mobile.set('');
    this.form.password.set('');
    await this.ensureRoles();
    this.setToggles([]);
    this.dialogOpen.set(true);
  }

  protected async openEdit(user: UserWithRoles): Promise<void> {
    this.editing.set(user);
    this.form.username.set(user.username);
    this.form.fullName.set(user.fullName);
    this.form.email.set(user.email);
    this.form.mobile.set(user.mobile ?? '');
    this.form.password.set('');
    await this.ensureRoles();
    this.setToggles(user.roleIds);
    this.dialogOpen.set(true);
  }

  protected toggleRole(roleId: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedRoleIds.update((list) => (checked ? [...list, roleId] : list.filter((id) => id !== roleId)));
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const roleIds = this.selectedRoleIds();
      if (this.editing()) {
        const id = this.editing()!.userId;
        await firstValueFrom(
          this.http.put(`/api/users/${id}`, {
            fullName: this.form.fullName(),
            email: this.form.email(),
            mobile: this.form.mobile() || null,
            roleIds,
            status: this.editing()!.status,
          }),
        );
        this.toast.success('User updated');
      } else {
        await firstValueFrom(
          this.http.post('/api/users', {
            username: this.form.username(),
            fullName: this.form.fullName(),
            email: this.form.email(),
            mobile: this.form.mobile() || null,
            password: this.form.password(),
            roleIds,
            status: 'Active',
          }),
        );
        this.toast.success('User created');
      }
      this.dialogOpen.set(false);
      await this.load();
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(user: UserWithRoles): Promise<void> {
    if (!confirm(`Delete user ${user.username}? This cannot be undone.`)) return;
    try {
      await firstValueFrom(this.http.delete(`/api/users/${user.userId}`));
      this.toast.success('User deleted');
      await this.load();
    } catch {
      /* handled by interceptor */
    }
  }

  protected openReset(user: UserWithRoles): void {
    this.resetUser.set(user);
    this.resetPassword.set('');
    this.resetOpen.set(true);
  }

  protected closeReset(): void {
    this.resetOpen.set(false);
  }

  protected async submitReset(): Promise<void> {
    if (this.resetSaving() || !this.resetUser()) return;
    this.resetSaving.set(true);
    try {
      await firstValueFrom(
        this.http.put(`/api/users/${this.resetUser()!.userId}/password`, { password: this.resetPassword() }),
      );
      this.toast.success('Password reset successfully');
      this.resetOpen.set(false);
    } catch {
      /* handled by interceptor */
    } finally {
      this.resetSaving.set(false);
    }
  }

  private async ensureRoles(): Promise<void> {
    if (this.roles().length > 0) return;
    try {
      const res = await firstValueFrom(this.http.get<Role[]>('/api/roles'));
      this.roles.set(res.filter((r) => r.isActive));
    } catch {
      /* ignored */
    }
  }

  private setToggles(selected: number[]): void {
    this.selectedRoleIds.set(selected);
    this.roleToggles.set(
      this.roles().map((r) => ({ roleId: r.roleId, name: r.name, checked: selected.includes(r.roleId) })),
    );
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(
        this.http.get<Paginated<UserWithRoles>>(`/api/users?page=${this.page()}&size=${this.size()}&search=${encodeURIComponent(this.search())}`),
      );
      const items = this.canViewAllUsers()
        ? res.items
        : res.items.filter((u) => u.userId === this.auth.user()?.userId);
      this.rows.set(items);
      this.total.set(this.canViewAllUsers() ? res.totalCount : items.length);
    } catch {
      this.toast.error('Failed to load users');
    } finally {
      this.loading.set(false);
    }
  }
}
