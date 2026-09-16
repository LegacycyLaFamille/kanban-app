# ADR-008 — RabbitMQ for Event-Driven Workflows

## Status

Accepted

## Date

2026-09-14

## Context

The target application requires at least one complete and demonstrable event-driven workflow.

Notifications and similar side effects should not force the originating business operation to directly execute all downstream behaviour.

The architecture should demonstrate asynchronous messaging without introducing microservices.

## Decision

RabbitMQ will be used as the message broker for event-driven workflows.

The backend remains a modular monolith.

Business services publish domain/application events through an event bus abstraction.

Example workflow:

`Task created -> publish task.created -> RabbitMQ -> Notification consumer -> persist notification`

Event naming follows:

`<domain>.<action>`

Example:

`task.created`

The design should support acknowledgements, retries, logging, failure handling, and idempotent consumers where required.

## Alternatives Considered

### Redis Streams

Considered, but RabbitMQ was selected because exchanges, queues, acknowledgements, retries, and dead-letter patterns make the messaging model explicit and easy to demonstrate.

### In-process event emitter only

Rejected because it would not provide the required broker-backed asynchronous workflow or realistic failure/retry behaviour.

### Microservices

Rejected because messaging does not require independently deployed services for the current scope.

## Consequences

### Positive

- Clear asynchronous workflow.
- Decouples side effects from the originating request.
- Supports acknowledgements, retries, and dead-letter strategies.
- Satisfies the event-driven requirement without microservices.

### Negative / Trade-offs

- Adds infrastructure to local and deployed environments.
- Requires failure handling and observability.
- Consumers must account for duplicate delivery.

## Implementation Notes

Consumers should be designed to be idempotent when duplicate delivery can occur.

RabbitMQ credentials and URLs must be supplied through environment configuration.

## Related Documentation

- `docs/architecture/BACKEND_MIGRATION.md`
- `docs/standards/TESTING_CONVENTIONS.md`

## Supersedes

None

## Superseded By

None
