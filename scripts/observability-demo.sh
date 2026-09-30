#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API="${API:-http://localhost:3000/api/v1}"
RABBITMQ_API="${RABBITMQ_API:-http://localhost:15672/api}"
ENV_FILE="$ROOT/backend/.env"
COMPOSE_FILE="$ROOT/backend/docker-compose.yml"

env_value() {
  grep "^$1=" "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '\r"'
}

json_id() {
  node -pe 'JSON.parse(require("fs").readFileSync(0)).id'
}

traffic() {
  local rounds="$1" jar email password project task
  jar="$(mktemp)"
  email="demo-$(date +%s)@kanban.test"
  password="$(openssl rand -hex 12)"

  curl -fsS -c "$jar" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$email\",\"name\":\"Observability Demo\",\"password\":\"$password\"}" \
    "$API/auth/register" > /dev/null
  curl -fsS -c "$jar" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$email\",\"password\":\"$password\"}" \
    "$API/auth/login" > /dev/null
  project="$(curl -fsS -b "$jar" -H 'Content-Type: application/json' \
    -d '{"name":"Observability demo"}' "$API/projects" | json_id)"

  for i in $(seq 1 "$rounds"); do
    task="$(curl -fsS -b "$jar" -H 'Content-Type: application/json' \
      -d "{\"title\":\"Demo task $i\"}" "$API/projects/$project/tasks" | json_id)"
    curl -fsS -b "$jar" -X PATCH -H 'Content-Type: application/json' \
      -d '{"status":"DONE"}' "$API/tasks/$task" > /dev/null
    curl -fsS -b "$jar" "$API/projects/$project/tasks" > /dev/null
    curl -s -o /dev/null -b "$jar" -H 'Content-Type: application/json' \
      -d '{}' "$API/projects/$project/tasks"
    curl -s -o /dev/null -b "$jar" "$API/tasks/00000000-0000-4000-8000-000000000000"
    curl -s -o /dev/null "$API/projects"
    echo "Round $i/$rounds done"
  done
  rm -f "$jar"
}

failure() {
  local user password message
  user="$(env_value RABBITMQ_USER)"
  password="$(env_value RABBITMQ_PASSWORD)"
  message="$(node -e '
    const { randomUUID } = require("node:crypto");
    const event = {
      id: randomUUID(),
      type: "task.completed",
      version: 1,
      occurredAt: new Date().toISOString(),
      actorId: null,
      payload: {
        taskId: randomUUID(),
        projectId: randomUUID(),
        title: "Demo failure",
        previousStatus: "TODO",
      },
    };
    process.stdout.write(JSON.stringify({
      properties: {
        content_type: "application/json",
        message_id: event.id,
        type: event.type,
        delivery_mode: 2,
      },
      routing_key: event.type,
      payload: JSON.stringify(event),
      payload_encoding: "string",
    }));
  ')"

  echo "Stopping PostgreSQL: the notification consumer can no longer read projects"
  docker compose -f "$COMPOSE_FILE" stop db > /dev/null
  curl -fsS -K - -H 'Content-Type: application/json' -d "$message" \
    "$RABBITMQ_API/exchanges/%2F/kanban.events/publish" > /dev/null \
    <<< "user = \"$user:$password\""
  echo "task.completed published: 3 retries 5 s apart, then dead-letter"
  sleep 25
  docker compose -f "$COMPOSE_FILE" start db > /dev/null
  echo "PostgreSQL restarted"
}

case "${1:-}" in
  traffic) traffic "${2:-10}" ;;
  failure) failure ;;
  *)
    echo "Usage: $0 traffic [rounds] | failure" >&2
    exit 1
    ;;
esac
