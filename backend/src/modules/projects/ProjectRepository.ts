import type { Project } from "./Project.js";

export interface ProjectRepository {
  findById(id: string): Promise<Project | null>;
  findByUser(userID: string): Promise<Project[] | null>;
  save(project: Project): Promise<void>;
}
