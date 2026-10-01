# GDPR (RGPD) Compliance

How the application meets the GDPR, and what is still left to the team
outside the code.

## User rights

| Right | Article | Where |
|---|---|---|
| Information | 13 | `/privacy` (privacy policy) and `/legal-notice` (LCEN), linked from login, sign-up and the sidebar |
| Access, portability | 15, 20 | Profile → Your data → **Download my personal data** — `GET /api/v1/auth/me/personal-data` |
| Rectification | 16 | Profile → details form — `PATCH /api/v1/auth/me` |
| Erasure | 17 | Profile → Danger zone → **Delete account** — `DELETE /api/v1/auth/me` |
| Restriction, objection | 18, 21 | By email to the privacy contact shown on `/privacy` |

### Personal data export

`GET /api/v1/auth/me/personal-data` returns one JSON file with everything
stored about the user:

- `account`: id, email, name, role, creation and update dates;
- `ownedProjects`, `memberships` (project, role, join date);
- `assignedTasks`;
- `receivedInvitations`, `sentInvitations` (project and role only);
- `notifications`.

Credentials (password hash, refresh token) are never exported, and other
people only appear as ids. This is separate from the project export
(`GET /auth/me/export`, see [DATA_EXPORT.md](DATA_EXPORT.md)), which exports
project content with people redacted.

### Account deletion

`DELETE /api/v1/auth/me` deletes the `User` row; the schema's cascades remove
the projects they own (with boards, tasks, members, invitations), their
memberships, invitations and notifications. Tasks assigned to them in other
people's projects are kept and unassigned (`onDelete: SetNull`). Session
cookies are cleared in the response.

Notifications of other users keep the deleted user's id in `actorId`. This id
no longer resolves to anyone, so it is not personal data anymore.

## Security (art. 32)

- Passwords hashed with bcrypt (cost 12); `PATCH /api/v1/auth/me/password`
  checks the current password and rotates the session, which revokes the
  user's other sessions.
- HttpOnly, `SameSite=Strict` session cookies (`Secure` in production).
- Rate limiting (`src/shared/security/rateLimit.ts`), per client IP:
  - login and password change: 10 failed attempts per 15 minutes;
  - registration: 20 per hour.

  Over the limit the API answers `429 TOO_MANY_REQUESTS`. The client IP comes
  from nginx (`trust proxy` is set to 1 in `main.ts`), so the backend must
  never be exposed directly. Set `RATE_LIMIT_DISABLED=true` only for local
  load or end-to-end testing.
- Secrets redacted from logs (`src/shared/observability/logger.ts`).

## Cookies

Only `accessToken` (15 min) and `refreshToken` (7 days), both strictly
necessary for authentication, so no consent banner is required (CNIL
guidance on art. 82 of the Loi Informatique et Libertés). Adding any analytics
or third-party script would require a consent banner first.

## Retention

| Data | Retention |
|---|---|
| Account and content | Until account deletion |
| Loki logs | 7 days (`docker/observability/loki/config.yaml`) |
| Tempo traces | 3 days (`docker/observability/tempo/config.yaml`) |

## Left to the team (not code)

1. Fill in every `[...]` placeholder in
   `frontend/src/features/legal/legal.config.ts` (publisher, publication
   director, host, privacy contact, backup retention) before opening the site
   to real users.
2. Keep a record of processing activities (art. 30).
3. Sign a data processing agreement with the hosting provider (art. 28).
4. Make sure the privacy contact mailbox is monitored: requests must be
   answered within one month.
5. If backups exist, make sure they expire within the period stated on the
   privacy page.
