#!/usr/bin/env bash
set -u

NODE_DIR="${AIFT_NODE_DIR:-$HOME/aift-termux-node-002}"
AIFT_HOME_DIR="${AIFT_HOME:-$HOME/.aift-webai}"
APP_PORT_VALUE="${APP_PORT:-3001}"
HANDOFF_PORT="${AIFT_HANDOFF_PORT:-3999}"
HOST="127.0.0.1"
LOG_DIR="$AIFT_HOME_DIR/logs"
RUNTIME_DIR="$AIFT_HOME_DIR/runtime"
LAUNCH_LOG="$LOG_DIR/phone-launch.log"
HANDOFF_LOG="$LOG_DIR/sync-handoff.log"
READY_FILE="$RUNTIME_DIR/dashboard-ready.json"
HANDOFF_STATUS_URL="http://$HOST:$HANDOFF_PORT/status"
DASHBOARD_URL="http://$HOST:$APP_PORT_VALUE/sync"

mkdir -p "$LOG_DIR" "$RUNTIME_DIR"
: > "$LAUNCH_LOG"

log() {
  printf '%s\n' "$*" | tee -a "$LAUNCH_LOG"
}

write_ready() {
  local state="$1"
  local message="$2"
  printf '{"state":"%s","message":"%s","updated_at":"%s","port":"%s"}\n' "$state" "$message" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$APP_PORT_VALUE" > "$READY_FILE"
}

http_ok() {
  local url="$1"
  node -e "fetch(process.argv[1]).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" "$url" >/dev/null 2>&1
}

open_android_url() {
  local url="$1"
  if command -v am >/dev/null 2>&1; then
    am start -a android.intent.action.VIEW -d "$url" >/dev/null 2>&1 || true
  fi
}

progress() {
  local label="$1"
  local current="$2"
  local total="$3"
  local width=24
  local filled=$(( current * width / total ))
  local empty=$(( width - filled ))
  local bar=""
  for _ in $(seq 1 "$filled" 2>/dev/null); do bar="${bar}█"; done
  for _ in $(seq 1 "$empty" 2>/dev/null); do bar="${bar}░"; done
  log "$label [$bar] $(( current * 100 / total ))%"
}

log "AIFT PHONE LAUNCH"
log "Started at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
log "Node directory: $NODE_DIR"
log "Dashboard URL: $DASHBOARD_URL"
log "Handoff status URL: $HANDOFF_STATUS_URL"

cd "$NODE_DIR" || {
  log "RED node directory is unavailable."
  exit 1
}

if command -v termux-wake-lock >/dev/null 2>&1; then
  termux-wake-lock >/dev/null 2>&1 || true
  log "GREEN wake lock requested."
fi

write_ready "starting" "AIFT phone launcher is starting handoff before opening the app."

if [ -f "scripts/aift-sync-handoff-server.mjs" ] && command -v node >/dev/null 2>&1; then
  if http_ok "$HANDOFF_STATUS_URL"; then
    log "GREEN handoff server already open."
  else
    log "YELLOW starting handoff server first."
    AIFT_HOME="$AIFT_HOME_DIR" APP_PORT="$APP_PORT_VALUE" AIFT_HANDOFF_PORT="$HANDOFF_PORT" node scripts/aift-sync-handoff-server.mjs > "$HANDOFF_LOG" 2>&1 &
    sleep 1
  fi
fi

open_android_url "$HANDOFF_STATUS_URL"

write_ready "syncing" "AIFT phone launcher is syncing repo before dashboard launch."
progress "Sync setup" 1 5

git pull --ff-only >> "$LAUNCH_LOG" 2>&1 || log "YELLOW git pull did not fast-forward cleanly. Continuing with local files."
progress "Sync setup" 2 5

write_ready "starting" "Detached supervisor is launching dashboard on the phone port."
AIFT_NODE_DIR="$NODE_DIR" AIFT_HOME="$AIFT_HOME_DIR" APP_PORT="$APP_PORT_VALUE" AIFT_HANDOFF_PORT="$HANDOFF_PORT" nohup bash scripts/aift-dashboard-supervisor.sh >/dev/null 2>&1 &
progress "Dashboard launch" 3 5

for i in $(seq 1 45); do
  if http_ok "http://$HOST:$APP_PORT_VALUE/api/dashboard-ready"; then
    progress "Dashboard ready" 5 5
    log "GREEN dashboard is open at $DASHBOARD_URL"
    open_android_url "$DASHBOARD_URL"
    exit 0
  fi
  if [ $(( i % 5 )) -eq 0 ]; then
    progress "Waiting for dashboard" 4 5
  fi
  sleep 2
done

write_ready "waiting" "Dashboard launch is still warming up. Keep the handoff page open."
log "YELLOW dashboard did not answer yet. Keep handoff status open: $HANDOFF_STATUS_URL"
open_android_url "$HANDOFF_STATUS_URL"
exit 0
