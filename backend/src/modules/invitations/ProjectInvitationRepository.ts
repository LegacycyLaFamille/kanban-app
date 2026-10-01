import type { ProjectMember, ProjectRole } from "../projects/ProjectMember.js";
import type { ProjectInvitation } from "./ProjectInvitation.js";

// What the API returns: ids resolved to display names so the frontend needs
// no extra request.
export interface ProjectInvitationView {
  id: string;
  createdAt: Date;
  role: ProjectRole;
  project: { id: string; name: string };
  invitee: { id: string; name: string; email: string };
  inviter: { id: string; name: string };
}

export interface ProjectInvitationRepository {
  create(invitation: ProjectInvitation): Promise<void>;
  findById(id: string): Promise<ProjectInvitation | null>;
  findByProjectAndInvitee(
    projectId: string,
    inviteeId: string,
  ): Promise<ProjectInvitation | null>;
  findViewById(id: string): Promise<ProjectInvitationView | null>;
  // Oldest first.
  findViewsByProject(projectId: string): Promise<ProjectInvitationView[]>;
  // Newest first.
  findViewsByInvitee(inviteeId: string): Promise<ProjectInvitationView[]>;
  delete(id: string): Promise<void>;
  // Atomically creates the membership and deletes the invitation.
  accept(invitation: ProjectInvitation, member: ProjectMember): Promise<void>;
}
