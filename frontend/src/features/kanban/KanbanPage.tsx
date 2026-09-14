import { KanbanLayout } from "../../app/layouts/KanbanLayout.tsx";
import { KanbanBoard } from "../../shared/components/KanbanBoard.tsx";

export function KanbanPage() {
  return (
    <KanbanLayout>
      <KanbanBoard />
    </KanbanLayout>
  );
}
