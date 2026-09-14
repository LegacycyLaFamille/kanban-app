import { useRef, useEffect } from "react";
import { useDrag } from "react-dnd";

import { DND_ITEM_TYPE, type DragItem, type Task } from "../types";
import { TaskCard } from "./TaskCard";

type DraggableTaskCardProps = {
  task: Task;
};

export function DraggableTaskCard({ task }: DraggableTaskCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [{ isDragging }, dragRef] = useDrag<DragItem, void, { isDragging: boolean }>(() => ({
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
      <TaskCard task={task} />
    </div>
  );
}