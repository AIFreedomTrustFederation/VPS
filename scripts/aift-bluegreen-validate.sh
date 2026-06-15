#!/usr/bin/env bash
set -Eeuo pipefail

NODE_DIR="${AIFT_NODE_DIR:-$HOME/aift-termux-node-002}"
AIFT_HOME_DIR="${AIFT_HOME:-$HOME/.aift-webai}"
PUBLIC_PORT="${AIFT_PUBLIC_DASHBOARD_PORT:-${APP_PORT:-3001}}"
CANDIDATE_PORT="${AIFT_CANDIDATE_DASHBOARD_PORT:-3002}"
LOG_DIR="$AIFT_HOME_DIR/logs"
RUNTIME_DIR="$AIFT_HOME_DIR/runtime"
CANDIDATE_ROOT="$RUNTIME_DIR/candidates"
READY_FILE="$RUNTIME_DIR/dashboard-ready.json"
ACTIVE_FILE="$RUNTIME_DIR/dashboard-active.json"
CANDIDATE_PID_FILE="$RUNTIME_DIR/dashboard-candidate.pid"
VALIDATE_LOG="$LOG_DIR/bluegreen-validate.log"
CANDIDATE_LOG="$LOG_DIR/dashboard-candidate.log"

mkdir -p "$LOG_DIR" "$RUNTIME_DIR" "$CANDIDATE_ROOT"
: > "$VALIDATE_LOG"

now_utc() {
  date -u +%Y-%m-%dT%H:%M:%SZ
}

log() {
  printf '%s\n' "$*" | tee -a "$VALIDATE_LOG"
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

log "AIFT BLUE/GREEN VALIDATION"
log "Started at: $(now_utc)"
log "Node directory: $NODE_DIR"
log "AIFT home: $AIFT_HOME_DIR"
log "Public dashboard port left untouched: $PUBLIC_PORT"
log "Candidate validation port: $CANDIDATE_PORT"

cd "$NODE_DIR" || fail "Node directory is unavailable."

write_ready "checking" "Checking repository state before non-destructive candidate validation."

BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo main)"
LOCAL_COMMIT="$(git rev-parse HEAD 2>/dev/null || echo unknown)"
log "Branch: $BRANCH"
log "Local commit: $LOCAL_COMMIT"

log "Fetching origin/$BRANCH."
git fetch origin "$BRANCH" || fail "Git fetch failed. Public dashboard was not touched."

REMOTE_COMMIT="$(git rev-parse "origin/$BRANCH" 2>/dev/null || echo unknown)"
COUNTS="$(git rev-list --left-right --count "HEAD...origin/$BRANCH" 2>/dev/null || echo '0 0')"
AHEAD="$(printf '%s' "$COUNTS" | awk '{print $1}')"
BEHIND="$(printf '%s' "$COUNTS" | awk '{print $2}')"
log "Remote commit: $REMOTE_COMMIT"
log "Ahead: $AHEAD"
log "Behind: $BEHIND"

if [ "$AHEAD" != "0" ]; then
  fail "Local repo is ahead or diverged. Refusing automated candidate validation to avoid overwriting local work."
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

if port_open "$CANDIDATE_PORT"; then
  fail "Candidate port $CANDIDATE_PORT is already in use. Stop the existing candidate or choose AIFT_CANDIDATE_DASHBOARD_PORT."
fi

CANDIDATE_DIR="$CANDIDATE_ROOT/dashboard-$TARGET_COMMIT"
write_ready "preparing" "Preparing candidate dashboard checkout."

if [ -d "$CANDIDATE_DIR" ]; then
  log "Removing stale candidate directory before validation."
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
npm install >> "$VALIDATE_LOG" 2>&1 || fail "Candidate dependency install failed."

write_ready "building" "Building candidate dashboard."
npm run build >> "$VALIDATE_LOG" 2>&1 || fail "Candidate dashboard build failed."

write_ready "starting-candidate" "Starting candidate dashboard on isolated validation port."
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
  fail "Candidate dashboard did not pass health check within 90 seconds. Public dashboard was not touched."
fi

VALIDATED_AT="$(now_utc)"
printf '{"target_host":"127.0.0.1","target_port":%s,"commit":"%s","branch":"%s","candidate_pid":%s,"validated_at":"%s","public_port":%s,"mode":"validated-candidate-public-untouched"}\n' "$CANDIDATE_PORT" "$TARGET_COMMIT" "$BRANCH" "$CANDIDATE_PID" "$VALIDATED_AT" "$PUBLIC_PORT" > "$ACTIVE_FILE"

write_ready "ready" "Candidate validation complete. Public dashboard was left running to prevent downtime."
log "GREEN Candidate validation complete."
log "Candidate URL: http://127.0.0.1:$CANDIDATE_PORT"
log "Public dashboard still running on port $PUBLIC_PORT"
log "Finished at: $(now_utc)"
