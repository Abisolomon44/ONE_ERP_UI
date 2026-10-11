import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { NavigationStoreService } from '../../core/services/navigation-store.service';
import { ThemeService } from '../../core/services/theme.service';
import { ToastService } from '../../core/services/toast.service';
import { PASSWORD_CHAR_PATTERN, USERNAME_CHAR_PATTERN, usernameError } from '../../core/validators/auth-validators';
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
  private readonly nav = inject(NavigationStoreService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  protected readonly theme = inject(ThemeService);

  protected readonly username = signal('');
  protected readonly password = signal('');
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly usernameFieldError = signal('');

  // Keypress filters: username = letters/numbers only, password = letters, numbers, # and @.
  protected readonly usernameCharPattern = USERNAME_CHAR_PATTERN;
  protected readonly passwordCharPattern = PASSWORD_CHAR_PATTERN;

  protected canSubmit(): boolean {
    return !!this.username().trim() && !!this.password() && !this.loading();
  }

  protected async submit(): Promise<void> {
    if (this.loading()) return;

    // Frontend validation first — no API call on failure.
    const username = this.username().trim();
    const usernameMessage = usernameError(username);
    if (usernameMessage) {
      this.usernameFieldError.set(usernameMessage);
      return;
    }
    if (!this.password()) {
      this.error.set('Password is required.');
      return;
    }

    this.usernameFieldError.set('');
    this.loading.set(true);
    this.error.set('');
    try {
      const res = await this.auth.login(username, this.password());
      this.toast.success('Welcome back', `Signed in as ${username} · ${res.tenantName ?? res.tenantCode}`);
      const navigation = await this.nav.ensureLoaded();
      const destination = navigation.hasAccess ? '/dashboard' : '/contact-administrator';
      await this.router.navigateByUrl(destination);
    } catch (e) {
      const body = (e as { error?: { message?: string } })?.error;
      const message = body?.message ?? (e as { message?: string })?.message;
      this.error.set(message || 'Unable to process your request. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  protected forgotPassword(): void {
    void this.router.navigate(['/forgot-password']);
  }
}
