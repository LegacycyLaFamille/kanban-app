import type { NextFunction, Request, RequestHandler, Response } from "express";
import { verifyToken } from "./tokens.js";

/** Where the current session of a user is stored (User.refreshToken). */
export interface SessionStore {
  // Session id of the user's active session, null if signed out or deleted.
  activeSessionId(userId: string): Promise<string | null>;
}

function unauthenticated(res: Response, message: string): void {
  res.status(401).json({ error: { code: "UNAUTHENTICATED", message } });
}

/**
 * Accepts a request only with a valid, unexpired **access** token whose
 * session is still the user's active one. A token from a session that was
 * logged out, replaced (password change, sign-in elsewhere) or deleted is
 * refused right away, not 15 minutes later.
 */
export function createRequireAuth(sessions: SessionStore): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token: unknown = req.cookies?.accessToken;
    if (typeof token !== "string" || token === "") {
      unauthenticated(res, "Authentication required.");
      return;
    }

    let claims;
    try {
      claims = verifyToken(token, "access");
    } catch {
      unauthenticated(res, "Invalid or expired session.");
      return;
    }

    try {
      const active = await sessions.activeSessionId(claims.userId);
      if (active === null || active !== claims.sid) {
        unauthenticated(res, "Invalid or expired session.");
        return;
      }
    } catch (error) {
      next(error);
      return;
    }

    req.userId = claims.userId;
    next();
  };
}
