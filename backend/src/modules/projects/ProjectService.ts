import type { ProjectRepository } from "./ProjectRepository.js";
import { Project } from "./Project.js";
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
  constructor(private readonly projectRepository: ProjectRepository) {}

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

  async readAll(userId: string): Promise<Project[]> {
    const projects = await this.projectRepository.findByUser(userId);
    return projects || [];
  }

  async readSingle(projectId: string, userId: string): Promise<Project> {
    const project = await this.projectRepository.findById(projectId);

    if (!project) throw new Error("Not found");
    if (project.ownerId !== userId) throw new Error("Forbidden");

    return project;
  }

  async update(
    projectId: string,
    userId: string,
    data: UpdateProjectDto,
  ): Promise<Project> {
    const project = await this.projectRepository.findById(projectId);

    if (!project) throw new Error("Not found");
    if (project.ownerId !== userId) throw new Error("Forbidden");

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

  async delete(projectId: string, userId: string): Promise<void> {
    const project = await this.projectRepository.findById(projectId);

    if (!project) throw new Error("Not found");
    if (project.ownerId !== userId) throw new Error("Forbidden");

    await this.projectRepository.delete(project);
  }
}
