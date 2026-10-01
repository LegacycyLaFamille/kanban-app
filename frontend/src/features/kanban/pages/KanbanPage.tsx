import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import { Board } from "../components/Board";

import styles from "./KanbanPage.module.css";

export function KanbanPage() {
  const { projectId } = useParams<{ projectId: string }>();
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

      <Board projectId={projectId} currentUserId={user?.id} />
    </div>
  );
}
