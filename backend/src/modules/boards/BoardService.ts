import type { BoardRepository } from "./BoardRepository.js";
import type { ProjectAccessGuard } from "../../shared/security/ProjectAccessGuard.js";
import { Board } from "./Board.js";
import { randomUUID } from "crypto";

export interface CreateBoardDto {
  name: string;
  projectId: string;
}

export interface UpdateBoardDto {
  id: string;
  name?: string;
}
export class BoardService {
  constructor(
    private readonly boardRepository: BoardRepository,
    private readonly projectAccessGuard: ProjectAccessGuard,
  ) {}

  // Reads: owner or any member. Writes: owner or EDITOR member.
  async create(userId: string, data: CreateBoardDto): Promise<Board> {
    const boardToCreate = new Board(
      randomUUID(),
      data.name,
      data.projectId,
      new Date(),
    );
    await this.projectAccessGuard.assertCanEdit(data.projectId, userId);
    await this.boardRepository.save(boardToCreate);
    return boardToCreate;
  }
  async getBoard(userid: string, boardId: string): Promise<Board> {
    const board = await this.boardRepository.findbyId(boardId);
    if (!board) {
      throw new Error("Board not found");
    }
    await this.projectAccessGuard.assertCanView(board.projectId, userid);
    return board;
  }
  async getProjectBoards(userId: string, projectId: string): Promise<Board[]> {
    await this.projectAccessGuard.assertCanView(projectId, userId);
    const boards = await this.boardRepository.findByProject(projectId);
    if (!boards) {
      throw new Error("Project Not found");
    }
    return boards;
  }
  async update(userId: string, data: UpdateBoardDto) {
    const oldBoard = await this.boardRepository.findbyId(data.id);
    if (!oldBoard) {
      throw new Error("Board not found");
    }
    await this.projectAccessGuard.assertCanEdit(oldBoard.projectId, userId);
    const newBoard = new Board(
      data.id,
      data.name ?? oldBoard.name,
      oldBoard.projectId,
      oldBoard.createdAt,
    );
    await this.boardRepository.save(newBoard);
    return newBoard;
  }

  async delete(userid: string, boardId: string): Promise<void> {
    const board = await this.boardRepository.findbyId(boardId);
    if (!board) {
      throw new Error("Board not found");
    }
    await this.projectAccessGuard.assertCanEdit(board.projectId, userid);
    await this.boardRepository.delete(board);
  }
}
