#!/usr/bin/env bash
# Runs ON THE VPS, streamed over ssh by scripts/deploy-dashboard-runner.sh:
#   flock <lock> bash -s -- APP_DIR DEPLOY_SHA RUN_ID RUN_URL ACTOR EVENT ROLLBACK < this-file
#
# Deploys exactly DEPLOY_SHA from the existing checkout at APP_DIR, verifies that
# the running dashboard is healthy AND reports DEPLOY_SHA, then appends one
# provenance record and updates the last-known-healthy revision. Everything is
# validated before anything on the server changes. Nothing here clones, pulls a
# branch, or falls back to a default path. Every check fails closed.
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
REVISION_LABEL="org.opencontainers.image.revision"
HEALTH_ATTEMPTS="${AIFT_HEALTH_ATTEMPTS:-30}"
HEALTH_INTERVAL_S="${AIFT_HEALTH_INTERVAL_S:-2}"
HEALTH_TIMEOUT_S="${AIFT_HEALTH_TIMEOUT_S:-5}"
SHA_RE='^[0-9a-f]{40}$'

refuse() {
  echo "Refusing deployment: $*" >&2
  exit 1
}

bounded_int() { # name value min max
  [[ "$2" =~ ^[0-9]{1,4}$ ]] || refuse "$1 must be an integer"
  ((10#$2 >= $3 && 10#$2 <= $4)) || refuse "$1 must be between $3 and $4"
}
bounded_int AIFT_HEALTH_ATTEMPTS "$HEALTH_ATTEMPTS" 1 60
bounded_int AIFT_HEALTH_INTERVAL_S "$HEALTH_INTERVAL_S" 0 10
bounded_int AIFT_HEALTH_TIMEOUT_S "$HEALTH_TIMEOUT_S" 1 30

[ -n "$APP_DIR" ] || refuse "VPS_APP_PATH is empty"
[[ "$APP_DIR" =~ ^/[A-Za-z0-9._/-]+$ ]] || refuse "app path must be an absolute path"
[ -d "$APP_DIR/.git" ] || refuse "${APP_DIR} is not a git repository"
[[ "$DEPLOY_SHA" =~ $SHA_RE ]] || refuse "invalid commit SHA"
[[ "$RUN_ID" =~ ^[0-9]{1,20}$ ]] || refuse "invalid workflow run id"
[[ "$RUN_URL" =~ ^https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/actions/runs/[0-9]+$ ]] || refuse "invalid workflow run URL"
[[ "$ACTOR" =~ ^[A-Za-z0-9]([A-Za-z0-9-]{0,38})(\[bot\])?$ ]] || refuse "invalid actor"
case "$EVENT" in push | workflow_dispatch) ;; *) refuse "invalid trigger event" ;; esac
case "$ROLLBACK" in true | false) ;; *) refuse "invalid rollback flag" ;; esac

for tool in git docker curl python3; do
  command -v "$tool" > /dev/null || refuse "$tool is not installed"
done

# Provenance and last-known-healthy state must be usable BEFORE the server changes.
mkdir -p "$STATE_DIR" || refuse "cannot create provenance directory"
LOG_FILE="$STATE_DIR/deployments.jsonl"
LAST_HEALTHY_FILE="$STATE_DIR/last-healthy-sha"
: >> "$LOG_FILE" || refuse "cannot write provenance log"
LAST_HEALTHY_BEFORE="none"
if [ -e "$LAST_HEALTHY_FILE" ]; then
  LAST_HEALTHY_BEFORE="$(cat "$LAST_HEALTHY_FILE")" || refuse "cannot read $LAST_HEALTHY_FILE"
  [[ "$LAST_HEALTHY_BEFORE" =~ $SHA_RE ]] || refuse "$LAST_HEALTHY_FILE is corrupt; fix it before deploying"
fi

