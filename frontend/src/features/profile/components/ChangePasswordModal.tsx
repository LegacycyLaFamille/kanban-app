import { type FormEvent, useRef, useState } from "react";

import {
  Button,
  Checkbox,
  FormControl,
  Modal,
  TextField,
  View,
} from "reshaped";

import { ApiError } from "../../../shared/api";

import type {
  ChangePasswordFieldErrors,
  ChangePasswordFormValues,
} from "../types/profile.types";

import {
  MIN_PASSWORD_LENGTH,
  hasErrors,
  validateChangePassword,
} from "../validation/profile.validation";

import styles from "./ProfileSections.module.css";

interface ChangePasswordModalProps {
  active: boolean;
  onClose: () => void;
  onConfirm?: ((values: ChangePasswordFormValues) => Promise<void>) | undefined;
}

const EMPTY_VALUES: ChangePasswordFormValues = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const FIELDS: {
  name: keyof ChangePasswordFormValues;
  label: string;
  autoComplete: string;
  helper?: string;
}[] = [
  {
    name: "currentPassword",
    label: "Current password",
    autoComplete: "current-password",
  },
  {
    name: "newPassword",
    label: "New password",
    autoComplete: "new-password",
    helper: `At least ${MIN_PASSWORD_LENGTH} characters.`,
  },
  {
    name: "confirmPassword",
    label: "Confirm new password",
    autoComplete: "new-password",
  },
];

export function ChangePasswordModal({
  active,
  onClose,
  onConfirm,
}: ChangePasswordModalProps) {
  const formRef = useRef<HTMLFormElement>(null);

  const [values, setValues] = useState(EMPTY_VALUES);
  const [errors, setErrors] = useState<ChangePasswordFieldErrors>({});
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function handleClose() {
    if (isSubmitting) {
      return;
    }

    setValues(EMPTY_VALUES);
    setErrors({});
    setFormError(null);
    setShowPasswords(false);
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationErrors = validateChangePassword(values);

    setErrors(validationErrors);

    if (hasErrors(validationErrors)) {
      const firstInvalid = FIELDS.find((field) => validationErrors[field.name]);
      const input = firstInvalid
        ? formRef.current?.elements.namedItem(firstInvalid.name)
        : null;

      if (input instanceof HTMLInputElement) {
        input.focus();
      }

      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      await onConfirm?.(values);
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.code === "INVALID_CURRENT_PASSWORD"
      ) {
        setErrors({ currentPassword: "The current password is incorrect." });
      } else if (error instanceof ApiError && error.status === 429) {
        setFormError(error.message);
      } else {
        setFormError("Unable to update your password. Please try again.");
      }

      return;
    } finally {
      setIsSubmitting(false);
    }

    setValues(EMPTY_VALUES);
    setShowPasswords(false);
    onClose();
  }

  return (
    <Modal active={active} onClose={handleClose} size="440px" padding={6}>
      <form
        ref={formRef}
        className={styles.form}
        onSubmit={handleSubmit}
        noValidate
      >
        <View gap={1}>
          <Modal.Title>Change password</Modal.Title>

          <Modal.Subtitle>
            Enter your current password, then choose a new one.
          </Modal.Subtitle>
        </View>

        {formError && (
          <div className={styles.errorMessage} role="alert">
            {formError}
          </div>
        )}

        {FIELDS.map((field) => {
          const error = errors[field.name];

          return (
            <FormControl key={field.name} hasError={Boolean(error)}>
              <FormControl.Label>{field.label}</FormControl.Label>

              <TextField
                name={field.name}
                value={values[field.name]}
                inputAttributes={{
                  type: showPasswords ? "text" : "password",
                  autoComplete: field.autoComplete,
                  autoCapitalize: "none",
                  spellCheck: false,
                }}
                onChange={({ value }) => {
                  setValues((current) => ({ ...current, [field.name]: value }));
                  setErrors((current) => ({
                    ...current,
                    [field.name]: undefined,
                  }));
                }}
              />

              {error ? (
                <FormControl.Error>{error}</FormControl.Error>
              ) : (
                field.helper && (
                  <FormControl.Helper>{field.helper}</FormControl.Helper>
                )
              )}
            </FormControl>
          );
        })}

        <Checkbox
          name="showPasswords"
          checked={showPasswords}
          onChange={({ checked }) => setShowPasswords(checked)}
        >
          Show passwords
        </Checkbox>

        <div className={styles.dialogActions}>
          <Button
            variant="outline"
            color="neutral"
            disabled={isSubmitting}
            onClick={handleClose}
          >
            Cancel
          </Button>

          <Button
            color="primary"
            loading={isSubmitting}
            loadingAriaLabel="Updating password"
            type="submit"
          >
            Update password
          </Button>
        </div>
      </form>
    </Modal>
  );
}
