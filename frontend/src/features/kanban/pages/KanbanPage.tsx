import { Link, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import { Board } from "../components/Board";
import { useBoardName } from "../hooks/useBoardName";

import styles from "./KanbanPage.module.css";

export function KanbanPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const boardId = searchParams.get("boardId") ?? undefined;
  const boardName = useBoardName(boardId);
  const { user } = useAuth();

  // Fallback that should NEVER happen
  if (!projectId) {
    return <div>No project selected.</div>;
  }

  return (
    <div className={styles.page}>
      <Link to={`/projects/${projectId}`} className={styles.back}>
        <span aria-hidden="true">←</span> Back to project
      </Link>

      <Board
        projectId={projectId}
        boardId={boardId}
        boardName={boardName}
        currentUserId={user?.id}
      />
    </div>
  );
}
