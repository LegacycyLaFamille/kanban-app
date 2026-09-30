import type { Channel, Options } from "amqplib";

// Event names follow `<domain>.<action>` (ADR-008) and are used as routing
// keys on a single topic exchange, e.g. `task.created`.
export const EVENTS_EXCHANGE = "kanban.events";
export const DEAD_LETTER_EXCHANGE = "kanban.events.dlx";
export const DEAD_LETTER_QUEUE = "kanban.events.dead-letter";

export interface ExchangeDefinition {
  name: string;
  type: "topic" | "direct" | "fanout";
}

export interface QueueDefinition {
  name: string;
  // Routing keys bound on `exchange`, e.g. ["task.created", "task.*"].
  bindings: string[];
  exchange: string;
  // Rejected or expired messages go to the dead-letter exchange.
  deadLetter: boolean;
}

export interface Topology {
  exchanges: ExchangeDefinition[];
  queues: QueueDefinition[];
}

// Base topology declared on every (re)connection. Modules add their own
// queues (e.g. the notifications consumer) with `withQueues`.
export const defaultTopology: Topology = {
  exchanges: [
    { name: EVENTS_EXCHANGE, type: "topic" },
    { name: DEAD_LETTER_EXCHANGE, type: "topic" },
  ],
  queues: [
    {
      name: DEAD_LETTER_QUEUE,
      exchange: DEAD_LETTER_EXCHANGE,
      bindings: ["#"],
      deadLetter: false,
    },
  ],
};

export function withQueues(
  topology: Topology,
  ...queues: QueueDefinition[]
): Topology {
  return { ...topology, queues: [...topology.queues, ...queues] };
}

// Idempotent: asserting an existing exchange/queue with the same options is
// a no-op in RabbitMQ, so this runs safely after every reconnection.
export async function declareTopology(
  channel: Channel,
  topology: Topology,
): Promise<void> {
  for (const exchange of topology.exchanges) {
    await channel.assertExchange(exchange.name, exchange.type, {
      durable: true,
    });
  }

  for (const queue of topology.queues) {
    const options: Options.AssertQueue = { durable: true };
    if (queue.deadLetter) options.deadLetterExchange = DEAD_LETTER_EXCHANGE;

    await channel.assertQueue(queue.name, options);
    for (const routingKey of queue.bindings) {
      await channel.bindQueue(queue.name, queue.exchange, routingKey);
    }
  }
}
