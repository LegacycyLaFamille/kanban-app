import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { TaskService } from "../../../modules/tasks/TaskService.js";
import { Task } from "../../../modules/tasks/Task.js";
import { Project } from "../../../modules/projects/Project.js";
import { ProjectMember } from "../../../modules/projects/ProjectMember.js";
import { Board } from "../../../modules/boards/Board.js";
import { ProjectAccessGuard } from "../../../shared/security/ProjectAccessGuard.js";
import { randomUUID } from "node:crypto";
import type { ProjectRepository } from "../../../modules/projects/ProjectRepository.js";
import type { ProjectMemberRepository } from "../../../modules/projects/ProjectMemberRepository.js";
import { InMemoryEventBus } from "../../../shared/events/InMemoryEventBus.js";

describe("TaskService", () => {
  let taskService: TaskService;
  let mockTaskRepository: {
    save: Mock;
    findById: Mock;
    findByProjectId: Mock;
    findAssignedTo: Mock;
    delete: Mock;
  };
  let mockProjectRepository: {
    findById: Mock;
  };
  let mockProjectMemberRepository: {
    findByProjectAndUser: Mock;
  };
  let mockBoardRepository: {
    findbyId: Mock;
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
      findAssignedTo: vi.fn(),
      delete: vi.fn(),
    };
    mockProjectRepository = {
      findById: vi.fn(),
    };
    mockProjectMemberRepository = {
      findByProjectAndUser: vi.fn(),
    };
    mockBoardRepository = {
      findbyId: vi.fn(),
    };

    const projectAccessGuard = new ProjectAccessGuard(
      mockProjectRepository as unknown as ProjectRepository,
      mockProjectMemberRepository as unknown as ProjectMemberRepository,
    );

    taskService = new TaskService(
      mockTaskRepository,
      projectAccessGuard,
      new InMemoryEventBus(),
      mockBoardRepository,
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

    it("creates the task already assigned to a project member", async () => {
      mockProjectRepository.findById.mockResolvedValue(project);
      mockProjectMemberRepository.findByProjectAndUser.mockImplementation(
        async (_projectId: string, userId: string) =>
          userId === memberId
            ? new ProjectMember("m-1", "proj-1", memberId, new Date())
            : null,
      );
      mockTaskRepository.save.mockImplementation(async (task: Task) => task);

      const result = await taskService.create("proj-1", ownerId, {
        title: "Test",
        description: "",
        priority: "Medium",
        status: "TODO",
        assigneeId: memberId,
      });

      expect(result.assigneeId).toBe(memberId);
    });

    it("rejects an assignee outside the project at creation", async () => {
      mockProjectRepository.findById.mockResolvedValue(project);
      mockProjectMemberRepository.findByProjectAndUser.mockResolvedValue(null);

      await expect(
        taskService.create("proj-1", ownerId, {
          title: "Test",
          description: "",
          priority: "Medium",
          status: "TODO",
          assigneeId: outsiderId,
        }),
      ).rejects.toThrow("Assignee is not a member of this project");
      expect(mockTaskRepository.save).not.toHaveBeenCalled();
    });

    it("creates the task on a board of the same project", async () => {
      mockProjectRepository.findById.mockResolvedValue(project);
      mockBoardRepository.findbyId.mockResolvedValue(
        new Board("board-1", "Sprint", "proj-1", new Date()),
      );
      mockTaskRepository.save.mockImplementation(async (task: Task) => task);

      const result = await taskService.create("proj-1", ownerId, {
        title: "Test",
        description: "",
        priority: "Medium",
        status: "TODO",
        boardId: "board-1",
      });

      expect(result.boardId).toBe("board-1");
    });

    it.each([
      [
        "a board of another project",
        new Board("board-2", "X", "proj-2", new Date()),
      ],
      ["an unknown board", null],
    ])("rejects creation on %s", async (_label, board) => {
      mockProjectRepository.findById.mockResolvedValue(project);
      mockBoardRepository.findbyId.mockResolvedValue(board);

      await expect(
        taskService.create("proj-1", ownerId, {
          title: "Test",
          description: "",
          priority: "Medium",
          status: "TODO",
          boardId: "board-2",
        }),
      ).rejects.toThrow("Board is not part of this project");
      expect(mockTaskRepository.save).not.toHaveBeenCalled();
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

    it("lets an EDITOR member create a task", async () => {
      mockProjectRepository.findById.mockResolvedValue(project);
      mockProjectMemberRepository.findByProjectAndUser.mockResolvedValue(
        new ProjectMember(
          randomUUID(),
          project.id,
          memberId,
          new Date(),
          "EDITOR",
        ),
      );
      mockTaskRepository.save.mockImplementation(async (t: Task) => t);

      const result = await taskService.create("proj-1", memberId, {
        title: "By an editor",
        description: "",
        priority: "Medium",
        status: "TODO",
      });

      expect(result.title).toBe("By an editor");
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

    it("clears an existing deadline when the payload sends deadline: null", async () => {
      const taskWithDeadline = new Task(
        "task-1",
        "Test",
        "",
        "proj-1",
        "TODO",
        "",
        new Date("2026-12-01T00:00:00.000Z"),
        new Date(),
        null,
      );
      mockTaskRepository.findById.mockResolvedValue(taskWithDeadline);
      mockProjectRepository.findById.mockResolvedValue(project);

      const result = await taskService.update("task-1", ownerId, {
        deadline: null,
      });

      expect(result.deadline).toBeNull();
      expect(mockTaskRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ deadline: null }),
      );
    });

    it("keeps the existing deadline when the payload omits it", async () => {
      const taskWithDeadline = new Task(
        "task-1",
        "Test",
        "",
        "proj-1",
        "TODO",
        "",
        new Date("2026-12-01T00:00:00.000Z"),
        new Date(),
        null,
      );
      mockTaskRepository.findById.mockResolvedValue(taskWithDeadline);
      mockProjectRepository.findById.mockResolvedValue(project);

      const result = await taskService.update("task-1", ownerId, {
        title: "Renamed",
      });

      expect(result.deadline).toEqual(taskWithDeadline.deadline);
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

    it("assigns the task to a project member", async () => {
      mockTaskRepository.findById.mockResolvedValue(task);
      mockProjectRepository.findById.mockResolvedValue(project);
      mockProjectMemberRepository.findByProjectAndUser.mockResolvedValue(
        new ProjectMember(randomUUID(), project.id, memberId, new Date()),
      );

      const result = await taskService.update("task-1", ownerId, {
        assigneeId: memberId,
      });

      expect(result.assigneeId).toBe(memberId);
      expect(mockTaskRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ assigneeId: memberId }),
      );
    });

    it("assigns the task to the project owner", async () => {
      mockTaskRepository.findById.mockResolvedValue(task);
      mockProjectRepository.findById.mockResolvedValue(project);

      const result = await taskService.update("task-1", ownerId, {
        assigneeId: ownerId,
      });

      expect(result.assigneeId).toBe(ownerId);
    });

    it("rejects moving the task to a board of another project", async () => {
      mockTaskRepository.findById.mockResolvedValue(task);
      mockProjectRepository.findById.mockResolvedValue(project);
      mockBoardRepository.findbyId.mockResolvedValue(
        new Board("board-2", "X", "proj-2", new Date()),
      );

      await expect(
        taskService.update("task-1", ownerId, { boardId: "board-2" }),
      ).rejects.toThrow("Board is not part of this project");
      expect(mockTaskRepository.save).not.toHaveBeenCalled();
    });

    it("rejects an assignee who has no access to the project", async () => {
      mockTaskRepository.findById.mockResolvedValue(task);
      mockProjectRepository.findById.mockResolvedValue(project);
      mockProjectMemberRepository.findByProjectAndUser.mockResolvedValue(null);

      await expect(
        taskService.update("task-1", ownerId, { assigneeId: outsiderId }),
      ).rejects.toThrow("Assignee is not a member of this project");
      expect(mockTaskRepository.save).not.toHaveBeenCalled();
    });

    it("clears the assignee when the payload sends assigneeId: null", async () => {
      const assignedTask = new Task(
        "task-1",
        "Test",
        "",
        "proj-1",
        "TODO",
        "",
        null,
        new Date(),
        null,
        memberId,
      );
      mockTaskRepository.findById.mockResolvedValue(assignedTask);
      mockProjectRepository.findById.mockResolvedValue(project);

      const result = await taskService.update("task-1", ownerId, {
        assigneeId: null,
      });

      expect(result.assigneeId).toBeNull();
      expect(
        mockProjectMemberRepository.findByProjectAndUser,
      ).not.toHaveBeenCalled();
    });

    it("keeps the existing assignee when the payload omits it", async () => {
      const assignedTask = new Task(
        "task-1",
        "Test",
        "",
        "proj-1",
        "TODO",
        "",
        null,
        new Date(),
        null,
        memberId,
      );
      mockTaskRepository.findById.mockResolvedValue(assignedTask);
      mockProjectRepository.findById.mockResolvedValue(project);

      const result = await taskService.update("task-1", ownerId, {
        title: "Renamed",
      });

      expect(result.assigneeId).toBe(memberId);
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

  describe("readAssigned", () => {
    it("délègue au repository avec l'utilisateur et le filtre", async () => {
      const assigned = [{ task, project: { id: "proj-1", name: "P" } }];
      mockTaskRepository.findAssignedTo.mockResolvedValue(assigned);

      await expect(
        taskService.readAssigned(ownerId, { status: "TODO" }),
      ).resolves.toBe(assigned);
      expect(mockTaskRepository.findAssignedTo).toHaveBeenCalledWith(ownerId, {
        status: "TODO",
      });
    });
  });
});
