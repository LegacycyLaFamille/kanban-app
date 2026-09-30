import type { Project } from "../../modules/projects/Project.js";
import type { ProjectRepository } from "../../modules/projects/ProjectRepository.js";
import type { ProjectMemberRepository } from "../../modules/projects/ProjectMemberRepository.js";

export type ProjectAccessRole = "owner" | "member";

/**
 * Shared project authorization, reused by the projects and tasks modules so
 * access rules live in one place instead of being duplicated per service.
 *
 * Permission model: the owner has full read/write/delete/membership rights;
 * members have read-only access. Task access always derives from access to
 * the task's parent project.
 */
export class ProjectAccessGuard {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly projectMemberRepository: ProjectMemberRepository,
  ) {}

  async getAccessRole(
    project: Project,
    userId: string,
  ): Promise<ProjectAccessRole | null> {
    if (project.ownerId === userId) return "owner";

    const membership = await this.projectMemberRepository.findByProjectAndUser(
      project.id,
      userId,
    );
    return membership ? "member" : null;
  }

  /** Owner or member: throws "Not found" / "Forbidden" like the rest of the codebase. */
  async assertCanView(projectId: string, userId: string): Promise<Project> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) throw new Error("Not found");

    const role = await this.getAccessRole(project, userId);
    if (!role) throw new Error("Forbidden");

    return project;
  }

  /** Owner only: required for modifying/deleting a project or its tasks, and managing membership. */
  async assertIsOwner(projectId: string, userId: string): Promise<Project> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) throw new Error("Not found");

    const role = await this.getAccessRole(project, userId);
    if (role !== "owner") throw new Error("Forbidden");

    return project;
  }
}
