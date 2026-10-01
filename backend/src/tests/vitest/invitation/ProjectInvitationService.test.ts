import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import {
  InvitationError,
  ProjectInvitationService,
} from "../../../modules/invitations/ProjectInvitationService.js";
import { ProjectInvitation } from "../../../modules/invitations/ProjectInvitation.js";
import type { ProjectInvitationRepository } from "../../../modules/invitations/ProjectInvitationRepository.js";
import { Project } from "../../../modules/projects/Project.js";
import { ProjectMember } from "../../../modules/projects/ProjectMember.js";
import type { ProjectRepository } from "../../../modules/projects/ProjectRepository.js";
import type { ProjectMemberRepository } from "../../../modules/projects/ProjectMemberRepository.js";
import { User } from "../../../modules/users/User.js";
import type { UserRepository } from "../../../modules/users/UserRepository.js";
import { ProjectAccessGuard } from "../../../shared/security/ProjectAccessGuard.js";

describe("ProjectInvitationService", () => {
  const ownerId = "owner-1";
  const inviteeId = "invitee-1";
  const project = new Project("proj-1", "Kanban", "", ownerId, new Date());
  const invitee = new User(inviteeId, "bob@example.com", "Bob", new Date());
  const invitation = new ProjectInvitation(
    "inv-1",
    project.id,
    inviteeId,
    ownerId,
    new Date(),
  );
  const view = {
    id: "inv-1",
    createdAt: invitation.createdAt,
    project: { id: project.id, name: project.name },
    invitee: { id: inviteeId, name: "Bob", email: "bob@example.com" },
    inviter: { id: ownerId, name: "Alice" },
  };

  let service: ProjectInvitationService;
  let invitations: Record<keyof ProjectInvitationRepository, Mock>;
  let members: { findByProjectAndUser: Mock; findByProject: Mock };
  let users: { findByEmail: Mock };
  let projects: { findById: Mock };

  beforeEach(() => {
    invitations = {
      create: vi.fn(),
      findById: vi.fn(),
      findByProjectAndInvitee: vi.fn().mockResolvedValue(null),
      findViewById: vi.fn().mockResolvedValue(view),
      findViewsByProject: vi.fn().mockResolvedValue([view]),
      findViewsByInvitee: vi.fn().mockResolvedValue([view]),
      delete: vi.fn(),
      accept: vi.fn(),
    };
    members = {
      findByProjectAndUser: vi.fn().mockResolvedValue(null),
      findByProject: vi.fn().mockResolvedValue([]),
    };
    users = { findByEmail: vi.fn().mockResolvedValue(invitee) };
    projects = { findById: vi.fn().mockResolvedValue(project) };

    const guard = new ProjectAccessGuard(
      projects as unknown as ProjectRepository,
      members as unknown as ProjectMemberRepository,
    );
    service = new ProjectInvitationService(
      invitations as unknown as ProjectInvitationRepository,
      members as unknown as ProjectMemberRepository,
      users as unknown as UserRepository,
      guard,
    );
  });

  describe("invite", () => {
    it("creates a pending invitation for the user with that email", async () => {
      const result = await service.invite(
        project.id,
        ownerId,
        "bob@example.com",
      );

      expect(invitations.create).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: project.id,
          inviteeId,
          inviterId: ownerId,
        }),
      );
      expect(result).toEqual(view);
    });

    it("rejects a non-owner", async () => {
      await expect(
        service.invite(project.id, "someone-else", "bob@example.com"),
      ).rejects.toThrow("Forbidden");
      expect(invitations.create).not.toHaveBeenCalled();
    });

    it("rejects an unknown email", async () => {
      users.findByEmail.mockResolvedValue(null);

      await expect(
        service.invite(project.id, ownerId, "nobody@example.com"),
      ).rejects.toMatchObject({ code: "USER_NOT_FOUND" });
    });

    it("rejects inviting the owner", async () => {
      users.findByEmail.mockResolvedValue(
        new User(ownerId, "alice@example.com", "Alice", new Date()),
      );

      await expect(
        service.invite(project.id, ownerId, "alice@example.com"),
      ).rejects.toMatchObject({ code: "ALREADY_OWNER" });
    });

    it("rejects a user who is already a member", async () => {
      members.findByProjectAndUser.mockImplementation(
        async (_projectId: string, userId: string) =>
          userId === inviteeId
            ? new ProjectMember("m-1", project.id, inviteeId, new Date())
            : null,
      );

      await expect(
        service.invite(project.id, ownerId, "bob@example.com"),
      ).rejects.toMatchObject({ code: "ALREADY_MEMBER" });
    });

    it("rejects a user who already has a pending invitation", async () => {
      invitations.findByProjectAndInvitee.mockResolvedValue(invitation);

      await expect(
        service.invite(project.id, ownerId, "bob@example.com"),
      ).rejects.toMatchObject({ code: "ALREADY_INVITED" });
    });
  });

  describe("cancel", () => {
    it("deletes an invitation of the project", async () => {
      invitations.findById.mockResolvedValue(invitation);

      await service.cancel(project.id, "inv-1", ownerId);

      expect(invitations.delete).toHaveBeenCalledWith("inv-1");
    });

    it("refuses an invitation belonging to another project", async () => {
      invitations.findById.mockResolvedValue(
        new ProjectInvitation("inv-2", "other", inviteeId, ownerId, new Date()),
      );

      await expect(
        service.cancel(project.id, "inv-2", ownerId),
      ).rejects.toBeInstanceOf(InvitationError);
      expect(invitations.delete).not.toHaveBeenCalled();
    });
  });

  describe("accept", () => {
    it("turns the invitation into a membership", async () => {
      invitations.findById.mockResolvedValue(invitation);

      const result = await service.accept("inv-1", inviteeId);

      expect(invitations.accept).toHaveBeenCalledWith(
        invitation,
        expect.objectContaining({ projectId: project.id, userId: inviteeId }),
      );
      expect(result).toEqual({ projectId: project.id });
    });

    it("only drops the invitation when the user is already a member", async () => {
      invitations.findById.mockResolvedValue(invitation);
      members.findByProjectAndUser.mockResolvedValue(
        new ProjectMember("m-1", project.id, inviteeId, new Date()),
      );

      await service.accept("inv-1", inviteeId);

      expect(invitations.accept).not.toHaveBeenCalled();
      expect(invitations.delete).toHaveBeenCalledWith("inv-1");
    });

    it("hides invitations addressed to someone else", async () => {
      invitations.findById.mockResolvedValue(invitation);

      await expect(service.accept("inv-1", "intruder")).rejects.toMatchObject({
        code: "INVITATION_NOT_FOUND",
      });
      expect(invitations.accept).not.toHaveBeenCalled();
    });
  });

  it("gives the accepted member the role chosen in the invitation", async () => {
    invitations.findById.mockResolvedValue(
      new ProjectInvitation(
        "inv-1",
        project.id,
        inviteeId,
        ownerId,
        new Date(),
        "EDITOR",
      ),
    );

    await service.accept("inv-1", inviteeId);

    expect(invitations.accept).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: inviteeId, role: "EDITOR" }),
    );
  });

  it("stores the chosen role on the invitation", async () => {
    await service.invite(project.id, ownerId, "bob@example.com", "EDITOR");

    expect(invitations.create).toHaveBeenCalledWith(
      expect.objectContaining({ role: "EDITOR" }),
    );
  });

  describe("decline", () => {
    it("deletes the invitation", async () => {
      invitations.findById.mockResolvedValue(invitation);

      await service.decline("inv-1", inviteeId);

      expect(invitations.delete).toHaveBeenCalledWith("inv-1");
    });
  });

  it("lists the invitations received by a user", async () => {
    await expect(service.listForInvitee(inviteeId)).resolves.toEqual([view]);
    expect(invitations.findViewsByInvitee).toHaveBeenCalledWith(inviteeId);
  });
});
