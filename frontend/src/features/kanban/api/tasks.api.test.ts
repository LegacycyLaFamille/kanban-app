import { afterEach, describe, expect, it, vi } from "vitest";

import { httpClient } from "../../../shared/api";

import {
  createTask,
  deleteTask,
  getTasksByProject,
  updateTask,
} from "./tasks.api";

describe("task.api", () => {
  const projectId = "project-uuid-1";
  const taskId = "task-uuid-1";

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("retrieves all tasks for a project", async () => {
    const tasks = [
      {
        id: taskId,
        title: "Implement Swagger UI",
        status: "TODO",
      },
    ];

    const getSpy = vi.spyOn(httpClient, "get").mockResolvedValue(tasks);

    const result = await getTasksByProject(projectId);

    expect(getSpy).toHaveBeenCalledWith(`/projects/${projectId}/tasks`);

    expect(result).toEqual(tasks);
  });

  it("creates a task within a project", async () => {
    const payload = {
      title: "Implement Swagger UI",
      description: "Setup OpenAPI specification endpoints",
      boardId: "board-uuid-1",
    };

    const createdTask = {
      id: taskId,
      ...payload,
    };

    const postSpy = vi.spyOn(httpClient, "post").mockResolvedValue(createdTask);

    const result = await createTask(projectId, payload);

    expect(postSpy).toHaveBeenCalledWith(
      `/projects/${projectId}/tasks`,
      payload,
    );

    expect(result).toEqual(createdTask);
  });

  it("updates a task", async () => {
    const payload = {
      title: "Updated Title",
      status: "DONE" as const,
    };

    const updatedTask = {
      id: taskId,
      ...payload,
    };

    const patchSpy = vi
      .spyOn(httpClient, "patch")
      .mockResolvedValue(updatedTask);

    const result = await updateTask(taskId, payload);

    expect(patchSpy).toHaveBeenCalledWith(`/tasks/${taskId}`, payload);

    expect(result).toEqual(updatedTask);
  });

  it("deletes a task", async () => {
    const deleteSpy = vi
      .spyOn(httpClient, "delete")
      .mockResolvedValue(undefined);

    await deleteTask(taskId);

    expect(deleteSpy).toHaveBeenCalledWith(`/tasks/${taskId}`);
  });
});
