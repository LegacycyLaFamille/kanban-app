# Authentication audit (S3-07)

**Date**: 2026-10-02 · **Scope**: registration, login, session
persistence, expiry, refresh, logout, password change and account deletion
on the delivery candidate (`feat/S3-board-scoped-kanban`).
French version: [AUTH_AUDIT.fr.md](AUTH_AUDIT.fr.md).

## Method

1. Code review of `backend/src/modules/auth/`, `shared/security/` and the
   user repository.
2. Every scenario is an automated test against the **real application and a
   real PostgreSQL** database:
   [`backend/src/tests/integration/api/auth.api.int.test.ts`](../../backend/src/tests/integration/api/auth.api.int.test.ts)
   (26 tests, run in CI by the `integration-backend` job).
3. **Reproduction**: the same tests were run against the code before the
   fixes. 11 of 26 failed; they are the findings below. After the fixes all
   26 pass.

No secret was recorded: tests use generated accounts on a throwaway
database, and assertions check that responses, traces and logs contain no
password, hash or token.

## Findings

| # | Finding | Severity | Before (reproduced) | Status |
| - | --- | --- | --- | --- |
| A1 | **Logout did not revoke the access token**: a copied access cookie kept working up to 15 min after logout. | High | `GET /auth/me` with the old cookie after logout → **200** | Fixed |
| A2 | **A deleted account kept access** with its access token until it expired. | High | `GET /projects` after `DELETE /auth/me` → **200** | Fixed |
| A3 | **A password change did not revoke the other session's access token** (only its refresh token). | High | old access cookie after the change → **200** | Fixed |
| A4 | **The refresh token was accepted as an access token** (same secret, no token type): a 7-day token opened every route. | High | `refreshToken` value sent as `accessToken` → **200** | Fixed |
| A5 | **Refresh tokens were stored in clear** in `User.refreshToken`: a database leak exposed live sessions. | Medium | stored value = cookie value | Fixed |
| A6 | **Rotation could reissue the same refresh token**: two tokens signed in the same second were identical. | Medium | refresh within 1 s → same token | Fixed |
| A7 | Signing in on a second device left the first device's access token valid (one stored session per user). | Low | first device → **200** | Fixed |
| A8 | **Emails were case-sensitive**: `Alice@x.com` and `alice@x.com` could register twice, and signing in with a different case failed. | Medium | duplicate → **201**; login → **400** | Fixed |
| A9 | Passwords over 72 bytes were accepted and **silently truncated by bcrypt**. | Low | → **201** | Fixed |

### Fixes

- **Session-bound access tokens** (A1, A2, A3, A7):
  `shared/security/tokens.ts`, `createRequireAuth.ts`. Each sign-in creates
  a session; the access token carries its id (`sid`) and every protected
  request checks it is still the user's active session. Logout, password
  change, account deletion and a new sign-in clear or replace it: the old
  tokens are refused on the **next** request. Cost: one primary-key query
  per authenticated request.
- **Typed tokens and pinned algorithm** (A4): tokens carry `typ` (`access`
  or `refresh`) and are verified with `HS256` only; `requireAuth` only
  accepts `access`, `/auth/refresh` only `refresh`. Unsigned (`alg: none`)
  and foreign-secret tokens are refused (unit tests).
- **Hashed refresh tokens** (A5): the database stores
  `SHA-256(refreshToken)`, which is also the session id. A token is never
  stored nor logged.
- **Unique refresh tokens** (A6): a random `jti` per token.
- **Email normalization** (A8): trimmed and lowercased by the validation
  schemas (`shared/http/schemas.ts`), compared case-insensitively by the
  repository (accounts created before keep working).
- **72-byte password limit** (A9) on registration and password change.

Deployment note: sessions stored before this change no longer match;
every user signs in once again after the deployment.

## Verified behaviour (evidence: `auth.api.int.test.ts`)

| Scenario | Result |
| --- | --- |
| Registration | 201, bcrypt (cost 12) hash stored, no secret in the response |
| Invalid registration (bad email, short or >72-byte password, short name, unknown field) | 400 `VALIDATION_ERROR`, nothing stored |
| Duplicate email (any case) | 409 `EMAIL_ALREADY_IN_USE` |
| Login | 200, tokens only in `HttpOnly`, `SameSite=Strict` cookies (15 min / 7 days), none in the body |
| Wrong password / unknown email | identical 401 `INVALID_CREDENTIALS`, no cookie |
| 10 failed logins from one IP in 15 min | 11th → 429 `TOO_MANY_REQUESTS` |
| No cookie, garbage, foreign-secret, unsigned or expired access token | 401 `UNAUTHENTICATED` |
| Refresh | 200, both tokens rotated; the old refresh token → 401 `SESSION_EXPIRED` (replay refused) |
| Logout | cookies cleared; the old access **and** refresh tokens → 401 |
| Password change | 204; old session → 401; old password refused; wrong current password → 400 |
| Account deletion | 204; old session → 401; login → 401 |
| `/auth/me` | id, email, name, role, createdAt only |

Unit tests: `tests/vitest/security/requireAuth.test.ts` (real JWTs: forged,
expired, `alg: none`, wrong type, revoked session, store failure).

## Accepted limitations

- **One session per user**: signing in on a second device signs the first
  one out. Consistent with the data model (one stored session).
- **Email enumeration**: registration answers 409 for a used email, and an
  unknown email is answered slightly faster than a wrong password (no bcrypt
  comparison). Mitigated by the rate limits; not blocking for this product.
- **Rate limiting is per IP** (10 failed logins / 15 min, 20 registrations
  / hour), in memory: it resets on restart and is not shared between
  instances. No per-account lockout.
- **`Secure` cookies only when `NODE_ENV=production`** (set in the backend
  image): production must be served over HTTPS, otherwise browsers drop the
  cookies and nobody can sign in.
- The refresh cookie is sent with every API request (path `/`); scoping it
  to `/api/v1/auth` would reduce its exposure.
- No password reset by email, no email verification, no JWT secret
  rotation: out of the project's scope.

## Conclusion

No blocking defect remains. All findings A1–A9 are fixed and covered by
automated tests that run in CI.
