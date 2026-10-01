import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Express } from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import { createHash } from "node:crypto";
import type { PrismaClient } from "../../../generated/prisma/client.js";
import { resetDatabase } from "../support.js";
import {
  PASSWORD,
  cookie,
  loadApp,
  register,
  setCookieLine,
  signIn,
  testPrisma,
} from "./harness.js";

// Authentication lifecycle against the real app and database: evidence for
// the authentication audit (docs/audit/AUTH_AUDIT.md).

let app: Express;
let prisma: PrismaClient;

beforeAll(async () => {
  app = await loadApp();
  prisma = testPrisma();
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await resetDatabase(prisma);
});

const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");

async function login(email: string, password = PASSWORD) {
  return request(app).post("/api/v1/auth/login").send({ email, password });
}

function asCookies(res: Parameters<typeof cookie>[0]) {
  return [
    `accessToken=${cookie(res, "accessToken")}`,
    `refreshToken=${cookie(res, "refreshToken")}`,
  ];
}

describe("registration", () => {
  it("creates the account and never returns secrets", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      name: "Alice",
      email: "alice@integration.test",
      password: PASSWORD,
    });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({
      email: "alice@integration.test",
      name: "Alice",
    });
    expect(res.text).not.toMatch(
      /passwordHash|refreshToken|Integration-Password/,
    );

    const stored = await prisma.user.findUniqueOrThrow({
      where: { email: "alice@integration.test" },
    });
    expect(stored.passwordHash).not.toBe(PASSWORD);
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$12\$/);
  });

  it("stores the email trimmed and lowercase", async () => {
    await request(app).post("/api/v1/auth/register").send({
      name: "Alice",
      email: "  Alice@Integration.TEST ",
      password: PASSWORD,
    });

    const stored = await prisma.user.findMany();
    expect(stored.map((user) => user.email)).toEqual([
      "alice@integration.test",
    ]);
  });

  it("refuses an email already used, whatever its case", async () => {
    await register(app, "Alice", "alice@integration.test");

    const res = await request(app).post("/api/v1/auth/register").send({
      name: "Alice Bis",
      email: "ALICE@integration.test",
      password: PASSWORD,
    });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EMAIL_ALREADY_IN_USE");
  });

  it.each([
    ["an invalid email", { email: "not-an-email" }],
    ["a password under 8 characters", { password: "short" }],
    ["a password over 72 bytes", { password: "é".repeat(40) }],
    ["a name under 2 characters", { name: "A" }],
    ["an unknown field", { role: "ADMIN" }],
  ])("refuses %s with 400 VALIDATION_ERROR", async (_label, override) => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Alice",
        email: "alice@integration.test",
        password: PASSWORD,
        ...override,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(await prisma.user.count()).toBe(0);
  });
});

