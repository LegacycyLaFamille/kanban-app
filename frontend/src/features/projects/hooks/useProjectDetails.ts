import { useCallback, useEffect, useState } from "react";

import { getProjectById } from "../api/project-details.api";

import type { ProjectDetails } from "../types/project.types";

export function useProjectDetails(projectId: string | undefined) {
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    let cancelled = false;

    getProjectById(projectId)
      .then((response) => {
        if (cancelled) {
          return;
        }

        if (!response) {
          setProject(null);
          setNotFound(true);

          return;
        }

        setProject(response);
        setNotFound(false);
        setError(null);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setError("Unable to load this project.");
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const reload = useCallback(async () => {
    if (!projectId) {
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

  return {
    project,
    isLoading,
    notFound: !projectId || notFound,
    error,
    reload,
  };
}
