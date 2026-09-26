import { httpClient } from "../../../shared/api";

import type {
  CreateProjectPayload,
  ProjectResponse,
  UpdateProjectPayload,
} from "../types/project-api.types";

function projectEndpoint(projectId: string): string {
  return `/projects/${encodeURIComponent(projectId)}`;
}

export function getProjects(): Promise<ProjectResponse[]> {
  return httpClient.get<ProjectResponse[]>("/projects");
}

export function getProject(projectId: string): Promise<ProjectResponse> {
  return httpClient.get<ProjectResponse>(projectEndpoint(projectId));
}

export function createProject(
  payload: CreateProjectPayload,
): Promise<ProjectResponse> {
  return httpClient.post<ProjectResponse, CreateProjectPayload>(
    "/projects",
    payload,
  );
}

export function updateProject(
  projectId: string,
  payload: UpdateProjectPayload,
): Promise<ProjectResponse> {
  return httpClient.patch<ProjectResponse, UpdateProjectPayload>(
    projectEndpoint(projectId),
    payload,
  );
}

export function deleteProject(projectId: string): Promise<void> {
  return httpClient.delete<void>(projectEndpoint(projectId));
}
