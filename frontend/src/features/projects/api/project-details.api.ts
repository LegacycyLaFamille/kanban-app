import { ApiError } from "../../../shared/api";

import { getProject } from "./projects.api";

import type { ProjectResponse } from "../types/project-api.types";

export async function getProjectById(
  projectId: string,
): Promise<ProjectResponse | null> {
  try {
    return await getProject(projectId);
  } catch (error: unknown) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }

    throw error;
  }
}
