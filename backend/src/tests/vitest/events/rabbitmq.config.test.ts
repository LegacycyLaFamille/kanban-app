import { describe, it, expect } from "vitest";
import {
  loadRabbitMqConfig,
  RabbitMqConfigError,
} from "../../../shared/config/rabbitmq.config.js";

describe("loadRabbitMqConfig", () => {
  it("renvoie null quand RabbitMQ n'est pas configuré", () => {
    expect(loadRabbitMqConfig({})).toBeNull();
  });

  it("construit l'URL depuis les variables séparées et encode le mot de passe", () => {
    const config = loadRabbitMqConfig({
      RABBITMQ_HOST: "rabbitmq",
      RABBITMQ_USER: "kanban",
      RABBITMQ_PASSWORD: "p@ss:w/rd",
    });

    expect(config?.url).toBe("amqp://kanban:p%40ss%3Aw%2Frd@rabbitmq:5672/%2F");
    expect(config?.prefetch).toBe(10);
  });

  it("masque le mot de passe dans l'URL loggable", () => {
    const config = loadRabbitMqConfig({
      RABBITMQ_URL: "amqp://kanban:secret@broker:5672/%2F",
    });

    expect(config?.safeUrl).toBe("amqp://kanban:***@broker:5672/%2F");
    expect(config?.safeUrl).not.toContain("secret");
  });

  it("donne la priorité à RABBITMQ_URL et accepte amqps", () => {
    const config = loadRabbitMqConfig({
      RABBITMQ_URL: "amqps://u:p@secure:5671/app",
      RABBITMQ_HOST: "ignored",
    });

    expect(config?.url).toBe("amqps://u:p@secure:5671/app");
  });

  it("refuse un hôte sans identifiants", () => {
    expect(() => loadRabbitMqConfig({ RABBITMQ_HOST: "rabbitmq" })).toThrow(
      RabbitMqConfigError,
    );
  });

  it("refuse une URL invalide ou un mauvais protocole", () => {
    expect(() => loadRabbitMqConfig({ RABBITMQ_URL: "not a url" })).toThrow(
      "not a valid URL",
    );
    expect(() =>
      loadRabbitMqConfig({ RABBITMQ_URL: "http://u:p@host" }),
    ).toThrow("amqp://");
  });

  it("valide RABBITMQ_PREFETCH", () => {
    const base = { RABBITMQ_URL: "amqp://u:p@h" };

    expect(
      loadRabbitMqConfig({ ...base, RABBITMQ_PREFETCH: "25" })?.prefetch,
    ).toBe(25);
    expect(() =>
      loadRabbitMqConfig({ ...base, RABBITMQ_PREFETCH: "0" }),
    ).toThrow("RABBITMQ_PREFETCH");
  });
});
