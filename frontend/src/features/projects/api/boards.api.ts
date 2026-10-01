import { httpClient } from "../../../shared/api";

import type {
  CreateBoardPayload,
  ProjectBoard,
  UpdateBoardPayload,
} from "../types/project-api.types";

function projectBoardsEndpoint(projectId: string): string {
  return `/projects/${encodeURIComponent(projectId)}/boards`;
}

function boardEndpoint(boardId: string): string {
  return `/boards/${encodeURIComponent(boardId)}`;
}

export function getBoards(projectId: string): Promise<ProjectBoard[]> {
  return httpClient.get<ProjectBoard[]>(projectBoardsEndpoint(projectId));
}

export function getBoard(boardId: string): Promise<ProjectBoard> {
  return httpClient.get<ProjectBoard>(boardEndpoint(boardId));
}

export function createBoard(
  projectId: string,
  payload: CreateBoardPayload,
): Promise<ProjectBoard> {
  return httpClient.post<ProjectBoard, CreateBoardPayload>(
    projectBoardsEndpoint(projectId),
    payload,
  );
}

export function updateBoard(
  boardId: string,
  payload: UpdateBoardPayload,
): Promise<ProjectBoard> {
  return httpClient.patch<ProjectBoard, UpdateBoardPayload>(
    boardEndpoint(boardId),
    payload,
  );
}

export function deleteBoard(boardId: string): Promise<void> {
  return httpClient.delete<void>(boardEndpoint(boardId));
}
