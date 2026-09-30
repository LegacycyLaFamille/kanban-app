export class ProjectMember {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public readonly userId: string,
    public readonly createdAt: Date,
  ) {}
}
