import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Express } from "express";
import request from "supertest";
import type { PrismaClient } from "../../../generated/prisma/client.js";
import { resetDatabase } from "../support.js";
import { loadApp, signUp, testPrisma, type SignedInUser } from "./harness.js";

// Project, board and task APIs end to end: routing, validation, services,
// Prisma and the database together.

let app: Express;
let prisma: PrismaClient;
let alice: SignedInUser;

const UNKNOWN_ID = "6f1c2b7e-3a4d-4e5f-8a9b-0c1d2e3f4a5b";

beforeAll(async () => {
  app = await loadApp();
  prisma = testPrisma();
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await resetDatabase(prisma);
  alice = await signUp(app, "Alice");
});

async function createProject(name = "Website") {
  const res = await alice.agent
    .post("/api/v1/projects")
    .send({ name, description: "Relaunch" });
  expect(res.status).toBe(201);
  return res.body as { id: string; name: string; ownerId: string };
}

async function createBoard(projectId: string, name = "Sprint 1") {
  const res = await alice.agent
    .post(`/api/v1/projects/${projectId}/boards`)
    .send({ name });
  expect(res.status).toBe(201);
  return res.body as { id: string; name: string; projectId: string };
}

describe("Project API", () => {
  it("creates a project owned by the caller, and persists it", async () => {
    const project = await createProject();

    expect(project).toMatchObject({ name: "Website", ownerId: alice.id });
    const stored = await prisma.project.findUniqueOrThrow({
      where: { id: project.id },
    });
    expect(stored.ownerId).toBe(alice.id);
  });

  it("ignores no field: an owner cannot be forced through the payload", async () => {
    const res = await alice.agent
      .post("/api/v1/projects")
      .send({ name: "Website", ownerId: UNKNOWN_ID });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("lists, reads, renames and deletes a project", async () => {
    const project = await createProject();

    const list = await alice.agent.get("/api/v1/projects");
    expect(list.status).toBe(200);
    expect(list.body.map((p: { id: string }) => p.id)).toEqual([project.id]);

    const read = await alice.agent.get(`/api/v1/projects/${project.id}`);
    expect(read.status).toBe(200);
    expect(read.body.name).toBe("Website");

    const renamed = await alice.agent
      .patch(`/api/v1/projects/${project.id}`)
      .send({ name: "Website v2" });
    expect(renamed.status).toBe(200);
    expect(renamed.body.name).toBe("Website v2");

    const deleted = await alice.agent.delete(`/api/v1/projects/${project.id}`);
    expect(deleted.status).toBe(204);
    expect(await prisma.project.count()).toBe(0);
  });

  it("deleting a project deletes its boards and tasks", async () => {
    const project = await createProject();
    const board = await createBoard(project.id);
    await alice.agent
      .post(`/api/v1/projects/${project.id}/tasks`)
      .send({ title: "Task", boardId: board.id });

    await alice.agent.delete(`/api/v1/projects/${project.id}`);

    expect(await prisma.board.count()).toBe(0);
    expect(await prisma.task.count()).toBe(0);
  });

  it.each([
    ["without a name", {}],
    ["with an empty name", { name: "   " }],
  ])("refuses a project %s with 400", async (_label, body) => {
    const res = await alice.agent.post("/api/v1/projects").send(body);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("answers 404 for an unknown project", async () => {
    const res = await alice.agent.get(`/api/v1/projects/${UNKNOWN_ID}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("answers 400 INVALID_JSON for a malformed body", async () => {
    const res = await alice.agent
      .post("/api/v1/projects")
      .set("Content-Type", "application/json")
      .send('{"name": ');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_JSON");
  });

  it("refuses every project route without a session", async () => {
    const project = await createProject();

    const responses = await Promise.all([
      request(app).get("/api/v1/projects"),
      request(app).post("/api/v1/projects").send({ name: "X" }),
      request(app).get(`/api/v1/projects/${project.id}`),
      request(app).delete(`/api/v1/projects/${project.id}`),
    ]);

    expect(responses.map((res) => res.status)).toEqual([401, 401, 401, 401]);
    expect(await prisma.project.count()).toBe(1);
  });
});

describe("Board API", () => {
  it("creates, lists, renames and deletes boards", async () => {
    const project = await createProject();
    const board = await createBoard(project.id);

    const list = await alice.agent.get(`/api/v1/projects/${project.id}/boards`);
    expect(list.body.map((b: { id: string }) => b.id)).toEqual([board.id]);

    const renamed = await alice.agent
      .patch(`/api/v1/boards/${board.id}`)
      .send({ name: "Sprint 2" });
    expect(renamed.status).toBe(200);
    expect(renamed.body.name).toBe("Sprint 2");

    const deleted = await alice.agent.delete(`/api/v1/boards/${board.id}`);
    expect(deleted.status).toBe(204);
    expect(await prisma.board.count()).toBe(0);
  });

  it("deleting a board keeps its tasks, without a board", async () => {
    const project = await createProject();
    const board = await createBoard(project.id);
    const task = await alice.agent
      .post(`/api/v1/projects/${project.id}/tasks`)
      .send({ title: "Task", boardId: board.id });

    await alice.agent.delete(`/api/v1/boards/${board.id}`);

    const stored = await prisma.task.findUniqueOrThrow({
      where: { id: task.body.id },
    });
    expect(stored.boardId).toBeNull();
  });

  it.each([
    ["without a name", {}],
    ["with an empty name", { name: "  " }],
    ["with an unknown field", { name: "Sprint", projectId: UNKNOWN_ID }],
  ])("refuses a board %s with 400", async (_label, body) => {
    const project = await createProject();

    const res = await alice.agent
      .post(`/api/v1/projects/${project.id}/boards`)
      .send(body);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(await prisma.board.count()).toBe(0);
  });

  it("answers 404 for an unknown board", async () => {
    const res = await alice.agent.get(`/api/v1/boards/${UNKNOWN_ID}`);

    expect(res.status).toBe(404);
  });
});

describe("Task API", () => {
  let projectId: string;
  let boardId: string;

  beforeEach(async () => {
    projectId = (await createProject()).id;
    boardId = (await createBoard(projectId)).id;
  });

  async function createTask(body: Record<string, unknown> = {}) {
    const res = await alice.agent
      .post(`/api/v1/projects/${projectId}/tasks`)
      .send({ title: "Write docs", boardId, ...body });
    expect(res.status).toBe(201);
    return res.body as { id: string };
  }

  it("creates a task on a board, with its defaults", async () => {
    const res = await alice.agent
      .post(`/api/v1/projects/${projectId}/tasks`)
      .send({ title: "Write docs", boardId });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: "Write docs",
      projectId,
      boardId,
      status: "TODO",
      assigneeId: null,
    });
  });

  it("lists, reads, updates and deletes a task", async () => {
    const task = await createTask({ priority: "Low" });

    const list = await alice.agent.get(`/api/v1/projects/${projectId}/tasks`);
    expect(list.body.map((t: { id: string }) => t.id)).toEqual([task.id]);

    const read = await alice.agent.get(`/api/v1/tasks/${task.id}`);
    expect(read.status).toBe(200);

    const deadline = "2026-12-31T17:00:00.000Z";
    const updated = await alice.agent.patch(`/api/v1/tasks/${task.id}`).send({
      status: "IN_PROGRESS",
      priority: "High",
      deadline,
      assigneeId: alice.id,
    });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({
      status: "IN_PROGRESS",
      priority: "High",
      assigneeId: alice.id,
    });
    const stored = await prisma.task.findUniqueOrThrow({
      where: { id: task.id },
    });
    expect(stored.deadline?.toISOString()).toBe(deadline);

    const deleted = await alice.agent.delete(`/api/v1/tasks/${task.id}`);
    expect(deleted.status).toBe(204);
    expect(await prisma.task.count()).toBe(0);
  });

  it("lists the caller's assigned tasks in My Tasks", async () => {
    const task = await createTask({ assigneeId: alice.id });
    await createTask({ title: "Unassigned" });

    const res = await alice.agent.get("/api/v1/tasks/my");

    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).toContain(task.id);
    expect(JSON.stringify(res.body)).not.toContain("Unassigned");
  });

  it.each([
    ["without a title", { title: undefined }],
    ["with an unknown status", { status: "ARCHIVED" }],
    ["with an unknown priority", { priority: "Urgent" }],
    ["with an invalid deadline", { deadline: "tomorrow" }],
    ["with an invalid boardId", { boardId: "not-a-uuid" }],
    ["with an unknown field", { projectId: UNKNOWN_ID }],
  ])("refuses a task %s with 400", async (_label, override) => {
    const res = await alice.agent
      .post(`/api/v1/projects/${projectId}/tasks`)
      .send({ title: "Write docs", boardId, ...override });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(await prisma.task.count()).toBe(0);
  });

  it("refuses an assignee who has no access to the project", async () => {
    const outsider = await signUp(app, "Outsider");

    const res = await alice.agent
      .post(`/api/v1/projects/${projectId}/tasks`)
      .send({ title: "Write docs", assigneeId: outsider.id });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("ASSIGNEE_NOT_PROJECT_MEMBER");
  });

  it("answers 404 for an unknown task, and on an unknown project", async () => {
    const read = await alice.agent.get(`/api/v1/tasks/${UNKNOWN_ID}`);
    const update = await alice.agent
      .patch(`/api/v1/tasks/${UNKNOWN_ID}`)
      .send({ status: "DONE" });
    const create = await alice.agent
      .post(`/api/v1/projects/${UNKNOWN_ID}/tasks`)
      .send({ title: "Write docs" });

    expect([read.status, update.status, create.status]).toEqual([
      404, 404, 404,
    ]);
  });

  it("refuses an empty update", async () => {
    const task = await createTask();

    const res = await alice.agent.patch(`/api/v1/tasks/${task.id}`).send({});

    expect(res.status).toBe(400);
  });
});
