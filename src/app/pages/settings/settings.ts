import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { ThemeService, AccentColor } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth.service';
import { BaseButton } from '../../shared/base-button';
import { BaseInput } from '../../shared/base-controls';
import { ToastService } from '../../core/services/toast.service';

interface AccentOption {
  value: AccentColor;
  label: string;
  color: string;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [LucideAngularModule, BaseButton, BaseInput],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class SettingsPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  protected readonly theme = inject(ThemeService);
  protected readonly auth = inject(AuthService);

  protected readonly saving = signal(false);

  protected readonly password = {
    current: signal(''),
    next: signal(''),
    confirm: signal(''),
  };

  protected readonly accents: AccentOption[] = [
    { value: 'blue', label: 'Blue', color: '#2563eb' },
    { value: 'green', label: 'Green', color: '#059669' },
    { value: 'purple', label: 'Purple', color: '#7c3aed' },
    { value: 'orange', label: 'Orange', color: '#ea580c' },
    { value: 'red', label: 'Red', color: '#dc2626' },
  ];

  protected get initials(): string {
    const name = this.auth.user()?.fullName || this.auth.user()?.username || 'A';
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'A';
  }

  protected get passwordMismatch(): string {
    if (!this.password.next() || !this.password.confirm()) return '';
    return this.password.next() !== this.password.confirm() ? 'Passwords do not match' : '';
  }

  protected async changePassword(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      await firstValueFrom(
        this.http.put('/api/profile/password', {
          currentPassword: this.password.current(),
          newPassword: this.password.next(),
        }),
      );
      this.toast.success('Password changed');
      this.password.current.set('');
      this.password.next.set('');
      this.password.confirm.set('');
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }
}
