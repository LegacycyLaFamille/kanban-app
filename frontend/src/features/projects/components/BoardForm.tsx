import { type FormEvent, useId, useState } from "react";

import type { CreateBoardPayload } from "../types/project-api.types";

import styles from "./ProjectForm.module.css";

type BoardFormProps = {
  title: string;
  submitLabel: string;
  initialName?: string;
  isSubmitting: boolean;
  serverError: string | null;
  onSubmit: (payload: CreateBoardPayload) => Promise<boolean>;
  onCancel: () => void;
};

export function BoardForm({
  title,
  submitLabel,
  initialName = "",
  isSubmitting,
  serverError,
  onSubmit,
  onCancel,
}: BoardFormProps) {
  const nameId = useId();
  const errorId = useId();

  const [name, setName] = useState(initialName);
  const [validationError, setValidationError] = useState<string | null>(null);

  const displayedError = validationError || serverError;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedName = name.trim();

    if (!normalizedName) {
      setValidationError("Board name is required.");
      return;
    }

    setValidationError(null);

    await onSubmit({ name: normalizedName });
  }

  return (
    <form
      className={styles.form}
      onSubmit={handleSubmit}
      noValidate
      aria-busy={isSubmitting}
    >
      <h3 className={styles.title}>{title}</h3>

      <div className={styles.field}>
        <label htmlFor={nameId}>Board name</label>

        <input
          id={nameId}
          type="text"
          value={name}
          required
          disabled={isSubmitting}
          placeholder="Development"
          aria-invalid={Boolean(validationError)}
          aria-describedby={displayedError ? errorId : undefined}
          onChange={(event) => {
            setName(event.target.value);
            setValidationError(null);
          }}
        />
      </div>

      {displayedError && (
        <p id={errorId} className={styles.error} role="alert">
          {displayedError}
        </p>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.secondaryButton}
          disabled={isSubmitting}
          onClick={onCancel}
        >
          Cancel
        </button>

        <button
          type="submit"
          className={styles.primaryButton}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
