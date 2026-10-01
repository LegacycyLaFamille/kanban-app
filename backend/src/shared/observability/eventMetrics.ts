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

/** Totals since this process started, for the admin system page. */
export interface EventTotals {
  since: string;
  published: Record<PublishOutcome, number>;
  consumed: Record<ConsumeOutcome, number>;
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

// OpenTelemetry counters cannot be read back in-process: these mirror them
// so the backend can report its own figures without querying Prometheus.
const totals: EventTotals = {
  since: new Date().toISOString(),
  published: { success: 0, failure: 0 },
  consumed: { success: 0, retry: 0, dead_letter: 0, unreadable: 0 },
};

export const eventMetrics: EventMetrics = {
  published: (eventType, outcome) => {
    totals.published[outcome] += 1;
    publishedCounter.add(1, { event_type: eventType, outcome });
  },
  consumed: (consumer, eventType, outcome, durationSeconds) => {
    totals.consumed[outcome] += 1;
    const attributes = { consumer, event_type: eventType, outcome };
    consumedCounter.add(1, attributes);
    if (durationSeconds !== undefined) {
      processingDuration.record(durationSeconds, attributes);
    }
  },
};

export function eventTotals(): EventTotals {
  return {
    since: totals.since,
    published: { ...totals.published },
    consumed: { ...totals.consumed },
  };
}
