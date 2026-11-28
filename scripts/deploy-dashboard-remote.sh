#!/usr/bin/env bash
# Runs ON THE VPS, streamed over ssh by scripts/deploy-dashboard-runner.sh:
#   flock <lock> bash -s -- APP_DIR DEPLOY_SHA RUN_ID RUN_URL ACTOR EVENT ROLLBACK < this-file
#
# Deploys exactly DEPLOY_SHA from the existing checkout at APP_DIR, verifies the
# dashboard is healthy within a bounded time, and appends one provenance record.
# Everything is validated before anything on the server changes. Nothing here
# clones, pulls a branch, or falls back to a default path.
set -Eeuo pipefail

APP_DIR="${1:-}"
DEPLOY_SHA="${2:-}"
RUN_ID="${3:-}"
RUN_URL="${4:-}"
ACTOR="${5:-}"
EVENT="${6:-}"
ROLLBACK="${7:-}"

# Tunables are bounded below. ssh does not forward these variables, so
# production always uses the defaults; they exist so the guards can be tested.
OPT_DIR="${AIFT_OPT_DIR:-/opt/aift}"
STATE_DIR="${AIFT_DEPLOY_STATE_DIR:-/var/lib/aift/dashboard-deploys}"
HEALTH_URL="http://127.0.0.1:3000/api/health" # compose publishes 127.0.0.1:3000 only
CONTAINER_NAME="aift-dashboard"
HEALTH_ATTEMPTS="${AIFT_HEALTH_ATTEMPTS:-30}"
HEALTH_INTERVAL_S="${AIFT_HEALTH_INTERVAL_S:-2}"
HEALTH_TIMEOUT_S="${AIFT_HEALTH_TIMEOUT_S:-5}"

refuse() {
  echo "Refusing deployment: $*" >&2
  exit 1
}

bounded_int() { # name value min max
  [[ "$2" =~ ^[0-9]{1,4}$ ]] || refuse "$1 must be an integer"
  (( 10#$2 >= $3 && 10#$2 <= $4 )) || refuse "$1 must be between $3 and $4"
}
bounded_int AIFT_HEALTH_ATTEMPTS "$HEALTH_ATTEMPTS" 1 60
bounded_int AIFT_HEALTH_INTERVAL_S "$HEALTH_INTERVAL_S" 0 10
bounded_int AIFT_HEALTH_TIMEOUT_S "$HEALTH_TIMEOUT_S" 1 30

[ -n "$APP_DIR" ] || refuse "VPS_APP_PATH is empty"
[[ "$APP_DIR" =~ ^/[A-Za-z0-9._/-]+$ ]] || refuse "app path must be an absolute path"
[ -d "$APP_DIR/.git" ] || refuse "${APP_DIR} is not a git repository"
[[ "$DEPLOY_SHA" =~ ^[0-9a-f]{40}$ ]] || refuse "invalid commit SHA"
[[ "$RUN_ID" =~ ^[0-9]{1,20}$ ]] || refuse "invalid workflow run id"
[[ "$RUN_URL" =~ ^https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/actions/runs/[0-9]+$ ]] || refuse "invalid workflow run URL"
[[ "$ACTOR" =~ ^[A-Za-z0-9]([A-Za-z0-9-]{0,38})(\[bot\])?$ ]] || refuse "invalid actor"
case "$EVENT" in push | workflow_dispatch) ;; *) refuse "invalid trigger event" ;; esac
case "$ROLLBACK" in true | false) ;; *) refuse "invalid rollback flag" ;; esac

command -v docker > /dev/null || refuse "docker is not installed"
command -v curl > /dev/null || refuse "curl is not installed"

# The provenance log must be writable BEFORE the server is changed.
mkdir -p "$STATE_DIR" || refuse "cannot create provenance directory"
LOG_FILE="$STATE_DIR/deployments.jsonl"
: >> "$LOG_FILE" || refuse "cannot write provenance log"

cd "$APP_DIR"
checkout_status=$(git status --porcelain --untracked-files=all) || refuse "cannot inspect remote checkout"
[ -z "$checkout_status" ] || refuse "dirty checkout"
PREVIOUS_SHA=$(git rev-parse HEAD) || refuse "cannot read current revision"

