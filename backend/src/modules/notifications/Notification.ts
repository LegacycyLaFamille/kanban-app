export class Notification {
  constructor(
    public readonly id: string,
    // Recipient.
    public readonly userId: string,
    // Source event type, e.g. `task.completed`.
    public readonly type: string,
    // Source event id: (eventId, userId) is unique.
    public readonly eventId: string,
    public readonly actorId: string | null,
    public readonly projectId: string,
    public readonly taskId: string | null,
    public readonly taskTitle: string | null,
    public readonly readAt: Date | null,
    public readonly createdAt: Date,
    // task.updated only: fields that changed.
    public readonly changes: string[] = [],
  ) {}
}
