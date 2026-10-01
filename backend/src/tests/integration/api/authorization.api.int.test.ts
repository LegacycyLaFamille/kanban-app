import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Express } from "express";
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "../../../generated/prisma/client.js";
import { resetDatabase } from "../support.js";
import {
  loadApp,
  signIn,
  signUp,
  testPrisma,
  type Agent,
  type SignedInUser,
} from "./harness.js";

// Authorization matrix (docs/audit/AUTHORIZATION_AUDIT.md): every project,
// board, task and admin action, by every kind of user, on fresh data.
//
// Project A: owned by `owner`, with `editor` (EDITOR) and `viewer` (VIEWER).
// Project B: owned by `outsider`, unrelated to everyone else.
// `admin` has the system ADMIN role but no project membership.

type Role = "owner" | "editor" | "viewer" | "outsider" | "admin";
const ROLES: Role[] = ["owner", "editor", "viewer", "outsider", "admin"];

let app: Express;
let prisma: PrismaClient;
const users = {} as Record<Role | "newcomer", SignedInUser>;

interface Fixture {
  projectA: string;
  boardA: string;
  taskA: string;
  projectB: string;
  boardB: string;
  taskB: string;
  invitation: string;
  notification: string;
}
let ids: Fixture;

beforeAll(async () => {
  app = await loadApp();
  prisma = testPrisma();
  await resetDatabase(prisma);
  for (const name of [...ROLES, "newcomer"] as const) {
    users[name] = await signUp(
      app,
      name.charAt(0).toUpperCase() + name.slice(1),
    );
  }
  await prisma.user.update({
    where: { id: users.admin.id },
    data: { role: "ADMIN" },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

// Fresh projects for every case; accounts and sessions are kept.
beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "Project", "Notification", "ProjectInvitation" CASCADE',
  );
  const projectA = await prisma.project.create({
    data: { name: "Project A", description: "", ownerId: users.owner.id },
  });
  await prisma.projectMember.createMany({
    data: [
      { projectId: projectA.id, userId: users.editor.id, role: "EDITOR" },
      { projectId: projectA.id, userId: users.viewer.id, role: "VIEWER" },
    ],
  });
  const boardA = await prisma.board.create({
    data: { name: "Board A", projectId: projectA.id },
  });
  const taskA = await prisma.task.create({
    data: {
      title: "Task A",
      description: "",
      projectId: projectA.id,
      boardId: boardA.id,
      status: "TODO",
      priority: "Low",
    },
  });
  const projectB = await prisma.project.create({
    data: { name: "Project B", description: "", ownerId: users.outsider.id },
  });
  const boardB = await prisma.board.create({
    data: { name: "Board B", projectId: projectB.id },
  });
  const taskB = await prisma.task.create({
    data: {
      title: "Task B",
      description: "",
      projectId: projectB.id,
      boardId: boardB.id,
      status: "TODO",
      priority: "Low",
    },
  });
  const invitation = await prisma.projectInvitation.create({
    data: {
      projectId: projectA.id,
      inviteeId: users.newcomer.id,
      inviterId: users.owner.id,
    },
  });
  const notification = await prisma.notification.create({
    data: {
      userId: users.owner.id,
      type: "task.created",
      eventId: randomUUID(),
      projectId: projectA.id,
      taskId: taskA.id,
      taskTitle: "Task A",
    },
  });
  ids = {
    projectA: projectA.id,
    boardA: boardA.id,
    taskA: taskA.id,
    projectB: projectB.id,
    boardB: boardB.id,
    taskB: taskB.id,
    invitation: invitation.id,
    notification: notification.id,
  };
});

type Method = "get" | "post" | "patch" | "delete";

interface Action {
  name: string;
  method: Method;
  path: (f: Fixture) => string;
  body?: (f: Fixture) => object;
  expected: Record<Role, number>;
}

const readable = {
  owner: 200,
  editor: 200,
  viewer: 200,
  outsider: 403,
  admin: 403,
};
const ownerOnly = (ok: number) => ({
  owner: ok,
  editor: 403,
  viewer: 403,
  outsider: 403,
  admin: 403,
});
const editors = (ok: number) => ({
  owner: ok,
  editor: ok,
  viewer: 403,
  outsider: 403,
  admin: 403,
});
const adminOnly = {
  owner: 403,
  editor: 403,
  viewer: 403,
  outsider: 403,
  admin: 200,
};

const ACTIONS: Action[] = [
  // Projects
  {
    name: "read project",
    method: "get",
    path: (f) => `/projects/${f.projectA}`,
    expected: readable,
  },
  {
    name: "rename project",
    method: "patch",
    path: (f) => `/projects/${f.projectA}`,
    body: () => ({ name: "Renamed" }),
    expected: ownerOnly(200),
  },
  {
    name: "delete project",
    method: "delete",
    path: (f) => `/projects/${f.projectA}`,
    expected: ownerOnly(204),
  },
  {
    name: "list members",
    method: "get",
    path: (f) => `/projects/${f.projectA}/members`,
    expected: readable,
  },
  {
    name: "read team",
    method: "get",
    path: (f) => `/projects/${f.projectA}/team`,
    expected: readable,
  },
  {
    name: "add member",
    method: "post",
    path: (f) => `/projects/${f.projectA}/members`,
    body: () => ({ email: users.newcomer.email, role: "EDITOR" }),
    expected: ownerOnly(201),
  },
  {
    name: "change a member's role",
    method: "patch",
    path: (f) => `/projects/${f.projectA}/members/${users.viewer.id}`,
    body: () => ({ role: "EDITOR" }),
    expected: ownerOnly(200),
  },
  {
    name: "remove a member",
    method: "delete",
    path: (f) => `/projects/${f.projectA}/members/${users.viewer.id}`,
    expected: ownerOnly(204),
  },
  // Invitations
  {
    name: "invite",
    method: "post",
    path: (f) => `/projects/${f.projectA}/invitations`,
    body: () => ({ email: users.outsider.email, role: "VIEWER" }),
    expected: ownerOnly(201),
  },
  {
    name: "list project invitations",
    method: "get",
    path: (f) => `/projects/${f.projectA}/invitations`,
    expected: ownerOnly(200),
  },
  {
    name: "cancel an invitation",
    method: "delete",
    path: (f) => `/projects/${f.projectA}/invitations/${f.invitation}`,
    expected: ownerOnly(204),
  },
  // Boards
  {
    name: "list boards",
    method: "get",
    path: (f) => `/projects/${f.projectA}/boards`,
    expected: readable,
  },
  {
    name: "create board",
    method: "post",
    path: (f) => `/projects/${f.projectA}/boards`,
    body: () => ({ name: "New board" }),
    expected: editors(201),
  },
  {
    name: "read board by id",
    method: "get",
    path: (f) => `/boards/${f.boardA}`,
    expected: readable,
  },
  {
    name: "rename board",
    method: "patch",
    path: (f) => `/boards/${f.boardA}`,
    body: () => ({ name: "Renamed" }),
    expected: editors(200),
  },
  {
    name: "delete board",
    method: "delete",
    path: (f) => `/boards/${f.boardA}`,
    expected: editors(204),
  },
  // Tasks
  {
    name: "list tasks",
    method: "get",
    path: (f) => `/projects/${f.projectA}/tasks`,
    expected: readable,
  },
  {
    name: "create task",
    method: "post",
    path: (f) => `/projects/${f.projectA}/tasks`,
    body: (f) => ({ title: "New task", boardId: f.boardA }),
    expected: editors(201),
  },
  {
    name: "read task by id",
    method: "get",
    path: (f) => `/tasks/${f.taskA}`,
    expected: readable,
  },
  {
    name: "move task",
    method: "patch",
    path: (f) => `/tasks/${f.taskA}`,
    body: () => ({ status: "DONE" }),
    expected: editors(200),
  },
  {
    name: "assign task",
    method: "patch",
    path: (f) => `/tasks/${f.taskA}`,
    body: () => ({ assigneeId: users.viewer.id }),
    expected: editors(200),
  },
  {
    name: "delete task",
    method: "delete",
    path: (f) => `/tasks/${f.taskA}`,
    expected: editors(204),
  },
  // Admin
  {
    name: "admin: list all tasks",
    method: "get",
    path: () => "/admin/tasks",
    expected: adminOnly,
  },
  {
    name: "admin: assign a task",
    method: "patch",
    path: (f) => `/admin/tasks/${f.taskA}/assignee`,
    body: () => ({ assigneeId: users.viewer.id }),
    expected: adminOnly,
  },
  {
    name: "admin: system status",
    method: "get",
    path: () => "/admin/system",
    expected: adminOnly,
  },
];

function send(agent: Agent, action: Action) {
  const url = `/api/v1${action.path(ids)}`;
  const req = agent[action.method](url);
  return action.body ? req.send(action.body(ids)) : req;
}

const cases = ACTIONS.flatMap((action) =>
  ROLES.map(
    (role) => [action.name, role, action.expected[role], action] as const,
  ),
);

describe("authorization matrix", () => {
  it.each(cases)("%s as %s → %i", async (_name, role, expected, action) => {
    const res = await send(users[role].agent, action);

    expect(res.status, res.text).toBe(expected);
    if (expected === 403) {
      expect(res.body.error.code).toBe("FORBIDDEN");
    }
  });

  it("a refused mutation changes nothing in the database", async () => {
    await users.viewer.agent
      .patch(`/api/v1/tasks/${ids.taskA}`)
      .send({ title: "Hacked" });
    await users.outsider.agent.delete(`/api/v1/projects/${ids.projectA}`);
    await users.editor.agent
      .patch(`/api/v1/projects/${ids.projectA}`)
      .send({ name: "Hacked" });

    const task = await prisma.task.findUniqueOrThrow({
      where: { id: ids.taskA },
    });
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: ids.projectA },
    });
    expect(task.title).toBe("Task A");
    expect(project.name).toBe("Project A");
  });
});

