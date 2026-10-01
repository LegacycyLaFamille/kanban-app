import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import { Board } from "../components/Board";

import styles from "./KanbanPage.module.css";

export function KanbanPage() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();

  // Fallback that should NEVER happen
  if (!projectId) {
    return <div>No project selected.</div>;
  }

  return (
    <div className={styles.page}>
      <button
        type="button"
        className={styles.back}
        onClick={() => navigate(`/projects/${projectId}`)}
      >
        ← Back to project
      </button>

      <Board projectId={projectId} currentUserId={user?.id} />
    </div>
  );
}
