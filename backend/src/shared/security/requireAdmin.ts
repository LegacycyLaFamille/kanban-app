import type { NextFunction, Request, Response } from "express";
import type { UserRepository } from "../../modules/users/UserRepository.js";

/**
 * Authorization guard for admin-only routes. Must run after requireAuth
 * (it relies on req.userId already being set) — a missing/invalid session
 * is rejected by requireAuth's own 401 before this ever runs.
 *
 * The role is looked up fresh from the database on every request rather
 * than trusted from a JWT claim, matching ProjectAccessGuard's approach:
 * a promotion/demotion takes effect immediately instead of waiting for the
 * user's access token to expire and refresh.
 *
 * Generic on purpose: this is groundwork for the admin dashboard ticket
 * (global task view, assignment, etc.) — any route needing "is this user
 * an admin" can reuse this guard as-is.
 */
export function requireAdmin(userRepository: UserRepository) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const userId = req.userId;

    const user = userId ? await userRepository.findById(userId) : null;

    if (!user || user.role !== "ADMIN") {
      res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "This action requires administrator access.",
        },
      });
      return;
    }

    next();
  };
}
