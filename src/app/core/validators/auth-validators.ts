// Shared frontend validation for authentication forms.
// Frontend validation runs BEFORE any API call; backend remains authoritative.

export const USERNAME_REGEX = /^[A-Za-z0-9]+$/;
export const OTP_REGEX = /^[0-9]{6}$/;

// Keypress-level character filters (applied per character as the user types/pastes).
export const USERNAME_CHAR_PATTERN = /^[A-Za-z0-9]$/;
export const PASSWORD_CHAR_PATTERN = /^[A-Za-z0-9#@]$/;

export interface PasswordRequirements {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  noSpaces: boolean;
}

/** Exact username validation message, or empty string when valid. */
export function usernameError(username: string): string {
  if (!username) return 'Username is required.';
  if (!USERNAME_REGEX.test(username)) {
    return 'Username must contain only letters and numbers.';
  }
  return '';
}

/** Exact OTP validation message, or empty string when valid. */
export function otpError(otp: string): string {
  if (!otp) return 'OTP is required.';
  if (!/^[0-9]+$/.test(otp)) return 'OTP must contain numbers only.';
  if (otp.length !== 6) return 'OTP must be 6 digits.';
  return '';
}

/** Exact new-password validation messages (all applicable), or empty array when valid. */
export function passwordErrors(password: string): string[] {
  if (!password) return ['New password is required.'];

  const errors: string[] = [];
  if (password.length < 8) errors.push('Password must be at least 8 characters.');
  if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter.');
  if (!/[a-z]/.test(password)) errors.push('Password must contain at least one lowercase letter.');
  if (!/[0-9]/.test(password)) errors.push('Password must contain at least one number.');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('Password must contain at least one special character.');
  if (/\s/.test(password)) errors.push('Password cannot contain spaces.');
  return errors;
}

/** Live requirement checklist for the reset/change password UI. */
export function passwordRequirements(password: string): PasswordRequirements {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
    noSpaces: !/\s/.test(password),
  };
}
