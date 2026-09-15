import { useRef, useEffect } from "react";
import { useDrop } from "react-dnd";
import { Button, Card, Text, View } from "reshaped";

import {
  DND_ITEM_TYPE,
  type ColumnId,
  type DragItem,
  type Task,
} from "../types";
import { DraggableTaskCard } from "./DraggableTaskCard";

type ColumnProps = {
  columnId: ColumnId;
  title: string;
  tasks: Task[];
  onDropTask: (taskId: string, targetColumnId: ColumnId) => void;
  onAddTask: () => void;
};

export function Column({
  columnId,
  title,
  tasks,
  onDropTask,
  onAddTask,
}: ColumnProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [{ isOver, canDrop }, dropRef] = useDrop<
    DragItem,
    void,
    { isOver: boolean; canDrop: boolean }
  >(
    () => ({
      accept: DND_ITEM_TYPE,
      drop: (item) => {
        onDropTask(item.id, columnId);
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }),
    [columnId, onDropTask],
  );

  useEffect(() => {
    dropRef(ref);
  }, [dropRef]);

  return (
    <div ref={ref} style={{ height: "100%" }}>
      <Card padding={4}>
        <div
          style={{
            minHeight: "400px",
            backgroundColor:
              isOver && canDrop
                ? "var(--rs-color-background-primary-faded)"
                : undefined,
            borderRadius: "8px",
            transition: "background-color 0.15s ease",
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          <View gap={4}>
            {/* Header with Title, Count, and + button */}
            <View direction="row" align="center" justify="space-between">
              <View direction="row" align="center" gap={2}>
                <Text weight="bold">{title}</Text>
                <Text variant="caption-1" color="neutral-faded">
                  ({tasks.length})
                </Text>
              </View>
              <Button variant="ghost" size="small" onClick={onAddTask}>
                +
              </Button>
            </View>

            {/* Cards List */}
            <View.Item grow>
              <View gap={3}>
                {tasks.map((task) => (
                  <DraggableTaskCard key={task.id} task={task} />
                ))}
              </View>
            </View.Item>

            {/* In-Card Add Button */}
            <Button
              variant="outline"
              color="neutral"
              size="small"
              fullWidth
              onClick={onAddTask}
            >
              Add card
            </Button>
          </View>
        </div>
      </Card>
    </div>
  );
}
