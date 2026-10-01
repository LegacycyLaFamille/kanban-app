import type { AppNotification } from "../types/notification.types";

function taskLabel(notification: AppNotification): string {
  const title = notification.task?.title;
  return title ? `"${title}"` : "a task";
}

// Backend task field names, as shown to the user.
const FIELD_LABELS: Record<string, string> = {
  title: "title",
  description: "description",
  status: "status",
  priority: "priority",
  deadline: "deadline",
  boardId: "board",
  assigneeId: "assignee",
};

// ["status"] -> "status", ["a", "b", "c"] -> "a, b and c".
function formatFields(changes: string[]): string {
  const labels = changes.map((field) => FIELD_LABELS[field] ?? field);
  if (labels.length <= 1) return labels.join("");
  return `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;
}

export function notificationMessage(notification: AppNotification): string {
  const actor = notification.actor?.name ?? "Someone";
  const task = taskLabel(notification);

  switch (notification.type) {
    case "task.created":
      return `${actor} created ${task}`;
    case "task.completed":
      return `${actor} completed ${task}`;
    case "task.assigned":
      return `${actor} assigned you to ${task}`;
    case "task.updated": {
      const changes = notification.changes ?? [];
      return changes.length > 0
        ? `${actor} changed the ${formatFields(changes)} of ${task}`
        : `${actor} updated ${task}`;
    }
    default:
      return `${actor} updated ${task}`;
  }
}

// Task notifications open the project's Kanban, others the project page.
export function notificationTarget(notification: AppNotification): string {
  const projectPath = `/projects/${notification.project.id}`;
  return notification.task ? `${projectPath}/kanban` : projectPath;
}

export function formatRelativeTime(isoDate: string, now = new Date()): string {
  const seconds = Math.round(
    (now.getTime() - new Date(isoDate).getTime()) / 1000,
  );

  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return days === 1 ? "yesterday" : `${days} days ago`;

  return new Date(isoDate).toLocaleDateString();
}
