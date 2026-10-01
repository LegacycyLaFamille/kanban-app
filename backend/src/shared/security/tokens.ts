import { createHash, randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";

// Session tokens (see docs/audit/AUTH_AUDIT.md):
// - the refresh token (7 days) only opens POST /auth/refresh;
// - the access token (15 min) opens every other protected route;
// - the database stores the SHA-256 of the current refresh token, never the
//   token itself, and that hash is the session id (`sid`) carried by the
//   access token. Logging out, changing the password, deleting the account
//   or signing in elsewhere replaces or clears it, which revokes the
//   outstanding access tokens at once instead of after 15 minutes.

export type TokenType = "access" | "refresh";

export const ACCESS_TOKEN_TTL = "15m";
export const REFRESH_TOKEN_TTL = "7d";

// Pinned so a token signed with another algorithm is always rejected.
const ALGORITHM = "HS256";

export interface AccessClaims {
  userId: string;
  sid: string;
}

function secret(): string {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error("FATAL: JWT_SECRET manquant.");
  return value;
}

/** Session id of a refresh token: what the database stores. */
export function sessionIdOf(refreshToken: string): string {
  return createHash("sha256").update(refreshToken).digest("hex");
}

export function issueSessionTokens(userId: string): {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
} {
  // jti makes every refresh token unique, even two issued in the same second.
  const refreshToken = jwt.sign(
    { userId, typ: "refresh", jti: randomUUID() },
    secret(),
    { algorithm: ALGORITHM, expiresIn: REFRESH_TOKEN_TTL },
  );
  const sessionId = sessionIdOf(refreshToken);
  const accessToken = jwt.sign(
    { userId, typ: "access", sid: sessionId },
    secret(),
    { algorithm: ALGORITHM, expiresIn: ACCESS_TOKEN_TTL },
  );
  return { accessToken, refreshToken, sessionId };
}

/**
 * Verifies signature, expiry, algorithm and token type. Throws on any
 * mismatch: a refresh token is never accepted as an access token, nor the
 * other way round.
 */
export function verifyToken(token: string, type: "access"): AccessClaims;
export function verifyToken(token: string, type: "refresh"): { userId: string };
export function verifyToken(
  token: string,
  type: TokenType,
): AccessClaims | { userId: string } {
  const payload = jwt.verify(token, secret(), { algorithms: [ALGORITHM] });
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Invalid token");
  }
  const { userId, typ, sid } = payload as Record<string, unknown>;
  if (typ !== type || typeof userId !== "string") {
    throw new Error("Invalid token");
  }
  if (type === "access") {
    if (typeof sid !== "string") throw new Error("Invalid token");
    return { userId, sid };
  }
  return { userId };
}
