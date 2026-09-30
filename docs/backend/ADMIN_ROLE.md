# User Roles and the Admin Guard

Adds a system-wide role to `User`, orthogonal to per-project
ownership/membership (`ProjectAccessGuard`, `Project.ownerId`,
`ProjectMember`): a user can be an app-wide admin while being just a member —
or nothing at all — on any given project. The two systems never overlap and
are checked independently. See
[`../standards/API_CONVENTIONS.md`](../standards/API_CONVENTIONS.md#system-wide-roles)
for the full convention.

This is groundwork for the admin dashboard ticket (global task view,
assignment). No admin-only route exists yet in this repo — only the schema,
the guard, and role exposure to the frontend.

## What exists

- `Role` enum in `prisma/schema.prisma`: `USER` | `ADMIN`. `User.role`
  defaults to `USER` (migration `add_user_role`).
- `requireAdmin(userRepository)` in `backend/src/shared/security/requireAdmin.ts`:
  an Express middleware factory that 403s a non-admin with the standard error
  shape. It reads `req.userId`, so it must be chained **after** `requireAuth`:

  ```ts
  router.get(
    "/admin/whatever",
    requireAuth,
    requireAdmin(userRepository),
    controller.handler,
  );
  ```

  The role is looked up from the database on every request (not cached in
  the JWT), so a promotion or demotion takes effect on the user's very next
  request rather than waiting for their access token to expire.
- `GET /auth/me` now returns `role` alongside `id`/`email`/`name`/`createdAt`.
  The frontend's `AuthUser` type (`frontend/src/features/auth/types/auth.types.ts`)
  has a matching optional `role` field — nothing yet reads it; that's the
  dashboard ticket's job.

## Promoting the first admin

There is no admin-management UI. Promote a user by email with the one-shot
script, after they've registered a normal account through
`POST /auth/register`:

```bash
cd backend
npx tsx src/scripts/promote-admin.ts --email=someone@example.com
# or, against a built image:
npm run db:promote-admin -- --email=someone@example.com
```

This runs `prisma.user.update({ where: { email }, data: { role: "ADMIN" } })`
against whatever `DATABASE_URL` is configured for the environment — point it
at the target database (local, staging, production) before running it there.
It fails clearly (non-zero exit) if no user with that email exists yet.

To demote back to `USER`, either edit the script's `role` value for a
one-off run or update the row directly:

```sql
UPDATE "User" SET role = 'USER' WHERE email = 'someone@example.com';
```

## Verifying locally

```bash
cd backend
docker compose up -d
npx prisma migrate dev
npx prisma generate
npm run dev
# register a user through the app, then:
npx tsx src/scripts/promote-admin.ts --email=<that user's email>
```

`GET /auth/me` for that session should now include `"role": "ADMIN"`.
