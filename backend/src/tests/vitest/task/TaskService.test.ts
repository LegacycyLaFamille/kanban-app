import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { TaskService } from "../../../modules/tasks/TaskService.js";
import { Task } from "../../../modules/tasks/Task.js";
import { Project } from "../../../modules/projects/Project.js";
import { ProjectMember } from "../../../modules/projects/ProjectMember.js";
import { ProjectAccessGuard } from "../../../shared/security/ProjectAccessGuard.js";
import { randomUUID } from "node:crypto";
import type { ProjectRepository } from "../../../modules/projects/ProjectRepository.js";
import type { ProjectMemberRepository } from "../../../modules/projects/ProjectMemberRepository.js";

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
  let mockProjectMemberRepository: {
    findByProjectAndUser: Mock;
  };

  const ownerId = "user-1";
  const memberId = "member-1";
  const outsiderId = "outsider-1";

  const project = new Project("proj-1", "My project", "", ownerId, new Date());

  const task = new Task(
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
    mockProjectMemberRepository = {
      findByProjectAndUser: vi.fn(),
    };

    const projectAccessGuard = new ProjectAccessGuard(
      mockProjectRepository as unknown as ProjectRepository,
      mockProjectMemberRepository as unknown as ProjectMemberRepository,
    );

    taskService = new TaskService(mockTaskRepository, projectAccessGuard);
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
      mockProjectRepository.findById.mockResolvedValue(project);

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

      const result = await taskService.create("proj-1", ownerId, {
        title: "Test",
        description: "",
        priority: "",
        status: "",
      });

      expect(result.title).toBe("Test");
      expect(mockTaskRepository.save).toHaveBeenCalled();
    });

    it("rejects task creation from a member (read-only access)", async () => {
      mockProjectRepository.findById.mockResolvedValue(project);
      mockProjectMemberRepository.findByProjectAndUser.mockResolvedValue(
        new ProjectMember(randomUUID(), project.id, memberId, new Date()),
      );

      await expect(
        taskService.create("proj-1", memberId, {
          title: "Test",
          description: "",
          priority: "",
          status: "",
        }),
      ).rejects.toThrow("Forbidden");
      expect(mockTaskRepository.save).not.toHaveBeenCalled();
    });
  });

  describe("read", () => {
    it("allows the owner to list tasks", async () => {
      mockProjectRepository.findById.mockResolvedValue(project);
      mockTaskRepository.findByProjectId.mockResolvedValue([task]);

      const result = await taskService.read("proj-1", ownerId);
      expect(result).toEqual([task]);
    });

    it("allows a project member to list tasks", async () => {
      mockProjectRepository.findById.mockResolvedValue(project);
      mockProjectMemberRepository.findByProjectAndUser.mockResolvedValue(
        new ProjectMember(randomUUID(), project.id, memberId, new Date()),
      );
      mockTaskRepository.findByProjectId.mockResolvedValue([task]);

      const result = await taskService.read("proj-1", memberId);
      expect(result).toEqual([task]);
    });

    it("rejects listing tasks for a user with no project access", async () => {
      mockProjectRepository.findById.mockResolvedValue(project);
      mockProjectMemberRepository.findByProjectAndUser.mockResolvedValue(null);

      await expect(taskService.read("proj-1", outsiderId)).rejects.toThrow(
        "Forbidden",
      );
    });
  });

  describe("readSingle", () => {
    it("throws Not found when the task does not exist", async () => {
      mockTaskRepository.findById.mockResolvedValue(null);

      await expect(taskService.readSingle("task-1", ownerId)).rejects.toThrow(
        "Not found",
      );
    });

    it("derives task access from the parent project: member can read", async () => {
      mockTaskRepository.findById.mockResolvedValue(task);
      mockProjectRepository.findById.mockResolvedValue(project);
      mockProjectMemberRepository.findByProjectAndUser.mockResolvedValue(
        new ProjectMember(randomUUID(), project.id, memberId, new Date()),
      );

      const result = await taskService.readSingle("task-1", memberId);
      expect(result).toEqual(task);
    });

    it("derives task access from the parent project: outsider is forbidden", async () => {
      mockTaskRepository.findById.mockResolvedValue(task);
      mockProjectRepository.findById.mockResolvedValue(project);
      mockProjectMemberRepository.findByProjectAndUser.mockResolvedValue(null);

      await expect(
        taskService.readSingle("task-1", outsiderId),
      ).rejects.toThrow("Forbidden");
    });
  });

  describe("update", () => {
    it("allows the owner to update a task", async () => {
      mockTaskRepository.findById.mockResolvedValue(task);
      mockProjectRepository.findById.mockResolvedValue(project);

      const result = await taskService.update("task-1", ownerId, {
        title: "Renamed",
      });

      expect(result.title).toBe("Renamed");
      expect(mockTaskRepository.save).toHaveBeenCalled();
    });

    it("rejects an update from a member (read-only access)", async () => {
      mockTaskRepository.findById.mockResolvedValue(task);
      mockProjectRepository.findById.mockResolvedValue(project);
      mockProjectMemberRepository.findByProjectAndUser.mockResolvedValue(
        new ProjectMember(randomUUID(), project.id, memberId, new Date()),
      );

      await expect(
        taskService.update("task-1", memberId, { title: "Renamed" }),
      ).rejects.toThrow("Forbidden");
      expect(mockTaskRepository.save).not.toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("allows the owner to delete a task", async () => {
      mockTaskRepository.findById.mockResolvedValue(task);
      mockProjectRepository.findById.mockResolvedValue(project);

      await taskService.delete("task-1", ownerId);

      expect(mockTaskRepository.delete).toHaveBeenCalledWith(task);
    });

    it("rejects deletion from a member", async () => {
      mockTaskRepository.findById.mockResolvedValue(task);
      mockProjectRepository.findById.mockResolvedValue(project);
      mockProjectMemberRepository.findByProjectAndUser.mockResolvedValue(
        new ProjectMember(randomUUID(), project.id, memberId, new Date()),
      );

      await expect(taskService.delete("task-1", memberId)).rejects.toThrow(
        "Forbidden",
      );
      expect(mockTaskRepository.delete).not.toHaveBeenCalled();
    });

    it("rejects deletion from an outsider", async () => {
      mockTaskRepository.findById.mockResolvedValue(task);
      mockProjectRepository.findById.mockResolvedValue(project);
      mockProjectMemberRepository.findByProjectAndUser.mockResolvedValue(null);

      await expect(taskService.delete("task-1", outsiderId)).rejects.toThrow(
        "Forbidden",
      );
    });
  });
});
