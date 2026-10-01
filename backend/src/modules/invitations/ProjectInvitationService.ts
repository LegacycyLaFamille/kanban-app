import { randomUUID } from "node:crypto";
import type { ProjectAccessGuard } from "../../shared/security/ProjectAccessGuard.js";
import { ProjectMember, type ProjectRole } from "../projects/ProjectMember.js";
import type { ProjectMemberRepository } from "../projects/ProjectMemberRepository.js";
import type { UserRepository } from "../users/UserRepository.js";
import { ProjectInvitation } from "./ProjectInvitation.js";
import type {
  ProjectInvitationRepository,
  ProjectInvitationView,
} from "./ProjectInvitationRepository.js";

export type InvitationErrorCode =
  | "USER_NOT_FOUND"
  | "INVITATION_NOT_FOUND"
  | "ALREADY_OWNER"
  | "ALREADY_MEMBER"
  | "ALREADY_INVITED";

export class InvitationError extends Error {
  constructor(
    public readonly code: InvitationErrorCode,
    message: string,
  ) {
    super(message);
  }
}

function invitationNotFound(): InvitationError {
  return new InvitationError(
    "INVITATION_NOT_FOUND",
    "The requested invitation could not be found.",
  );
}

/**
 * Invitation flow for project membership: the owner invites a user by
 * email, the invitee accepts (becomes a member) or declines. Project access
 * errors from ProjectAccessGuard ("Not found" / "Forbidden") pass through.
 */
export class ProjectInvitationService {
  constructor(
    private readonly invitationRepository: ProjectInvitationRepository,
    private readonly projectMemberRepository: ProjectMemberRepository,
    private readonly userRepository: UserRepository,
    private readonly projectAccessGuard: ProjectAccessGuard,
  ) {}

  /** Owner only. `role` is what the invitee gets once they accept. */
  async invite(
    projectId: string,
    userId: string,
    email: string,
    role: ProjectRole = "VIEWER",
  ): Promise<ProjectInvitationView> {
    const project = await this.projectAccessGuard.assertIsOwner(
      projectId,
      userId,
    );

    const invitee = await this.userRepository.findByEmail(email);
    if (!invitee) {
      throw new InvitationError(
        "USER_NOT_FOUND",
        "No user found with this email.",
      );
    }
    if (invitee.id === project.ownerId) {
      throw new InvitationError(
        "ALREADY_OWNER",
        "This user is already the project owner.",
      );
    }
    if (
      await this.projectMemberRepository.findByProjectAndUser(
        projectId,
        invitee.id,
      )
    ) {
      throw new InvitationError(
        "ALREADY_MEMBER",
        "This user is already a project member.",
      );
    }
    if (
      await this.invitationRepository.findByProjectAndInvitee(
        projectId,
        invitee.id,
      )
    ) {
      throw new InvitationError(
        "ALREADY_INVITED",
        "This user has already been invited to the project.",
      );
    }

    const invitation = new ProjectInvitation(
      randomUUID(),
      projectId,
      invitee.id,
      userId,
      new Date(),
      role,
    );
    await this.invitationRepository.create(invitation);

    const view = await this.invitationRepository.findViewById(invitation.id);
    if (!view) throw invitationNotFound();
    return view;
  }

  /** Owner only: pending invitations of the project. */
  async listForProject(
    projectId: string,
    userId: string,
  ): Promise<ProjectInvitationView[]> {
    await this.projectAccessGuard.assertIsOwner(projectId, userId);
    return this.invitationRepository.findViewsByProject(projectId);
  }

  /** Owner only: withdraw a pending invitation. */
  async cancel(
    projectId: string,
    invitationId: string,
    userId: string,
  ): Promise<void> {
    await this.projectAccessGuard.assertIsOwner(projectId, userId);

    const invitation = await this.invitationRepository.findById(invitationId);
    if (!invitation || invitation.projectId !== projectId) {
      throw invitationNotFound();
    }
    await this.invitationRepository.delete(invitation.id);
  }

  /** Invitations received by the authenticated user. */
  listForInvitee(userId: string): Promise<ProjectInvitationView[]> {
    return this.invitationRepository.findViewsByInvitee(userId);
  }

  /** Invitee only: join the project as a member. */
  async accept(
    invitationId: string,
    userId: string,
  ): Promise<{ projectId: string }> {
    const invitation = await this.findOwnInvitation(invitationId, userId);

    const existing = await this.projectMemberRepository.findByProjectAndUser(
      invitation.projectId,
      userId,
    );
    if (existing) {
      // Added through another path in the meantime: nothing left to join.
      await this.invitationRepository.delete(invitation.id);
    } else {
      await this.invitationRepository.accept(
        invitation,
        new ProjectMember(
          randomUUID(),
          invitation.projectId,
          userId,
          new Date(),
          invitation.role,
        ),
      );
    }
    return { projectId: invitation.projectId };
  }

  /** Invitee only. */
  async decline(invitationId: string, userId: string): Promise<void> {
    const invitation = await this.findOwnInvitation(invitationId, userId);
    await this.invitationRepository.delete(invitation.id);
  }

  // An invitation addressed to another user is reported as missing, not
  // forbidden, so ids cannot be probed.
  private async findOwnInvitation(
    invitationId: string,
    userId: string,
  ): Promise<ProjectInvitation> {
    const invitation = await this.invitationRepository.findById(invitationId);
    if (!invitation || invitation.inviteeId !== userId) {
      throw invitationNotFound();
    }
    return invitation;
  }
}
