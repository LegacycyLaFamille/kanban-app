export class Board {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly projectId: string,
    public readonly createdAt: Date,
  ) {}
}
