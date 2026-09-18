import type { BoardRepository } from "./BoardRepository.js";
import type { ProjectRepository } from "../projects/ProjectRepository.js";
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
    private readonly projectRepository: ProjectRepository,
  ) {}
  async create(userId: string, data: CreateBoardDto): Promise<Board> {
    const boardToCreate = new Board(
      randomUUID(),
      data.name,
      data.projectId,
      new Date(),
    );
    this.checkOwnerShip(userId, data.projectId);
    await this.boardRepository.save(boardToCreate);
    return boardToCreate;
  }
  async getBoard(userid: string, boardId: string): Promise<Board> {
    const board = await this.boardRepository.findbyId(boardId);
    if (!board) {
      throw new Error("Board not found");
    }
    this.checkOwnerShip(userid, board.projectId);
    return board;
  }
  async getProjectBoards(userId: string, projectId: string): Promise<Board[]> {
    this.checkOwnerShip(userId, projectId);
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
    this.checkOwnerShip(userId, oldBoard.projectId);
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
    this.checkOwnerShip(userid, board.projectId);
    await this.boardRepository.delete(board);
  }

  private async checkOwnerShip(
    userId: string,
    projectId: string,
  ): Promise<void> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new Error("Not found");
    }
    if (project.ownerId != userId) {
      throw new Error("Forbidden");
    }
  }
}
