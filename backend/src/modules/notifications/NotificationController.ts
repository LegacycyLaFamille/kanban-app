import type { Request, Response } from "express";
import { z } from "zod";
import { InvalidNotificationCursorError } from "./NotificationRepository.js";
import {
  NotificationNotFoundError,
  type NotificationService,
} from "./NotificationService.js";
import {
  listNotificationsQuerySchema,
  notificationIdSchema,
} from "./notification.schema.js";

function notFound(res: Response) {
  return res.status(404).json({
    error: {
      code: "NOTIFICATION_NOT_FOUND",
      message: "The requested notification could not be found.",
    },
  });
}

// Every handler only ever reads or changes the authenticated user's own
// notifications: the user id comes from the session, never from the request.
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  async list(req: Request, res: Response) {
    // validateSchema only covers the body; the query string is validated
    // here with the same error shape.
    const parsed = listNotificationsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      const { formErrors, fieldErrors } = z.flattenError(parsed.error);
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: formErrors[0] ?? "Invalid request",
          details: fieldErrors,
        },
      });
    }

    const { unread, limit, cursor } = parsed.data;
    try {
      const page = await this.notificationService.list(req.userId!, {
        unreadOnly: unread,
        limit,
        ...(cursor === undefined ? {} : { cursor }),
      });
      return res.status(200).json(page);
    } catch (error) {
      if (error instanceof InvalidNotificationCursorError) {
        return res.status(400).json({
          error: {
            code: "INVALID_CURSOR",
            message: "The cursor does not match any of your notifications.",
          },
        });
      }
      return this.internalError(error, res);
    }
  }

  async unreadCount(req: Request, res: Response) {
    try {
      const count = await this.notificationService.countUnread(req.userId!);
      return res.status(200).json({ count });
    } catch (error) {
      return this.internalError(error, res);
    }
  }

  async markRead(req: Request<{ notificationId: string }>, res: Response) {
    // A malformed id cannot exist: same answer as a missing one.
    if (!notificationIdSchema.safeParse(req.params.notificationId).success) {
      return notFound(res);
    }
    try {
      const notification = await this.notificationService.markRead(
        req.params.notificationId,
        req.userId!,
      );
      return res.status(200).json(notification);
    } catch (error) {
      if (error instanceof NotificationNotFoundError) return notFound(res);
      return this.internalError(error, res);
    }
  }

  async markAllRead(req: Request, res: Response) {
    try {
      const updated = await this.notificationService.markAllRead(req.userId!);
      return res.status(200).json({ updated });
    } catch (error) {
      return this.internalError(error, res);
    }
  }

  private internalError(error: unknown, res: Response) {
    console.error("[notifications] Request failed:", error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred.",
      },
    });
  }
}
