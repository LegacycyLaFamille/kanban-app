import type { ReactNode } from "react";

import { Button, Text } from "reshaped";

import type { FeedbackSize } from "./feedback.types";

import styles from "./Feedback.module.css";

interface ErrorStateProps {
  message: string;
  title?: string;
  onRetry?: () => void;
  retryLabel?: string;
  action?: ReactNode;
  size?: FeedbackSize;
}

export function ErrorState({
  message,
  title,
  onRetry,
  retryLabel = "Retry",
  action,
  size = "section",
}: ErrorStateProps) {
  return (
    <div className={`${styles.state} ${styles[size] ?? ""}`}>
      <div className={styles.text} role="alert">
        {title && (
          <Text as="p" weight="bold">
            {title}
          </Text>
        )}

        <Text as="p" color="neutral-faded">
          {message}
        </Text>
      </div>

      {(onRetry || action) && (
        <div className={styles.actions}>
          {onRetry && (
            <Button variant="outline" onClick={onRetry}>
              {retryLabel}
            </Button>
          )}

          {action}
        </div>
      )}
    </div>
  );
}
