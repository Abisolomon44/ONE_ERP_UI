import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { ToastService } from '../../core/services/toast.service';
import { BaseButton } from '../../shared/base-button';
import { BaseInput } from '../../shared/base-controls';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, BaseButton, BaseInput],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  protected readonly theme = inject(ThemeService);

  protected readonly username = signal('admin');
  protected readonly password = signal('Admin@123');
  protected readonly loading = signal(false);
  protected readonly error = signal('');

  protected async submit(): Promise<void> {
    if (!this.username() || !this.password() || this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    try {
      const res = await this.auth.login(this.username(), this.password());
      this.toast.success('Welcome back', `Signed in as ${this.username()} · ${res.tenantName ?? res.tenantCode}`);
      await this.router.navigateByUrl('/dashboard');
    } catch (e) {
      const body = (e as { error?: { message?: string } })?.error;
      const message = body?.message ?? (e as { message?: string })?.message;
      this.error.set(message || 'Invalid username or password.');
    } finally {
      this.loading.set(false);
    }
  }
}
