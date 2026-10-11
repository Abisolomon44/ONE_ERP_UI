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
} from '../../core/validators/auth-validators';
import { BaseButton } from '../../shared/base-button';
import { BaseInput } from '../../shared/base-controls';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, BaseButton, BaseInput],
  templateUrl: './change-password.html',
  styleUrl: './change-password.css',
})
export class ChangePasswordPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly currentPassword = signal('');
  protected readonly newPassword = signal('');
  protected readonly confirmPassword = signal('');
  protected readonly loading = signal(false);
  protected readonly currentPasswordFieldError = signal('');

  // Keypress filter: password = letters, numbers, # and @ only.
  protected readonly passwordCharPattern = PASSWORD_CHAR_PATTERN;
  protected readonly newPasswordFieldError = signal('');
  protected readonly confirmPasswordFieldError = signal('');

  protected readonly requirements = computed<PasswordRequirements>(() =>
    passwordRequirements(this.newPassword())
  );
  protected readonly canSubmit = computed(
    () =>
      !!this.currentPassword() &&
      !!this.newPassword() &&
      !!this.confirmPassword() &&
      !this.loading()
  );

  protected async submit(): Promise<void> {
    if (this.loading()) return;

    // Frontend validation first — no API call on failure.
    if (!this.currentPassword()) {
      this.currentPasswordFieldError.set('Current password is required.');
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

    this.currentPasswordFieldError.set('');
    this.newPasswordFieldError.set('');
    this.confirmPasswordFieldError.set('');
    this.loading.set(true);
    try {
      const message = await this.auth.changePassword(
        this.currentPassword(),
        this.newPassword()
      );
      this.toast.success('Password changed', message || 'Password changed successfully.');
      void this.router.navigate(['/dashboard']);
    } catch (e) {
      const body = (e as { error?: { message?: string } })?.error;
      const raw = body?.message ?? '';
      if (/current password is incorrect/i.test(raw)) {
        this.currentPasswordFieldError.set('Current password is incorrect.');
      } else {
        this.toast.error(
          'Change failed',
          raw || 'Unable to process your request. Please try again.'
        );
      }
    } finally {
      this.loading.set(false);
    }
  }

  protected cancel(): void {
    void this.router.navigate(['/dashboard']);
  }
}
