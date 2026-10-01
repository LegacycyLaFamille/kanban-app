import type { ProjectRole } from "../types/team.types";

export const PROJECT_ROLES: ProjectRole[] = ["VIEWER", "EDITOR"];

export const ROLE_LABELS: Record<ProjectRole, string> = {
  VIEWER: "Can view",
  EDITOR: "Can edit",
};
