import { loadRabbitMqConfig } from "../../config/rabbitmq.config.js";
import { RabbitMqConnection } from "./RabbitMqConnection.js";
import { defaultTopology } from "./topology.js";

// Backend-wide connection. Invalid configuration fails fast at import time,
// a missing one only disables the broker (see loadRabbitMqConfig).
export const rabbitMq = new RabbitMqConnection(loadRabbitMqConfig(), {
  topology: defaultTopology,
});
