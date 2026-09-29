import { type FormEvent, useEffect, useRef, useState } from "react";

import { Button, FormControl, TextField } from "reshaped";

import type { AuthUser } from "../../auth/types/auth.types";

import { useUpdateProfile } from "../hooks/useUpdateProfile";

import type {
  ProfileFieldErrors,
  ProfileFormValues,
  UpdateProfilePayload,
} from "../types/profile.types";

import {
  MAX_NAME_LENGTH,
  hasErrors,
  validateProfile,
} from "../validation/profile.validation";

import { ProfileSection } from "./ProfileSection";
import { UnsavedChangesGuard } from "./UnsavedChangesGuard";

import styles from "./ProfileSections.module.css";

const SUCCESS_MESSAGE_DURATION = 4000;

const FIELD_ORDER: (keyof ProfileFormValues)[] = ["name", "email"];

interface ProfileDetailsFormProps {
  user: AuthUser;
}

function toFormValues(user: AuthUser): ProfileFormValues {
  return {
    name: user.name,
    email: user.email,
  };
}

export function ProfileDetailsForm({ user }: ProfileDetailsFormProps) {
  const {
    submit,
    isSubmitting,
    error: requestError,
    fieldErrors: serverErrors,
    clearFieldError,
  } = useUpdateProfile();

  const formRef = useRef<HTMLFormElement>(null);

  const [values, setValues] = useState<ProfileFormValues>(() =>
    toFormValues(user),
  );

  const [errors, setErrors] = useState<ProfileFieldErrors>({});

  const [isSaved, setIsSaved] = useState(false);

  const changes: UpdateProfilePayload = {};

  if (values.name.trim() !== user.name) {
    changes.name = values.name.trim();
  }

  if (values.email.trim() !== user.email) {
    changes.email = values.email.trim();
  }

  const isDirty = Object.keys(changes).length > 0;

  const nameError = errors.name ?? serverErrors.name;
  const emailError = errors.email ?? serverErrors.email;

  function focusFirstInvalidField(fieldErrors: ProfileFieldErrors) {
    const field = FIELD_ORDER.find((name) => fieldErrors[name]);

    if (!field) {
      return;
    }

    const input = formRef.current?.elements.namedItem(field);

    if (input instanceof HTMLInputElement) {
      input.focus();
    }
  }

  // Server-side field errors arrive asynchronously: move focus to them too.
  useEffect(() => {
    focusFirstInvalidField(serverErrors);
  }, [serverErrors]);

  useEffect(() => {
    if (!isSaved) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setIsSaved(false);
    }, SUCCESS_MESSAGE_DURATION);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [isSaved]);

  function updateField(field: keyof ProfileFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    clearFieldError(field);
    setIsSaved(false);
  }

  function handleReset() {
    setValues(toFormValues(user));
    setErrors({});
    clearFieldError("name");
    clearFieldError("email");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isDirty || isSubmitting) {
      return;
    }

    const validationErrors = validateProfile(values);

    setErrors(validationErrors);

    if (hasErrors(validationErrors)) {
      focusFirstInvalidField(validationErrors);

      return;
    }

    const saved = await submit(changes);

    if (saved) {
      // Match what the API stored (trimmed), so the form is no longer dirty.
      setValues({ name: values.name.trim(), email: values.email.trim() });
    }

    setIsSaved(saved);
  }

  return (
    <ProfileSection
      title="Personal information"
      description="Update the name and email address linked to your account."
    >
      <UnsavedChangesGuard when={isDirty && !isSubmitting} />

      {requestError && (
        <div className={styles.errorMessage} role="alert">
          {requestError}
        </div>
      )}

      <div aria-live="polite">
        {isSaved && (
          <div className={styles.successMessage} role="status">
            Your profile has been updated.
          </div>
        )}
      </div>

      <form
        ref={formRef}
        className={styles.form}
        onSubmit={handleSubmit}
        noValidate
      >
        <FormControl hasError={Boolean(nameError)}>
          <FormControl.Label>Name</FormControl.Label>

          <TextField
            name="name"
            value={values.name}
            placeholder="Your name"
            inputAttributes={{
              autoComplete: "name",
              maxLength: MAX_NAME_LENGTH,
            }}
            onChange={({ value }) => updateField("name", value)}
          />

          {nameError && <FormControl.Error>{nameError}</FormControl.Error>}
        </FormControl>

        <FormControl hasError={Boolean(emailError)}>
          <FormControl.Label>Email</FormControl.Label>

          <TextField
            name="email"
            value={values.email}
            placeholder="you@example.com"
            inputAttributes={{
              type: "email",
              autoComplete: "email",
              autoCapitalize: "none",
              spellCheck: false,
            }}
            onChange={({ value }) => updateField("email", value)}
          />

          {emailError ? (
            <FormControl.Error>{emailError}</FormControl.Error>
          ) : (
            <FormControl.Helper>
              You use this email address to sign in.
            </FormControl.Helper>
          )}
        </FormControl>

        <div className={styles.formActions}>
          <Button
            variant="outline"
            color="neutral"
            disabled={!isDirty || isSubmitting}
            onClick={handleReset}
          >
            Discard changes
          </Button>

          <Button
            color="primary"
            disabled={!isDirty}
            loading={isSubmitting}
            loadingAriaLabel="Saving profile"
            type="submit"
          >
            Save changes
          </Button>
        </div>
      </form>
    </ProfileSection>
  );
}
