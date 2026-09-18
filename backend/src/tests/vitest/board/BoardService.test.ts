import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { BoardService } from "../../../modules/boards/BoardService.js";
import { Board } from "../../../modules/boards/Board.js";
import type { BoardRepository } from "../../../modules/boards/BoardRepository.js";
import type { ProjectRepository } from "../../../modules/projects/ProjectRepository.js";
import type { Project } from "../../../modules/projects/Project.js";

describe("BoardService", () => {
  let boardService: BoardService;

  let mockBoardRepository: {
    save: Mock;
    findbyId: Mock;
    findByProject: Mock;
    delete: Mock;
  };

  let mockProjectRepository: {
    findById: Mock;
  };

  const mockUserId = "user-123";
  const mockProjectId = "project-123";
  const mockBoardId = "board-123";

  // Mock partiel du projet suffisant pour passer le checkOwnerShip
  const mockProject = {
    id: mockProjectId,
    ownerId: mockUserId,
  } as unknown as Project;

  const mockBoard = new Board(
    mockBoardId,
    "Mon Board Kanban",
    mockProjectId,
    new Date(),
  );

  beforeEach(() => {
    mockBoardRepository = {
      save: vi.fn(),
      findbyId: vi.fn(),
      findByProject: vi.fn(),
      delete: vi.fn(),
    };

    mockProjectRepository = {
      findById: vi.fn(),
    };

    boardService = new BoardService(
      mockBoardRepository as unknown as BoardRepository,
      mockProjectRepository as unknown as ProjectRepository,
    );
  });

  describe("create", () => {
    it("devrait créer et retourner un board si l'utilisateur est propriétaire du projet", async () => {
      mockProjectRepository.findById.mockResolvedValue(mockProject);

      const dto = { name: "Nouveau Board", projectId: mockProjectId };
      const result = await boardService.create(mockUserId, dto);

      expect(mockProjectRepository.findById).toHaveBeenCalledWith(
        mockProjectId,
      );
      expect(mockBoardRepository.save).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Board);
      expect(result.name).toBe(dto.name);
      expect(result.projectId).toBe(dto.projectId);
    });

    it("devrait throw 'Not found' si le projet n'existe pas", async () => {
      mockProjectRepository.findById.mockResolvedValue(null);

      await expect(
        boardService.create(mockUserId, {
          name: "Test",
          projectId: mockProjectId,
        }),
      ).rejects.toThrow("Not found");
      expect(mockBoardRepository.save).not.toHaveBeenCalled();
    });

    it("devrait throw 'Forbidden' si l'utilisateur n'est pas le propriétaire", async () => {
      const alienProject = { ...mockProject, ownerId: "hacker-999" };
      mockProjectRepository.findById.mockResolvedValue(alienProject);

      await expect(
        boardService.create(mockUserId, {
          name: "Test",
          projectId: mockProjectId,
        }),
      ).rejects.toThrow("Forbidden");
      expect(mockBoardRepository.save).not.toHaveBeenCalled();
    });
  });

  describe("getBoard", () => {
    it("devrait retourner le board si l'utilisateur a les droits", async () => {
      mockBoardRepository.findbyId.mockResolvedValue(mockBoard);
      mockProjectRepository.findById.mockResolvedValue(mockProject);

      const result = await boardService.getBoard(mockUserId, mockBoardId);
      expect(result).toEqual(mockBoard);
    });

    it("devrait throw 'Board not found' si l'ID est invalide", async () => {
      mockBoardRepository.findbyId.mockResolvedValue(null);

      await expect(
        boardService.getBoard(mockUserId, mockBoardId),
      ).rejects.toThrow("Board not found");
    });
  });

  describe("getProjectBoards", () => {
    it("devrait lister les boards du projet", async () => {
      mockProjectRepository.findById.mockResolvedValue(mockProject);
      mockBoardRepository.findByProject.mockResolvedValue([mockBoard]);

      const result = await boardService.getProjectBoards(
        mockUserId,
        mockProjectId,
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockBoard);
    });
  });

  describe("update", () => {
    it("devrait mettre à jour et retourner le board", async () => {
      mockBoardRepository.findbyId.mockResolvedValue(mockBoard);
      mockProjectRepository.findById.mockResolvedValue(mockProject);

      const updateDto = { id: mockBoardId, name: "Board Renommé" };
      const result = await boardService.update(mockUserId, updateDto);

      expect(mockBoardRepository.save).toHaveBeenCalled();
      expect(result.name).toBe("Board Renommé");
      expect(result.id).toBe(mockBoardId);
    });

    it("devrait conserver l'ancien nom si aucun n'est fourni", async () => {
      mockBoardRepository.findbyId.mockResolvedValue(mockBoard);
      mockProjectRepository.findById.mockResolvedValue(mockProject);

      const result = await boardService.update(mockUserId, { id: mockBoardId });
      expect(result.name).toBe(mockBoard.name); // Conserve le nom d'origine
    });
  });

  describe("delete", () => {
    it("devrait supprimer le board", async () => {
      mockBoardRepository.findbyId.mockResolvedValue(mockBoard);
      mockProjectRepository.findById.mockResolvedValue(mockProject);

      await boardService.delete(mockUserId, mockBoardId);
      expect(mockBoardRepository.delete).toHaveBeenCalledWith(mockBoard);
    });
  });
});
