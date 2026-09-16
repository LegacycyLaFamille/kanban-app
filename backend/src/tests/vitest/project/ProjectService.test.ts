import { describe, it, expect, beforeEach, vi, type Mock } from "vitest"; // ou 'jest'
import { ProjectService } from "../../../modules/projects/ProjectService.js";
import { Project } from "../../../modules/projects/Project.js";
import { randomUUID } from "node:crypto";
import type { ProjectRepository } from "../../../modules/projects/ProjectRepository.js";
describe("ProjectService", () => {
  let projectService: ProjectService;
  let mockProjectRepository: {
    save: Mock;
    findById: Mock;
    findByUser: Mock;
    delete: Mock;
  };

  beforeEach(() => {
    mockProjectRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      findByUser: vi.fn(),
      delete: vi.fn(),
    };
    projectService = new ProjectService(
      mockProjectRepository as ProjectRepository,
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

  describe("readSingle", () => {
    it("devrait lever une erreur 404 Not found si le projet n'existe pas", async () => {
      mockProjectRepository.findById.mockResolvedValue(null);

      await expect(
        projectService.readSingle("proj-1", "user-1"),
      ).rejects.toThrow("Not found");
    });

    it("devrait lever une erreur 403 Forbidden si l'utilisateur n'est pas le propriétaire", async () => {
      mockProjectRepository.findById.mockResolvedValue(
        new Project(
          "proj-1",
          "Secret",
          "This is a secret project",
          "hacker-1",
          new Date(),
        ),
      );

      await expect(
        projectService.readSingle("proj-1", "user-1"),
      ).rejects.toThrow("Forbidden");
    });

    it("devrait retourner le projet si l'utilisateur est le propriétaire", async () => {
      const fakeProject = new Project(
        "proj-1",
        "My Project",
        "descri",
        "user-1",
        new Date(),
      );
      mockProjectRepository.findById.mockResolvedValue(fakeProject);

      const result = await projectService.readSingle("proj-1", "user-1");
      expect(result.ownerId).toBe("user-1");
    });
  });
});
