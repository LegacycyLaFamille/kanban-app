import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { TaskService } from "../../../modules/tasks/TaskService.js";
import { Task } from "../../../modules/tasks/Task.js";
import { Project } from "../../../modules/projects/Project.js";
import type { ProjectRepository } from "../../../modules/projects/ProjectRepository.js";

describe("TaskService", () => {
  let taskService: TaskService;
  let mockTaskRepository: {
    save: Mock;
    findById: Mock;
    findByProjectId: Mock;
    delete: Mock;
  };
  let mockProjectRepository: {
    findById: Mock;
  };

  beforeEach(() => {
    mockTaskRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      findByProjectId: vi.fn(),
      delete: vi.fn(),
    };
    mockProjectRepository = {
      findById: vi.fn(),
    };
    taskService = new TaskService(
      mockTaskRepository,
      mockProjectRepository as unknown as ProjectRepository,
    );
  });

  describe("create", () => {
    it("devrait lever une erreur si le projet n'appartient pas à l'utilisateur (Forbidden)", async () => {
      mockProjectRepository.findById.mockResolvedValue(
        new Project("proj-1", "Other's project", "desc", "user-2", new Date()),
      );

      await expect(
        taskService.create("proj-1", "user-1", {
          title: "Test",
          description: "",
          priority: "",
          status: "",
        }),
      ).rejects.toThrow("Forbidden");
    });

    it("devrait créer la tâche si les droits sont valides", async () => {
      mockProjectRepository.findById.mockResolvedValue(
        new Project("proj-1", "My project", "", "user-1", new Date()),
      );

      const expectedTask = new Task(
        "task-1",
        "Test",
        "",
        "proj-1",
        "TODO",
        "",
        null,
        new Date(),
        null,
      );
      mockTaskRepository.save.mockResolvedValue(expectedTask);

      const result = await taskService.create("proj-1", "user-1", {
        title: "Test",
        description: "",
        priority: "",
        status: "",
      });

      expect(result.title).toBe("Test");
      expect(mockTaskRepository.save).toHaveBeenCalled();
    });
  });
});
