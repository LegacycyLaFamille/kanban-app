import type { EventBus } from "./EventBus.js";
import { rabbitMq } from "./rabbitmq/index.js";
import { RabbitMqEventBus } from "./rabbitmq/RabbitMqEventBus.js";

// Backend-wide Event Bus. Modules receive it through their constructor and
// only see the EventBus interface.
export const eventBus: EventBus = new RabbitMqEventBus(rabbitMq);
