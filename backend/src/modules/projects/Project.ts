export class Project {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly ownerId: string,
    public readonly createdAt: Date,
  ) {}
}
