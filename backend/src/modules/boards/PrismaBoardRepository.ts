import type {
  PrismaClient,
  Board as PrismaBoard,
} from "../../generated/prisma/client.js";
import { Board } from "./Board.js";
import type { BoardRepository } from "./BoardRepository.js";

export class PrismaBoardRepository implements BoardRepository {
  constructor(private readonly prisma: PrismaClient) {}
  private toDomain(prismaBoard: PrismaBoard): Board {
    return new Board(
      prismaBoard.id,
      prismaBoard.name,
      prismaBoard.projectId,
      prismaBoard.createdAt,
    );
  }
  async findbyId(id: string): Promise<Board | null> {
    const board = await this.prisma.board.findUnique({ where: { id } });
    return board ? this.toDomain(board) : null;
  }
  async findByProject(projectId: string): Promise<Board[] | null> {
    const boards = await this.prisma.board.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
    });
    return boards.map((board) => this.toDomain(board));
  }
  async save(board: Board): Promise<void> {
    await this.prisma.board.upsert({
      where: { id: board.id },
      update: {
        name: board.name,
      },
      create: {
        id: board.id,
        name: board.name,
        projectId: board.projectId,
        createdAt: board.createdAt,
      },
    });
  }
  async delete(board: Board): Promise<void> {
    await this.prisma.board.delete({ where: { id: board.id } });
  }
}
