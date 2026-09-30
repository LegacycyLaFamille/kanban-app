import { useRef, useEffect } from "react";
import { useDrag } from "react-dnd";

import { DND_ITEM_TYPE, type DragItem, type Task } from "../types";
import { TaskCard } from "./TaskCard";

type DraggableTaskCardProps = {
  task: Task;
  /** True while this task's status update is being persisted; blocks re-dragging it. */
  isPending?: boolean;
};

export function DraggableTaskCard({
  task,
  isPending = false,
}: DraggableTaskCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [{ isDragging }, dragRef] = useDrag<
    DragItem,
    void,
    { isDragging: boolean }
  >(
    () => ({
      type: DND_ITEM_TYPE,
      item: { id: task.id, sourceColumnId: task.columnId },
      canDrag: () => !isPending,
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [task.id, task.columnId, isPending],
  );

  useEffect(() => {
    dragRef(ref);
  }, [dragRef]);

  return (
    <div
      ref={ref}
      data-task-id={task.id}
      aria-busy={isPending}
      style={{
        opacity: isPending ? 0.6 : isDragging ? 0.4 : 1,
        cursor: isPending ? "wait" : "grab",
        transition: "opacity 0.15s ease",
      }}
    >
      <TaskCard task={task} />
    </div>
  );
}
