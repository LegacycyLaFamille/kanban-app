export class Task {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly description: string,
    public readonly projectId: string,
    public readonly status: string,
    public readonly priority: string,
    public readonly deadline: Date | null,
    public readonly createdAt: Date,
    public readonly boardId: string | null,
  ) {}
}
