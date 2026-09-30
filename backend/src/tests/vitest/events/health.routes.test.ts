import { describe, it, expect, vi } from "vitest";
import express from "express";
import request from "supertest";
import { createHealthRouter } from "../../../shared/http/health.routes.js";
import type { RabbitMqStatus } from "../../../shared/events/rabbitmq/RabbitMqConnection.js";

function appWith(database: "up" | "down", rabbitmq: RabbitMqStatus) {
  const app = express();
  app.use(
    createHealthRouter({
      checkDatabase:
        database === "up"
          ? vi.fn().mockResolvedValue(undefined)
          : vi.fn().mockRejectedValue(new Error("db down")),
      rabbitMqStatus: () => rabbitmq,
    }),
  );
  return app;
}

describe("GET /health", () => {
  it("renvoie ok quand la base et le broker sont disponibles", async () => {
    const res = await request(
      appWith("up", {
        state: "connected",
        connectedAt: "2026-09-30T10:00:00.000Z",
      }),
    ).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: "ok",
      database: "up",
      rabbitmq: { state: "connected" },
    });
  });

  it("considère un broker désactivé comme ok", async () => {
    const res = await request(appWith("up", { state: "disabled" })).get(
      "/health",
    );

    expect(res.body.status).toBe("ok");
  });

  it("renvoie degraded (200) quand seul le broker est indisponible", async () => {
    const res = await request(
      appWith("up", { state: "disconnected", reconnectAttempt: 3 }),
    ).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: "degraded",
      rabbitmq: { state: "disconnected", reconnectAttempt: 3 },
    });
  });

  it("renvoie 503 quand la base est indisponible", async () => {
    const res = await request(appWith("down", { state: "connected" })).get(
      "/health",
    );

    expect(res.status).toBe(503);
    expect(res.body.status).toBe("down");
  });

  it("n'expose ni l'URL du broker ni le message d'erreur brut", async () => {
    const res = await request(
      appWith("up", {
        state: "disconnected",
        url: "amqp://kanban:***@rabbitmq:5672/%2F",
        lastError: "connect ECONNREFUSED 172.18.0.3:5672",
      }),
    ).get("/health");

    expect(JSON.stringify(res.body)).not.toMatch(/amqp:|172\.18|kanban/);
  });
});
