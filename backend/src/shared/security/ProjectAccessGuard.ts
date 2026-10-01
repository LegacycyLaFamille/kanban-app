import type { Project } from "../../modules/projects/Project.js";
import type { ProjectRepository } from "../../modules/projects/ProjectRepository.js";
import type { ProjectMemberRepository } from "../../modules/projects/ProjectMemberRepository.js";

export type ProjectAccessRole = "owner" | "member";

// Finer-grained than ProjectAccessRole: members are split by their role.
export type ProjectPermission = "owner" | "editor" | "viewer";

/**
 * Shared project authorization, reused by the projects and tasks modules so
 * access rules live in one place instead of being duplicated per service.
 *
 * Permission model: the owner has full read/write/delete/membership rights;
 * EDITOR members can also manage boards and tasks; VIEWER members have
 * read-only access. Task and board access always derive from access to the
 * parent project.
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

  async getPermission(
    project: Project,
    userId: string,
  ): Promise<ProjectPermission | null> {
    if (project.ownerId === userId) return "owner";

    const membership = await this.projectMemberRepository.findByProjectAndUser(
      project.id,
      userId,
    );
    if (!membership) return null;
    return membership.role === "EDITOR" ? "editor" : "viewer";
  }

  /** Owner or member: throws "Not found" / "Forbidden" like the rest of the codebase. */
  async assertCanView(projectId: string, userId: string): Promise<Project> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) throw new Error("Not found");

    const role = await this.getAccessRole(project, userId);
    if (!role) throw new Error("Forbidden");

    return project;
  }

  /** Owner or EDITOR member: required for managing the project's boards and tasks. */
  async assertCanEdit(projectId: string, userId: string): Promise<Project> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) throw new Error("Not found");

    const permission = await this.getPermission(project, userId);
    if (permission !== "owner" && permission !== "editor") {
      throw new Error("Forbidden");
    }

    return project;
  }

  /** Owner only: required for modifying/deleting a project and managing membership. */
  async assertIsOwner(projectId: string, userId: string): Promise<Project> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) throw new Error("Not found");

    const role = await this.getAccessRole(project, userId);
    if (role !== "owner") throw new Error("Forbidden");

    return project;
  }
}
