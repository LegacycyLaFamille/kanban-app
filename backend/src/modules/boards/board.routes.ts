import { Router } from "express";
import { prisma } from "../../shared/database/prisma.js";
import { PrismaBoardRepository } from "./PrismaBoardRepository.js";
import { PrismaProjectRepository } from "../projects/PrismaProjectRepository.js";
import { BoardService } from "./BoardService.js";
import { BoardController } from "./BoardController.js";
import { projectRouter } from "../projects/project.routes.js";
import { requireAuth } from "../../shared/security/requireAuth.js";

export const boardRouter = Router();

const boardRepository = new PrismaBoardRepository(prisma);
const projectRepository = new PrismaProjectRepository(prisma);
const boardService = new BoardService(boardRepository, projectRepository);
const boardController = new BoardController(boardService);

projectRouter.post("/boards", requireAuth, boardController.createBoard);

projectRouter.get(
  "/projects/:projectId/boards",
  requireAuth,
  boardController.getBoardsByProject,
);

projectRouter.get(
  "/boards/:boardId",
  requireAuth,
  boardController.getBoardById,
);

projectRouter.patch(
  "/boards/:boardId",
  requireAuth,
  boardController.updateBoard,
);

projectRouter.delete(
  "/boards/:boardId",
  requireAuth,
  boardController.deleteBoard,
);
