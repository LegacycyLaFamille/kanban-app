import type {
  ChangePasswordFieldErrors,
  ChangePasswordFormValues,
  ProfileFieldErrors,
  ProfileFormValues,
} from "../types/profile.types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_NAME_LENGTH = 2;
export const MAX_NAME_LENGTH = 100;
export const MIN_PASSWORD_LENGTH = 8;

export function validateProfile(values: ProfileFormValues): ProfileFieldErrors {
  const errors: ProfileFieldErrors = {};
  const name = values.name.trim();
  const email = values.email.trim();

  if (!name) {
    errors.name = "Name is required.";
  } else if (name.length < MIN_NAME_LENGTH) {
    errors.name = `Name must contain at least ${MIN_NAME_LENGTH} characters.`;
  } else if (name.length > MAX_NAME_LENGTH) {
    errors.name = `Name must contain at most ${MAX_NAME_LENGTH} characters.`;
  }

  if (!email) {
    errors.email = "Email is required.";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Please enter a valid email address.";
  }

  return errors;
}

export function validateChangePassword(
  values: ChangePasswordFormValues,
): ChangePasswordFieldErrors {
  const errors: ChangePasswordFieldErrors = {};

  if (!values.currentPassword) {
    errors.currentPassword = "Current password is required.";
  }

  if (!values.newPassword) {
    errors.newPassword = "New password is required.";
  } else if (values.newPassword.length < MIN_PASSWORD_LENGTH) {
    errors.newPassword = `Password must contain at least ${MIN_PASSWORD_LENGTH} characters.`;
  } else if (values.newPassword === values.currentPassword) {
    errors.newPassword = "New password must differ from the current one.";
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = "Please confirm your new password.";
  } else if (values.newPassword !== values.confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}

export function hasErrors(errors: object): boolean {
  return Object.values(errors).some(Boolean);
}
