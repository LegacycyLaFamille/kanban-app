import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { ProjectAccessGuard } from "../../../shared/security/ProjectAccessGuard.js";
import { Project } from "../../../modules/projects/Project.js";
import { ProjectMember } from "../../../modules/projects/ProjectMember.js";
import { randomUUID } from "node:crypto";
import type { ProjectRepository } from "../../../modules/projects/ProjectRepository.js";
import type { ProjectMemberRepository } from "../../../modules/projects/ProjectMemberRepository.js";

describe("ProjectAccessGuard", () => {
  let guard: ProjectAccessGuard;
  let mockProjectRepository: { findById: Mock };
  let mockProjectMemberRepository: { findByProjectAndUser: Mock };

  const ownerId = "owner-1";
  const memberId = "member-1";
  const outsiderId = "outsider-1";

  const project = new Project("proj-1", "Project", "", ownerId, new Date());

  beforeEach(() => {
    mockProjectRepository = { findById: vi.fn() };
    mockProjectMemberRepository = { findByProjectAndUser: vi.fn() };

    guard = new ProjectAccessGuard(
      mockProjectRepository as unknown as ProjectRepository,
      mockProjectMemberRepository as unknown as ProjectMemberRepository,
    );
  });

  describe("getAccessRole", () => {
    it("returns 'owner' for the project owner", async () => {
      const role = await guard.getAccessRole(project, ownerId);
      expect(role).toBe("owner");
      expect(
        mockProjectMemberRepository.findByProjectAndUser,
      ).not.toHaveBeenCalled();
    });

    it("returns 'member' for a user with a membership row", async () => {
      mockProjectMemberRepository.findByProjectAndUser.mockResolvedValue(
        new ProjectMember(randomUUID(), project.id, memberId, new Date()),
      );

      const role = await guard.getAccessRole(project, memberId);
      expect(role).toBe("member");
    });

    it("returns null for a user with neither ownership nor membership", async () => {
      mockProjectMemberRepository.findByProjectAndUser.mockResolvedValue(null);

      const role = await guard.getAccessRole(project, outsiderId);
      expect(role).toBeNull();
    });
  });

  describe("assertCanView", () => {
    it("throws 'Not found' when the project does not exist", async () => {
      mockProjectRepository.findById.mockResolvedValue(null);

      await expect(guard.assertCanView("missing", ownerId)).rejects.toThrow(
        "Not found",
      );
    });

    it("allows the owner", async () => {
      mockProjectRepository.findById.mockResolvedValue(project);

      await expect(guard.assertCanView(project.id, ownerId)).resolves.toEqual(
        project,
      );
    });

    it("allows a member", async () => {
      mockProjectRepository.findById.mockResolvedValue(project);
      mockProjectMemberRepository.findByProjectAndUser.mockResolvedValue(
        new ProjectMember(randomUUID(), project.id, memberId, new Date()),
      );

      await expect(guard.assertCanView(project.id, memberId)).resolves.toEqual(
        project,
      );
    });

    it("rejects an outsider with 'Forbidden'", async () => {
      mockProjectRepository.findById.mockResolvedValue(project);
      mockProjectMemberRepository.findByProjectAndUser.mockResolvedValue(null);

      await expect(guard.assertCanView(project.id, outsiderId)).rejects.toThrow(
        "Forbidden",
      );
    });
  });

  describe("assertIsOwner", () => {
    it("throws 'Not found' when the project does not exist", async () => {
      mockProjectRepository.findById.mockResolvedValue(null);

      await expect(guard.assertIsOwner("missing", ownerId)).rejects.toThrow(
        "Not found",
      );
    });

    it("allows the owner", async () => {
      mockProjectRepository.findById.mockResolvedValue(project);

      await expect(guard.assertIsOwner(project.id, ownerId)).resolves.toEqual(
        project,
      );
    });

    it("rejects a member with 'Forbidden'", async () => {
      mockProjectRepository.findById.mockResolvedValue(project);
      mockProjectMemberRepository.findByProjectAndUser.mockResolvedValue(
        new ProjectMember(randomUUID(), project.id, memberId, new Date()),
      );

      await expect(guard.assertIsOwner(project.id, memberId)).rejects.toThrow(
        "Forbidden",
      );
    });

    it("rejects an outsider with 'Forbidden'", async () => {
      mockProjectRepository.findById.mockResolvedValue(project);
      mockProjectMemberRepository.findByProjectAndUser.mockResolvedValue(null);

      await expect(guard.assertIsOwner(project.id, outsiderId)).rejects.toThrow(
        "Forbidden",
      );
    });
  });
});