cd "$APP_DIR"
checkout_status=$(git status --porcelain --untracked-files=all) || refuse "cannot inspect remote checkout"
[ -z "$checkout_status" ] || refuse "dirty checkout"
[ "$(git rev-parse --is-shallow-repository)" = "false" ] || refuse "shallow checkout: ancestry cannot be verified"
PREVIOUS_SHA=$(git rev-parse --verify "HEAD^{commit}") || refuse "cannot read current revision"

STATUS="failed"
RUNNING_COMMIT="unknown"
write_record() {
  local rc=$?
  trap - EXIT
  local server_head ts line
  server_head=$(git -C "$APP_DIR" rev-parse HEAD 2> /dev/null || echo unknown)
  [[ "$server_head" =~ $SHA_RE ]] || server_head="unknown"
  [[ "$RUNNING_COMMIT" =~ $SHA_RE ]] || RUNNING_COMMIT="unknown"
  ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  printf -v line '{"timestamp_utc":"%s","status":"%s","deployed_sha":"%s","previous_sha":"%s","server_head":"%s","running_commit":"%s","last_healthy_before":"%s","run_id":"%s","run_url":"%s","actor":"%s","event":"%s","rollback":%s}' \
    "$ts" "$STATUS" "$DEPLOY_SHA" "$PREVIOUS_SHA" "$server_head" "$RUNNING_COMMIT" "$LAST_HEALTHY_BEFORE" "$RUN_ID" "$RUN_URL" "$ACTOR" "$EVENT" "$ROLLBACK"
  if printf '%s\n' "$line" >> "$LOG_FILE"; then
    echo "AIFT_DEPLOY_RECORD $line"
  else
    echo "Could not append deployment record to $LOG_FILE" >&2
    [ "$rc" -ne 0 ] || rc=1
  fi
  exit "$rc"
}
trap write_record EXIT

# is_ancestor A B -> 0 if A is an ancestor of (or equal to) B, 1 if not.
# Any other git result (unknown object, corrupt or shallow history) refuses.
is_ancestor() {
  local rc=0
  git merge-base --is-ancestor "$1" "$2" || rc=$?
  case "$rc" in
    0 | 1) return "$rc" ;;
    *)
      STATUS="refused_ancestry"
      refuse "cannot verify ancestry of $1 and $2 (git exit $rc)"
      ;;
  esac
}

git fetch origin -- "$DEPLOY_SHA" || refuse "cannot fetch $DEPLOY_SHA from origin"
git cat-file -e "${DEPLOY_SHA}^{commit}" || refuse "$DEPLOY_SHA is not a commit"
if [ "$ROLLBACK" = "true" ]; then
  # Rollbacks may go backwards, but only to a commit that is on main.
  git fetch origin -- "+refs/heads/main:refs/remotes/origin/main" || refuse "cannot fetch origin/main"
  if ! is_ancestor "$DEPLOY_SHA" refs/remotes/origin/main; then
    STATUS="refused_rollback_target"
    refuse "rollback target $DEPLOY_SHA is not an ancestor of origin/main"
  fi
else
  # A normal deploy may only move forward from what is deployed now.
  if ! is_ancestor "$PREVIOUS_SHA" "$DEPLOY_SHA"; then
    STATUS="refused_downgrade"
    refuse "$DEPLOY_SHA does not descend from the deployed $PREVIOUS_SHA; use rollback_sha for an intentional rollback"
  fi
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
# compose.yml passes this to the image build (label + /api/health "commit").
export AIFT_COMMIT_SHA="$DEPLOY_SHA"
docker compose -f compose.yml up -d --build
docker compose -f compose.yml ps
RUNNING_COMMIT=$(docker inspect -f "{{ index .Config.Labels \"$REVISION_LABEL\" }}" "$CONTAINER_NAME" 2> /dev/null || true)

