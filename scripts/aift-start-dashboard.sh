#!/usr/bin/env bash
set -Eeuo pipefail

NODE_DIR="${AIFT_NODE_DIR:-$HOME/aift-termux-node-002}"
APP_DIR="$NODE_DIR/apps/aift-dashboard"
HOST="${APP_HOST:-127.0.0.1}"
PREFERRED_PORT="${APP_PORT:-3001}"
SERVICE="${AIFT_SERVICE:-dashboard}"

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

cd "$APP_DIR"

if [ ! -d node_modules ]; then
  printf '[AIFT VPS] Installing dashboard dependencies...\n'
  npm install
fi

printf '\n[AIFT VPS] Dashboard assigned port: %s\n' "$ASSIGNED_PORT"
printf '[AIFT VPS] Local URL: http://%s:%s\n\n' "$HOST" "$ASSIGNED_PORT"

exec npx next dev --webpack --hostname "$HOST" --port "$ASSIGNED_PORT"
