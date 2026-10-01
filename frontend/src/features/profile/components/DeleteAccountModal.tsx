import { type FormEvent, useState } from "react";

import { Button, FormControl, Modal, TextField, View } from "reshaped";

import styles from "./ProfileSections.module.css";

interface DeleteAccountModalProps {
  active: boolean;
  email: string;
  onClose: () => void;
  onConfirm?: (() => Promise<void>) | undefined;
}

export function DeleteAccountModal({
  active,
  email,
  onClose,
  onConfirm,
}: DeleteAccountModalProps) {
  const [confirmation, setConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfirmed =
    confirmation.trim().toLowerCase() === email.trim().toLowerCase();

  function handleClose() {
    if (isSubmitting) {
      return;
    }

    setConfirmation("");
    setError(null);
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isConfirmed) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await onConfirm?.();
    } catch {
      setError("Unable to delete your account. Please try again.");

      return;
    } finally {
      setIsSubmitting(false);
    }

    setConfirmation("");
    onClose();
  }

  return (
    <Modal active={active} onClose={handleClose} size="440px" padding={6}>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <View gap={2}>
          <Modal.Title>Delete account</Modal.Title>

          <Modal.Subtitle>
            This permanently deletes your account along with the projects and
            tasks you own. This action cannot be undone.
          </Modal.Subtitle>
        </View>

        {error && (
          <div className={styles.errorMessage} role="alert">
            {error}
          </div>
        )}

        <FormControl>
          <FormControl.Label>
            Type <strong className={styles.breakAnywhere}>{email}</strong> to
            confirm
          </FormControl.Label>

          <TextField
            name="confirmEmail"
            value={confirmation}
            placeholder={email}
            inputAttributes={{
              type: "email",
              autoComplete: "off",
              autoCapitalize: "none",
              spellCheck: false,
            }}
            onChange={({ value }) => setConfirmation(value)}
          />
        </FormControl>

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
            color="critical"
            disabled={!isConfirmed}
            loading={isSubmitting}
            loadingAriaLabel="Deleting account"
            type="submit"
          >
            Delete my account
          </Button>
        </div>
      </form>
    </Modal>
  );
}
