import { useCallback, useEffect, useState } from "react";

import {
  createProject as createProjectRequest,
  getProjects,
} from "../api/projects.api";

import type { CreateProjectPayload, Project } from "../types/project.types";

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await getProjects();

      setProjects(response);
    } catch {
      setError("Unable to load projects.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createProject = useCallback(async (payload: CreateProjectPayload) => {
    try {
      setIsCreating(true);
      setError(null);

      const project = await createProjectRequest(payload);

      setProjects((currentProjects) => [project, ...currentProjects]);

      return project;
    } catch {
      setError("Unable to create project.");

      return null;
    } finally {
      setIsCreating(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  return {
    projects,
    isLoading,
    isCreating,
    error,
    reload: loadProjects,
    createProject,
  };
}
