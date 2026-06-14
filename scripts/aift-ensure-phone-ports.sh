#!/usr/bin/env bash
set -u

NODE_DIR="${AIFT_NODE_DIR:-$(pwd)}"
AIFT_HOME="${AIFT_HOME:-$HOME/.aift-webai}"
APP_PORT="${APP_PORT:-3001}"
HANDOFF_PORT="${AIFT_HANDOFF_PORT:-3999}"
HOST="127.0.0.1"
LOG_DIR="$AIFT_HOME/logs"
RUNTIME_DIR="$AIFT_HOME/runtime"
LOG_FILE="$LOG_DIR/phone-port-check.log"
READY_FILE="$RUNTIME_DIR/dashboard-ready.json"
RUNNING_FILE="$RUNTIME_DIR/dashboard-running.json"
HANDOFF_LOG="$LOG_DIR/sync-handoff.log"
DASHBOARD_LOG="$LOG_DIR/dashboard-runtime.log"

mkdir -p "$LOG_DIR" "$RUNTIME_DIR"
: > "$LOG_FILE"

log() {
  printf '%s\n' "$*" | tee -a "$LOG_FILE"
}

http_ok() {
  local url="$1"
  node -e "fetch(process.argv[1]).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" "$url" >/dev/null 2>&1
}

log "AIFT PHONE PORT CHECK"
log "Started at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
log "Node directory: $NODE_DIR"
log "AIFT home: $AIFT_HOME"
log "Dashboard URL: http://$HOST:$APP_PORT"
log "Handoff URL: http://$HOST:$HANDOFF_PORT"
log ""

cd "$NODE_DIR" || {
  log "RED node directory is not available."
  exit 1
}

if http_ok "http://$HOST:$HANDOFF_PORT/status"; then
  log "GREEN handoff server is open at http://$HOST:$HANDOFF_PORT/status"
else
  log "YELLOW handoff server was closed; starting it now."
  AIFT_HOME="$AIFT_HOME" APP_PORT="$APP_PORT" AIFT_HANDOFF_PORT="$HANDOFF_PORT" node scripts/aift-sync-handoff-server.mjs > "$HANDOFF_LOG" 2>&1 &
  sleep 1
  if http_ok "http://$HOST:$HANDOFF_PORT/status"; then
    log "GREEN handoff server started at http://$HOST:$HANDOFF_PORT/status"
  else
    log "RED handoff server did not open on port $HANDOFF_PORT"
  fi
fi

if http_ok "http://$HOST:$APP_PORT/api/dashboard-ready"; then
  log "GREEN dashboard API is open at http://$HOST:$APP_PORT/api/dashboard-ready"
else
  log "YELLOW dashboard API was closed; starting dashboard now."
  printf '{"state":"starting","message":"Phone port recovery is starting the dashboard.","updated_at":"%s","port":"%s"}\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$APP_PORT" > "$READY_FILE"
  (APP_PORT="$APP_PORT" AIFT_HOME="$AIFT_HOME" bash scripts/aift-start-dashboard.sh > "$DASHBOARD_LOG" 2>&1 &)
  sleep 3
  if http_ok "http://$HOST:$APP_PORT/api/dashboard-ready"; then
    log "GREEN dashboard API recovered at http://$HOST:$APP_PORT/api/dashboard-ready"
  else
    log "RED dashboard API did not recover on port $APP_PORT yet. Keep handoff open: http://$HOST:$HANDOFF_PORT/status"
  fi
fi

if [ -s "$READY_FILE" ]; then
  log "GREEN ready file exists: $READY_FILE"
else
  log "RED ready file missing: $READY_FILE"
fi

if [ -s "$RUNNING_FILE" ]; then
  log "GREEN running file exists: $RUNNING_FILE"
else
  log "YELLOW running file missing: $RUNNING_FILE"
fi

log ""
log "Open dashboard: http://$HOST:$APP_PORT"
log "Open sync hub: http://$HOST:$APP_PORT/sync"
log "Open handoff status: http://$HOST:$HANDOFF_PORT/status"
log "Export logs: http://$HOST:$HANDOFF_PORT/export"
log "Finished at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
