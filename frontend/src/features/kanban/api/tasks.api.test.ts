import { afterEach, describe, expect, it, vi } from "vitest";

import { httpClient } from "../../../shared/api";

import {
  createTask,
  deleteTask,
  getTasksByProject,
  updateTask,
} from "./tasks.api.ts";
import type { CreateTaskDto, Task, UpdateTaskDto } from "../types/task.types";

describe("task.api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockTask: Task = {
    id: "task-uuid-1",
    title: "Implement Swagger UI",
    description: "Setup OpenAPI specification endpoints",
    status: "IN_PROGRESS",
    projectId: "project-uuid-1",
    boardId: "board-uuid-1",
    createdAt: "2026-09-24T00:00:00.000Z",
    updatedAt: "2026-09-24T00:00:00.000Z",
  };

  it("retrieves all tasks for a project", async () => {
    const tasks: Task[] = [mockTask];
    const getSpy = vi.spyOn(httpClient, "get").mockResolvedValue(tasks);

    const projectId = "project-uuid-1";
    const result = await getTasksByProject(projectId);

    expect(getSpy).toHaveBeenCalledWith(`/api/v1/projects/${projectId}/tasks`);
    expect(result).toEqual(tasks);
  });

  it("creates a task within a project", async () => {
    const postSpy = vi.spyOn(httpClient, "post").mockResolvedValue(mockTask);

    const projectId = "project-uuid-1";
    const payload: CreateTaskDto = {
      title: "Implement Swagger UI",
      description: "Setup OpenAPI specification endpoints",
      boardId: "board-uuid-1",
    };

    const result = await createTask(projectId, payload);

    expect(postSpy).toHaveBeenCalledWith(
      `/api/v1/projects/${projectId}/tasks`,
      payload,
    );
    expect(result).toEqual(mockTask);
  });

  it("updates a task", async () => {
    const updatedTask: Task = {
      ...mockTask,
      title: "Updated Title",
      status: "DONE",
    };
    const patchSpy = vi
      .spyOn(httpClient, "patch")
      .mockResolvedValue(updatedTask);

    const taskId = "task-uuid-1";
    const payload: UpdateTaskDto = {
      title: "Updated Title",
      status: "DONE",
    };

    const result = await updateTask(taskId, payload);

    expect(patchSpy).toHaveBeenCalledWith(`/api/v1/tasks/${taskId}`, payload);
    expect(result).toEqual(updatedTask);
  });

  it("deletes a task", async () => {
    const deleteSpy = vi
      .spyOn(httpClient, "delete")
      .mockResolvedValue(undefined);

    const taskId = "task-uuid-1";
    await deleteTask(taskId);

    expect(deleteSpy).toHaveBeenCalledWith(`/api/v1/tasks/${taskId}`);
  });
});