describe("login", () => {
  beforeEach(async () => {
    await register(app, "Alice", "alice@integration.test");
  });

  it("opens a session in HttpOnly, SameSite=Strict cookies, not in the body", async () => {
    const res = await login("alice@integration.test");

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("alice@integration.test");
    expect(res.text).not.toMatch(/eyJ/); // no JWT in the body

    for (const name of ["accessToken", "refreshToken"]) {
      const line = setCookieLine(res, name);
      expect(line).toMatch(/HttpOnly/);
      expect(line).toMatch(/SameSite=Strict/);
    }
    expect(setCookieLine(res, "accessToken")).toMatch(/Max-Age=900/);
    expect(setCookieLine(res, "refreshToken")).toMatch(/Max-Age=604800/);
  });

  it("accepts the email in any case and with spaces", async () => {
    const res = await login("  ALICE@Integration.test ");

    expect(res.status).toBe(200);
  });

  it("answers the same 401 for a wrong password and an unknown email", async () => {
    const wrongPassword = await login(
      "alice@integration.test",
      "Wrong-Password-1",
    );
    const unknownEmail = await login("nobody@integration.test");

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
    expect(wrongPassword.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(cookie(wrongPassword, "accessToken")).toBeUndefined();
  });

  it("stores only a hash of the refresh token", async () => {
    const res = await login("alice@integration.test");
    const refreshToken = cookie(res, "refreshToken")!;

    const stored = await prisma.user.findUniqueOrThrow({
      where: { email: "alice@integration.test" },
    });
    expect(stored.refreshToken).not.toBe(refreshToken);
    expect(stored.refreshToken).toBe(sha256(refreshToken));
  });

  it("locks the account after 10 failed attempts (rate limit)", async () => {
    process.env.RATE_LIMIT_DISABLED = "false";
    try {
      for (let attempt = 0; attempt < 10; attempt++) {
        const res = await login("alice@integration.test", "Wrong-Password-1");
        expect(res.status).toBe(401);
      }
      const blocked = await login("alice@integration.test");

      expect(blocked.status).toBe(429);
      expect(blocked.body.error.code).toBe("TOO_MANY_REQUESTS");
    } finally {
      process.env.RATE_LIMIT_DISABLED = "true";
    }
  });
});

describe("protected requests", () => {
  it("refuses a request without session, with 401", async () => {
    const res = await request(app).get("/api/v1/auth/me");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("refuses a forged or garbage access token", async () => {
    const user = await register(app, "Alice");
    const forged = jwt.sign(
      { userId: user.id, typ: "access", sid: "x" },
      "not-the-secret",
    );

    for (const token of ["garbage", forged]) {
      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Cookie", `accessToken=${token}`);
      expect(res.status).toBe(401);
    }
  });

  it("refuses an expired access token", async () => {
    const user = await register(app, "Alice");
    const session = await login(user.email);
    const sid = (
      await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
    ).refreshToken;
    const expired = jwt.sign(
      {
        userId: user.id,
        typ: "access",
        sid,
        exp: Math.floor(Date.now() / 1000) - 60,
      },
      process.env.JWT_SECRET!,
    );

    const valid = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", asCookies(session));
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", `accessToken=${expired}`);

    expect(valid.status).toBe(200);
    expect(res.status).toBe(401);
  });

  it("refuses the refresh token used as an access token", async () => {
    const user = await register(app, "Alice");
    const session = await login(user.email);

    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", `accessToken=${cookie(session, "refreshToken")}`);

    expect(res.status).toBe(401);
  });

  it("returns the profile without secrets", async () => {
    const user = await register(app, "Alice");
    const agent = await signIn(app, user.email);

    const res = await agent.get("/api/v1/auth/me");

    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(
      ["createdAt", "email", "id", "name", "role"].sort(),
    );
  });
});

describe("session refresh", () => {
  it("rotates both tokens, and the previous refresh token stops working", async () => {
    const user = await register(app, "Alice");
    const first = await login(user.email);

    const refreshed = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", asCookies(first));
    expect(refreshed.status).toBe(200);
    expect(cookie(refreshed, "refreshToken")).not.toBe(
      cookie(first, "refreshToken"),
    );

    // Replaying the old refresh token (stolen, or an old tab) is refused,
    // and the old access token belongs to a replaced session.
    const replay = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", asCookies(first));
    const oldAccess = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", asCookies(first));
    const newAccess = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", asCookies(refreshed));

    expect(replay.status).toBe(401);
    expect(replay.body.error.code).toBe("SESSION_EXPIRED");
    expect(oldAccess.status).toBe(401);
    expect(newAccess.status).toBe(200);
  });

  it("refuses an access token presented as a refresh token", async () => {
    const user = await register(app, "Alice");
    const session = await login(user.email);

    const res = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", `refreshToken=${cookie(session, "accessToken")}`);

    expect(res.status).toBe(401);
  });

  it("answers 401 NO_SESSION without a refresh cookie", async () => {
    const res = await request(app).post("/api/v1/auth/refresh");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("NO_SESSION");
  });
});

describe("logout and revocation", () => {
  it("clears the cookies and revokes both tokens at once", async () => {
    const user = await register(app, "Alice");
    const session = await login(user.email);

    const res = await request(app)
      .post("/api/v1/auth/logout")
      .set("Cookie", asCookies(session));
    expect(res.status).toBe(200);
    expect(setCookieLine(res, "accessToken")).toMatch(
      /Expires=Thu, 01 Jan 1970/,
    );
    expect(setCookieLine(res, "refreshToken")).toMatch(
      /Expires=Thu, 01 Jan 1970/,
    );

    // Someone who kept a copy of the cookies cannot use them any more.
    const access = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", asCookies(session));
    const refresh = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", asCookies(session));
    expect(access.status).toBe(401);
    expect(refresh.status).toBe(401);
  });

  it("signing in elsewhere replaces the previous session (one per user)", async () => {
    const user = await register(app, "Alice");
    const laptop = await login(user.email);
    const phone = await login(user.email);

    const fromLaptop = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", asCookies(laptop));
    const fromPhone = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", asCookies(phone));

    expect(fromLaptop.status).toBe(401);
    expect(fromPhone.status).toBe(200);
  });

  it("a password change revokes the old session and the old password", async () => {
    const user = await register(app, "Alice");
    const session = await login(user.email);

    const change = await request(app)
      .patch("/api/v1/auth/me/password")
      .set("Cookie", asCookies(session))
      .send({ currentPassword: PASSWORD, newPassword: "New-Password-2" });
    expect(change.status).toBe(204);

    const oldSession = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", asCookies(session));
    const newSession = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", asCookies(change));
    expect(oldSession.status).toBe(401);
    expect(newSession.status).toBe(200);
    expect((await login(user.email)).status).toBe(401);
    expect((await login(user.email, "New-Password-2")).status).toBe(200);
  });

  it("refuses a password change with a wrong current password", async () => {
    const user = await register(app, "Alice");
    const agent = await signIn(app, user.email);

    const res = await agent.patch("/api/v1/auth/me/password").send({
      currentPassword: "Wrong-Password-1",
      newPassword: "New-Password-2",
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_CURRENT_PASSWORD");
    expect((await login(user.email)).status).toBe(200);
  });

  it("a deleted account cannot sign in nor use its old session", async () => {
    const user = await register(app, "Alice");
    const session = await login(user.email);

    const deletion = await request(app)
      .delete("/api/v1/auth/me")
      .set("Cookie", asCookies(session));
    expect(deletion.status).toBe(204);

    const afterwards = await request(app)
      .get("/api/v1/projects")
      .set("Cookie", asCookies(session));
    expect(afterwards.status).toBe(401);
    expect((await login(user.email)).status).toBe(401);
  });
});
