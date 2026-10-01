import { type FormEvent, useId, useState } from "react";

import type { CreateProjectPayload } from "../types/project-api.types";

import styles from "./ProjectForm.module.css";

type ProjectFormProps = {
  title: string;
  submitLabel: string;
  initialValues?: CreateProjectPayload;
  isSubmitting: boolean;
  serverError: string | null;
  onSubmit: (payload: CreateProjectPayload) => Promise<boolean>;
  onCancel: () => void;
};

export function ProjectForm({
  title,
  submitLabel,
  initialValues,
  isSubmitting,
  serverError,
  onSubmit,
  onCancel,
}: ProjectFormProps) {
  const nameId = useId();
  const descriptionId = useId();
  const errorId = useId();

  const [name, setName] = useState(initialValues?.name ?? "");
  const [description, setDescription] = useState(
    initialValues?.description ?? "",
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const displayedError = validationError || serverError;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedName = name.trim();

    if (!normalizedName) {
      setValidationError("Project name is required.");
      return;
    }

    setValidationError(null);

    await onSubmit({
      name: normalizedName,
      description: description.trim(),
    });
  }

  return (
    <form
      className={styles.form}
      onSubmit={handleSubmit}
      noValidate
      aria-busy={isSubmitting}
    >
      <h2 className={styles.title}>{title}</h2>

      <div className={styles.field}>
        <label htmlFor={nameId}>Project name</label>

        <input
          id={nameId}
          type="text"
          value={name}
          required
          disabled={isSubmitting}
          placeholder="My project"
          aria-invalid={Boolean(validationError)}
          aria-describedby={displayedError ? errorId : undefined}
          onChange={(event) => {
            setName(event.target.value);
            setValidationError(null);
          }}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor={descriptionId}>Description</label>

        <textarea
          id={descriptionId}
          value={description}
          rows={4}
          disabled={isSubmitting}
          placeholder="What is this project about?"
          onChange={(event) => setDescription(event.target.value)}
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
