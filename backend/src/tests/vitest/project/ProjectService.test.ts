import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { ProjectService } from "../../../modules/projects/ProjectService.js";
import { Project } from "../../../modules/projects/Project.js";
import { ProjectMember } from "../../../modules/projects/ProjectMember.js";
import { ProjectAccessGuard } from "../../../shared/security/ProjectAccessGuard.js";
import { User } from "../../../modules/users/User.js";
import { randomUUID } from "node:crypto";
import type { ProjectRepository } from "../../../modules/projects/ProjectRepository.js";
import type { ProjectMemberRepository } from "../../../modules/projects/ProjectMemberRepository.js";
import type { UserRepository } from "../../../modules/users/UserRepository.js";

describe("ProjectService", () => {
  let projectService: ProjectService;
  let mockProjectRepository: {
    save: Mock;
    findById: Mock;
    findByUser: Mock;
    delete: Mock;
  };
  let mockProjectMemberRepository: {
    findByProjectAndUser: Mock;
    findByProject: Mock;
    findByUser: Mock;
    add: Mock;
    remove: Mock;
  };
  let mockUserRepository: {
    findByEmail: Mock;
  };

  const ownerId = "owner-1";
  const memberId = "member-1";
  const outsiderId = "outsider-1";

  const project = new Project(
    "proj-1",
    "My Project",
    "descri",
    ownerId,
    new Date(),
  );

  beforeEach(() => {
    mockProjectRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      findByUser: vi.fn(),
      delete: vi.fn(),
    };
    mockProjectMemberRepository = {
      findByProjectAndUser: vi.fn(),
      findByProject: vi.fn(),
      findByUser: vi.fn(),
      add: vi.fn(),
      remove: vi.fn(),
    };
    mockUserRepository = {
      findByEmail: vi.fn(),
    };

    const projectAccessGuard = new ProjectAccessGuard(
      mockProjectRepository as unknown as ProjectRepository,
      mockProjectMemberRepository as unknown as ProjectMemberRepository,
    );

    projectService = new ProjectService(
      mockProjectRepository as unknown as ProjectRepository,
      mockProjectMemberRepository as unknown as ProjectMemberRepository,
      mockUserRepository as unknown as UserRepository,
      projectAccessGuard,
    );
  });

  describe("create", () => {
    it("devrait créer et retourner un projet", async () => {
      const dto = { name: "Kanban Board", description: "" };
      const expectedProject = new Project(
        randomUUID(),
        dto.name,
        "",
        "user-1",
        new Date(),
      );
      mockProjectRepository.save.mockResolvedValue(expectedProject);
      mockProjectRepository.findById.mockResolvedValue(expectedProject);

      const result = await projectService.create("user-1", dto);

      expect(mockProjectRepository.save).toHaveBeenCalledTimes(1);
      expect(result.name).toBe("Kanban Board");
    });
  });

  describe("readAll", () => {
    it("merges owned projects and projects the user is a member of, without duplicates", async () => {
      const memberProject = new Project(
        "proj-2",
        "Shared Project",
        "",
        "someone-else",
        new Date(),
      );
      mockProjectRepository.findByUser.mockResolvedValue([project]);
      mockProjectMemberRepository.findByUser.mockResolvedValue([
        new ProjectMember(randomUUID(), memberProject.id, ownerId, new Date()),
      ]);
      mockProjectRepository.findById.mockResolvedValue(memberProject);

      const result = await projectService.readAll(ownerId);

      expect(result).toHaveLength(2);
      expect(result.map((p) => p.id)).toEqual(
        expect.arrayContaining([project.id, memberProject.id]),
      );
    });
  });

  describe("readSingle", () => {
    it("devrait lever une erreur 404 Not found si le projet n'existe pas", async () => {
      mockProjectRepository.findById.mockResolvedValue(null);

      await expect(
        projectService.readSingle("proj-1", "user-1"),
      ).rejects.toThrow("Not found");
    });

    it("devrait lever une erreur 403 Forbidden si l'utilisateur n'est ni propriétaire ni membre", async () => {
      mockProjectRepository.findById.mockResolvedValue(project);
      mockProjectMemberRepository.findByProjectAndUser.mockResolvedValue(null);

      await expect(
        projectService.readSingle("proj-1", outsiderId),
      ).rejects.toThrow("Forbidden");
    });

    it("devrait retourner le projet si l'utilisateur est le propriétaire", async () => {
      mockProjectRepository.findById.mockResolvedValue(project);

      const result = await projectService.readSingle("proj-1", ownerId);
      expect(result.ownerId).toBe(ownerId);
    });

    it("returns the project when the user is a member", async () => {
      mockProjectRepository.findById.mockResolvedValue(project);
      mockProjectMemberRepository.findByProjectAndUser.mockResolvedValue(
        new ProjectMember(randomUUID(), project.id, memberId, new Date()),
      );

      const result = await projectService.readSingle("proj-1", memberId);
      expect(result.id).toBe(project.id);
    });
  });

  describe("update", () => {
    it("allows the owner to update the project", async () => {
      mockProjectRepository.findById.mockResolvedValue(project);

      const result = await projectService.update("proj-1", ownerId, {
        name: "Renamed",
      });

      expect(mockProjectRepository.save).toHaveBeenCalled();
      expect(result.name).toBe("Renamed");
    });

    it("rejects an update from a member (read-only access)", async () => {
      mockProjectRepository.findById.mockResolvedValue(project);
      mockProjectMemberRepository.findByProjectAndUser.mockResolvedValue(
        new ProjectMember(randomUUID(), project.id, memberId, new Date()),
      );

      await expect(
        projectService.update("proj-1", memberId, { name: "Renamed" }),
      ).rejects.toThrow("Forbidden");
      expect(mockProjectRepository.save).not.toHaveBeenCalled();
    });

    it("rejects an update from a non-member", async () => {
      mockProjectRepository.findById.mockResolvedValue(project);
      mockProjectMemberRepository.findByProjectAndUser.mockResolvedValue(null);

      await expect(
        projectService.update("proj-1", outsiderId, { name: "Renamed" }),
      ).rejects.toThrow("Forbidden");
    });
  });

  describe("delete", () => {
    it("allows the owner to delete the project", async () => {
      mockProjectRepository.findById.mockResolvedValue(project);

      await projectService.delete("proj-1", ownerId);

      expect(mockProjectRepository.delete).toHaveBeenCalledWith(project);
    });

    it("rejects deletion from a member", async () => {
      mockProjectRepository.findById.mockResolvedValue(project);
      mockProjectMemberRepository.findByProjectAndUser.mockResolvedValue(
        new ProjectMember(randomUUID(), project.id, memberId, new Date()),
      );

      await expect(projectService.delete("proj-1", memberId)).rejects.toThrow(
        "Forbidden",
      );
      expect(mockProjectRepository.delete).not.toHaveBeenCalled();
    });

    it("rejects deletion from a non-member", async () => {
      mockProjectRepository.findById.mockResolvedValue(project);
      mockProjectMemberRepository.findByProjectAndUser.mockResolvedValue(null);

      await expect(projectService.delete("proj-1", outsiderId)).rejects.toThrow(
        "Forbidden",
      );
    });
  });

  describe("listMembers", () => {
    it("allows the owner and members to list members", async () => {
      mockProjectRepository.findById.mockResolvedValue(project);
      mockProjectMemberRepository.findByProject.mockResolvedValue([]);

      await expect(
        projectService.listMembers("proj-1", ownerId),
      ).resolves.toEqual([]);
    });

    it("rejects listing members for a non-member", async () => {
      mockProjectRepository.findById.mockResolvedValue(project);
      mockProjectMemberRepository.findByProjectAndUser.mockResolvedValue(null);

      await expect(
        projectService.listMembers("proj-1", outsiderId),
      ).rejects.toThrow("Forbidden");
    });
  });

  describe("addMember", () => {
    it("allows the owner to add a member by email", async () => {
      mockProjectRepository.findById.mockResolvedValue(project);
      mockUserRepository.findByEmail.mockResolvedValue(
        User.create("member@example.com", "Member", memberId),
      );
      mockProjectMemberRepository.findByProjectAndUser.mockResolvedValue(null);

      const result = await projectService.addMember(
        "proj-1",
        ownerId,
        "member@example.com",
      );

      expect(result.userId).toBe(memberId);
      expect(mockProjectMemberRepository.add).toHaveBeenCalledTimes(1);
    });

    it("rejects a non-owner adding a member", async () => {
      mockProjectRepository.findById.mockResolvedValue(project);
      mockProjectMemberRepository.findByProjectAndUser.mockResolvedValue(
        new ProjectMember(randomUUID(), project.id, memberId, new Date()),
      );

      await expect(
        projectService.addMember("proj-1", memberId, "someone@example.com"),
      ).rejects.toThrow("Forbidden");
      expect(mockProjectMemberRepository.add).not.toHaveBeenCalled();
    });

    it("rejects adding a user who is already the owner", async () => {
      mockProjectRepository.findById.mockResolvedValue(project);
      mockUserRepository.findByEmail.mockResolvedValue(
        User.create("owner@example.com", "Owner", ownerId),
      );

      await expect(
        projectService.addMember("proj-1", ownerId, "owner@example.com"),
      ).rejects.toThrow("User is already the project owner");
    });

    it("rejects adding a user who is already a member", async () => {
      mockProjectRepository.findById.mockResolvedValue(project);
      mockUserRepository.findByEmail.mockResolvedValue(
        User.create("member@example.com", "Member", memberId),
      );
      mockProjectMemberRepository.findByProjectAndUser.mockResolvedValue(
        new ProjectMember(randomUUID(), project.id, memberId, new Date()),
      );

      await expect(
        projectService.addMember("proj-1", ownerId, "member@example.com"),
      ).rejects.toThrow("User is already a project member");
    });
  });

  describe("removeMember", () => {
    it("allows the owner to remove a member", async () => {
      mockProjectRepository.findById.mockResolvedValue(project);

      await projectService.removeMember("proj-1", ownerId, memberId);

      expect(mockProjectMemberRepository.remove).toHaveBeenCalledWith(
        "proj-1",
        memberId,
      );
    });

    it("rejects a non-owner removing a member", async () => {
      mockProjectRepository.findById.mockResolvedValue(project);
      mockProjectMemberRepository.findByProjectAndUser.mockResolvedValue(
        new ProjectMember(randomUUID(), project.id, memberId, new Date()),
      );

      await expect(
        projectService.removeMember("proj-1", memberId, outsiderId),
      ).rejects.toThrow("Forbidden");
      expect(mockProjectMemberRepository.remove).not.toHaveBeenCalled();
    });
  });
});
