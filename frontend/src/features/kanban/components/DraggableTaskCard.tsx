import { useRef, useEffect, type KeyboardEvent } from "react";
import { useDrag } from "react-dnd";

import { DND_ITEM_TYPE, type DragItem, type Task } from "../types";
import { TaskCard } from "./TaskCard";

type DraggableTaskCardProps = {
  task: Task;
  /** Opens the task's edit dialog, where its column/status can also be
   * changed — the keyboard- and screen-reader-accessible equivalent to
   * dragging the card, since drag-and-drop has no built-in alternative
   * input method (RGAA 7.3 / WCAG 2.5.7). Omitted for read-only users: the
   * card is then a plain, non-interactive element. */
  onOpen?: () => void;
  /** True while this task's status update is being persisted; blocks re-dragging it. */
  isPending?: boolean;
};

export function DraggableTaskCard({
  task,
  onOpen,
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

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen?.();
    }
  }

  const interactiveProps = onOpen
    ? {
        role: "button",
        tabIndex: 0,
        "aria-label": `Open task ${task.title}`,
        onClick: onOpen,
        onKeyDown: handleKeyDown,
      }
    : {};

  return (
    <div
      ref={ref}
      data-task-id={task.id}
      aria-busy={isPending}
      {...interactiveProps}
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
