import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import {
  createRequireAuth,
  type SessionStore,
} from "../../../shared/security/createRequireAuth.js";
import { issueSessionTokens } from "../../../shared/security/tokens.js";

// Real tokens, signed with the test secret: what is verified here is the
// actual JWT handling, not a mock of it.
const SECRET = "test_secret";

function call(
  requireAuth: ReturnType<typeof createRequireAuth>,
  accessToken?: string,
) {
  const req = {
    cookies: accessToken === undefined ? {} : { accessToken },
  } as unknown as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next, done: requireAuth(req, res, next) };
}

function expectRejected(
  res: Response,
  next: NextFunction,
  message = "Invalid or expired session.",
) {
  expect(res.status).toHaveBeenCalledWith(401);
  expect(res.json).toHaveBeenCalledWith({
    error: { code: "UNAUTHENTICATED", message },
  });
  expect(next).not.toHaveBeenCalled();
}

describe("requireAuth", () => {
  let activeSessionId: ReturnType<typeof vi.fn>;
  let requireAuth: ReturnType<typeof createRequireAuth>;

  beforeEach(() => {
    process.env.JWT_SECRET = SECRET;
    activeSessionId = vi.fn();
    requireAuth = createRequireAuth({ activeSessionId } as SessionStore);
  });

  it("rejects a request without an access token", async () => {
    const { res, next, done } = call(requireAuth);
    await done;

    expectRejected(res, next, "Authentication required.");
  });

  it("lets a valid access token of the active session through", async () => {
    const tokens = issueSessionTokens("user-1");
    activeSessionId.mockResolvedValue(tokens.sessionId);

    const { req, next, done } = call(requireAuth, tokens.accessToken);
    await done;

    expect(next).toHaveBeenCalledWith();
    expect(req.userId).toBe("user-1");
    expect(activeSessionId).toHaveBeenCalledWith("user-1");
  });

  it("rejects a token signed with another secret", async () => {
    const forged = jwt.sign(
      { userId: "user-1", typ: "access", sid: "s" },
      "not-the-secret",
    );

    const { res, next, done } = call(requireAuth, forged);
    await done;

    expectRejected(res, next);
  });

  it("rejects an expired token", async () => {
    const expired = jwt.sign(
      { userId: "user-1", typ: "access", sid: "s", exp: 1 },
      SECRET,
    );

    const { res, next, done } = call(requireAuth, expired);
    await done;

    expectRejected(res, next);
  });

  it("rejects an unsigned token (alg none)", async () => {
    const unsigned = jwt.sign(
      { userId: "user-1", typ: "access", sid: "s" },
      "",
      { algorithm: "none" },
    );

    const { res, next, done } = call(requireAuth, unsigned);
    await done;

    expectRejected(res, next);
  });

  it("rejects a refresh token used as an access token", async () => {
    const tokens = issueSessionTokens("user-1");
    activeSessionId.mockResolvedValue(tokens.sessionId);

    const { res, next, done } = call(requireAuth, tokens.refreshToken);
    await done;

    expectRejected(res, next);
  });

  it("rejects a token of a session that was replaced or logged out", async () => {
    const tokens = issueSessionTokens("user-1");

    activeSessionId.mockResolvedValue("another-session");
    const replaced = call(requireAuth, tokens.accessToken);
    await replaced.done;
    expectRejected(replaced.res, replaced.next);

    activeSessionId.mockResolvedValue(null);
    const loggedOut = call(requireAuth, tokens.accessToken);
    await loggedOut.done;
    expectRejected(loggedOut.res, loggedOut.next);
  });

  it("rejects a token without a session id (issued before sessions)", async () => {
    const legacy = jwt.sign({ userId: "user-1" }, SECRET, {
      expiresIn: "15m",
    });

    const { res, next, done } = call(requireAuth, legacy);
    await done;

    expectRejected(res, next);
    expect(activeSessionId).not.toHaveBeenCalled();
  });

  it("hands a session store failure to the error handler", async () => {
    const tokens = issueSessionTokens("user-1");
    const failure = new Error("database down");
    activeSessionId.mockRejectedValue(failure);

    const { next, done } = call(requireAuth, tokens.accessToken);
    await done;

    expect(next).toHaveBeenCalledWith(failure);
  });
});