# Strict health schema: a JSON object with ok === true, a known status, a
# checked_at string, a checks list, and commit equal to the deployed SHA.
validate_health() { # expected_sha < body
  python3 -c '
import json, re, sys

def unique(pairs):
    seen = {}
    for key, value in pairs:
        if key in seen:
            raise ValueError("duplicate key")
        seen[key] = value
    return seen

def reject_constant(value):
    raise ValueError("non-finite number")

expected = sys.argv[1]
try:
    data = json.loads(sys.stdin.read(), object_pairs_hook=unique, parse_constant=reject_constant)
except ValueError as error:
    sys.exit("health response is not valid JSON: %s" % error)
if not isinstance(data, dict):
    sys.exit("health response is not a JSON object")
if "ok" not in data:
    sys.exit("health response has no ok field")
if data["ok"] is not True:
    sys.exit("health response ok is not true")
if data.get("status") not in ("healthy", "warning"):
    sys.exit("health response status is not healthy or warning")
if not isinstance(data.get("checked_at"), str) or not isinstance(data.get("checks"), list):
    sys.exit("health response is missing checked_at or checks")
commit = data.get("commit")
if not isinstance(commit, str) or not re.fullmatch(r"[0-9a-f]{40}", commit):
    sys.exit("health response has no valid commit")
if commit != expected:
    sys.exit("running commit %s is not the deployed %s" % (commit, expected))
' "$1"
}

# Bounded health verification against the loopback-only published port.
healthy=0
reason="not checked"
for attempt in $(seq 1 "$((10#$HEALTH_ATTEMPTS))"); do
  state=$(docker inspect -f '{{.State.Running}} {{.State.Restarting}}' "$CONTAINER_NAME" 2> /dev/null || true)
  if [ "$state" != "true false" ]; then
    reason="container state: ${state:-unknown}"
  elif ! body=$(curl -fsS --max-time "$((10#$HEALTH_TIMEOUT_S))" --max-filesize 65536 "$HEALTH_URL" 2> /dev/null); then
    reason="health endpoint did not answer"
  elif ! reason=$(validate_health "$DEPLOY_SHA" <<< "$body" 2>&1); then
    :
  else
    healthy=1
    break
  fi
  echo "Health check $attempt/$HEALTH_ATTEMPTS not ready ($reason)" >&2
  if [ "$attempt" -lt "$((10#$HEALTH_ATTEMPTS))" ]; then sleep "$((10#$HEALTH_INTERVAL_S))"; fi
done
if [ "$healthy" -ne 1 ]; then
  STATUS="unhealthy"
  docker compose -f compose.yml ps >&2 || true
  echo "Dashboard did not become healthy within $HEALTH_ATTEMPTS attempts (last: $reason)" >&2
  exit 1
fi

# Exact-target verification: checkout, running container and app must all be DEPLOY_SHA.
server_head=$(git -C "$APP_DIR" rev-parse HEAD)
RUNNING_COMMIT=$(docker inspect -f "{{ index .Config.Labels \"$REVISION_LABEL\" }}" "$CONTAINER_NAME" 2> /dev/null || true)
if [ "$server_head" != "$DEPLOY_SHA" ] || [ "$RUNNING_COMMIT" != "$DEPLOY_SHA" ]; then
  STATUS="target_mismatch"
  refuse "deployed target mismatch: checkout=$server_head container=${RUNNING_COMMIT:-none} expected=$DEPLOY_SHA"
fi

# Last-known-healthy revision, written atomically and only after full verification.
tmp_healthy="$LAST_HEALTHY_FILE.tmp.$$"
if ! { printf '%s\n' "$DEPLOY_SHA" > "$tmp_healthy" && mv -f "$tmp_healthy" "$LAST_HEALTHY_FILE"; }; then
  STATUS="failed"
  refuse "cannot record last healthy revision"
fi

STATUS="healthy"
echo "AIFT Dashboard $DEPLOY_SHA deployed to Sacramento Node 001, healthy and verified on 127.0.0.1:3000."
