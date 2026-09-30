import { useCallback, useEffect, useState } from "react";

import {
  createBoard as createBoardRequest,
  deleteBoard as deleteBoardRequest,
  getBoards,
  updateBoard as updateBoardRequest,
} from "../api/boards.api";

import type {
  CreateBoardPayload,
  ProjectBoard,
  UpdateBoardPayload,
} from "../types/project-api.types";

import { projectErrorMessage } from "../utils/projectError";

type BoardState = {
  projectId: string | undefined;
  boards: ProjectBoard[];
  error: string | null;
};

export function useBoards(projectId: string | undefined) {
  const [state, setState] = useState<BoardState>({
    projectId: undefined,
    boards: [],
    error: null,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    let active = true;

    getBoards(projectId)
      .then((boards) => {
        if (!active) {
          return;
        }

        setState({
          projectId,
          boards,
          error: null,
        });
      })
      .catch((requestError: unknown) => {
        if (!active) {
          return;
        }

        setState({
          projectId,
          boards: [],
          error: projectErrorMessage(
            requestError,
            "Unable to load project boards.",
          ),
        });
      });

    return () => {
      active = false;
    };
  }, [projectId]);

  const reload = useCallback(async (): Promise<void> => {
    if (!projectId) {
      return;
    }

    setIsRefreshing(true);

    try {
      const boards = await getBoards(projectId);

      setState({
        projectId,
        boards,
        error: null,
      });
    } catch (requestError) {
      setState({
        projectId,
        boards: [],
        error: projectErrorMessage(
          requestError,
          "Unable to load project boards.",
        ),
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [projectId]);

  const createBoard = useCallback(
    async (payload: CreateBoardPayload): Promise<ProjectBoard | null> => {
      if (!projectId) {
        return null;
      }

      setIsMutating(true);
      setMutationError(null);

      try {
        const board = await createBoardRequest(projectId, payload);

        setState((current) => {
          if (current.projectId !== projectId) {
            return current;
          }

          return {
            ...current,
            boards: [...current.boards, board],
            error: null,
          };
        });

        return board;
      } catch (requestError) {
        setMutationError(
          projectErrorMessage(requestError, "Unable to create board."),
        );

        return null;
      } finally {
        setIsMutating(false);
      }
    },
    [projectId],
  );

  const updateBoard = useCallback(
    async (
      boardId: string,
      payload: UpdateBoardPayload,
    ): Promise<ProjectBoard | null> => {
      if (!projectId) {
        return null;
      }

      setIsMutating(true);
      setMutationError(null);

      try {
        const updatedBoard = await updateBoardRequest(boardId, payload);

        setState((current) => {
          if (current.projectId !== projectId) {
            return current;
          }

          return {
            ...current,
            boards: current.boards.map((board) =>
              board.id === boardId ? updatedBoard : board,
            ),
          };
        });

        return updatedBoard;
      } catch (requestError) {
        setMutationError(
          projectErrorMessage(requestError, "Unable to update board."),
        );

        return null;
      } finally {
        setIsMutating(false);
      }
    },
    [projectId],
  );

  const deleteBoard = useCallback(
    async (boardId: string): Promise<boolean> => {
      if (!projectId) {
        return false;
      }

      setIsMutating(true);
      setMutationError(null);

      try {
        await deleteBoardRequest(boardId);

        setState((current) => {
          if (current.projectId !== projectId) {
            return current;
          }

          return {
            ...current,
            boards: current.boards.filter((board) => board.id !== boardId),
          };
        });

        return true;
      } catch (requestError) {
        setMutationError(
          projectErrorMessage(requestError, "Unable to delete board."),
        );

        return false;
      } finally {
        setIsMutating(false);
      }
    },
    [projectId],
  );

  const resetMutationError = useCallback(() => {
    setMutationError(null);
  }, []);

  const matchesCurrentProject = state.projectId === projectId;

  return {
    boards: matchesCurrentProject ? state.boards : [],
    isLoading: Boolean(projectId) && (!matchesCurrentProject || isRefreshing),
    error: matchesCurrentProject ? state.error : null,
    isMutating,
    mutationError,
    reload,
    createBoard,
    updateBoard,
    deleteBoard,
    resetMutationError,
  };
}
