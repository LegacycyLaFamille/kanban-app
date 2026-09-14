import { useRef, useEffect } from "react";
import { useDrop } from "react-dnd";
import { View, Text } from "reshaped";

import {
  DND_ITEM_TYPE,
  type ColumnId,
  type DragItem,
  type Task,
} from "../types";
import { TaskCard } from "./TaskCard";

type ColumnProps = {
  columnId: ColumnId;
  title: string;
  tasks: Task[];
  onDropTask: (taskId: string, targetColumnId: ColumnId) => void;
};

export function Column({ columnId, title, tasks, onDropTask }: ColumnProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [{ isOver, canDrop }, dropRef] = useDrop<
    DragItem,
    void,
    { isOver: boolean; canDrop: boolean }
  >(() => ({
    accept: DND_ITEM_TYPE,
    drop: (item) => {
      onDropTask(item.id, columnId);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));

  useEffect(() => {
    dropRef(ref);
  }, [dropRef]);

  return (
    <div ref={ref}>
      <View
        backgroundColor={isOver && canDrop ? "primary-faded" : "neutral-faded"}
        padding={3}
        borderRadius="medium"
        minWidth="240px"
      >
        <Text variant="body-2-bold">{title}</Text>
        <View gap={2} paddingTop={2}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </View>
      </View>
    </div>
  );
}
