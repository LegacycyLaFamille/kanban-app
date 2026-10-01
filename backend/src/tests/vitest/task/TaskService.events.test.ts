import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { TaskService } from "../../../modules/tasks/TaskService.js";
import { Task } from "../../../modules/tasks/Task.js";
import { Project } from "../../../modules/projects/Project.js";
import { ProjectAccessGuard } from "../../../shared/security/ProjectAccessGuard.js";
import type { ProjectRepository } from "../../../modules/projects/ProjectRepository.js";
import type { ProjectMemberRepository } from "../../../modules/projects/ProjectMemberRepository.js";
import { InMemoryEventBus } from "../../../shared/events/InMemoryEventBus.js";
import {
  EventPublishError,
  type EventBus,
} from "../../../shared/events/EventBus.js";

const ownerId = "user-1";
const project = new Project("proj-1", "My project", "", ownerId, new Date());

function task(overrides: Partial<Record<keyof Task, unknown>> = {}): Task {
  const base = {
    id: "task-1",
    title: "Write docs",
    description: "",
    projectId: "proj-1",
    status: "TODO",
    priority: "Medium",
    deadline: null,
    createdAt: new Date("2026-09-01T00:00:00.000Z"),
    boardId: null,
    ...overrides,
  } as Task;
  return new Task(
    base.id,
    base.title,
    base.description,
    base.projectId,
    base.status,
    base.priority,
    base.deadline,
    base.createdAt,
    base.boardId,
  );
}

