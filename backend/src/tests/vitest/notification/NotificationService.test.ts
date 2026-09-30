import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NotificationService } from "../../../modules/notifications/NotificationService.js";
import { Notification } from "../../../modules/notifications/Notification.js";
import { InMemoryNotificationRepository } from "./InMemoryNotificationRepository.js";
import {
  NOTIFICATION_CONSUMER,
  subscribeNotificationConsumer,
} from "../../../modules/notifications/notification.consumer.js";
import { Project } from "../../../modules/projects/Project.js";
import { ProjectMember } from "../../../modules/projects/ProjectMember.js";
import type { ProjectRepository } from "../../../modules/projects/ProjectRepository.js";
import type { ProjectMemberRepository } from "../../../modules/projects/ProjectMemberRepository.js";
import { Task } from "../../../modules/tasks/Task.js";
import { TaskService } from "../../../modules/tasks/TaskService.js";
import type { TaskCompletedEvent } from "../../../modules/tasks/task.events.js";
import { ProjectAccessGuard } from "../../../shared/security/ProjectAccessGuard.js";
import { createEvent } from "../../../shared/events/DomainEvent.js";
import { InMemoryEventBus } from "../../../shared/events/InMemoryEventBus.js";

const OWNER = "owner";
const ALICE = "alice";
const BOB = "bob";

function member(userId: string) {
  return new ProjectMember(`m-${userId}`, "proj-1", userId, new Date());
}

function completedEvent(actorId: string | null): TaskCompletedEvent {
  return createEvent(
    "task.completed",
    {
      taskId: "task-1",
      projectId: "proj-1",
      title: "Write docs",
      previousStatus: "IN_PROGRESS",
    },
    { actorId, occurredAt: new Date("2026-09-30T10:00:00.000Z") },
  );
}

describe("NotificationService", () => {
  let notifications: InMemoryNotificationRepository;
  let projects: { findById: Mock };
  let members: { findByProject: Mock };
  let service: NotificationService;

  beforeEach(() => {
    notifications = new InMemoryNotificationRepository();
    projects = {
      findById: vi
        .fn()
        .mockResolvedValue(
          new Project("proj-1", "Kanban", "", OWNER, new Date()),
        ),
    };
    members = {
      findByProject: vi.fn().mockResolvedValue([member(ALICE), member(BOB)]),
    };
    service = new NotificationService(
      notifications,
      projects as unknown as ProjectRepository,
      members as unknown as ProjectMemberRepository,
    );
  });

  it("notifie le propriétaire et les membres, sauf l'auteur de l'action", async () => {
    const event = completedEvent(ALICE);

    const result = await service.notifyTaskEvent(event);

    expect(result).toEqual({ recipients: 2, created: 2 });
    expect(notifications.rows.map((n) => n.userId).sort()).toEqual([
      BOB,
      OWNER,
    ]);
    expect(notifications.rows[0]).toMatchObject({
      type: "task.completed",
      eventId: event.id,
      actorId: ALICE,
      projectId: "proj-1",
      taskId: "task-1",
      taskTitle: "Write docs",
      readAt: null,
      createdAt: new Date("2026-09-30T10:00:00.000Z"),
    });
  });

  it("ne notifie pas le propriétaire de sa propre action", async () => {
    await service.notifyTaskEvent(completedEvent(OWNER));

    expect(notifications.rows.map((n) => n.userId).sort()).toEqual([
      ALICE,
      BOB,
    ]);
  });

  it("notifie tout le monde pour un événement système (actorId nul)", async () => {
    await service.notifyTaskEvent(completedEvent(null));

    expect(notifications.rows).toHaveLength(3);
  });

  it("ne crée pas de doublon si le propriétaire est aussi membre", async () => {
    members.findByProject.mockResolvedValue([member(OWNER), member(ALICE)]);

    const result = await service.notifyTaskEvent(completedEvent(BOB));

    expect(result).toEqual({ recipients: 2, created: 2 });
  });

  it("ne crée rien pour un projet supprimé depuis l'événement", async () => {
    projects.findById.mockResolvedValue(null);

    const result = await service.notifyTaskEvent(completedEvent(ALICE));

    expect(result).toEqual({ recipients: 0, created: 0 });
    expect(members.findByProject).not.toHaveBeenCalled();
  });

  it("est idempotent quand le même événement est traité deux fois", async () => {
    const event = completedEvent(ALICE);

    await service.notifyTaskEvent(event);
    const second = await service.notifyTaskEvent(event);

    expect(second).toEqual({ recipients: 2, created: 0 });
    expect(notifications.rows).toHaveLength(2);
  });

  it("crée de nouvelles notifications pour un autre événement de la même tâche", async () => {
    await service.notifyTaskEvent(completedEvent(ALICE));
    await service.notifyTaskEvent(completedEvent(ALICE));

    expect(notifications.rows).toHaveLength(4);
  });
});

