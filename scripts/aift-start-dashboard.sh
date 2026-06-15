#!/usr/bin/env bash
set -Eeuo pipefail

NODE_DIR="${AIFT_NODE_DIR:-$HOME/aift-termux-node-002}"
APP_DIR="$NODE_DIR/apps/aift-dashboard"
HOST="${APP_HOST:-0.0.0.0}"
PREFERRED_PORT="${APP_PORT:-3001}"
SERVICE="${AIFT_SERVICE:-dashboard}"
AIFT_HOME_DIR="${AIFT_HOME:-$HOME/.aift-webai}"
RUNTIME_DIR="$AIFT_HOME_DIR/runtime"
LOG_DIR="$AIFT_HOME_DIR/logs"
HANDOFF_PORT="${AIFT_HANDOFF_PORT:-3999}"
PID_FILE="$RUNTIME_DIR/dashboard.pid"

printf '\n[AIFT VPS] Start dashboard with automatic port assignment\n'
printf '[AIFT VPS] Node dir: %s\n' "$NODE_DIR"
printf '[AIFT VPS] Preferred port: %s\n\n' "$PREFERRED_PORT"

if [ ! -d "$NODE_DIR/.git" ]; then
  printf '[AIFT VPS] Node repo is missing or not git-backed. Refreshing from GitHub first...\n'
  curl -fsSL https://raw.githubusercontent.com/AIFreedomTrustFederation/VPS/main/scripts/aift-git-refresh.sh | bash
fi

cd "$NODE_DIR"

if ! git pull --ff-only; then
  printf '[AIFT VPS] Git pull failed. Continuing with current checkout and marking sync warning.\n'
fi

if [ ! -f "scripts/aift-port-assign.sh" ]; then
  printf '[AIFT VPS] Missing port assignment helper. Run git pull and try again.\n'
  exit 1
fi

ASSIGNED_PORT="$(bash scripts/aift-port-assign.sh "$SERVICE" "$PREFERRED_PORT")"

mkdir -p "$RUNTIME_DIR" "$LOG_DIR"

if [ -f "scripts/aift-sync-handoff-server.mjs" ]; then
  if ! command -v node >/dev/null 2>&1; then
    printf '[AIFT VPS] Node.js is missing; handoff export server was not started.\n'
  elif ! (echo > "/dev/tcp/127.0.0.1/$HANDOFF_PORT") >/dev/null 2>&1; then
    AIFT_HOME="$AIFT_HOME_DIR" APP_PORT="$ASSIGNED_PORT" AIFT_HANDOFF_PORT="$HANDOFF_PORT" node scripts/aift-sync-handoff-server.mjs > "$LOG_DIR/sync-handoff.log" 2>&1 &
    printf '[AIFT VPS] Handoff/export URL: http://127.0.0.1:%s\n' "$HANDOFF_PORT"
  else
    printf '[AIFT VPS] Handoff/export URL already running: http://127.0.0.1:%s\n' "$HANDOFF_PORT"
  fi
fi

if [ -f "scripts/aift-service-registry.sh" ]; then
  APP_HOST="$HOST" bash scripts/aift-service-registry.sh register "$SERVICE" "$ASSIGNED_PORT" >/dev/null || true
fi

if [ ! -d "$APP_DIR" ]; then
  printf '[AIFT VPS] Dashboard app not found: %s\n' "$APP_DIR"
  exit 1
fi

RUNNING_COMMIT="$(git rev-parse HEAD 2>/dev/null || echo unknown)"
RUNNING_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
STARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
printf '{"state":"starting","message":"Dashboard process is launching and waiting for HTTP health.","updated_at":"%s","commit":"%s","port":"%s"}\n' "$STARTED_AT" "$RUNNING_COMMIT" "$ASSIGNED_PORT" > "$RUNTIME_DIR/dashboard-ready.json"
printf '{"running_commit":"%s","running_branch":"%s","started_at":"%s","host":"%s","port":"%s"}\n' "$RUNNING_COMMIT" "$RUNNING_BRANCH" "$STARTED_AT" "$HOST" "$ASSIGNED_PORT" > "$RUNTIME_DIR/dashboard-running.json"

cd "$APP_DIR"

printf '[AIFT VPS] Installing or refreshing dashboard dependencies...\n'
npm install

printf '\n[AIFT VPS] Dashboard assigned port: %s\n' "$ASSIGNED_PORT"
printf '[AIFT VPS] Local URL: http://%s:%s\n' "$HOST" "$ASSIGNED_PORT"
printf '[AIFT VPS] Export logs: http://127.0.0.1:%s/export\n' "$HANDOFF_PORT"
printf '[AIFT VPS] Running commit: %s\n\n' "$RUNNING_COMMIT"

npx next dev --webpack --hostname "$HOST" --port "$ASSIGNED_PORT" &
NEXT_PID="$!"
echo "$NEXT_PID" > "$PID_FILE"

HEALTH_URL="http://127.0.0.1:$ASSIGNED_PORT/api/health"
READY="0"
for attempt in $(seq 1 60); do
  if command -v curl >/dev/null 2>&1 && curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
    READY="1"
    break
  fi
  if ! kill -0 "$NEXT_PID" >/dev/null 2>&1; then
    FAILED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    printf '{"state":"error","message":"Dashboard process exited before health check passed.","updated_at":"%s","commit":"%s","port":"%s"}\n' "$FAILED_AT" "$RUNNING_COMMIT" "$ASSIGNED_PORT" > "$RUNTIME_DIR/dashboard-ready.json"
    wait "$NEXT_PID"
    exit 1
  fi
  printf '[AIFT VPS] Waiting for dashboard health: attempt %s/60\n' "$attempt"
  sleep 1
done

if [ "$READY" = "1" ]; then
  READY_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  printf '{"state":"ready","message":"Dashboard health check passed. Return to AIFT Cloud.","updated_at":"%s","commit":"%s","port":"%s"}\n' "$READY_AT" "$RUNNING_COMMIT" "$ASSIGNED_PORT" > "$RUNTIME_DIR/dashboard-ready.json"
  printf '[AIFT VPS] Dashboard health check passed.\n'
else
  FAILED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  printf '{"state":"error","message":"Dashboard did not pass HTTP health check within 60 seconds.","updated_at":"%s","commit":"%s","port":"%s"}\n' "$FAILED_AT" "$RUNNING_COMMIT" "$ASSIGNED_PORT" > "$RUNTIME_DIR/dashboard-ready.json"
  printf '[AIFT VPS] Dashboard did not pass health check within 60 seconds.\n' >&2
fi

wait "$NEXT_PID"
