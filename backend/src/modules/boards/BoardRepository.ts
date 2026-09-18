import type { Board } from "./Board.js";

export interface BoardRepository {
  findbyId(id: string): Promise<Board | null>;
  findByProject(projectId: string): Promise<Board[] | null>;
  save(board: Board): Promise<void>;
  delete(board: Board): Promise<void>;
}
