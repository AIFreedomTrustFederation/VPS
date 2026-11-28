#!/usr/bin/env bash
# Runner-side helpers for the VPS dashboard deploy workflows.
#   gate            decide whether this run may deploy (VPS_DEPLOY_ENABLED must be exactly 'true')
#   validate        check required configuration and shapes (names only, never values)
#   resolve-target  choose the SHA to deploy; rollback SHAs must be ancestors of origin/main
#   ssh-setup       write the SSH key and pinned known_hosts, require a matching host entry
#   deploy          run scripts/deploy-dashboard-remote.sh on the server under flock
#   summarize       publish the server's provenance record to the job summary
# All input arrives through environment variables; nothing is interpolated into code.
set -Eeuo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCK_FILE="/var/lock/aift-dashboard-deploy.lock"

fail() {
  echo "Refusing deployment: $*" >&2
  exit 1
}

output() { # key value
  if [ -n "${GITHUB_OUTPUT:-}" ]; then
    printf '%s=%s\n' "$1" "$2" >> "$GITHUB_OUTPUT"
  fi
}

port_of() {
  echo "${VPS_PORT:-22}"
}

cmd_gate() {
  # Byte-exact, case-sensitive comparison in bash. GitHub expression '==' is
  # case-insensitive, so the raw variable value is compared here instead.
  local raw="${VPS_DEPLOY_ENABLED_RAW-}" event="${EVENT_NAME:-}" ref="${REF_FULL:-}" deploy=false
  if [ "$raw" = "true" ] && [ "$ref" = "refs/heads/main" ]; then
    case "$event" in push | workflow_dispatch) deploy=true ;; esac
  fi
  output deploy "$deploy"
  if [ "$deploy" = "true" ]; then
    echo "Deployment authorized for $event on $ref."
    return 0
  fi
  if [ "$event" = "workflow_dispatch" ]; then
    echo "::error::Manual deploy refused: repository variable VPS_DEPLOY_ENABLED must be exactly 'true' (lowercase, no spaces) and the run must be on refs/heads/main." >&2
    exit 1
  fi
  echo "::notice::Deploy skipped: VPS_DEPLOY_ENABLED is not exactly 'true', the ref is not main, or this event never deploys."
}

cmd_validate() {
  local missing=() name
  for name in VPS_HOST VPS_USER VPS_SSH_KEY VPS_APP_PATH VPS_KNOWN_HOSTS; do
    [ -n "${!name:-}" ] || missing+=("$name")
  done
  if [ "${#missing[@]}" -gt 0 ]; then
    fail "missing required secrets: ${missing[*]} (VPS_PORT is optional and defaults to 22)"
  fi
  [[ "$VPS_APP_PATH" =~ ^/[A-Za-z0-9._/-]+$ ]] || fail "VPS_APP_PATH must be an absolute path (letters, digits, . _ / -)"
  [[ "$VPS_HOST" =~ ^[A-Za-z0-9][A-Za-z0-9.:-]*$ ]] || fail "VPS_HOST has an unsupported format"
  [[ "$VPS_USER" =~ ^[A-Za-z_][A-Za-z0-9_-]*$ ]] || fail "VPS_USER has an unsupported format"
  local port
  port="$(port_of)"
  [[ "$port" =~ ^[0-9]{1,5}$ ]] && (( 10#$port >= 1 && 10#$port <= 65535 )) || fail "VPS_PORT must be 1-65535"
  echo "Deployment configuration is complete."
}

cmd_resolve_target() {
  local sha="${GITHUB_SHA:-}" rollback=false requested="${ROLLBACK_SHA:-}"
  if [ -n "$requested" ]; then
    [ "${EVENT_NAME:-}" = "workflow_dispatch" ] || fail "rollback is only available for manual runs"
    [[ "$requested" =~ ^[0-9a-f]{40}$ ]] || fail "rollback_sha must be a full 40-character lowercase hex SHA"
    [ "$(git rev-parse --is-shallow-repository 2> /dev/null)" = "false" ] || fail "checkout is shallow; rollback ancestry cannot be verified"
    git rev-parse --verify --quiet "refs/remotes/origin/main^{commit}" > /dev/null || fail "origin/main is not available to verify rollback_sha"
    git cat-file -e "${requested}^{commit}" 2> /dev/null || fail "rollback_sha is not a commit in this repository"
    local rc=0
    git merge-base --is-ancestor "$requested" refs/remotes/origin/main 2> /dev/null || rc=$?
    case "$rc" in
      0) ;;
      1) fail "rollback_sha is not an ancestor of main" ;;
      *) fail "cannot verify that rollback_sha is an ancestor of main (git exit $rc)" ;;
    esac
    sha="$requested"
    rollback=true
  fi
  [[ "$sha" =~ ^[0-9a-f]{40}$ ]] || fail "target SHA is missing or not a 40-character hex SHA"
  output sha "$sha"
  output rollback "$rollback"
  echo "Deploy target: $sha (rollback=$rollback)"
}