describe("cross-project and cross-board access", () => {
  it("project A's owner cannot reach project B's resources by id", async () => {
    const agent = users.owner.agent;
    const responses = await Promise.all([
      agent.get(`/api/v1/projects/${ids.projectB}`),
      agent.get(`/api/v1/boards/${ids.boardB}`),
      agent.patch(`/api/v1/boards/${ids.boardB}`).send({ name: "X" }),
      agent.get(`/api/v1/tasks/${ids.taskB}`),
      agent.patch(`/api/v1/tasks/${ids.taskB}`).send({ status: "DONE" }),
      agent.delete(`/api/v1/tasks/${ids.taskB}`),
      agent
        .post(`/api/v1/projects/${ids.projectB}/tasks`)
        .send({ title: "Intruder" }),
    ]);

    expect(responses.map((res) => res.status)).toEqual([
      403, 403, 403, 403, 403, 403, 403,
    ]);
    expect(
      await prisma.task.count({ where: { projectId: ids.projectB } }),
    ).toBe(1);
  });

  it("a task cannot be created on, or moved to, another project's board", async () => {
    const create = await users.editor.agent
      .post(`/api/v1/projects/${ids.projectA}/tasks`)
      .send({ title: "Smuggled", boardId: ids.boardB });
    const move = await users.editor.agent
      .patch(`/api/v1/tasks/${ids.taskA}`)
      .send({ boardId: ids.boardB });

    expect(create.status).toBe(400);
    expect(create.body.error.code).toBe("BOARD_NOT_IN_PROJECT");
    expect(move.status).toBe(400);
    expect(move.body.error.code).toBe("BOARD_NOT_IN_PROJECT");
    const task = await prisma.task.findUniqueOrThrow({
      where: { id: ids.taskA },
    });
    expect(task.boardId).toBe(ids.boardA);
  });

  it("a task cannot be moved to another project through its payload", async () => {
    const res = await users.owner.agent
      .patch(`/api/v1/tasks/${ids.taskA}`)
      .send({ projectId: ids.projectB });

    expect(res.status).toBe(400);
    const task = await prisma.task.findUniqueOrThrow({
      where: { id: ids.taskA },
    });
    expect(task.projectId).toBe(ids.projectA);
  });

  it("a task cannot be assigned to someone outside its project", async () => {
    const byOwner = await users.owner.agent
      .patch(`/api/v1/tasks/${ids.taskA}`)
      .send({ assigneeId: users.outsider.id });
    const byAdmin = await users.admin.agent
      .patch(`/api/v1/admin/tasks/${ids.taskA}/assignee`)
      .send({ assigneeId: users.outsider.id });

    expect(byOwner.status).toBe(400);
    expect(byOwner.body.error.code).toBe("ASSIGNEE_NOT_PROJECT_MEMBER");
    expect(byAdmin.status).toBe(400);
  });

  it("lists only the projects and tasks the user can see", async () => {
    const outsiderProjects = await users.outsider.agent.get("/api/v1/projects");
    const viewerProjects = await users.viewer.agent.get("/api/v1/projects");
    const tasksA = await users.owner.agent.get(
      `/api/v1/projects/${ids.projectA}/tasks`,
    );

    const names = (res: { body: { name: string }[] }) =>
      res.body.map((project) => project.name).sort();
    expect(names(outsiderProjects)).toEqual(["Project B"]);
    expect(names(viewerProjects)).toEqual(["Project A"]);
    expect(tasksA.body.map((task: { title: string }) => task.title)).toEqual([
      "Task A",
    ]);
  });

  it("removing a member revokes their access on their very next request", async () => {
    const before = await users.editor.agent
      .patch(`/api/v1/tasks/${ids.taskA}`)
      .send({ status: "IN_PROGRESS" });
    await users.owner.agent.delete(
      `/api/v1/projects/${ids.projectA}/members/${users.editor.id}`,
    );
    const after = await users.editor.agent
      .patch(`/api/v1/tasks/${ids.taskA}`)
      .send({ status: "DONE" });

    expect(before.status).toBe(200);
    expect(after.status).toBe(403);
  });

  it("a demoted EDITOR loses write access at once", async () => {
    await users.owner.agent
      .patch(`/api/v1/projects/${ids.projectA}/members/${users.editor.id}`)
      .send({ role: "VIEWER" });

    const res = await users.editor.agent
      .patch(`/api/v1/tasks/${ids.taskA}`)
      .send({ status: "DONE" });

    expect(res.status).toBe(403);
  });
});

