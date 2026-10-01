import type { AppNotification } from "../types/notification.types";

function taskLabel(notification: AppNotification): string {
  const title = notification.task?.title;
  return title ? `"${title}"` : "a task";
}

export function notificationMessage(notification: AppNotification): string {
  const actor = notification.actor?.name ?? "Someone";

  switch (notification.type) {
    case "task.created":
      return `${actor} created ${taskLabel(notification)}`;
    case "task.completed":
      return `${actor} completed ${taskLabel(notification)}`;
    default:
      return `${actor} updated ${taskLabel(notification)}`;
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
