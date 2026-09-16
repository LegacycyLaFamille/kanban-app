import { Card, Text, View } from "reshaped";
import type { Task } from "../types";

type TaskCardProps = {
  task: Task;
};

export function TaskCard({ task }: TaskCardProps) {
  return (
    <Card padding={3}>
      <View gap={2}>
        <Text variant="body-2" weight="medium">
          {task.title}
        </Text>

        {task.description && (
          <Text variant="caption-1" color="neutral-faded">
            {task.description.length > 55
              ? `${task.description.slice(0, 55)}...`
              : task.description}
          </Text>
        )}

        <View direction="row" justify="space-between" align="center">
          {task.priority && (
            <Text variant="caption-2" color="neutral-faded">
              🏷️{" "}
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            </Text>
          )}
          {task.assignee?.name && (
            <Text variant="caption-2" color="neutral-faded">
              👤 {task.assignee.name}
            </Text>
          )}
        </View>
      </View>
    </Card>
  );
}
