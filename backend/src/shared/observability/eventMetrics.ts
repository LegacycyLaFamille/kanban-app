import { metrics } from "@opentelemetry/api";

export type PublishOutcome = "success" | "failure";
export type ConsumeOutcome = "success" | "retry" | "dead_letter" | "unreadable";

export interface EventMetrics {
  published(eventType: string, outcome: PublishOutcome): void;
  consumed(
    consumer: string,
    eventType: string,
    outcome: ConsumeOutcome,
    durationSeconds?: number,
  ): void;
}

const meter = metrics.getMeter("kanban-backend");

const publishedCounter = meter.createCounter("kanban.events.published", {
  description: "Events handed to the broker",
});
const consumedCounter = meter.createCounter("kanban.events.consumed", {
  description: "Events handled by a consumer, by outcome",
});
const processingDuration = meter.createHistogram(
  "kanban.events.processing.duration",
  { unit: "s", description: "Duration of an event handler" },
);

export const eventMetrics: EventMetrics = {
  published: (eventType, outcome) =>
    publishedCounter.add(1, { event_type: eventType, outcome }),
  consumed: (consumer, eventType, outcome, durationSeconds) => {
    const attributes = { consumer, event_type: eventType, outcome };
    consumedCounter.add(1, attributes);
    if (durationSeconds !== undefined) {
      processingDuration.record(durationSeconds, attributes);
    }
  },
};
