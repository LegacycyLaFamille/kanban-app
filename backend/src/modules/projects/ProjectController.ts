import type { Request, Response } from "express";
import { ProjectService } from "./ProjectService.js";

export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  async createProject(req: Request, res: Response) {
    try {
      const userId = req.userId!;
      const projectData = req.body;

      const project = await this.projectService.create(userId, projectData);
      return res.status(201).json(project);
    } catch (error: unknown) {
      return this.handleServiceError(error, res);
    }
  }

  async getProjects(req: Request, res: Response) {
    try {
      const userId = req.userId!;
      const projects = await this.projectService.readAll(userId);
      return res.status(200).json(projects);
    } catch (error: unknown) {
      return this.handleServiceError(error, res);
    }
  }

  async getProjectById(req: Request<{ projectId: string }>, res: Response) {
    try {
      const { projectId } = req.params;
      const userId = req.userId!;

      const project = await this.projectService.readSingle(projectId, userId);
      return res.status(200).json(project);
    } catch (error: unknown) {
      return this.handleServiceError(error, res);
    }
  }

  async updateProject(req: Request<{ projectId: string }>, res: Response) {
    try {
      const { projectId } = req.params;
      const userId = req.userId!;
      const updateData = req.body;

      const updatedProject = await this.projectService.update(
        projectId,
        userId,
        updateData,
      );
      return res.status(200).json(updatedProject);
    } catch (error: unknown) {
      return this.handleServiceError(error, res);
    }
  }

  async deleteProject(req: Request<{ projectId: string }>, res: Response) {
    try {
      const { projectId } = req.params;
      const userId = req.userId!;

      await this.projectService.delete(projectId, userId);
      return res.status(204).send();
    } catch (error: unknown) {
      return this.handleServiceError(error, res);
    }
  }

  async getMembers(req: Request<{ projectId: string }>, res: Response) {
    try {
      const { projectId } = req.params;
      const userId = req.userId!;

      const members = await this.projectService.listMembers(projectId, userId);
      return res.status(200).json(members);
    } catch (error: unknown) {
      return this.handleServiceError(error, res);
    }
  }

  async addMember(req: Request<{ projectId: string }>, res: Response) {
    try {
      const { projectId } = req.params;
      const userId = req.userId!;
      const { email } = req.body;

      const member = await this.projectService.addMember(
        projectId,
        userId,
        email,
      );
      return res.status(201).json(member);
    } catch (error: unknown) {
      return this.handleServiceError(error, res);
    }
  }

  async removeMember(
    req: Request<{ projectId: string; memberUserId: string }>,
    res: Response,
  ) {
    try {
      const { projectId, memberUserId } = req.params;
      const userId = req.userId!;

      await this.projectService.removeMember(projectId, userId, memberUserId);
      return res.status(204).send();
    } catch (error: unknown) {
      return this.handleServiceError(error, res);
    }
  }

  private handleServiceError(error: unknown, res: Response) {
    const message = error instanceof Error ? error.message : error;

    if (message === "Forbidden") {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "You are not authorized to access this project.",
        },
      });
    }

    if (message === "Not found") {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "The requested project could not be found.",
        },
      });
    }

    if (
      message === "User is already the project owner" ||
      message === "User is already a project member"
    ) {
      return res.status(409).json({
        error: {
          code: "CONFLICT",
          message,
        },
      });
    }

    console.error("[ProjectController Error]", error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred.",
      },
    });
  }
}
