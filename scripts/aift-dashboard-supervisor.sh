#!/usr/bin/env bash
set -u

NODE_DIR="${AIFT_NODE_DIR:-$HOME/aift-termux-node-002}"
AIFT_HOME_DIR="${AIFT_HOME:-$HOME/.aift-webai}"
APP_PORT_VALUE="${APP_PORT:-3001}"
HANDOFF_PORT="${AIFT_HANDOFF_PORT:-3999}"
LOG_DIR="$AIFT_HOME_DIR/logs"
RUNTIME_DIR="$AIFT_HOME_DIR/runtime"
READY_FILE="$RUNTIME_DIR/dashboard-ready.json"
PID_FILE="$RUNTIME_DIR/dashboard.pid"
SUPERVISOR_LOG="$LOG_DIR/dashboard-supervisor.log"
DASHBOARD_LOG="$LOG_DIR/dashboard-runtime.log"
HANDOFF_LOG="$LOG_DIR/sync-handoff.log"

mkdir -p "$LOG_DIR" "$RUNTIME_DIR"

log() {
  printf '%s\n' "$*" | tee -a "$SUPERVISOR_LOG"
}

write_ready() {
  local state="$1"
  local message="$2"
  printf '{"state":"%s","message":"%s","updated_at":"%s","port":"%s"}\n' "$state" "$message" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$APP_PORT_VALUE" > "$READY_FILE"
}

: > "$SUPERVISOR_LOG"
log "AIFT DASHBOARD SUPERVISOR"
log "Started at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
log "Node directory: $NODE_DIR"
log "AIFT home: $AIFT_HOME_DIR"
log "Dashboard port: $APP_PORT_VALUE"
log "Handoff port: $HANDOFF_PORT"

cd "$NODE_DIR" || {
  log "RED node directory is unavailable."
  exit 1
}

write_ready "starting" "Dashboard supervisor is preparing a safe restart."

if [ -f "scripts/aift-sync-handoff-server.mjs" ] && command -v node >/dev/null 2>&1; then
  if ! (echo > "/dev/tcp/127.0.0.1/$HANDOFF_PORT") >/dev/null 2>&1; then
    log "Starting handoff server on $HANDOFF_PORT."
    AIFT_HOME="$AIFT_HOME_DIR" APP_PORT="$APP_PORT_VALUE" AIFT_HANDOFF_PORT="$HANDOFF_PORT" node scripts/aift-sync-handoff-server.mjs > "$HANDOFF_LOG" 2>&1 &
    sleep 1
  else
    log "Handoff server already open on $HANDOFF_PORT."
  fi
else
  log "YELLOW handoff server could not be started."
fi

log "Stopping old dashboard process by PID file when available."
if [ -f "$PID_FILE" ]; then
  OLD_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" >/dev/null 2>&1; then
    log "Stopping dashboard PID $OLD_PID."
    kill "$OLD_PID" >/dev/null 2>&1 || true
    sleep 2
    if kill -0 "$OLD_PID" >/dev/null 2>&1; then
      log "Dashboard PID $OLD_PID did not exit; sending TERM again."
      kill "$OLD_PID" >/dev/null 2>&1 || true
      sleep 1
    fi
  else
    log "PID file exists but no live dashboard process was found."
  fi
else
  log "No dashboard PID file found; refusing broad pkill to avoid stopping unrelated Next.js apps."
fi

log "Clearing dashboard build cache."
rm -rf apps/aift-dashboard/.next

write_ready "starting" "Dashboard supervisor is starting the dashboard and waiting for HTTP health."
log "Launching dashboard detached on port $APP_PORT_VALUE."

AIFT_NODE_DIR="$NODE_DIR" AIFT_HOME="$AIFT_HOME_DIR" APP_PORT="$APP_PORT_VALUE" AIFT_HANDOFF_PORT="$HANDOFF_PORT" bash scripts/aift-start-dashboard.sh > "$DASHBOARD_LOG" 2>&1 &

log "Dashboard launch command is detached."
log "Dashboard URL: http://127.0.0.1:$APP_PORT_VALUE"
log "Handoff status: http://127.0.0.1:$HANDOFF_PORT/status"
log "Export logs: http://127.0.0.1:$HANDOFF_PORT/export"
log "Finished at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
