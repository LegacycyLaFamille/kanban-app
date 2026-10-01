import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { loginRateLimit } from "../../../shared/security/rateLimit.js";

describe("loginRateLimit", () => {
  it("blocks an IP after 10 failed attempts but ignores successful ones", async () => {
    const app = express();
    app.use(express.json());
    app.post("/login", loginRateLimit, (req, res) => {
      res.status(req.body.ok ? 200 : 401).end();
    });

    for (let i = 0; i < 5; i++) {
      expect(
        (await request(app).post("/login").send({ ok: true })).status,
      ).toBe(200);
    }

    for (let i = 0; i < 10; i++) {
      expect((await request(app).post("/login").send({})).status).toBe(401);
    }

    const blocked = await request(app).post("/login").send({ ok: true });

    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe("TOO_MANY_REQUESTS");
  });
});
