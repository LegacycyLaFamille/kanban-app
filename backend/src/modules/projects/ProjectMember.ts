// Mirrors prisma/schema.prisma's ProjectRole enum: VIEWER reads the project,
// EDITOR also manages its boards and tasks.
export type ProjectRole = "VIEWER" | "EDITOR";

export const PROJECT_ROLES = ["VIEWER", "EDITOR"] as const;

export class ProjectMember {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public readonly userId: string,
    public readonly createdAt: Date,
    public readonly role: ProjectRole = "VIEWER",
  ) {}
}
