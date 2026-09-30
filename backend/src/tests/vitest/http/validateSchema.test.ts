import { describe, expect, it } from "vitest";
import express, { type Express } from "express";
import request from "supertest";
import { z } from "zod";

import { validateSchema } from "../../../shared/http/validateSchema.js";

describe("validateSchema", () => {
  const schema = z.strictObject({
    name: z.string().trim().min(1, "Name is required"),
    age: z.number().int().positive().optional(),
  });

  function buildApp(): Express {
    const app = express();
    app.use(express.json());
    app.post("/widgets", validateSchema(schema), (req, res) => {
      res.status(200).json({ received: req.body });
    });
    return app;
  }

  it("calls next with the parsed body when the payload is valid", async () => {
    const res = await request(buildApp())
      .post("/widgets")
      .send({ name: "  Widget  ", age: 3 });

    expect(res.status).toBe(200);
    // The schema's .trim() transform proves req.body was replaced with the
    // parsed output, not passed through untouched.
    expect(res.body).toEqual({ received: { name: "Widget", age: 3 } });
  });

  it("rejects a missing required field with the standard error shape", async () => {
    const res = await request(buildApp()).post("/widgets").send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.message).toBe("Invalid request");
    expect(res.body.error.details.name).toBeDefined();
  });

  it("rejects an empty required field with the schema's custom message", async () => {
    const res = await request(buildApp()).post("/widgets").send({ name: "" });

    expect(res.status).toBe(400);
    expect(res.body.error.details.name).toEqual(["Name is required"]);
  });

  it("rejects a wrong-type field", async () => {
    const res = await request(buildApp())
      .post("/widgets")
      .send({ name: "Widget", age: "not-a-number" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details.age).toBeDefined();
  });

  it("rejects unknown fields (strictObject)", async () => {
    const res = await request(buildApp())
      .post("/widgets")
      .send({ name: "Widget", unexpected: true });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("never calls the route handler when validation fails", async () => {
    let handlerCalled = false;
    const app = express();
    app.use(express.json());
    app.post("/widgets", validateSchema(schema), (_req, res) => {
      handlerCalled = true;
      res.status(200).json({});
    });

    await request(app).post("/widgets").send({});

    expect(handlerCalled).toBe(false);
  });
});
