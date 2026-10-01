import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";

import { AdminTaskService } from "../../../modules/admin/AdminTaskService.js";
import type { AdminTaskRepository } from "../../../modules/admin/AdminTaskRepository.js";
import type { AdminProjectTasks } from "../../../modules/admin/AdminTask.js";
import { Task } from "../../../modules/tasks/Task.js";
import { Project } from "../../../modules/projects/Project.js";
import { ProjectAccessGuard } from "../../../shared/security/ProjectAccessGuard.js";
import { InMemoryEventBus } from "../../../shared/events/InMemoryEventBus.js";
import type { TaskRepository } from "../../../modules/tasks/TaskRepository.js";
import type { ProjectRepository } from "../../../modules/projects/ProjectRepository.js";
import type { ProjectMemberRepository } from "../../../modules/projects/ProjectMemberRepository.js";

describe("AdminTaskService", () => {
  let service: AdminTaskService;
  let mockAdminTaskRepository: Mocked<AdminTaskRepository>;
  let mockTaskRepository: Mocked<Pick<TaskRepository, "findById" | "save">>;
  let mockProjectRepository: Mocked<Pick<ProjectRepository, "findById">>;
  let mockProjectMemberRepository: Mocked<
    Pick<ProjectMemberRepository, "findByProjectAndUser">
  >;

  const ownerId = "owner-1";
  const memberId = "member-1";
  const outsiderId = "outsider-1";

  const project = new Project(
    "proj-1",
    "Project",
    "",
    ownerId,
    new Date("2026-09-01T00:00:00.000Z"),
  );

  const task = new Task(
    "task-1",
    "Task",
    "",
    "proj-1",
    "TODO",
    "Medium",
    null,
    new Date("2026-09-01T00:00:00.000Z"),
    null,
  );

  beforeEach(() => {
    mockAdminTaskRepository = {
      findAllGroupedByProject: vi.fn(),
    };
    mockTaskRepository = {
      findById: vi.fn(),
      save: vi.fn(),
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

    service = new AdminTaskService(
      mockAdminTaskRepository,
      mockTaskRepository as unknown as TaskRepository,
      mockProjectRepository as unknown as ProjectRepository,
      projectAccessGuard,
    );
  });

  describe("listAll", () => {
    it("delegates to the admin task repository", async () => {
      const groups: AdminProjectTasks[] = [
        {
          projectId: "proj-1",
          projectName: "Project",
          assignableUsers: [],
          tasks: [],
        },
      ];
      mockAdminTaskRepository.findAllGroupedByProject.mockResolvedValue(groups);

      const result = await service.listAll();

      expect(result).toBe(groups);
      expect(
        mockAdminTaskRepository.findAllGroupedByProject,
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe("assign", () => {
    it("throws Not found when the task does not exist", async () => {
      mockTaskRepository.findById.mockResolvedValue(null);

      await expect(service.assign("task-1", ownerId)).rejects.toThrow(
        "Not found",
      );
    });

    it("assigns the task to the project owner", async () => {
      mockTaskRepository.findById.mockResolvedValue(task);
      mockProjectRepository.findById.mockResolvedValue(project);
      mockTaskRepository.save.mockImplementation(
        async (t) => t as unknown as Task,
      );

      const result = await service.assign("task-1", ownerId);

      expect(result.assigneeId).toBe(ownerId);
      expect(mockTaskRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ assigneeId: ownerId }),
      );
    });

    it("assigns the task to a project member", async () => {
      mockTaskRepository.findById.mockResolvedValue(task);
      mockProjectRepository.findById.mockResolvedValue(project);
      mockProjectMemberRepository.findByProjectAndUser.mockResolvedValue({
        id: "member-record-1",
        projectId: "proj-1",
        userId: memberId,
        createdAt: new Date(),
        role: "VIEWER",
      });
      mockTaskRepository.save.mockImplementation(
        async (t) => t as unknown as Task,
      );

      const result = await service.assign("task-1", memberId);

      expect(result.assigneeId).toBe(memberId);
    });

    it("announces the assignment so the assignee gets notified", async () => {
      const eventBus = new InMemoryEventBus();
      const withEvents = new AdminTaskService(
        mockAdminTaskRepository,
        mockTaskRepository as unknown as TaskRepository,
        mockProjectRepository as unknown as ProjectRepository,
        new ProjectAccessGuard(
          mockProjectRepository as unknown as ProjectRepository,
          mockProjectMemberRepository as unknown as ProjectMemberRepository,
        ),
        eventBus,
      );
      mockTaskRepository.findById.mockResolvedValue(task);
      mockProjectRepository.findById.mockResolvedValue(project);
      mockProjectMemberRepository.findByProjectAndUser.mockResolvedValue({
        id: "member-record-1",
        projectId: "proj-1",
        userId: memberId,
        createdAt: new Date(),
        role: "VIEWER",
      });
      mockTaskRepository.save.mockImplementation(
        async (t) => t as unknown as Task,
      );

      await withEvents.assign("task-1", memberId, "admin-1");

      const [event] = eventBus.publishedOfType("task.assigned");
      expect(event?.actorId).toBe("admin-1");
      expect(event?.payload).toMatchObject({
        taskId: "task-1",
        assigneeId: memberId,
      });
    });

    it("rejects assigning to a user with no access to the project", async () => {
      mockTaskRepository.findById.mockResolvedValue(task);
      mockProjectRepository.findById.mockResolvedValue(project);
      mockProjectMemberRepository.findByProjectAndUser.mockResolvedValue(null);

      await expect(service.assign("task-1", outsiderId)).rejects.toThrow(
        "Assignee is not a member of this project",
      );
      expect(mockTaskRepository.save).not.toHaveBeenCalled();
    });

    it("clears the assignee when assigneeId is null, without checking membership", async () => {
      const assignedTask = new Task(
        "task-1",
        "Task",
        "",
        "proj-1",
        "TODO",
        "Medium",
        null,
        new Date(),
        null,
        ownerId,
      );
      mockTaskRepository.findById.mockResolvedValue(assignedTask);
      mockTaskRepository.save.mockImplementation(
        async (t) => t as unknown as Task,
      );

      const result = await service.assign("task-1", null);

      expect(result.assigneeId).toBeNull();
      expect(mockProjectRepository.findById).not.toHaveBeenCalled();
    });

    it("throws Not found when the task's project no longer exists", async () => {
      mockTaskRepository.findById.mockResolvedValue(task);
      mockProjectRepository.findById.mockResolvedValue(null);

      await expect(service.assign("task-1", ownerId)).rejects.toThrow(
        "Not found",
      );
    });
  });
});
