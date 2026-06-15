#!/usr/bin/env bash
set -Eeuo pipefail

NODE_DIR="${AIFT_NODE_DIR:-$HOME/aift-termux-node-002}"
AIFT_HOME_DIR="${AIFT_HOME:-$HOME/.aift-webai}"
PUBLIC_PORT="${AIFT_PUBLIC_DASHBOARD_PORT:-${APP_PORT:-3001}}"
CANDIDATE_PORT="${AIFT_CANDIDATE_DASHBOARD_PORT:-3002}"
HANDOFF_PORT="${AIFT_HANDOFF_PORT:-3999}"
LOG_DIR="$AIFT_HOME_DIR/logs"
RUNTIME_DIR="$AIFT_HOME_DIR/runtime"
CANDIDATE_ROOT="$RUNTIME_DIR/candidates"
READY_FILE="$RUNTIME_DIR/dashboard-ready.json"
ACTIVE_FILE="$RUNTIME_DIR/dashboard-active.json"
CANDIDATE_PID_FILE="$RUNTIME_DIR/dashboard-candidate.pid"
LIVE_PID_FILE="$RUNTIME_DIR/dashboard.pid"
BLUEGREEN_LOG="$LOG_DIR/bluegreen-sync.log"
CANDIDATE_LOG="$LOG_DIR/dashboard-candidate.log"

mkdir -p "$LOG_DIR" "$RUNTIME_DIR" "$CANDIDATE_ROOT"
: > "$BLUEGREEN_LOG"

now_utc() {
  date -u +%Y-%m-%dT%H:%M:%SZ
}

log() {
  printf '%s\n' "$*" | tee -a "$BLUEGREEN_LOG"
}

write_ready() {
  local state="$1"
  local message="$2"
  printf '{"state":"%s","message":"%s","updated_at":"%s","public_port":"%s","candidate_port":"%s"}\n' "$state" "$message" "$(now_utc)" "$PUBLIC_PORT" "$CANDIDATE_PORT" > "$READY_FILE"
}

fail() {
  local message="$1"
  write_ready "error" "$message"
  log "RED $message"
  exit 1
}

port_open() {
  local port="$1"
  (echo > "/dev/tcp/127.0.0.1/$port") >/dev/null 2>&1
}

stop_pid_file() {
  local file="$1"
  local label="$2"
  if [ ! -f "$file" ]; then
    log "$label: no PID file found."
    return 0
  fi
  local pid
  pid="$(cat "$file" 2>/dev/null || true)"
  if [ -z "$pid" ]; then
    log "$label: PID file was empty."
    return 0
  fi
  if kill -0 "$pid" >/dev/null 2>&1; then
    log "$label: stopping PID $pid."
    kill "$pid" >/dev/null 2>&1 || true
    for _ in $(seq 1 10); do
      if ! kill -0 "$pid" >/dev/null 2>&1; then
        break
      fi
      sleep 1
    done
  else
    log "$label: PID $pid is not running."
  fi
}

log "AIFT BLUE/GREEN DASHBOARD SYNC"
log "Started at: $(now_utc)"
log "Node directory: $NODE_DIR"
log "AIFT home: $AIFT_HOME_DIR"
log "Public dashboard port: $PUBLIC_PORT"
log "Candidate dashboard port: $CANDIDATE_PORT"
log "Handoff port: $HANDOFF_PORT"

cd "$NODE_DIR" || fail "Node directory is unavailable."

write_ready "checking" "Checking repository state before blue/green sync."

BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo main)"
LOCAL_COMMIT="$(git rev-parse HEAD 2>/dev/null || echo unknown)"
log "Branch: $BRANCH"
log "Local commit: $LOCAL_COMMIT"

log "Fetching origin/$BRANCH."
git fetch origin "$BRANCH" || fail "Git fetch failed. Keeping current dashboard active."

REMOTE_COMMIT="$(git rev-parse "origin/$BRANCH" 2>/dev/null || echo unknown)"
COUNTS="$(git rev-list --left-right --count "HEAD...origin/$BRANCH" 2>/dev/null || echo '0 0')"
AHEAD="$(printf '%s' "$COUNTS" | awk '{print $1}')"
BEHIND="$(printf '%s' "$COUNTS" | awk '{print $2}')"
log "Remote commit: $REMOTE_COMMIT"
log "Ahead: $AHEAD"
log "Behind: $BEHIND"

if [ "$AHEAD" != "0" ]; then
  fail "Local repo is ahead or diverged. Refusing automated sync to avoid destructive overwrite."
fi

if [ "$BEHIND" = "0" ]; then
  TARGET_REF="HEAD"
  TARGET_COMMIT="$LOCAL_COMMIT"
  log "Repo is already up to date; candidate will be built from current HEAD."
