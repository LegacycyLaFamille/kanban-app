import { useParams } from "react-router-dom";
import { Board } from "../components/Board";

export function KanbanPage() {
  const { projectId } = useParams<{ projectId: string }>();

  // Fallback that should NEVER happen
  if (!projectId) {
    return <div>No project selected.</div>;
  }

  return <Board projectId={projectId} />;
}