cmd_ssh_setup() {
  local ssh_dir="${AIFT_SSH_DIR:-$HOME/.ssh}" port target
  port="$(port_of)"
  umask 077
  mkdir -p "$ssh_dir"
  printf '%s\n' "$VPS_SSH_KEY" > "$ssh_dir/aift_vps_key"
  printf '%s\n' "$VPS_KNOWN_HOSTS" > "$ssh_dir/aift_known_hosts"
  chmod 600 "$ssh_dir/aift_vps_key" "$ssh_dir/aift_known_hosts"
  if [ "$port" = "22" ]; then
    target="$VPS_HOST"
  else
    target="[$VPS_HOST]:$port"
  fi
  ssh-keygen -F "$target" -f "$ssh_dir/aift_known_hosts" > /dev/null 2>&1 \
    || fail "VPS_KNOWN_HOSTS has no entry for $target (a nonstandard port needs the form: [host]:port keytype key)"
}

cmd_deploy() {
  local ssh_dir="${AIFT_SSH_DIR:-$HOME/.ssh}" port out remote
  port="$(port_of)"
  out="${DEPLOY_OUTPUT:-deploy-output.log}"
  [[ "$VPS_APP_PATH" =~ ^/[A-Za-z0-9._/-]+$ ]] || fail "VPS_APP_PATH must be an absolute path"
  [[ "$DEPLOY_SHA" =~ ^[0-9a-f]{40}$ ]] || fail "target SHA is not a 40-character hex SHA"
  [[ "$DEPLOY_RUN_ID" =~ ^[0-9]{1,20}$ ]] || fail "invalid workflow run id"
  [[ "$DEPLOY_RUN_URL" =~ ^https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/actions/runs/[0-9]+$ ]] || fail "invalid workflow run URL"
  [[ "$DEPLOY_ACTOR" =~ ^[A-Za-z0-9]([A-Za-z0-9-]{0,38})(\[bot\])?$ ]] || fail "invalid actor"
  case "$DEPLOY_EVENT" in push | workflow_dispatch) ;; *) fail "invalid trigger event" ;; esac
  case "$DEPLOY_ROLLBACK" in true | false) ;; *) fail "invalid rollback flag" ;; esac
  # Every argument was validated above and none can contain a quote, so each
  # one is single-quoted for the remote shell (this also protects "[bot]").
  remote="flock -w 1800 $LOCK_FILE bash -s -- '$VPS_APP_PATH' '$DEPLOY_SHA' '$DEPLOY_RUN_ID' '$DEPLOY_RUN_URL' '$DEPLOY_ACTOR' '$DEPLOY_EVENT' '$DEPLOY_ROLLBACK'"
  ssh -i "$ssh_dir/aift_vps_key" \
    -o IdentitiesOnly=yes \
    -o BatchMode=yes \
    -o StrictHostKeyChecking=yes \
    -o UserKnownHostsFile="$ssh_dir/aift_known_hosts" \
    -o ConnectTimeout=20 \
    -o ServerAliveInterval=15 \
    -o ServerAliveCountMax=4 \
    -p "$port" \
    "$VPS_USER@$VPS_HOST" \
    "$remote" < "$HERE/deploy-dashboard-remote.sh" 2>&1 | tee "$out"
}

cmd_summarize() {
  local out="${DEPLOY_OUTPUT:-deploy-output.log}" record_file="${DEPLOY_RECORD_FILE:-deployment-record.json}" summary="${GITHUB_STEP_SUMMARY:-/dev/null}" record suggestion
  record="$(grep '^AIFT_DEPLOY_RECORD ' "$out" 2> /dev/null | tail -n 1 | cut -d' ' -f2- || true)"
  {
    echo "### VPS dashboard deployment"
    if [ -n "$record" ] && suggestion="$(python3 -c '
import json, re, sys
sha = re.compile(r"[0-9a-f]{40}")
assert chr(96) not in sys.argv[1]
record = json.loads(sys.argv[1])
assert isinstance(record, dict)
for key in ("deployed_sha", "previous_sha"):
    assert sha.fullmatch(record[key]), key
assert record["status"] in ("healthy", "unhealthy", "failed", "target_mismatch", "refused_downgrade", "refused_ancestry", "refused_rollback_target", "refused_unverifiable_target")
last = record.get("last_healthy_before", "none")
assert last == "none" or sha.fullmatch(last), "last_healthy_before"
if record["status"] == "healthy":
    print("none needed (deploy verified healthy)")
elif last != "none":
    print(last)
else:
    print(record["previous_sha"])
' "$record" 2> /dev/null)"; then
      printf '%s\n' "$record" > "$record_file"
      echo '```json'
      echo "$record"
      echo '```'
      echo ""
      echo "Suggested rollback target (last known healthy): \`$suggestion\` (see docs/deploy-rollback.md)"
    else
      echo "No valid provenance record was returned by the server (the deploy stopped before the server changed, or the connection failed)."
    fi
  } >> "$summary"
}

case "${1:-}" in
  gate) cmd_gate ;;
  validate) cmd_validate ;;
  resolve-target) cmd_resolve_target ;;
  ssh-setup) cmd_ssh_setup ;;
  deploy) cmd_deploy ;;
  summarize) cmd_summarize ;;
  *) echo "usage: $0 gate|validate|resolve-target|ssh-setup|deploy|summarize" >&2; exit 2 ;;
esac