else
  TARGET_REF="origin/$BRANCH"
  TARGET_COMMIT="$REMOTE_COMMIT"
  log "Repo is behind; candidate will be built from origin/$BRANCH."
fi

if [ "$TARGET_COMMIT" = "unknown" ]; then
  fail "Could not determine target commit."
fi

CANDIDATE_DIR="$CANDIDATE_ROOT/dashboard-$TARGET_COMMIT"

write_ready "preparing" "Preparing candidate dashboard checkout."

if [ -d "$CANDIDATE_DIR" ]; then
  log "Removing existing candidate worktree: $CANDIDATE_DIR"
  git worktree remove --force "$CANDIDATE_DIR" >/dev/null 2>&1 || rm -rf "$CANDIDATE_DIR"
fi

log "Creating candidate worktree: $CANDIDATE_DIR"
git worktree add --detach "$CANDIDATE_DIR" "$TARGET_REF" || fail "Could not create candidate worktree."

APP_DIR="$CANDIDATE_DIR/apps/aift-dashboard"
if [ ! -d "$APP_DIR" ]; then
  fail "Candidate dashboard app directory is missing."
fi

write_ready "installing" "Installing candidate dashboard dependencies."
cd "$APP_DIR"
npm install >> "$BLUEGREEN_LOG" 2>&1 || fail "Candidate dependency install failed."

write_ready "building" "Building candidate dashboard."
npm run build >> "$BLUEGREEN_LOG" 2>&1 || fail "Candidate dashboard build failed."

if port_open "$CANDIDATE_PORT"; then
  log "Candidate port $CANDIDATE_PORT is already open. Stopping previous candidate if tracked."
  stop_pid_file "$CANDIDATE_PID_FILE" "Previous candidate"
  sleep 1
fi

write_ready "starting" "Starting candidate dashboard on isolated port."
: > "$CANDIDATE_LOG"
AIFT_NODE_DIR="$CANDIDATE_DIR" AIFT_HOME="$AIFT_HOME_DIR" APP_PORT="$CANDIDATE_PORT" APP_HOST="127.0.0.1" npx next start --hostname 127.0.0.1 --port "$CANDIDATE_PORT" > "$CANDIDATE_LOG" 2>&1 &
CANDIDATE_PID="$!"
echo "$CANDIDATE_PID" > "$CANDIDATE_PID_FILE"
log "Candidate PID: $CANDIDATE_PID"

HEALTH_URL="http://127.0.0.1:$CANDIDATE_PORT/api/health"
write_ready "health-checking" "Waiting for candidate dashboard health check."

CANDIDATE_READY="0"
for attempt in $(seq 1 90); do
  if command -v curl >/dev/null 2>&1 && curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
    CANDIDATE_READY="1"
    break
  fi
  if ! kill -0 "$CANDIDATE_PID" >/dev/null 2>&1; then
    fail "Candidate dashboard exited before health passed. See dashboard-candidate.log."
  fi
  log "Waiting for candidate health: attempt $attempt/90"
  sleep 1
done

if [ "$CANDIDATE_READY" != "1" ]; then
  fail "Candidate dashboard did not pass health check within 90 seconds."
fi

write_ready "candidate-ready" "Candidate dashboard is healthy. Promoting active dashboard target."

PROMOTED_AT="$(now_utc)"
printf '{"target_host":"127.0.0.1","target_port":%s,"commit":"%s","branch":"%s","candidate_pid":%s,"promoted_at":"%s","public_port":%s}\n' "$CANDIDATE_PORT" "$TARGET_COMMIT" "$BRANCH" "$CANDIDATE_PID" "$PROMOTED_AT" "$PUBLIC_PORT" > "$ACTIVE_FILE"
log "Active dashboard target written to $ACTIVE_FILE"

if [ -f "$LIVE_PID_FILE" ]; then
  OLD_PID="$(cat "$LIVE_PID_FILE" 2>/dev/null || true)"
  if [ -n "$OLD_PID" ] && [ "$OLD_PID" != "$CANDIDATE_PID" ]; then
    log "Draining old live dashboard PID $OLD_PID after candidate promotion."
    kill "$OLD_PID" >/dev/null 2>&1 || true
  fi
fi

echo "$CANDIDATE_PID" > "$LIVE_PID_FILE"

write_ready "ready" "Blue/green sync complete. Candidate is healthy and promoted."
log "GREEN Blue/green sync complete."
log "Candidate URL: http://127.0.0.1:$CANDIDATE_PORT"
log "Public dashboard port remains: $PUBLIC_PORT"
log "Finished at: $(now_utc)"
