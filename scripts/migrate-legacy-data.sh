#!/usr/bin/env bash
# Migrates the legacy todo_items data (MySQL or SQLite) into the PostgreSQL
# archive table, from inside the running backend container.
#
# Run it on the server from the deployed stack directory
# (~/kanban-dev or ~/kanban-main), after `docker compose up -d --wait`:
#
#   ./scripts/migrate-legacy-data.sh --dry-run   # check first
#   ./scripts/migrate-legacy-data.sh             # then migrate
#
# MySQL source: export MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD and
# MYSQL_DB before running; they are forwarded to the container. Without
# MYSQL_HOST the SQLite file of the container (SQLITE_DB_LOCATION) is used.
# See docs/backend/LEGACY_DATA_MIGRATION.md.
set -euo pipefail

cd "$(dirname "$0")/.."

SERVICE="${BACKEND_SERVICE:-backend}"

if ! docker compose ps --status running --services | grep -qx "$SERVICE"; then
  echo "Service '$SERVICE' is not running. Deploy the stack first." >&2
  exit 1
fi

env_args=()
for var in MYSQL_HOST MYSQL_PORT MYSQL_USER MYSQL_PASSWORD MYSQL_DB; do
  # `-e VAR` without a value lets docker read it from this shell, so the
  # password never appears in the process list.
  if [[ -n "${!var:-}" ]]; then
    env_args+=(-e "$var")
  fi
done

exec docker compose exec -T "${env_args[@]}" "$SERVICE" \
  node dist/scripts/migrate-legacy-data.js "$@"
