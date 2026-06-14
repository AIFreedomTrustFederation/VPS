#!/usr/bin/env bash
set -Eeuo pipefail

NODE_DIR="${AIFT_NODE_DIR:-$HOME/aift-termux-node-002}"
AIFT_HOME_DIR="${AIFT_HOME:-$HOME/.aift-webai}"
APP_PORT_VALUE="${APP_PORT:-3001}"
HANDOFF_PORT="${AIFT_HANDOFF_PORT:-3999}"
LOG_DIR="$AIFT_HOME_DIR/logs"
RUNTIME_DIR="$AIFT_HOME_DIR/runtime"
HANDSHAKE_LOG="$LOG_DIR/sync-handshake.log"
HISTORY_LOG="$LOG_DIR/sync-history.log"
HANDOFF_LOG="$LOG_DIR/sync-handoff.log"
READY_FILE="$RUNTIME_DIR/dashboard-ready.json"

mkdir -p "$LOG_DIR" "$RUNTIME_DIR"
cd "$NODE_DIR"

now_utc() {
  date -u +%Y-%m-%dT%H:%M:%SZ
}

line() {
  printf '%s\n' "$*" | tee -a "$HANDSHAKE_LOG" "$HISTORY_LOG"
}

write_ready() {
  local state="$1"
  local message="$2"
  printf '{"state":"%s","message":"%s","updated_at":"%s"}\n' "$state" "$message" "$(now_utc)" > "$READY_FILE"
}

: > "$HANDSHAKE_LOG"
line "AIFT SYNC HANDSHAKE"
line "Started at: $(now_utc)"
line "Node directory: $NODE_DIR"
line "AIFT home: $AIFT_HOME_DIR"
line "Dashboard port: $APP_PORT_VALUE"
line "Handoff port: $HANDOFF_PORT"
line ""

write_ready "syncing" "Sync handshake started. Checking repository state."

if [ -f "scripts/aift-sync-handoff-server.mjs" ]; then
  if command -v node >/dev/null 2>&1; then
    if ! (echo > "/dev/tcp/127.0.0.1/$HANDOFF_PORT") >/dev/null 2>&1; then
      AIFT_HOME="$AIFT_HOME_DIR" APP_PORT="$APP_PORT_VALUE" AIFT_HANDOFF_PORT="$HANDOFF_PORT" node scripts/aift-sync-handoff-server.mjs > "$HANDOFF_LOG" 2>&1 &
      line "Handoff server: started at http://127.0.0.1:$HANDOFF_PORT"
    else
      line "Handoff server: already running at http://127.0.0.1:$HANDOFF_PORT"
    fi
  else
    line "Handoff server: skipped because node command is unavailable"
  fi
else
  line "Handoff server: skipped because script is missing"
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
LOCAL_BEFORE="$(git rev-parse HEAD 2>/dev/null || echo unknown)"
line "Branch: $BRANCH"
line "Local commit before sync: $LOCAL_BEFORE"
line ""
line "Fetching origin/$BRANCH..."
FETCH_OUTPUT="$(git fetch origin "$BRANCH" 2>&1)" || FETCH_STATUS=$?
FETCH_STATUS="${FETCH_STATUS:-0}"
line "$FETCH_OUTPUT"
line "Fetch exit code: $FETCH_STATUS"

REMOTE_COMMIT="$(git rev-parse "origin/$BRANCH" 2>/dev/null || echo unknown)"
LOCAL_AFTER_FETCH="$(git rev-parse HEAD 2>/dev/null || echo unknown)"
COUNTS="$(git rev-list --left-right --count "HEAD...origin/$BRANCH" 2>/dev/null || echo '0 0')"
AHEAD="$(printf '%s' "$COUNTS" | awk '{print $1}')"
BEHIND="$(printf '%s' "$COUNTS" | awk '{print $2}')"
line "Remote commit: $REMOTE_COMMIT"
line "Local commit after fetch: $LOCAL_AFTER_FETCH"
line "Ahead: $AHEAD"
line "Behind: $BEHIND"
line ""

if [ "$FETCH_STATUS" != "0" ]; then
  write_ready "error" "Fetch failed. See sync-handshake.log."
  line "Result: failed during fetch"
  exit 1
fi

line "Pulling updates with fast-forward only..."
PULL_OUTPUT="$(git pull --ff-only 2>&1)" || PULL_STATUS=$?
PULL_STATUS="${PULL_STATUS:-0}"
line "$PULL_OUTPUT"
line "Pull exit code: $PULL_STATUS"
LOCAL_AFTER_PULL="$(git rev-parse HEAD 2>/dev/null || echo unknown)"
line "Local commit after pull: $LOCAL_AFTER_PULL"
line ""

if [ "$PULL_STATUS" != "0" ]; then
  write_ready "error" "Pull failed. Manual review is required."
  line "Result: failed during pull"
  exit 1
fi

if [ "$LOCAL_BEFORE" = "$LOCAL_AFTER_PULL" ]; then
  line "Update result: no new dashboard files were needed."
else
  line "Update result: dashboard files changed."
fi

write_ready "starting" "Dashboard files synced. Detached supervisor is restarting dashboard on the same phone port."
line "Dashboard restart: scheduling detached supervisor"
line "Supervisor script: scripts/aift-dashboard-supervisor.sh"

AIFT_NODE_DIR="$NODE_DIR" AIFT_HOME="$AIFT_HOME_DIR" APP_PORT="$APP_PORT_VALUE" AIFT_HANDOFF_PORT="$HANDOFF_PORT" nohup bash scripts/aift-dashboard-supervisor.sh >/dev/null 2>&1 &

line "Detached dashboard supervisor launched."
line "Handoff status URL: http://127.0.0.1:$HANDOFF_PORT/status"
line "Handoff export URL: http://127.0.0.1:$HANDOFF_PORT/export"
line "Finished scheduling at: $(now_utc)"
