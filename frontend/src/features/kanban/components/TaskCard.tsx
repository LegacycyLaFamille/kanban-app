import { Card, Text, View } from "reshaped";

import type { Task } from "../types";

type TaskCardProps = {
  task: Task;
};

const PRIORITY_LABELS: Record<NonNullable<Task["priority"]>, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export function TaskCard({ task }: TaskCardProps) {
  return (
    <Card padding={3}>
      <View gap={1}>
        <Text variant="body-2-bold">{task.title}</Text>

        {task.description && (
          <Text variant="caption-1" color="neutral-faded">
            {task.description}
          </Text>
        )}

        {task.priority && (
          <Text variant="caption-1" color="neutral-faded">
            Priority: {PRIORITY_LABELS[task.priority]}
          </Text>
        )}

        {task.deadline && (
          <Text variant="caption-1" color="neutral-faded">
            Due: {new Date(task.deadline).toLocaleDateString()}
          </Text>
        )}

        {task.assignee && (
          <Text variant="caption-1" color="neutral-faded">
            {task.assignee.name}
          </Text>
        )}
      </View>
    </Card>
  );
}