import type { ReactNode } from "react";

import { Loader } from "reshaped";

import styles from "./Feedback.module.css";

interface LoadingStateProps {
  label: string;
  className?: string;
  children?: ReactNode;
}

export function LoadingState({
  label,
  className,
  children,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-label={label}
      aria-busy="true"
      className={
        className ?? (children ? undefined : `${styles.state} ${styles.screen}`)
      }
    >
      {children ?? <Loader size="large" />}
    </div>
  );
}