describe("TaskService - événements", () => {
  let repository: {
    save: Mock;
    findById: Mock;
    findByProjectId: Mock;
    findAssignedTo: Mock;
    delete: Mock;
  };
  let projects: { findById: Mock };
  let eventBus: InMemoryEventBus;
  let service: TaskService;

  const build = (bus: EventBus) =>
    new TaskService(
      repository,
      new ProjectAccessGuard(
        projects as unknown as ProjectRepository,
        { findByProjectAndUser: vi.fn() } as unknown as ProjectMemberRepository,
      ),
      bus,
    );

  beforeEach(() => {
    repository = {
      save: vi.fn(async (t: Task) => t),
      findById: vi.fn(),
      findByProjectId: vi.fn(),
      findAssignedTo: vi.fn(),
      delete: vi.fn(),
    };
    projects = { findById: vi.fn().mockResolvedValue(project) };
    eventBus = new InMemoryEventBus();
    service = build(eventBus);
  });

  describe("task.created", () => {
    it("est publié après l'enregistrement avec les identifiants et l'auteur", async () => {
      const publish = vi.spyOn(eventBus, "publish");
      const created = await service.create("proj-1", ownerId, {
        title: "Write docs",
        description: "",
        priority: "High",
        status: "TODO",
      });

      const [event] = eventBus.publishedOfType("task.created");
      expect(event).toMatchObject({
        type: "task.created",
        version: 1,
        actorId: ownerId,
        payload: {
          taskId: created.id,
          projectId: "proj-1",
          boardId: null,
          title: "Write docs",
          status: "TODO",
          priority: "High",
        },
      });
      expect(repository.save.mock.invocationCallOrder[0]!).toBeLessThan(
        publish.mock.invocationCallOrder[0]!,
      );
    });

    it("n'est pas publié si l'enregistrement échoue", async () => {
      repository.save.mockRejectedValue(new Error("db down"));

      await expect(
        service.create("proj-1", ownerId, {
          title: "x",
          description: "",
          priority: "Low",
          status: "TODO",
        }),
      ).rejects.toThrow("db down");
      expect(eventBus.published).toHaveLength(0);
    });

    it("n'est pas publié si l'accès est refusé", async () => {
      await expect(
        service.create("proj-1", "intruder", {
          title: "x",
          description: "",
          priority: "Low",
          status: "TODO",
        }),
      ).rejects.toThrow("Forbidden");
      expect(eventBus.published).toHaveLength(0);
    });

    it("la création réussit même si le broker est indisponible", async () => {
      const failingBus: EventBus = {
        publish: (event) => Promise.reject(new EventPublishError(event)),
        subscribe: vi.fn(),
      };
      service = build(failingBus);

      await expect(
        service.create("proj-1", ownerId, {
          title: "x",
          description: "",
          priority: "Low",
          status: "TODO",
        }),
      ).resolves.toMatchObject({ title: "x" });
    });
  });

  describe("task.updated", () => {
    it("liste les champs réellement modifiés", async () => {
      repository.findById.mockResolvedValue(task());

      await service.update("task-1", ownerId, {
        title: "Write better docs",
        priority: "Medium",
        status: "IN_PROGRESS",
      });

      const [event] = eventBus.publishedOfType("task.updated");
      expect(event?.actorId).toBe(ownerId);
      expect(event?.payload).toEqual({
        taskId: "task-1",
        projectId: "proj-1",
        title: "Write better docs",
        changes: ["title", "status"],
        previousStatus: "TODO",
        status: "IN_PROGRESS",
        assigneeId: null,
        previousAssigneeId: null,
      });
    });

    it("n'est pas publié pour une mise à jour sans changement", async () => {
      repository.findById.mockResolvedValue(task());

      await service.update("task-1", ownerId, {
        title: "Write docs",
        status: "TODO",
      });

      expect(eventBus.published).toHaveLength(0);
    });

    it("détecte un changement de deadline à la milliseconde près", async () => {
      repository.findById.mockResolvedValue(
        task({ deadline: new Date("2026-10-01T00:00:00.000Z") }),
      );

      await service.update("task-1", ownerId, {
        deadline: "2026-10-01T00:00:00.000Z",
      });
      expect(eventBus.published).toHaveLength(0);

      await service.update("task-1", ownerId, {
        deadline: "2026-10-02T00:00:00.000Z",
      });
      expect(
        eventBus.publishedOfType("task.updated")[0]?.payload,
      ).toMatchObject({ changes: ["deadline"] });
    });

    it("signale un changement d'assignation", async () => {
      repository.findById.mockResolvedValue(task());

      await service.update("task-1", ownerId, { assigneeId: ownerId });

      expect(
        eventBus.publishedOfType("task.updated")[0]?.payload,
      ).toMatchObject({ changes: ["assigneeId"] });
    });

    it("n'est pas publié si la tâche n'existe pas", async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.update("missing", ownerId, { title: "x" }),
      ).rejects.toThrow("Not found");
      expect(eventBus.published).toHaveLength(0);
    });
  });

  describe("task.completed", () => {
    it("est publié au passage à DONE, en plus de task.updated", async () => {
      repository.findById.mockResolvedValue(task({ status: "IN_PROGRESS" }));

      await service.update("task-1", ownerId, { status: "DONE" });

      expect(eventBus.published.map((e) => e.type)).toEqual([
        "task.updated",
        "task.completed",
      ]);
      expect(eventBus.publishedOfType("task.completed")[0]).toMatchObject({
        actorId: ownerId,
        payload: {
          taskId: "task-1",
          projectId: "proj-1",
          title: "Write docs",
          previousStatus: "IN_PROGRESS",
        },
      });
    });

    it("n'est pas publié pour les autres statuts", async () => {
      repository.findById.mockResolvedValue(task({ status: "TODO" }));

      await service.update("task-1", ownerId, { status: "IN_PROGRESS" });

      expect(eventBus.publishedOfType("task.completed")).toHaveLength(0);
    });

    it("n'est pas republié quand une tâche déjà DONE est modifiée ou renvoyée à DONE", async () => {
      repository.findById.mockResolvedValue(task({ status: "DONE" }));

      await service.update("task-1", ownerId, { status: "DONE" });
      await service.update("task-1", ownerId, { title: "Renamed" });

      expect(eventBus.publishedOfType("task.completed")).toHaveLength(0);
      expect(eventBus.publishedOfType("task.updated")).toHaveLength(1);
    });

    it("est republié si la tâche est rouverte puis terminée à nouveau", async () => {
      repository.findById
        .mockResolvedValueOnce(task({ status: "DONE" }))
        .mockResolvedValueOnce(task({ status: "TODO" }));

      await service.update("task-1", ownerId, { status: "TODO" });
      await service.update("task-1", ownerId, { status: "DONE" });

      expect(eventBus.publishedOfType("task.completed")).toHaveLength(1);
    });
  });
});
