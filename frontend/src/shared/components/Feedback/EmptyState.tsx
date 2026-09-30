import type { ReactNode } from "react";

import { Text } from "reshaped";

import type { FeedbackSize } from "./feedback.types";

import styles from "./Feedback.module.css";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  size?: FeedbackSize;
}

export function EmptyState({
  title,
  description,
  action,
  size = "section",
}: EmptyStateProps) {
  return (
    <div className={`${styles.state} ${styles[size] ?? ""}`}>
      <div className={styles.text}>
        <Text as="p" weight="bold">
          {title}
        </Text>

        {description && (
          <Text as="p" color="neutral-faded">
            {description}
          </Text>
        )}
      </div>

      {action && <div className={styles.actions}>{action}</div>}
    </div>
  );
}
