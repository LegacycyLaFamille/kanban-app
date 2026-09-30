import type { ProjectRepository } from "./ProjectRepository.js";
import type { ProjectMemberRepository } from "./ProjectMemberRepository.js";
import type { UserRepository } from "../users/UserRepository.js";
import { Project } from "./Project.js";
import { ProjectMember } from "./ProjectMember.js";
import { ProjectAccessGuard } from "../../shared/security/ProjectAccessGuard.js";
import { randomUUID } from "node:crypto";

export interface CreateProjectDto {
  name: string;
  description: string;
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
}

export class ProjectService {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly projectMemberRepository: ProjectMemberRepository,
    private readonly userRepository: UserRepository,
    private readonly projectAccessGuard: ProjectAccessGuard,
  ) {}

  async create(userId: string, data: CreateProjectDto): Promise<Project> {
    const projectToCreate = new Project(
      randomUUID(),
      data.name,
      data.description,
      userId,
      new Date(),
    );
    await this.projectRepository.save(projectToCreate);
    const savedProject = await this.projectRepository.findById(
      projectToCreate.id,
    );
    if (!savedProject) throw new Error("Project not created");
    return savedProject;
  }

  /** Projects the user owns or is a member of. */
  async readAll(userId: string): Promise<Project[]> {
    const owned = (await this.projectRepository.findByUser(userId)) ?? [];
    const memberships = await this.projectMemberRepository.findByUser(userId);

    const memberProjects = await Promise.all(
      memberships.map((membership) =>
        this.projectRepository.findById(membership.projectId),
      ),
    );

    const seen = new Set(owned.map((project) => project.id));
    const merged = [...owned];
    for (const project of memberProjects) {
      if (project && !seen.has(project.id)) {
        seen.add(project.id);
        merged.push(project);
      }
    }
    return merged;
  }

  /** Owner or member. */
  async readSingle(projectId: string, userId: string): Promise<Project> {
    return this.projectAccessGuard.assertCanView(projectId, userId);
  }

  /** Owner only. */
  async update(
    projectId: string,
    userId: string,
    data: UpdateProjectDto,
  ): Promise<Project> {
    const project = await this.projectAccessGuard.assertIsOwner(
      projectId,
      userId,
    );

    const updatedProject = new Project(
      project.id,
      data.name ?? project.name,
      data.description ?? project.description,
      project.ownerId,
      project.createdAt,
    );

    await this.projectRepository.save(updatedProject);
    return updatedProject;
  }

  /** Owner only. */
  async delete(projectId: string, userId: string): Promise<void> {
    const project = await this.projectAccessGuard.assertIsOwner(
      projectId,
      userId,
    );
    await this.projectRepository.delete(project);
  }

  /** Owner or member: list of member records (does not include the owner). */
  async listMembers(
    projectId: string,
    userId: string,
  ): Promise<ProjectMember[]> {
    await this.projectAccessGuard.assertCanView(projectId, userId);
    return this.projectMemberRepository.findByProject(projectId);
  }

  /** Owner only: grant another user read-only access to the project. */
  async addMember(
    projectId: string,
    userId: string,
    memberEmail: string,
  ): Promise<ProjectMember> {
    const project = await this.projectAccessGuard.assertIsOwner(
      projectId,
      userId,
    );

    const userToAdd = await this.userRepository.findByEmail(memberEmail);
    if (!userToAdd) throw new Error("Not found");
    if (userToAdd.id === project.ownerId) {
      throw new Error("User is already the project owner");
    }

    const existing = await this.projectMemberRepository.findByProjectAndUser(
      projectId,
      userToAdd.id,
    );
    if (existing) throw new Error("User is already a project member");

    const member = new ProjectMember(
      randomUUID(),
      projectId,
      userToAdd.id,
      new Date(),
    );
    await this.projectMemberRepository.add(member);
    return member;
  }

  /** Owner only: revoke a member's access to the project. */
  async removeMember(
    projectId: string,
    userId: string,
    memberUserId: string,
  ): Promise<void> {
    await this.projectAccessGuard.assertIsOwner(projectId, userId);
    await this.projectMemberRepository.remove(projectId, memberUserId);
  }
}
