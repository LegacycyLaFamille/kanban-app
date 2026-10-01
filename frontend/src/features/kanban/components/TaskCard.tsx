import type { ReactNode } from "react";
import { Card } from "reshaped";

import type { Task, TaskPriority } from "../types";
import { getDeadlineStatus } from "../utils/deadlineStatus";

import styles from "./TaskCard.module.css";

type TaskCardProps = {
  task: Task;
  /** id for the priority/deadline/assignee line, so an interactive wrapper
   * can point aria-describedby at it. */
  detailsId?: string;
};

// Each priority gets a shape as well as a colour, so it reads without
// colour vision (RGAA 3.1): ▼ low, ● medium, ▲ high.
const PRIORITY_ICONS: Record<TaskPriority, ReactNode> = {
  low: <path d="M2 3h8L6 9.5Z" />,
  medium: <circle cx="6" cy="6" r="3.6" />,
  high: <path d="M6 2.5 10 9H2Z" />,
};

const AVATAR_COLORS = 6;

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters =
    parts.length > 1
      ? `${parts[0]![0]}${parts[parts.length - 1]![0]}`
      : (parts[0]?.slice(0, 2) ?? "");
  return letters.toUpperCase() || "?";
}

// Same person, same colour, on every card.
function avatarColor(id: string): number {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % AVATAR_COLORS;
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
      <rect
        x="1.5"
        y="2.5"
        width="9"
        height="8"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M1.5 5h9M4 1.2v2.4M8 1.2v2.4"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  );
}

export function TaskCard({ task, detailsId }: TaskCardProps) {
  const deadline = getDeadlineStatus(task.deadline, task.columnId);

  return (
    <Card padding={0} className={styles.card}>
      <span
        className={styles.accent}
        data-priority={task.priority ?? "none"}
        aria-hidden="true"
      />

      <div className={styles.body}>
        <span className={styles.title}>{task.title}</span>

        {task.description && (
          <span className={styles.description}>
            {task.description.length > 55
              ? `${task.description.slice(0, 55)}...`
              : task.description}
          </span>
        )}

        {(task.priority || deadline || task.assignee?.name) && (
          <div className={styles.meta} id={detailsId}>
            {task.priority && (
              <span className={styles.badge} data-tone={task.priority}>
                <svg
                  viewBox="0 0 12 12"
                  width="10"
                  height="10"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  {PRIORITY_ICONS[task.priority]}
                </svg>
                <span className="sr-only">Priority: </span>
                {capitalize(task.priority)}
              </span>
            )}

            {deadline && (
              <span className={styles.badge} data-tone={deadline.tone}>
                <CalendarIcon />
                {deadline.label}
              </span>
            )}

            {task.assignee?.name && (
              <span className={styles.assignee}>
                <span
                  className={styles.avatar}
                  data-color={avatarColor(task.assignee.id)}
                  aria-hidden="true"
                >
                  {initials(task.assignee.name)}
                </span>
                <span className="sr-only">Assigned to </span>
                {task.assignee.name}
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
