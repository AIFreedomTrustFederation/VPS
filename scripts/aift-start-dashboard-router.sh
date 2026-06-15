#!/usr/bin/env bash
set -Eeuo pipefail

AIFT_HOME_DIR="${AIFT_HOME:-$HOME/.aift-webai}"
ROUTER_PORT="${AIFT_ROUTER_PORT:-${APP_PORT:-3001}}"
ROUTER_HOST="${AIFT_ROUTER_HOST:-0.0.0.0}"
TARGET_PORT="${AIFT_INITIAL_TARGET_PORT:-3101}"
NODE_DIR="${AIFT_NODE_DIR:-$HOME/aift-termux-node-002}"
RUNTIME_DIR="$AIFT_HOME_DIR/runtime"
LOG_DIR="$AIFT_HOME_DIR/logs"
ACTIVE_FILE="$RUNTIME_DIR/dashboard-active.json"
ROUTER_LOG="$LOG_DIR/dashboard-router.log"

mkdir -p "$RUNTIME_DIR" "$LOG_DIR"

if [ ! -f "$ACTIVE_FILE" ]; then
  printf '{"target_host":"127.0.0.1","target_port":%s,"commit":"unknown","branch":"unknown","promoted_at":"%s","mode":"initial-router-target"}\n' "$TARGET_PORT" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$ACTIVE_FILE"
fi

cd "$NODE_DIR"
AIFT_HOME="$AIFT_HOME_DIR" AIFT_ROUTER_PORT="$ROUTER_PORT" AIFT_ROUTER_HOST="$ROUTER_HOST" node scripts/aift-dashboard-router.mjs > "$ROUTER_LOG" 2>&1 &
echo "$!" > "$RUNTIME_DIR/dashboard-router.pid"
printf 'AIFT dashboard router started on %s:%s\n' "$ROUTER_HOST" "$ROUTER_PORT"
printf 'Router PID: %s\n' "$(cat "$RUNTIME_DIR/dashboard-router.pid")"
printf 'Active target file: %s\n' "$ACTIVE_FILE"
node scripts/aift-phone-url.mjs "$ROUTER_PORT" || true
