import type { ProjectRole } from "../projects/ProjectMember.js";

export class ProjectInvitation {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    // User invited to join the project as a member.
    public readonly inviteeId: string,
    // Project owner who sent the invitation.
    public readonly inviterId: string,
    public readonly createdAt: Date,
    // Role the invitee gets once the invitation is accepted.
    public readonly role: ProjectRole = "VIEWER",
  ) {}
}
