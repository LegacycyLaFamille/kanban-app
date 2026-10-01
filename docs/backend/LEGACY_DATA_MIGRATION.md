# Legacy Data Migration (MySQL / SQLite → PostgreSQL)

One-shot script that copies the legacy `todo_items` table into the
PostgreSQL table `LegacyTodoItem`.

Per [ADR-007](../adr/ADR-007-no-legacy-data-migration.md), legacy todos have
no owner, so they are **archived as-is** and are **not** turned into
`Project` / `Task` rows. The archive is not linked to any user and no API
route exposes it. It only exists for traceability and manual recovery.

## What the script does

1. Reads `todo_items` from the legacy database: MySQL when `MYSQL_HOST` is
   set, otherwise the SQLite file at `SQLITE_DB_LOCATION` (the rule the
   legacy app used). The source is only read, never modified.
2. Normalizes rows the way the legacy app read them:
   - `completed` is `true` only when the legacy value is `1`;
   - rows without an `id` are skipped and counted;
   - duplicate ids (the legacy table has no primary key) keep the first row,
     like the legacy `getItem`, and are listed in the report.
3. Upserts rows in batches (one transaction per batch, 500 rows by default).
4. Checks that every valid row is now present in PostgreSQL and exits with
   code `1` if any is missing.

The script is **idempotent**: running it again updates the existing rows and
refreshes `migratedAt`. It never creates duplicates.

## Prerequisites

- The stack is deployed. On container start the backend runs
  `prisma migrate deploy`, which creates the `LegacyTodoItem` table
  (migration `20260930120000_add_legacy_todo_archive`).
- For a MySQL source, the backend container must be able to reach the MySQL
  host. If MySQL runs on the same VM in another Docker network, use the host
  gateway IP (usually `172.17.0.1`) with a published port, or attach the
  networks.

## Run it after a deployment

On the server, from the deployed stack directory (`~/kanban-dev` for test,
`~/kanban-main` for prod):

```bash
# 1. Always start with a dry run: it reads and validates, writes nothing
./scripts/migrate-legacy-data.sh --dry-run

# 2. Migrate
./scripts/migrate-legacy-data.sh
```

### Source: SQLite (default stack)

No configuration needed. The script reads `/data/todo.db` from the
`backend-data` volume (the container's `SQLITE_DB_LOCATION`).

### Source: MySQL

Export the connection variables first. The wrapper forwards them to the
container without putting the password on the command line:

```bash
export MYSQL_HOST=172.17.0.1 MYSQL_PORT=3306 MYSQL_DB=todos MYSQL_USER=todo
read -rs MYSQL_PASSWORD && export MYSQL_PASSWORD
./scripts/migrate-legacy-data.sh --dry-run
./scripts/migrate-legacy-data.sh
```

To force a source: `--source=mysql` or `--source=sqlite`.
Other options: `--sqlite-path=PATH`, `--batch-size=N`, `--help`.

### Without the wrapper

```bash
docker compose exec backend npm run db:migrate-legacy -- --dry-run
# local development (tsx, uses backend/.env):
cd backend && npm run db:migrate-legacy:dev -- --dry-run
```

## Output

The last line is a JSON report, keep it in the deployment notes:

```text
[legacy-migration] Done: {"read":5,"valid":3,"skippedWithoutId":1,"duplicateIds":["2222…"],"written":3,"verified":3,"dryRun":false}
```

| Field              | Meaning                                              |
| ------------------ | ---------------------------------------------------- |
| `read`             | Rows read from `todo_items`                          |
| `valid`            | Rows with a usable id, after deduplication           |
| `skippedWithoutId` | Rows ignored because `id` was null or empty          |
| `duplicateIds`     | Ids found more than once (first row kept)            |
| `written`          | Rows upserted into PostgreSQL                        |
| `verified`         | Rows found in PostgreSQL afterwards (must = `valid`) |

A missing `todo_items` table is not an error: the report shows `read: 0`.

## Manual checks

```bash
docker compose exec postgres sh -c \
  'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT source, completed, count(*) FROM \"LegacyTodoItem\" GROUP BY 1, 2"'
```

## Rollback

The legacy database is never modified. To drop the copied data:

```sql
DELETE FROM "LegacyTodoItem";
```

## Troubleshooting

- **Accents look like `cafÃ©`**: check the bytes in the legacy MySQL
  (`SELECT HEX(name) …`). If they are already double encoded there, the
  script copies them faithfully: the data was stored with a wrong client
  charset, not broken by the migration.
- **`SQLite legacy database not found`**: the path is wrong. The script
  opens SQLite read-only and never creates an empty file.
- **`Verification failed`**: some rows were not written. Re-run the script
  (it is idempotent) and check the PostgreSQL logs.
