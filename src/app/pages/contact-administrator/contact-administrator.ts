import { Component, computed, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { BaseButton } from '../../shared/base-button';

@Component({
  selector: 'app-contact-administrator',
  standalone: true,
  imports: [LucideAngularModule, BaseButton],
  templateUrl: './contact-administrator.html',
  styleUrl: './contact-administrator.css',
})
export class ContactAdministratorPage {
  private readonly auth = inject(AuthService);

  protected readonly user = this.auth.user;

  protected readonly firstName = computed(() => {
    const raw = this.auth.user()?.fullName || this.auth.user()?.username || '';
    return raw.trim().split(/\s+/)[0] || 'User';
  });

  protected readonly initials = computed(() => {
    const name = this.auth.user()?.fullName || this.auth.user()?.username || 'A';
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'A';
  });

  protected readonly roleLabel = computed(() => {
    const roles = this.auth.user()?.roles;
    return Array.isArray(roles) && roles.length ? roles[0] : 'Member';
  });

  protected logout(): void {
    void this.auth.logout();
  }
}