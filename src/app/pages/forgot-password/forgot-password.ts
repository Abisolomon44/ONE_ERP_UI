import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import {
  PASSWORD_CHAR_PATTERN,
  passwordErrors,
  passwordRequirements,
  PasswordRequirements,
  USERNAME_CHAR_PATTERN,
  usernameError,
} from '../../core/validators/auth-validators';
import { BaseButton } from '../../shared/base-button';
import { BaseInput } from '../../shared/base-controls';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, BaseButton, BaseInput],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPasswordPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly username = signal('');
  protected readonly newPassword = signal('');
  protected readonly confirmPassword = signal('');
  protected readonly loading = signal(false);
  protected readonly done = signal(false);
  protected readonly usernameFieldError = signal('');

  // Keypress filters: username = letters/numbers only, password = letters, numbers, # and @.
  protected readonly usernameCharPattern = USERNAME_CHAR_PATTERN;
  protected readonly passwordCharPattern = PASSWORD_CHAR_PATTERN;
  protected readonly newPasswordFieldError = signal('');
  protected readonly confirmPasswordFieldError = signal('');

  protected readonly requirements = computed<PasswordRequirements>(() =>
    passwordRequirements(this.newPassword())
  );
  protected readonly canSubmit = computed(
    () =>
      !!this.username().trim() &&
      !!this.newPassword() &&
      !!this.confirmPassword() &&
      !this.loading()
  );

  protected async submit(): Promise<void> {
    if (this.loading()) return;

    // Frontend validation first — no API call on failure.
    const username = this.username().trim();
    const usernameMessage = usernameError(username);
    if (usernameMessage) {
      this.usernameFieldError.set(usernameMessage);
      return;
    }

    const passwordMessages = passwordErrors(this.newPassword());
    if (passwordMessages.length > 0) {
      this.newPasswordFieldError.set(passwordMessages[0]);
      return;
    }

    if (!this.confirmPassword()) {
      this.confirmPasswordFieldError.set('Confirm password is required.');
      return;
    }
    if (this.confirmPassword() !== this.newPassword()) {
      this.confirmPasswordFieldError.set('Passwords do not match.');
      return;
    }

    this.usernameFieldError.set('');
    this.newPasswordFieldError.set('');
    this.confirmPasswordFieldError.set('');
    this.loading.set(true);
    try {
      const message = await this.auth.forgotPassword(username, this.newPassword());
      this.toast.success('Password reset', message || 'Password reset successfully.');
      this.done.set(true);
    } catch (e) {
      const body = (e as { error?: { message?: string } })?.error;
      const raw = body?.message ?? '';
      if (/wait \d+ seconds/i.test(raw)) {
        this.toast.error('Please wait', raw);
      } else if (raw) {
        // Password policy errors map to the field; anything else shows generically.
        this.newPasswordFieldError.set(raw);
      } else {
        this.toast.error('Request failed', 'Unable to process your request. Please try again.');
      }
    } finally {
      this.loading.set(false);
    }
  }

  protected backToLogin(): void {
    void this.router.navigate(['/login']);
  }
}
