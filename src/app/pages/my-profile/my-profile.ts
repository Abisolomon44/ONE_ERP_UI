import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import {
  passwordErrors,
  passwordRequirements,
  PasswordRequirements,
} from '../../core/validators/auth-validators';
import { BaseButton } from '../../shared/base-button';

type Section = 'personal' | 'employee' | 'account' | 'company' | 'password';

@Component({
  selector: 'app-my-profile',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, BaseButton],
  templateUrl: './my-profile.html',
  styleUrl: './my-profile.css',
})
export class MyProfilePage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  // Data
  protected readonly photoUrl = signal<string | null>(null);
  protected readonly fullName = signal('');
  protected readonly email = signal('');
  protected readonly mobile = signal('');
  protected readonly username = signal('');
  protected readonly employeeId = signal('');
  protected readonly department = signal('');
  protected readonly designation = signal('');
  protected readonly role = signal('');
  protected readonly status = signal('');
  protected readonly companyName = signal('');
  protected readonly companyCode = signal('');
  protected readonly defaultCompany = signal('');
  protected readonly defaultBranch = signal('');
  protected readonly allowedCompanies = signal<string[]>([]);
  protected readonly allowedBranches = signal<string[]>([]);

  // Personal info editing
  protected readonly editingPersonal = signal(false);
  protected readonly personalNewName = signal('');
  protected readonly personalNewEmail = signal('');
  protected readonly personalNewMobile = signal('');
  protected readonly personalNewUsername = signal('');
  protected readonly showCurrentPassword = signal(false);
  protected readonly showNewPassword = signal(false);
  protected readonly showConfirmPassword = signal(false);
  protected readonly photoFile = signal<File | null>(null);
  protected readonly photoPreview = signal<string | null>(null);

  // Password editing
  protected readonly editingPassword = signal(false);
  protected readonly currentPassword = signal('');
  protected readonly newPassword = signal('');
  protected readonly confirmPassword = signal('');

  protected readonly passwordRequirements = signal<PasswordRequirements>({
    minLength: true,
    hasUppercase: true,
    hasLowercase: true,
    hasNumber: true,
    hasSpecial: true,
    noSpaces: true,
  });
  protected readonly pwdError = signal('');

  // State
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly savingPassword = signal(false);
  protected readonly error = signal('');

  protected section: Section = 'personal';

  protected readonly canSave = computed(
    () =>
      !!this.personalNewName() &&
      !!this.personalNewEmail() &&
      !!this.personalNewMobile() &&
      !!this.personalNewUsername() &&
      !this.loading()
  );

  protected readonly passwordValidity = computed(() => {
    if (!this.newPassword()) return { valid: false, messages: ['New password is required.'] };
    const messages = passwordErrors(this.newPassword());
    return {
      valid: messages.length === 0,
      messages,
    };
  });

  protected readonly canSavePassword = computed(
    () =>
      !!this.currentPassword() &&
      !!this.newPassword() &&
      !!this.confirmPassword() &&
      this.newPassword() === this.confirmPassword() &&
      this.passwordValidity().valid &&
      !this.savingPassword()
  );

  protected async ngOnInit(): Promise<void> {
    await this.loadProfile();
  }

  protected async loadProfile(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const profile = await this.auth.getProfile();
      this.photoUrl.set(profile.photoUrl ?? null);
      this.fullName.set(profile.fullName);
      this.email.set(profile.email);
      this.mobile.set(profile.mobile ?? '');
      this.username.set(profile.username);
      this.employeeId.set(profile.employeeId ?? '-');
      this.department.set(profile.department ?? '-');
      this.designation.set(profile.designation ?? '-');
      this.role.set(profile.role ?? '-');
      this.status.set(profile.status ?? '-');
      this.companyName.set(profile.companyName ?? '-');
      this.companyCode.set(profile.companyCode ?? '-');
      this.defaultCompany.set(profile.defaultCompany ?? '-');
      this.defaultBranch.set(profile.defaultBranch ?? '-');
      this.allowedCompanies.set(profile.allowedCompanies ?? []);
      this.allowedBranches.set(profile.allowedBranches ?? []);

      // Keep auto-save flag in sync with the authenticated state.
    } catch (e) {
      this.toast.error('Load failed', this.apiError(e));
    } finally {
      this.loading.set(false);
    }
  }

  // ---------- Personal Information ----------

  protected startEdit(): void {
    this.editingPersonal.set(true);
    this.personalNewName.set(this.fullName());
    this.personalNewEmail.set(this.email());
    this.personalNewMobile.set(this.mobile());
    this.personalNewUsername.set(this.username());
    this.photoPreview.set(this.photoUrl());
  }

  protected cancelPersonal(): void {
    this.editingPersonal.set(false);
    this.photoFile.set(null);
    this.photoPreview.set(this.photoUrl());
    this.error.set('');
  }

  protected async savePersonal(): Promise<void> {
    if (this.loading()) return;

    // Frontend validation first — no API call on failure.
    const errors = this.personalErrors();
    if (errors.length > 0) {
      this.error.set(errors[0]);
      return;
    }

    if (errors.length > 0) {
      this.error.set(errors[0]);
      return;
    }

    this.saving.set(true);
    this.error.set('');
    try {
      await this.auth.updateProfile({
        fullName: this.personalNewName(),
        email: this.personalNewEmail(),
        mobile: this.personalNewMobile(),
        username: this.personalNewUsername(),
      });

      this.fullName.set(this.personalNewName());
      this.email.set(this.personalNewEmail());
      this.mobile.set(this.personalNewMobile());
      this.username.set(this.personalNewUsername());
      this.editingPersonal.set(false);
      this.photoFile.set(null);
      this.photoPreview.set(this.photoUrl());
      this.toast.success('Saved', 'Personal information updated.');
    } catch (e) {
      this.toast.error('Save failed', this.apiError(e));
    } finally {
      this.saving.set(false);
    }
  }

  protected setPhotoFile(file: File | null | undefined): void {
    if (!file) return;
    this.photoFile.set(file);
    const reader = new FileReader();
    reader.onload = () => {
      this.photoPreview.set(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  protected onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.setPhotoFile(input?.files?.[0]);
  }

  protected async uploadPhoto(): Promise<void> {
    if (!this.photoFile() || this.loading()) return;
    const file = this.photoFile()!;
    if (!file.type.startsWith('image/')) {
      this.toast.error('Invalid file', 'Please choose an image file.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.toast.error('File too large', 'Profile photo must be under 2 MB.');
      return;
    }

    this.loading.set(true);
    try {
      await this.auth.uploadPhoto(file);
      this.photoFile.set(null);
      await this.loadProfile();
      this.toast.success('Saved', 'Profile photo updated.');
    } catch (e) {
      this.toast.error('Upload failed', this.apiError(e));
    } finally {
      this.loading.set(false);
    }
  }

  private personalErrors(): string[] {
    const errors: string[] = [];
    if (!this.personalNewName().trim()) errors.push('Full name is required.');
    if (!this.personalNewEmail().trim()) errors.push('Email is required.');
    if (!this.personalNewMobile().trim()) errors.push('Mobile number is required.');
    if (!this.personalNewUsername().trim()) errors.push('Username is required.');
    return errors;
  }

  // ---------- Password ----------

  protected startChangePassword(): void {
    this.editingPassword.set(true);
    this.currentPassword.set('');
    this.newPassword.set('');
    this.confirmPassword.set('');
    this.pwdError.set('');
  }

  protected cancelPassword(): void {
    this.editingPassword.set(false);
    this.currentPassword.set('');
    this.newPassword.set('');
    this.confirmPassword.set('');
    this.pwdError.set('');
  }

  protected async changePassword(): Promise<void> {
    if (this.loading()) return;

    const errors = this.passwordErrors();
    if (errors.length > 0) {
      this.pwdError.set(errors[0]);
      return;
    }

    if (this.newPassword() !== this.confirmPassword()) {
      this.pwdError.set('Passwords do not match.');
      return;
    }

    this.savingPassword.set(true);
    this.pwdError.set('');
    try {
      await this.auth.changePassword(this.currentPassword(), this.newPassword());
      this.toast.success('Password changed', 'Your password was updated successfully.');
      this.cancelPassword();
      await this.loadProfile();
    } catch (e) {
      this.toast.error('Change failed', this.apiError(e));
    } finally {
      this.savingPassword.set(false);
    }
  }

  private passwordErrors(): string[] {
    const errors: string[] = [];
    if (!this.currentPassword()) errors.push('Current password is required.');
    if (!this.newPassword()) errors.push('New password is required.');
    const messages = passwordErrors(this.newPassword());
    if (messages.length > 0) errors.push(messages[0]);
    if (!this.confirmPassword()) errors.push('Confirm password is required.');
    else if (this.confirmPassword() !== this.newPassword()) errors.push('Passwords do not match.');
    return errors;
  }

  private apiError(e: unknown): string {
    const body = (e as { error?: { message?: string } })?.error;
    const message = body?.message ?? (e as { message?: string })?.message;
    if (!message) return 'Unable to process your request. Please try again.';
    const raw = message as string;
    if (/(current password|incorrect)/i.test(raw)) return 'Current password is incorrect.';
    if (/^(users must|user not found|username does not exist)/i.test(raw)) {
      return 'This username is not available. Please choose another.';
    }
    if (/(already in use|in use by another user)/i.test(raw)) {
      return 'This value is already in use. Please choose another.';
    }
    if (/(password does not meet the|weak|validation)/i.test(raw)) {
      return 'Please check the password requirements below.';
    }
    return raw;
  }
}
