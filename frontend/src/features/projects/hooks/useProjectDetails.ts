import { useCallback, useEffect, useState } from "react";

import { ApiError } from "../../../shared/api";

import {
  deleteProject as deleteProjectRequest,
  getProject,
  updateProject as updateProjectRequest,
} from "../api/projects.api";

import type {
  ProjectResponse,
  UpdateProjectPayload,
} from "../types/project-api.types";

import { projectErrorMessage } from "../utils/projectError";

type ProjectLoadState = {
  projectId: string | undefined;
  project: ProjectResponse | null;
  notFound: boolean;
  error: string | null;
};

function toLoadState(
  projectId: string,
  requestError: unknown,
): ProjectLoadState {
  if (requestError instanceof ApiError && requestError.status === 404) {
    return {
      projectId,
      project: null,
      notFound: true,
      error: null,
    };
  }

  return {
    projectId,
    project: null,
    notFound: false,
    error: projectErrorMessage(requestError, "Unable to load this project."),
  };
}

export function useProjectDetails(projectId: string | undefined) {
  const [state, setState] = useState<ProjectLoadState>({
    projectId: undefined,
    project: null,
    notFound: false,
    error: null,
  });

  const [isReloading, setIsReloading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    let active = true;

    getProject(projectId)
      .then((project) => {
        if (!active) {
          return;
        }

        setState({
          projectId,
          project,
          notFound: false,
          error: null,
        });
      })
      .catch((requestError: unknown) => {
        if (active) {
          setState(toLoadState(projectId, requestError));
        }
      });

    return () => {
      active = false;
    };
  }, [projectId]);

  const reload = useCallback(async (): Promise<void> => {
    if (!projectId) {
      return;
    }

    setIsReloading(true);

    try {
      const project = await getProject(projectId);

      setState({
        projectId,
        project,
        notFound: false,
        error: null,
      });
    } catch (requestError) {
      setState(toLoadState(projectId, requestError));
    } finally {
      setIsReloading(false);
    }
  }, [projectId]);

  const saveProject = useCallback(
    async (payload: UpdateProjectPayload): Promise<ProjectResponse | null> => {
      if (!projectId) {
        return null;
      }

      setIsSaving(true);
      setMutationError(null);

      try {
        const updatedProject = await updateProjectRequest(projectId, payload);

        setState({
          projectId,
          project: updatedProject,
          notFound: false,
          error: null,
        });

        return updatedProject;
      } catch (requestError) {
        setMutationError(
          projectErrorMessage(requestError, "Unable to update project."),
        );

        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [projectId],
  );

  const removeProject = useCallback(async (): Promise<boolean> => {
    if (!projectId) {
      return false;
    }

    setIsDeleting(true);
    setMutationError(null);

    try {
      await deleteProjectRequest(projectId);

      return true;
    } catch (requestError) {
      setMutationError(
        projectErrorMessage(requestError, "Unable to delete project."),
      );

      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [projectId]);

  const resetMutationError = useCallback(() => {
    setMutationError(null);
  }, []);

  const matchesCurrentProject = state.projectId === projectId;

  return {
    project: matchesCurrentProject ? state.project : null,
    isLoading: Boolean(projectId) && (!matchesCurrentProject || isReloading),
    notFound: !projectId || (matchesCurrentProject && state.notFound),
    error: matchesCurrentProject ? state.error : null,
    isSaving,
    isDeleting,
    mutationError,
    reload,
    saveProject,
    removeProject,
    resetMutationError,
  };
}
