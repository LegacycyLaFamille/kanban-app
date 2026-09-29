import { useCallback, useEffect, useState } from "react";

import {
  createProject as createProjectRequest,
  getProjects,
} from "../api/projects.api";

import type {
  CreateProjectPayload,
  ProjectResponse,
} from "../types/project-api.types";

import { projectErrorMessage } from "../utils/projectError";

export function useProjects() {
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getProjects()
      .then((response) => {
        if (!active) {
          return;
        }

        setProjects(response);
        setError(null);
      })
      .catch((requestError: unknown) => {
        if (!active) {
          return;
        }

        setError(projectErrorMessage(requestError, "Unable to load projects."));
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const reload = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getProjects();

      setProjects(response);
    } catch (requestError) {
      setError(projectErrorMessage(requestError, "Unable to load projects."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createProject = useCallback(
    async (payload: CreateProjectPayload): Promise<ProjectResponse | null> => {
      setIsCreating(true);
      setMutationError(null);

      try {
        const createdProject = await createProjectRequest(payload);

        setProjects((current) => [createdProject, ...current]);

        return createdProject;
      } catch (requestError) {
        setMutationError(
          projectErrorMessage(requestError, "Unable to create project."),
        );

        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [],
  );

  const resetMutationError = useCallback(() => {
    setMutationError(null);
  }, []);

  return {
    projects,
    isLoading,
    isCreating,
    error,
    mutationError,
    reload,
    createProject,
    resetMutationError,
  };
}
