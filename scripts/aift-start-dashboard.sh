#!/usr/bin/env bash
set -Eeuo pipefail

NODE_DIR="${AIFT_NODE_DIR:-$HOME/aift-termux-node-002}"
APP_DIR="$NODE_DIR/apps/aift-dashboard"
HOST="${APP_HOST:-127.0.0.1}"
PREFERRED_PORT="${APP_PORT:-3001}"
SERVICE="${AIFT_SERVICE:-dashboard}"
AIFT_HOME_DIR="${AIFT_HOME:-$HOME/.aift-webai}"
RUNTIME_DIR="$AIFT_HOME_DIR/runtime"

printf '\n[AIFT VPS] Start dashboard with automatic port assignment\n'
printf '[AIFT VPS] Node dir: %s\n' "$NODE_DIR"
printf '[AIFT VPS] Preferred port: %s\n\n' "$PREFERRED_PORT"

if [ ! -d "$NODE_DIR/.git" ]; then
  printf '[AIFT VPS] Node repo is missing or not git-backed. Refreshing from GitHub first...\n'
  curl -fsSL https://raw.githubusercontent.com/AIFreedomTrustFederation/VPS/main/scripts/aift-git-refresh.sh | bash
fi

cd "$NODE_DIR"

git pull --ff-only || true

if [ ! -f "scripts/aift-port-assign.sh" ]; then
  printf '[AIFT VPS] Missing port assignment helper. Run git pull and try again.\n'
  exit 1
fi

ASSIGNED_PORT="$(bash scripts/aift-port-assign.sh "$SERVICE" "$PREFERRED_PORT")"

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
mkdir -p "$RUNTIME_DIR"
printf '{"running_commit":"%s","running_branch":"%s","started_at":"%s","host":"%s","port":"%s"}\n' "$RUNNING_COMMIT" "$RUNNING_BRANCH" "$STARTED_AT" "$HOST" "$ASSIGNED_PORT" > "$RUNTIME_DIR/dashboard-running.json"

cd "$APP_DIR"

if [ ! -d node_modules ]; then
  printf '[AIFT VPS] Installing dashboard dependencies...\n'
  npm install
fi

READY_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
printf '{"state":"ready","message":"Dashboard is ready. Return to AIFT Cloud.","updated_at":"%s","commit":"%s","port":"%s"}\n' "$READY_AT" "$RUNNING_COMMIT" "$ASSIGNED_PORT" > "$RUNTIME_DIR/dashboard-ready.json"

printf '\n[AIFT VPS] Dashboard assigned port: %s\n' "$ASSIGNED_PORT"
printf '[AIFT VPS] Local URL: http://%s:%s\n' "$HOST" "$ASSIGNED_PORT"
printf '[AIFT VPS] Running commit: %s\n\n' "$RUNNING_COMMIT"

exec npx next dev --webpack --hostname "$HOST" --port "$ASSIGNED_PORT"
