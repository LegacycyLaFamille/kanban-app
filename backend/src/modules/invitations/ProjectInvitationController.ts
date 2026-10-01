import type { Request, Response } from "express";
import { recordError } from "../../shared/observability/recordError.js";
import {
  InvitationError,
  type InvitationErrorCode,
  type ProjectInvitationService,
} from "./ProjectInvitationService.js";
import { invitationIdSchema } from "./invitation.schema.js";

const STATUS_BY_CODE: Record<InvitationErrorCode, number> = {
  USER_NOT_FOUND: 404,
  INVITATION_NOT_FOUND: 404,
  ALREADY_OWNER: 409,
  ALREADY_MEMBER: 409,
  ALREADY_INVITED: 409,
};

function invitationNotFound(res: Response) {
  return res.status(404).json({
    error: {
      code: "INVITATION_NOT_FOUND",
      message: "The requested invitation could not be found.",
    },
  });
}

export class ProjectInvitationController {
  constructor(private readonly invitationService: ProjectInvitationService) {}

  async invite(req: Request<{ projectId: string }>, res: Response) {
    try {
      const invitation = await this.invitationService.invite(
        req.params.projectId,
        req.userId!,
        req.body.email,
        req.body.role,
      );
      return res.status(201).json(invitation);
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  async listForProject(req: Request<{ projectId: string }>, res: Response) {
    try {
      const invitations = await this.invitationService.listForProject(
        req.params.projectId,
        req.userId!,
      );
      return res.status(200).json(invitations);
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  async cancel(
    req: Request<{ projectId: string; invitationId: string }>,
    res: Response,
  ) {
    // A malformed id cannot exist: same answer as a missing one.
    if (!invitationIdSchema.safeParse(req.params.invitationId).success) {
      return invitationNotFound(res);
    }
    try {
      await this.invitationService.cancel(
        req.params.projectId,
        req.params.invitationId,
        req.userId!,
      );
      return res.status(204).send();
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  async listMine(req: Request, res: Response) {
    try {
      const invitations = await this.invitationService.listForInvitee(
        req.userId!,
      );
      return res.status(200).json(invitations);
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  async accept(req: Request<{ invitationId: string }>, res: Response) {
    if (!invitationIdSchema.safeParse(req.params.invitationId).success) {
      return invitationNotFound(res);
    }
    try {
      const result = await this.invitationService.accept(
        req.params.invitationId,
        req.userId!,
      );
      return res.status(200).json(result);
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  async decline(req: Request<{ invitationId: string }>, res: Response) {
    if (!invitationIdSchema.safeParse(req.params.invitationId).success) {
      return invitationNotFound(res);
    }
    try {
      await this.invitationService.decline(
        req.params.invitationId,
        req.userId!,
      );
      return res.status(204).send();
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  private handleError(error: unknown, res: Response) {
    if (error instanceof InvitationError) {
      return res.status(STATUS_BY_CODE[error.code]).json({
        error: { code: error.code, message: error.message },
      });
    }

    // Project access errors raised by ProjectAccessGuard.
    const message = error instanceof Error ? error.message : "";
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

    recordError(error, "Invitation request failed");
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred.",
      },
    });
  }
}