STATUS="failed"
write_record() {
  local rc=$?
  trap - EXIT
  local server_head ts line
  server_head=$(git -C "$APP_DIR" rev-parse HEAD 2> /dev/null || echo unknown)
  ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  printf -v line '{"timestamp_utc":"%s","status":"%s","deployed_sha":"%s","previous_sha":"%s","server_head":"%s","run_id":"%s","run_url":"%s","actor":"%s","event":"%s","rollback":%s}' \
    "$ts" "$STATUS" "$DEPLOY_SHA" "$PREVIOUS_SHA" "$server_head" "$RUN_ID" "$RUN_URL" "$ACTOR" "$EVENT" "$ROLLBACK"
  if printf '%s\n' "$line" >> "$LOG_FILE"; then
    echo "AIFT_DEPLOY_RECORD $line"
  else
    echo "Could not append deployment record to $LOG_FILE" >&2
    [ "$rc" -ne 0 ] || rc=1
  fi
  exit "$rc"
}
trap write_record EXIT

git fetch origin -- "$DEPLOY_SHA" || refuse "cannot fetch $DEPLOY_SHA from origin"
# A run that waited for approval (or a re-run) must never silently downgrade a
# newer deployment; going backwards is only allowed as an explicit rollback.
if [ "$ROLLBACK" = "false" ] && [ "$PREVIOUS_SHA" != "$DEPLOY_SHA" ] \
  && git merge-base --is-ancestor "$DEPLOY_SHA" "$PREVIOUS_SHA" 2> /dev/null; then
  STATUS="refused_downgrade"
  refuse "$DEPLOY_SHA is older than the deployed $PREVIOUS_SHA; use rollback_sha for an intentional rollback"
fi
git checkout --detach "$DEPLOY_SHA"
[ "$(git rev-parse HEAD)" = "$DEPLOY_SHA" ] || refuse "remote revision differs from workflow commit $DEPLOY_SHA"
checkout_status=$(git status --porcelain --untracked-files=all) || refuse "cannot inspect remote checkout"
[ -z "$checkout_status" ] || refuse "dirty checkout at verified commit"

mkdir -p "$OPT_DIR/registry" "$OPT_DIR/logs" "$OPT_DIR/secrets"
for registry in nodes templates builds deployments; do
  [ -f "$OPT_DIR/registry/$registry.yml" ] || cp "registry-examples/$registry.yml" "$OPT_DIR/registry/$registry.yml"
done
if [ ! -f "$OPT_DIR/registry/apps.yml" ]; then
  cat > "$OPT_DIR/registry/apps.yml" << 'APPREGISTRY'
apps:
  aift-dashboard:
    repo: https://github.com/AIFreedomTrustFederation/VPS
    branch: main
    domain: vps.aifreedomtrust.com
    framework: nextjs
    status: running
    node: sacramento-node-001
    trust_class: business-app
APPREGISTRY
fi

cd apps/aift-dashboard
docker compose -f compose.yml up -d --build
docker compose -f compose.yml ps

# Bounded health verification against the loopback-only published port.
healthy=0
for attempt in $(seq 1 "$((10#$HEALTH_ATTEMPTS))"); do
  state=$(docker inspect -f '{{.State.Running}} {{.State.Restarting}}' "$CONTAINER_NAME" 2> /dev/null || true)
  if [ "$state" = "true false" ] \
    && body=$(curl -fsS --max-time "$((10#$HEALTH_TIMEOUT_S))" "$HEALTH_URL" 2> /dev/null) \
    && [[ "$body" == *'"ok":true'* ]]; then
    healthy=1
    break
  fi
  echo "Health check $attempt/$HEALTH_ATTEMPTS not ready (container state: ${state:-unknown})" >&2
  [ "$attempt" -lt "$((10#$HEALTH_ATTEMPTS))" ] && sleep "$((10#$HEALTH_INTERVAL_S))"
done
if [ "$healthy" -ne 1 ]; then
  STATUS="unhealthy"
  docker compose -f compose.yml ps >&2 || true
  echo "Dashboard did not become healthy within $HEALTH_ATTEMPTS attempts" >&2
  exit 1
fi

STATUS="healthy"
echo "AIFT Dashboard $DEPLOY_SHA deployed to Sacramento Node 001 and healthy on 127.0.0.1:3000."
