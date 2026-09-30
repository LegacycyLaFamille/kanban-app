import { describe, it, expect, vi } from "vitest";
import {
  createEvent,
  InvalidEventError,
  parseDomainEvent,
  type DomainEvent,
} from "../../../shared/events/DomainEvent.js";
import {
  EventPublishError,
  matchesEventType,
  type EventBus,
} from "../../../shared/events/EventBus.js";
import { InMemoryEventBus } from "../../../shared/events/InMemoryEventBus.js";
import { publishSafely } from "../../../shared/events/publishSafely.js";

type TaskCreated = DomainEvent<"task.created", { taskId: string }>;

describe("createEvent", () => {
  it("remplit l'enveloppe commune", () => {
    const occurredAt = new Date("2026-09-30T10:00:00.000Z");
    const event = createEvent(
      "task.created",
      { taskId: "t1" },
      { actorId: "u1", occurredAt },
    );

    expect(event).toEqual({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      type: "task.created",
      version: 1,
      occurredAt: "2026-09-30T10:00:00.000Z",
      actorId: "u1",
      payload: { taskId: "t1" },
    });
  });

  it("génère un id unique par événement et un actorId nul par défaut", () => {
    const a = createEvent("task.created", {});
    const b = createEvent("task.created", {});

    expect(a.id).not.toBe(b.id);
    expect(a.actorId).toBeNull();
  });

  it("refuse un type qui ne suit pas <domain>.<action>", () => {
    for (const type of ["taskCreated", "Task.created", "task.", "a.b.c"]) {
      expect(() => createEvent(type, {})).toThrow(InvalidEventError);
    }
  });
});

describe("parseDomainEvent", () => {
  it("accepte un événement sérialisé puis relu", () => {
    const event = createEvent("task.created", { taskId: "t1" });

    expect(parseDomainEvent(JSON.parse(JSON.stringify(event)))).toEqual(event);
  });

  it("rejette une enveloppe incomplète en listant les champs fautifs", () => {
    expect(() =>
      parseDomainEvent({ id: "not-a-uuid", type: "task.created" }),
    ).toThrow(/id .*occurredAt|occurredAt.*id/s);
  });
});

describe("matchesEventType", () => {
  it.each([
    ["task.created", "task.created", true],
    ["task.created", "task.updated", false],
    ["task.*", "task.updated", true],
    ["*.created", "project.created", true],
    ["#", "task.created", true],
    ["task.#", "task.created", true],
    ["task.*", "project.created", false],
  ])("%s ~ %s → %s", (pattern, type, expected) => {
    expect(matchesEventType(pattern, type)).toBe(expected);
  });
});

describe("InMemoryEventBus", () => {
  it("délivre aux abonnés correspondants uniquement", async () => {
    const bus = new InMemoryEventBus();
    const onTask = vi.fn().mockResolvedValue(undefined);
    const onProject = vi.fn().mockResolvedValue(undefined);
    await bus.subscribe<TaskCreated>({
      name: "test.tasks",
      eventTypes: ["task.*"],
      handler: onTask,
    });
    await bus.subscribe({
      name: "test.projects",
      eventTypes: ["project.created"],
      handler: onProject,
    });

    const event = createEvent("task.created", { taskId: "t1" });
    await bus.publish(event);

    expect(onTask).toHaveBeenCalledWith(event);
    expect(onProject).not.toHaveBeenCalled();
    expect(bus.publishedOfType("task.created")).toEqual([event]);
  });

  it("isole l'éditeur des erreurs des consumers", async () => {
    const bus = new InMemoryEventBus();
    await bus.subscribe({
      name: "test.failing",
      eventTypes: ["task.created"],
      handler: () => Promise.reject(new Error("boom")),
    });

    await expect(
      bus.publish(createEvent("task.created", {})),
    ).resolves.toBeUndefined();
    expect(bus.failures).toHaveLength(1);
    expect(bus.failures[0]?.subscription).toBe("test.failing");
  });

  it("refuse un payload non sérialisable, comme le broker", async () => {
    const bus = new InMemoryEventBus();
    const event = createEvent("task.created", {}) as DomainEvent;
    (event as { occurredAt: unknown }).occurredAt = undefined;

    await expect(bus.publish(event)).rejects.toThrow(InvalidEventError);
  });

  it("refuse deux abonnements du même nom", async () => {
    const bus = new InMemoryEventBus();
    const subscription = {
      name: "test.dup",
      eventTypes: ["task.created"],
      handler: vi.fn(),
    };
    await bus.subscribe(subscription);

    await expect(bus.subscribe(subscription)).rejects.toThrow("already exists");
  });
});

describe("publishSafely", () => {
  it("renvoie true quand la publication réussit", async () => {
    const bus = new InMemoryEventBus();

    await expect(
      publishSafely(bus, createEvent("task.created", {})),
    ).resolves.toBe(true);
  });

  it("ne propage pas l'échec et le journalise avec l'id et le type", async () => {
    const event = createEvent("task.created", {});
    const bus: EventBus = {
      publish: () =>
        Promise.reject(
          new EventPublishError(event, {
            cause: new Error("RabbitMQ is not connected"),
          }),
        ),
      subscribe: vi.fn(),
    };
    const log = vi.fn();

    await expect(publishSafely(bus, event, log)).resolves.toBe(false);
    expect(log).toHaveBeenCalledWith(
      expect.stringMatching(
        new RegExp(`task\\.created ${event.id}.*RabbitMQ is not connected`),
      ),
    );
  });
});
