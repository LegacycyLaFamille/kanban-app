import type { Request, Response } from "express";
import type { BoardService } from "./BoardService.js";

export class BoardController {
  constructor(private readonly boardService: BoardService) {}

  createBoard = async (
    req: Request<{ projectId: string }, unknown, { name: string }>,
    res: Response,
  ) => {
    try {
      const userId = req.userId!;
      const { projectId } = req.params;
      const { name } = req.body;

      const board = await this.boardService.create(userId, {
        name,
        projectId,
      });

      return res.status(201).json(board);
    } catch (error: unknown) {
      return this.handleServiceError(error, res);
    }
  };

  updateBoard = async (
    req: Request<{ boardId: string }, unknown, { name: string }>,
    res: Response,
  ) => {
    try {
      const userId = req.userId!;
      const { boardId } = req.params;
      const { name } = req.body;

      const updatedBoard = await this.boardService.update(userId, {
        id: boardId,
        name,
      });

      return res.status(200).json(updatedBoard);
    } catch (error: unknown) {
      return this.handleServiceError(error, res);
    }
  };

  deleteBoard = async (req: Request<{ boardId: string }>, res: Response) => {
    try {
      const userId = req.userId!;
      const { boardId } = req.params;

      await this.boardService.delete(userId, boardId);

      return res.status(204).send();
    } catch (error: unknown) {
      return this.handleServiceError(error, res);
    }
  };

  getBoardById = async (req: Request<{ boardId: string }>, res: Response) => {
    try {
      const userId = req.userId!;
      const { boardId } = req.params;

      const board = await this.boardService.getBoard(userId, boardId);

      return res.status(200).json(board);
    } catch (error: unknown) {
      return this.handleServiceError(error, res);
    }
  };

  getBoardsByProject = async (
    req: Request<{ projectId: string }>,
    res: Response,
  ) => {
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
  };

  private handleServiceError(error: unknown, res: Response) {
    if (error instanceof Error) {
      if (error.message.toLowerCase().includes("not found")) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: error.message,
          },
        });
      }

      if (error.message === "Forbidden") {
        return res.status(403).json({
          error: {
            code: "FORBIDDEN",
            message: "You are not authorized to access this resource.",
          },
        });
      }
    }

    console.error("[BoardController Error]", error);

    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred.",
      },
    });
  }
}
