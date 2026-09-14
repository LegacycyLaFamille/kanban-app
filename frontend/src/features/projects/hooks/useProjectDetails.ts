import { useCallback, useEffect, useState } from "react";

import { getProjectById } from "../api/project-details.api";

import type { ProjectDetails } from "../types/project.types";

export function useProjectDetails(projectId: string | undefined) {
  const [project, setProject] = useState<ProjectDetails | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [notFound, setNotFound] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const loadProject = useCallback(async () => {
    if (!projectId) {
      setProject(null);
      setNotFound(true);
      setIsLoading(false);

      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setNotFound(false);

      const response = await getProjectById(projectId);

      if (!response) {
        setProject(null);
        setNotFound(true);

        return;
      }

      setProject(response);
    } catch {
      setError("Unable to load this project.");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  return {
    project,
    isLoading,
    notFound,
    error,
    reload: loadProject,
  };
}