describe("per-user resources", () => {
  it("only the invitee can accept or decline an invitation", async () => {
    for (const role of ROLES) {
      const accept = await users[role].agent.post(
        `/api/v1/invitations/${ids.invitation}/accept`,
      );
      const decline = await users[role].agent.post(
        `/api/v1/invitations/${ids.invitation}/decline`,
      );
      expect([role, accept.status, decline.status]).toEqual([role, 404, 404]);
    }

    const accepted = await users.newcomer.agent.post(
      `/api/v1/invitations/${ids.invitation}/accept`,
    );
    expect(accepted.status).toBe(200);
    const read = await users.newcomer.agent.get(
      `/api/v1/projects/${ids.projectA}`,
    );
    expect(read.status).toBe(200);
  });

  it("nobody can read or mark another user's notification", async () => {
    for (const role of ["editor", "viewer", "outsider", "admin"] as const) {
      const mark = await users[role].agent.patch(
        `/api/v1/notifications/${ids.notification}/read`,
      );
      const list = await users[role].agent.get("/api/v1/notifications");
      expect([role, mark.status]).toEqual([role, 404]);
      expect(JSON.stringify(list.body)).not.toContain(ids.notification);
    }
    const stored = await prisma.notification.findUniqueOrThrow({
      where: { id: ids.notification },
    });
    expect(stored.readAt).toBeNull();
  });

  it("a data export only contains the caller's own projects", async () => {
    const res = await users.outsider.agent.get(
      "/api/v1/auth/me/export?format=json",
    );

    expect(res.status).toBe(200);
    expect(res.text).toContain("Project B");
    expect(res.text).not.toContain("Project A");
  });

  it("re-signing in does not grant another user's access", async () => {
    // A fresh session of the viewer still has the viewer's rights only.
    const agent = await signIn(app, users.viewer.email);
    const res = await agent
      .patch(`/api/v1/projects/${ids.projectA}`)
      .send({ name: "Mine" });
    users.viewer.agent = agent;

    expect(res.status).toBe(403);
  });
});
