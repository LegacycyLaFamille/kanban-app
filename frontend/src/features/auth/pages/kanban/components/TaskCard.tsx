import { useRef, useEffect } from "react";
import { useDrag } from "react-dnd";
import { Card, Text } from "reshaped";

import { DND_ITEM_TYPE, type DragItem, type Task } from "../types";

type TaskCardProps = {
  task: Task;
};

export function TaskCard({ task }: TaskCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [{ isDragging }, dragRef] = useDrag<
    DragItem,
    void,
    { isDragging: boolean }
  >(() => ({
    type: DND_ITEM_TYPE,
    item: { id: task.id, sourceColumnId: task.columnId },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  useEffect(() => {
    dragRef(ref);
  }, [dragRef]);

  return (
    <div ref={ref} style={{ opacity: isDragging ? 0.5 : 1, cursor: "grab" }}>
      <Card padding={3}>
        <Text>{task.title}</Text>
      </Card>
    </div>
  );
}
