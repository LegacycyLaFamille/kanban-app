import { randomUUID } from "node:crypto";
import { z } from "zod";

export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

// Payloads must survive JSON.stringify/parse unchanged: no Date, undefined,
// class instances or functions. Declare them with `type`, not `interface`,
// so TypeScript can check them against this index signature.
export type JsonObject = { [key: string]: JsonValue };

// Common envelope of every event exchanged through the Event Bus.
export interface DomainEvent<
  TType extends string = string,
  TPayload extends JsonObject = JsonObject,
> {
  // Unique per event, used for idempotent consumers.
  id: string;
  // `<domain>.<action>` (ADR-008), also the RabbitMQ routing key.
  type: TType;
  // Payload schema version of this event type.
  version: number;
  // ISO-8601 UTC timestamp of the business fact, not of the publication.
  occurredAt: string;
  // User who triggered the event, null for system events.
  actorId: string | null;
  payload: TPayload;
}

export const EVENT_TYPE_PATTERN = /^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/;

export class InvalidEventError extends Error {}

export interface CreateEventOptions {
  actorId?: string | null;
  version?: number;
  occurredAt?: Date;
}

export function createEvent<TType extends string, TPayload extends JsonObject>(
  type: TType,
  payload: TPayload,
  {
    actorId = null,
    version = 1,
    occurredAt = new Date(),
  }: CreateEventOptions = {},
): DomainEvent<TType, TPayload> {
  if (!EVENT_TYPE_PATTERN.test(type)) {
    throw new InvalidEventError(
      `Event type "${type}" must follow <domain>.<action>`,
    );
  }
  return {
    id: randomUUID(),
    type,
    version,
    occurredAt: occurredAt.toISOString(),
    actorId,
    payload,
  };
}

const domainEventSchema = z.object({
  id: z.uuid(),
  type: z.string().regex(EVENT_TYPE_PATTERN),
  version: z.number().int().positive(),
  occurredAt: z.iso.datetime(),
  actorId: z.string().nullable(),
  payload: z.record(z.string(), z.unknown()),
});

// Validates an envelope received from the broker. The payload itself is
// trusted to match its type: producers and consumers share the definition.
export function parseDomainEvent(raw: unknown): DomainEvent {
  const result = domainEventSchema.safeParse(raw);
  if (!result.success) {
    throw new InvalidEventError(
      `Invalid event envelope: ${result.error.issues
        .map((issue) => `${issue.path.join(".") || "(root)"} ${issue.message}`)
        .join(", ")}`,
    );
  }
  return result.data as DomainEvent;
}