describe("Workflow task → Event Bus → notifications", () => {
  it("la création et la complétion d'une tâche notifient les membres", async () => {
    const eventBus = new InMemoryEventBus();
    const notifications = new InMemoryNotificationRepository();
    const projectRepository = {
      findById: vi
        .fn()
        .mockResolvedValue(
          new Project("proj-1", "Kanban", "", OWNER, new Date()),
        ),
    } as unknown as ProjectRepository;
    const memberRepository = {
      findByProject: vi.fn().mockResolvedValue([member(ALICE)]),
      findByProjectAndUser: vi.fn().mockResolvedValue(null),
    } as unknown as ProjectMemberRepository;
    const log = vi.fn();

    await subscribeNotificationConsumer(
      eventBus,
      new NotificationService(
        notifications,
        projectRepository,
        memberRepository,
      ),
      log,
    );

    const stored = new Map<string, Task>();
    const taskService = new TaskService(
      {
        save: vi.fn(async (t: Task) => {
          stored.set(t.id, t);
          return t;
        }),
        findById: vi.fn(async (id: string) => stored.get(id) ?? null),
        findByProjectId: vi.fn(),
        delete: vi.fn(),
      },
      new ProjectAccessGuard(projectRepository, memberRepository),
      eventBus,
    );

    const task = await taskService.create("proj-1", OWNER, {
      title: "Write docs",
      description: "",
      priority: "Medium",
      status: "TODO",
    });
    await taskService.update(task.id, OWNER, { status: "IN_PROGRESS" });
    await taskService.update(task.id, OWNER, { status: "DONE" });

    expect(eventBus.published.map((e) => e.type)).toEqual([
      "task.created",
      "task.updated",
      "task.updated",
      "task.completed",
    ]);
    expect(eventBus.failures).toEqual([]);
    expect(notifications.rows.map((n) => [n.userId, n.type])).toEqual([
      [ALICE, "task.created"],
      [ALICE, "task.completed"],
    ]);
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining("1 created for 1 recipient(s)"),
    );
  });

  it("s'abonne sous un nom de consumer dédié aux types notifiés", async () => {
    const eventBus = { publish: vi.fn(), subscribe: vi.fn() };

    await subscribeNotificationConsumer(eventBus, {} as NotificationService);

    expect(eventBus.subscribe).toHaveBeenCalledWith(
      expect.objectContaining({
        name: NOTIFICATION_CONSUMER,
        eventTypes: ["task.created", "task.completed"],
      }),
    );
  });
});

describe("Idempotence du consumer (S2-29)", () => {
  function setup() {
    const eventBus = new InMemoryEventBus();
    const notifications = new InMemoryNotificationRepository();
    const log = vi.fn();
    const service = new NotificationService(
      notifications,
      {
        findById: vi
          .fn()
          .mockResolvedValue(
            new Project("proj-1", "Kanban", "", OWNER, new Date()),
          ),
      } as unknown as ProjectRepository,
      {
        findByProject: vi.fn().mockResolvedValue([member(ALICE), member(BOB)]),
      } as unknown as ProjectMemberRepository,
    );
    return { eventBus, notifications, log, service };
  }

  it("une double livraison du même événement ne crée aucun doublon", async () => {
    const { eventBus, notifications, log, service } = setup();
    await subscribeNotificationConsumer(eventBus, service, log);
    const event = completedEvent(ALICE);

    await eventBus.publish(event);
    await eventBus.publish(event);

    expect(notifications.rows).toHaveLength(2);
    expect(log).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("2 created for 2 recipient(s)"),
    );
    expect(log).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining(
        "0 created for 2 recipient(s) (2 already existed)",
      ),
    );
    expect(eventBus.failures).toEqual([]);
  });

  it("une relivraison partielle complète les destinataires manquants", async () => {
    const { eventBus, notifications, service } = setup();
    await subscribeNotificationConsumer(eventBus, service);
    const event = completedEvent(ALICE);
    // Simulates a crash after only the owner's row was written.
    await notifications.createMany([
      new Notification(
        "n-owner",
        OWNER,
        event.type,
        event.id,
        ALICE,
        "proj-1",
        "task-1",
        "Write docs",
        null,
        new Date(event.occurredAt),
      ),
    ]);

    await eventBus.publish(event);

    expect(notifications.rows.map((n) => n.userId).sort()).toEqual([
      BOB,
      OWNER,
    ]);
  });
});
