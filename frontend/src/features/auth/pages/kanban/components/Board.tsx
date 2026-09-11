import { useState, useCallback } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { View } from "reshaped";

import type { ColumnId, Task } from "../types";
import { initialTasks } from "../data/mockTasks";
import { Column } from "./Column";

const COLUMNS: { id: ColumnId; title: string }[] = [
  { id: "todo", title: "To Do" },
  { id: "in-progress", title: "In Progress" },
  { id: "done", title: "Done" },
];

export function Board() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  const handleDropTask = useCallback(
    (taskId: string, targetColumnId: ColumnId) => {
      setTasks((current) =>
        current.map((task) =>
          task.id === taskId ? { ...task, columnId: targetColumnId } : task,
        ),
      );
    },
    [],
  );

  return (
    <DndProvider backend={HTML5Backend}>
      <View direction="row" gap={4} padding={4}>
        {COLUMNS.map((column) => (
          <Column
            key={column.id}
            columnId={column.id}
            title={column.title}
            tasks={tasks.filter((task) => task.columnId === column.id)}
            onDropTask={handleDropTask}
          />
        ))}
      </View>
    </DndProvider>
  );
}
