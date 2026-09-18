import type { BoardService } from "./BoardService.js";
import type { Request, Response } from "express";

export class BoardController {
  constructor(private readonly boardService: BoardService) {}

  async createBoard(req: Request, res: Response) {
    try {
      const userId = req.userId!;
      const boardData = req.body;
      const board = await this.boardService.create(userId, boardData);
      return res.status(201).json(board);
    } catch (error: unknown) {
      return this.handleServiceError(error, res);
    }
  }

  async updateBoard(req: Request<{ boardId: string }>, res: Response) {
    try {
      const userId = req.userId!;
      const updateData = req.body;
      const updatedBoard = await this.boardService.update(userId, updateData);

      return res.status(200).json(updatedBoard);
    } catch (error: unknown) {
      return this.handleServiceError(error, res);
    }
  }

  async deleteBoard(req: Request<{ boardId: string }>, res: Response) {
    try {
      const userId = req.userId!;
      const { boardId } = req.params;
      await this.boardService.delete(userId, boardId);
      return res.status(204).send();
    } catch (error: unknown) {
      this.handleServiceError(error, res);
    }
  }

  async getBoardById(req: Request<{ boardId: string }>, res: Response) {
    try {
      const userId = req.userId!;
      const { boardId } = req.params;
      const board = await this.boardService.getBoard(userId, boardId);

      return res.status(200).json(board);
    } catch (error: unknown) {
      return this.handleServiceError(error, res);
    }
  }

  async getBoardsByProject(req: Request<{ projectId: string }>, res: Response) {
    try {
      const userId = req.userId!;
      const { projectId } = req.params;
      const boards = await this.boardService.getProjectBoards(
        userId,
        projectId,
      );

      return res.status(200).json(boards);
    } catch (error: unknown) {
      return this.handleServiceError(error, res);
    }
  }

  private handleServiceError(error: unknown, res: Response) {
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === "Forbidden") {
        return res
          .status(403)
          .json({ error: "You are not authorized to access this resource." });
      }
    }
    console.error("[BoardController Error]", error);
    return res.status(500).json({ error: "An unexpected error occurred." });
  }
}
