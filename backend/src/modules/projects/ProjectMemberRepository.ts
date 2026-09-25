import type { ProjectMember } from "./ProjectMember.js";

export interface ProjectMemberRepository {
  findByProjectAndUser(
    projectId: string,
    userId: string,
  ): Promise<ProjectMember | null>;
  findByProject(projectId: string): Promise<ProjectMember[]>;
  findByUser(userId: string): Promise<ProjectMember[]>;
  add(member: ProjectMember): Promise<void>;
  remove(projectId: string, userId: string): Promise<void>;
}
