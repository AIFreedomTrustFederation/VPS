#!/usr/bin/env bash
# End-to-end acceptance harness for the VPS dashboard deploy pipeline.
#
# OPT-IN AND DESTRUCTIVE TO THE MACHINE IT RUNS ON. Run it only on a disposable
# Linux box with Docker (and the compose plugin). It never contacts GitHub or the
# production VPS and uses no real credentials. It:
#   * builds a stand-in "VPS" container (Ubuntu, real sshd, root login, git, curl,
#     python3, flock, Docker CLI on the host daemon) listening on 127.0.0.1:$SSH_PORT;
#   * generates throwaway SSH client and host keys under $WORK_DIR/keys (never commit them);
#   * makes a bare "origin" from this repository's HEAD, plus harness-only commits;
#   * drives the REAL scripts/deploy-dashboard-runner.sh exactly like
#     .github/workflows/deploy-aift-dashboard.yml (env vars, same subcommands);
#   * builds and runs the REAL dashboard image from apps/aift-dashboard/{Dockerfile,compose.yml},
#     which means it owns host port 127.0.0.1:3000, the container name aift-dashboard,
#     and the host directory /opt/aift (the compose file mounts it).
#
# Usage:
#   AIFT_ACCEPTANCE=1 WORK_DIR=/workspace/vps-acceptance \
#     [DOCKER="sudo docker"] scripts/acceptance/dashboard-deploy-acceptance.sh [scenario ...]
# Scenarios (default: all, in order): hostkey first forward rollback historical
#   unhealthy concurrency interrupt
# Evidence: $WORK_DIR/logs/<scenario>.log, $WORK_DIR/runs/<run>/, $WORK_DIR/results.tsv
# Cleanup:  scripts/acceptance/dashboard-deploy-acceptance.sh cleanup
set -Eeuo pipefail

[ "${AIFT_ACCEPTANCE:-}" = "1" ] || { echo "Set AIFT_ACCEPTANCE=1 to run this opt-in, machine-altering harness." >&2; exit 2; }

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORK_DIR="${WORK_DIR:-$REPO/../vps-acceptance}"
WORK_DIR="$(mkdir -p "$WORK_DIR" && cd "$WORK_DIR" && pwd)"
SSH_PORT="${SSH_PORT:-2222}"
read -r -a DOCKER_CMD <<< "${DOCKER:-docker}"
SERVER=aift-acceptance-vps
SERVER_IMAGE=aift-acceptance-vps:local
APP_PATH=/root/AIFT/VPS
HEALTH_URL=http://127.0.0.1:3000/api/health
LABEL=org.opencontainers.image.revision
ORIGIN="$WORK_DIR/origin.git"
RUNNER="$WORK_DIR/runner"
EDIT="$WORK_DIR/edit"
KEYS="$WORK_DIR/keys"
STATE="$WORK_DIR/server-state"   # mounted at /var/lib/aift on the stand-in VPS
LOGS="$WORK_DIR/logs"
RUNS="$WORK_DIR/runs"
RESULTS="$WORK_DIR/results.tsv"
RUN_SEQ_FILE="$WORK_DIR/.run-seq"
NONCE="$(date +%s)-$$"
mkdir -p "$LOGS" "$RUNS"

dk() { "${DOCKER_CMD[@]}" "$@"; }
vps() { dk exec "$SERVER" "$@"; }
say() { printf '\n[%s] %s\n' "$(date '+%H:%M:%S %Z')" "$*"; }

FAILED=0
check() { # scenario description command...
  local scenario="$1" desc="$2"
  shift 2
  if "$@"; then
    printf '%s\tPASS\t%s\n' "$scenario" "$desc" | tee -a "$RESULTS"
  else
    printf '%s\tFAIL\t%s\n' "$scenario" "$desc" | tee -a "$RESULTS"
    FAILED=$((FAILED + 1))
  fi
}
eq() { [ "$1" = "$2" ] || { echo "  expected [$2] got [$1]" >&2; return 1; }; }

# ---------------------------------------------------------------- observation
server_head() { vps git -C "$APP_PATH" rev-parse HEAD; }
last_healthy() { cat "$STATE/dashboard-deploys/last-healthy-sha" 2> /dev/null || echo none; }
log_lines() { wc -l < "$STATE/dashboard-deploys/deployments.jsonl" 2> /dev/null || echo 0; }
last_record() { tail -n 1 "$STATE/dashboard-deploys/deployments.jsonl"; }
record_field() { last_record | python3 -c 'import json,sys; v=json.load(sys.stdin)[sys.argv[1]]; print(str(v).lower() if isinstance(v,bool) else v)' "$1"; }
container_label() { dk inspect -f "{{ index .Config.Labels \"$LABEL\" }}" aift-dashboard 2> /dev/null || echo none; }
health_body() { curl -sS --max-time 5 "$HEALTH_URL" 2> /dev/null || true; }
health_commit() { health_body | python3 -c 'import json,sys; print(json.load(sys.stdin).get("commit","missing"))' 2> /dev/null || echo unreachable; }
health_ok() { health_body | python3 -c 'import json,sys; d=json.load(sys.stdin); sys.exit(0 if d.get("ok") is True else 1)' 2> /dev/null; }
# First word of the served marker file (the second word is a per-run nonce).
marker() { curl -sS --max-time 5 http://127.0.0.1:3000/acceptance-marker.txt 2> /dev/null | head -c 64 | awk 'NR == 1 { print $1 }' || true; }
snapshot() { # name
  {
    echo "server HEAD:       $(server_head)"
    echo "container label:   $(container_label)"
    echo "health commit:     $(health_commit)"
    echo "marker file:       $(marker)"
    echo "last-healthy-sha:  $(last_healthy)"
    echo "provenance lines:  $(log_lines)"
    echo "health body:       $(health_body | head -c 400)"
  } | tee "$RUNS/snapshot-$1.txt"
}

# ---------------------------------------------------------------- setup
setup_keys() {
  mkdir -p "$KEYS"
  chmod 700 "$KEYS"
  [ -f "$KEYS/client" ] || ssh-keygen -q -t ed25519 -N '' -C aift-acceptance-client -f "$KEYS/client"
  [ -f "$KEYS/host_ed25519" ] || ssh-keygen -q -t ed25519 -N '' -C aift-acceptance-host -f "$KEYS/host_ed25519"
  [ -f "$KEYS/wrong_host" ] || ssh-keygen -q -t ed25519 -N '' -C aift-acceptance-wrong -f "$KEYS/wrong_host"
  cp "$KEYS/client.pub" "$KEYS/authorized_keys"
  # Pinned line in the [host]:port form the workflow requires for a non-22 port.
  printf '[127.0.0.1]:%s %s\n' "$SSH_PORT" "$(cut -d' ' -f1-2 "$KEYS/host_ed25519.pub")" > "$KEYS/known_hosts.good"
  printf '[127.0.0.1]:%s %s\n' "$SSH_PORT" "$(cut -d' ' -f1-2 "$KEYS/wrong_host.pub")" > "$KEYS/known_hosts.wrong"
  printf '127.0.0.1 %s\n' "$(cut -d' ' -f1-2 "$KEYS/host_ed25519.pub")" > "$KEYS/known_hosts.portless"
}

setup_origin() {
  rm -rf "$ORIGIN" "$EDIT" "$RUNNER"
  git clone -q --bare --no-local "$REPO" "$ORIGIN"
  git -C "$ORIGIN" symbolic-ref HEAD refs/heads/main
  # Origin "main" is this checkout's HEAD (the code under test).
  git -C "$ORIGIN" update-ref refs/heads/main "$(git -C "$REPO" rev-parse HEAD)"
  git clone -q "$ORIGIN" "$EDIT"
  git -C "$EDIT" config user.name "AIFT acceptance harness"
  git -C "$EDIT" config user.email "acceptance@invalid"
  git clone -q "$ORIGIN" "$RUNNER"
}

# Harness-only commit on origin/main that changes a file served by the app,
# so a rebuild must really contain the target's code (/acceptance-marker.txt).
push_marker_commit() { # marker-text
  git -C "$EDIT" pull -q --ff-only
  # The nonce makes every harness run change the build context, so images are really rebuilt.
  printf '%s %s\n' "$1" "$NONCE" > "$EDIT/apps/aift-dashboard/public/acceptance-marker.txt"
  git -C "$EDIT" add apps/aift-dashboard/public/acceptance-marker.txt
  git -C "$EDIT" commit -q -m "acceptance: marker $1"
  git -C "$EDIT" push -q origin HEAD:main
  git -C "$EDIT" rev-parse HEAD
}

push_broken_health_commit() {
  git -C "$EDIT" pull -q --ff-only
  python3 - "$EDIT/apps/aift-dashboard/app/api/health/route.ts" << 'PY'
import sys
p = sys.argv[1]
t = open(p).read()
old = "ok: status !== 'broken',"
assert old in t
open(p, "w").write(t.replace(old, "ok: false, // acceptance: deliberately unhealthy", 1))
PY
  git -C "$EDIT" commit -q -am "acceptance: deliberately failing health check"
  git -C "$EDIT" push -q origin HEAD:main
  git -C "$EDIT" rev-parse HEAD
}

start_server() { # fresh: removes all server state first
  dk rm -f "$SERVER" > /dev/null 2>&1 || true
  dk rm -f aift-dashboard > /dev/null 2>&1 || true
  if [ "${1:-}" = "fresh" ]; then
    dk run --rm -v "$WORK_DIR:/w" ubuntu:24.04 rm -rf /w/server-state > /dev/null
  fi
  mkdir -p "$STATE"
  dk build -q -t "$SERVER_IMAGE" -f "$REPO/scripts/acceptance/vps-server.Dockerfile" "$REPO/scripts/acceptance" > /dev/null
  dk run -d --name "$SERVER" --network host \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v /opt/aift:/opt/aift \
    -v "$STATE:/var/lib/aift" \
    -v "$ORIGIN:/srv/origin.git:ro" \
    -v "$KEYS/host_ed25519:/etc/ssh/acceptance_host_ed25519:ro" \
    -v "$KEYS/authorized_keys:/root/.ssh/authorized_keys:ro" \
    "$SERVER_IMAGE" /usr/sbin/sshd -D -e \
    -o ListenAddress=127.0.0.1 -o Port="$SSH_PORT" \
    -o HostKey=/etc/ssh/acceptance_host_ed25519 \
    -o PasswordAuthentication=no -o KbdInteractiveAuthentication=no \
    -o PermitRootLogin=prohibit-password -o StrictModes=no > /dev/null
  for _ in $(seq 1 30); do
    (exec 3<> "/dev/tcp/127.0.0.1/$SSH_PORT") 2> /dev/null && return 0
    sleep 1
  done
  echo "sshd did not start" >&2
  return 1
}

fresh_server_clone() { # sha
  vps rm -rf "$APP_PATH"
  vps mkdir -p "$(dirname "$APP_PATH")"
  vps git clone -q /srv/origin.git "$APP_PATH"
  vps git -C "$APP_PATH" checkout -q --detach "$1"
}

# ---------------------------------------------------------------- the workflow
# Mirrors deploy-aift-dashboard.yml: validate, resolve-target, ssh-setup, deploy,
# summarize. Returns the deploy step's exit code. Evidence in $RUNS/<name>/.
run_workflow() { # name event sha [rollback_sha] [known_hosts_file]
  local name="$1" event="$2" sha="$3" rollback="${4:-}" kh="${5:-$KEYS/known_hosts.good}"
  local dir="$RUNS/$name" seq rc=0
  rm -rf "$dir"
  mkdir -p "$dir/ssh"
  seq=$(($(cat "$RUN_SEQ_FILE" 2> /dev/null || echo 9000) + 1))
  echo "$seq" > "$RUN_SEQ_FILE"
  git -C "$RUNNER" fetch -q origin '+refs/heads/main:refs/remotes/origin/main'
  git -C "$RUNNER" checkout -q --detach "$sha"
  # Each step stops the job on failure, like a workflow step. (set -e is not
  # reliable here because callers use `run_workflow ... || true`.)
  (
    cd "$RUNNER"
    export VPS_HOST=127.0.0.1 VPS_USER=root VPS_PORT="$SSH_PORT" VPS_APP_PATH="$APP_PATH"
    VPS_SSH_KEY="$(cat "$KEYS/client")"
    VPS_KNOWN_HOSTS="$(cat "$kh")"
    export VPS_SSH_KEY VPS_KNOWN_HOSTS
    export AIFT_SSH_DIR="$dir/ssh" GITHUB_OUTPUT="$dir/github_output" GITHUB_STEP_SUMMARY="$dir/summary.md"
    export DEPLOY_OUTPUT="$dir/deploy-output.log" DEPLOY_RECORD_FILE="$dir/deployment-record.json"
    export GITHUB_SHA="$sha" EVENT_NAME="$event" ROLLBACK_SHA="$rollback"
    bash scripts/deploy-dashboard-runner.sh validate || exit $?
    bash scripts/deploy-dashboard-runner.sh resolve-target || exit $?
    DEPLOY_SHA="$(sed -n 's/^sha=//p' "$GITHUB_OUTPUT" | tail -n 1)"
    DEPLOY_ROLLBACK="$(sed -n 's/^rollback=//p' "$GITHUB_OUTPUT" | tail -n 1)"
    export DEPLOY_SHA DEPLOY_ROLLBACK DEPLOY_EVENT="$event" DEPLOY_ACTOR=acceptance-harness DEPLOY_RUN_ID="$seq"
    export DEPLOY_RUN_URL="https://github.com/AIFreedomTrustFederation/VPS/actions/runs/$seq"
    bash scripts/deploy-dashboard-runner.sh ssh-setup || exit $?
    deploy_rc=0
    bash scripts/deploy-dashboard-runner.sh deploy || deploy_rc=$?
    bash scripts/deploy-dashboard-runner.sh summarize
    exit "$deploy_rc"
  ) > "$dir/workflow.log" 2>&1 || rc=$?
  echo "$rc" > "$dir/exit_code"
  echo "workflow run $name (event=$event sha=${sha:0:12} rollback=${rollback:0:12}) exit=$rc; evidence $dir"
  return "$rc"
}

# ---------------------------------------------------------------- scenarios
MAIN_SHA=""
sc_hostkey() {
  local before
  start_server fresh
  fresh_server_clone "$MAIN_SHA"
  before=$(log_lines)
  run_workflow hostkey-portless push "$MAIN_SHA" "" "$KEYS/known_hosts.portless" || true
  check hostkey "known_hosts without [host]:port entry is refused before connecting" \
    grep -q "has no entry for \[127.0.0.1\]:$SSH_PORT" "$RUNS/hostkey-portless/workflow.log"
  run_workflow hostkey-wrong push "$MAIN_SHA" "" "$KEYS/known_hosts.wrong" || true
  check hostkey "wrong pinned host key fails ssh host key verification" \
    grep -q "Host key verification failed" "$RUNS/hostkey-wrong/workflow.log"
  check hostkey "wrong key: deploy step exit code is non-zero" test "$(cat "$RUNS/hostkey-wrong/exit_code")" != 0
  check hostkey "wrong key: server untouched (no provenance record, HEAD unchanged)" \
    eq "$(log_lines)/$(server_head)" "$before/$MAIN_SHA"
  : > "$KEYS/known_hosts.empty"
  run_workflow hostkey-missing push "$MAIN_SHA" "" "$KEYS/known_hosts.empty" || true
  check hostkey "missing VPS_KNOWN_HOSTS is refused by validate" \
    grep -q "missing required secrets: VPS_KNOWN_HOSTS" "$RUNS/hostkey-missing/workflow.log"
}

sc_first() {
  # No state dir, no last-healthy file, no container, fresh clone of origin.
  start_server fresh
  fresh_server_clone "$MAIN_SHA"
  check first "precondition: no provenance state on the server" test ! -e "$STATE/dashboard-deploys"
  run_workflow first-deploy push "$MAIN_SHA" || true
  snapshot first
  check first "first deploy succeeds" eq "$(cat "$RUNS/first-deploy/exit_code")" 0
  check first "record status healthy, last_healthy_before none" eq "$(record_field status)/$(record_field last_healthy_before)" "healthy/none"
  check first "real /api/health reports ok and commit == deployed SHA" eq "$(health_commit)" "$MAIN_SHA"
  check first "/api/health is strict-valid JSON with ok true" health_ok
  check first "image revision label == deployed SHA" eq "$(container_label)" "$MAIN_SHA"
  check first "last-healthy-sha written" eq "$(last_healthy)" "$MAIN_SHA"
  check first "job summary carries the record" grep -q '"status":"healthy"' "$RUNS/first-deploy/summary.md"
  check first "dashboard published on loopback only" \
    eq "$(dk port aift-dashboard 3000/tcp | sort -u | tr '\n' ' ')" "127.0.0.1:3000 "
}

B_SHA="" C_SHA=""
sc_forward() {
  B_SHA=$(push_marker_commit acceptance-B)
  run_workflow forward-B push "$B_SHA" || true
  check forward "forward deploy B healthy" eq "$(record_field status)" healthy
  check forward "running code is B (marker, label, health commit, HEAD)" \
    eq "$(marker)/$(container_label)/$(health_commit)/$(server_head)" "acceptance-B/$B_SHA/$B_SHA/$B_SHA"
  C_SHA=$(push_marker_commit acceptance-C)
  run_workflow forward-C push "$C_SHA" || true
  snapshot forward
  check forward "forward deploy C healthy, last-healthy C, last_healthy_before B" \
    eq "$(record_field status)/$(last_healthy)/$(record_field last_healthy_before)" "healthy/$C_SHA/$B_SHA"
  check forward "running code is C" eq "$(marker)/$(container_label)/$(health_commit)" "acceptance-C/$C_SHA/$C_SHA"
  local lines
  lines=$(log_lines)
  run_workflow forward-stale-B push "$B_SHA" || true
  check forward "stale push of older B is refused_downgrade and nothing changes" \
    eq "$(record_field status)/$(server_head)/$(container_label)/$(last_healthy)" "refused_downgrade/$C_SHA/$C_SHA/$C_SHA"
  check forward "refusal is still recorded (one more provenance line)" eq "$(log_lines)" "$((lines + 1))"
}

sc_rollback() {
  local tip
  tip=$(git -C "$ORIGIN" rev-parse main)
  run_workflow rollback-to-B workflow_dispatch "$tip" "$B_SHA" || true
  snapshot rollback
  check rollback "rollback run succeeds" eq "$(cat "$RUNS/rollback-to-B/exit_code")" 0
  check rollback "rollback build really serves B's code (marker)" eq "$(marker)" acceptance-B
  check rollback "HEAD, label, health commit and last-healthy all == B" \
    eq "$(server_head)/$(container_label)/$(health_commit)/$(last_healthy)" "$B_SHA/$B_SHA/$B_SHA/$B_SHA"
  check rollback "record marks rollback true, previous C" eq "$(record_field rollback)/$(record_field previous_sha)" "true/$C_SHA"
  run_workflow roll-forward-C push "$C_SHA" || true
  check rollback "a normal deploy moves forward again from the rollback" \
    eq "$(record_field status)/$(marker)" "healthy/acceptance-C"
}

sc_historical() {
  # Commits from before the running-commit contract (#51): no "commit" in /api/health,
  # no image revision label. HIST_SHA defaults to the #50 merge.
  local hist="${HIST_SHA:-458dfe5041a576ba100b2430efd606fa2fec368a}" tip before_head before_label before_lh
  git -C "$ORIGIN" cat-file -e "$hist^{commit}" || { check historical "historical commit $hist present" false; return; }
  tip=$(git -C "$ORIGIN" rev-parse main)
  before_head=$(server_head) before_label=$(container_label) before_lh=$(last_healthy)
  run_workflow rollback-historical workflow_dispatch "$tip" "$hist" || true
  snapshot historical
  check historical "rollback to a pre-contract commit fails" test "$(cat "$RUNS/rollback-historical/exit_code")" != 0
  check historical "last-healthy-sha is preserved" eq "$(last_healthy)" "$before_lh"
  echo "historical: status=$(record_field status) head=$(server_head) label=$(container_label) health_commit=$(health_commit)"
  check historical "refused before the server changed (HEAD and running container untouched)" \
    eq "$(record_field status)/$(server_head)/$(container_label)" "refused_unverifiable_target/$before_head/$before_label"
}

U_SHA=""
sc_unhealthy() {
  local lh before
  lh=$(last_healthy)
  U_SHA=$(push_broken_health_commit)
  run_workflow unhealthy-U push "$U_SHA" || true
  snapshot unhealthy
  check unhealthy "deploy of a failing health check fails the job" test "$(cat "$RUNS/unhealthy-U/exit_code")" != 0
  check unhealthy "record status unhealthy" eq "$(record_field status)" unhealthy
  check unhealthy "last-healthy-sha preserved across the failed deploy" eq "$(last_healthy)" "$lh"
  check unhealthy "job summary suggests last known healthy as rollback target" \
    grep -q "Suggested rollback target (last known healthy): \`$lh\`" "$RUNS/unhealthy-U/summary.md"
  before=$(log_lines)
  run_workflow unhealthy-U-retry push "$U_SHA" || true
  check unhealthy "a second failed deploy still preserves last-healthy" \
    eq "$(record_field status)/$(last_healthy)/$(log_lines)" "unhealthy/$lh/$((before + 1))"
  # Documented manual recovery: workflow_dispatch with rollback_sha = suggested target.
  run_workflow recover-from-U workflow_dispatch "$U_SHA" "$lh" || true
  snapshot recovered
  check unhealthy "manual rollback to last-healthy recovers a healthy, verified app" \
    eq "$(cat "$RUNS/recover-from-U/exit_code")/$(record_field status)/$(health_commit)/$(container_label)" "0/healthy/$lh/$lh"
  # Then land a revert of the bad commit on main (docs/deploy-rollback.md), so main is deployable again.
  git -C "$EDIT" pull -q --ff-only
  git -C "$EDIT" revert --no-edit "$U_SHA" > /dev/null
  git -C "$EDIT" push -q origin HEAD:main
  local reverted
  reverted=$(git -C "$EDIT" rev-parse HEAD)
  run_workflow revert-U push "$reverted" || true
  check unhealthy "after reverting the bad commit on main, the next push deploys healthy" \
    eq "$(record_field status)/$(last_healthy)" "healthy/$reverted"
}

sc_concurrency() {
  local d1 holder rc lines
  d1=$(push_marker_commit acceptance-D)
  lines=$(log_lines)
  run_workflow concurrent-D push "$d1" > "$LOGS/concurrency-first.out" 2>&1 &
  holder=$!
  # Wait until the first run holds the server lock (it is building).
  for _ in $(seq 1 120); do
    vps flock -n /var/lock/aift-dashboard-deploy.lock true 2> /dev/null || break
    sleep 1
  done
  rc=0
  vps flock -n /var/lock/aift-dashboard-deploy.lock true 2> /dev/null || rc=$?
  check concurrency "server lock is held while a deploy runs (non-blocking flock refused)" test "$rc" != 0
  # A second (stale) workflow run queues on the same lock, then is refused as a downgrade.
  run_workflow concurrent-stale-C push "$C_SHA" || true
  wait "$holder" || true
  check concurrency "first deploy completes healthy" eq "$(cat "$RUNS/concurrent-D/exit_code")" 0
  check concurrency "queued stale deploy ran after it and was refused_downgrade" \
    eq "$(record_field status)/$(record_field deployed_sha)" "refused_downgrade/$C_SHA"
  check concurrency "records are serialized (2 new lines, D healthy first)" \
    eq "$(tail -n 2 "$STATE/dashboard-deploys/deployments.jsonl" | head -n 1 | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["status"], d["deployed_sha"])')/$(log_lines)" "healthy $d1/$((lines + 2))"
  check concurrency "running app is still D" eq "$(container_label)/$(health_commit)" "$d1/$d1"
}

wait_for_output() { # file regex timeout
  for _ in $(seq 1 "$3"); do
    grep -Eq "$2" "$1" 2> /dev/null && return 0
    sleep 1
  done
  return 1
}

kill_runner_tree() { # pid  (like a cancelled or timed-out job: the runner process tree dies)
  pkill -TERM -P "$1" 2> /dev/null || true
  local p
  for p in $(pgrep -f "aift_vps_key" || true); do kill -TERM "$p" 2> /dev/null || true; done
  kill -TERM "$1" 2> /dev/null || true
  wait "$1" 2> /dev/null || true
}

sc_interrupt() {
  local e f pid lh lines
  lh=$(last_healthy)
  lines=$(log_lines)
  # 1) Runner killed mid-build (job cancelled / runner lost).
  e=$(push_marker_commit acceptance-E)
  run_workflow interrupt-build push "$e" > "$LOGS/interrupt-build.out" 2>&1 &
  pid=$!
  wait_for_output "$RUNS/interrupt-build/deploy-output.log" 'npm|RUN|Building|load build' 180 || true
  sleep 5
  kill_runner_tree "$pid"
  # The remote side must finish or stop and release the lock within the timeout.
  for _ in $(seq 1 600); do
    vps flock -n /var/lock/aift-dashboard-deploy.lock true 2> /dev/null && break
    sleep 1
  done
  sleep 2
  snapshot interrupt-build
  echo "after kill mid-build: lines $lines -> $(log_lines); last record: $(last_record)"
  check interrupt "server lock released after the runner was killed" vps flock -n /var/lock/aift-dashboard-deploy.lock true
  check interrupt "last-healthy is never ahead of a verified deploy" \
    python3 -c 'import sys; sys.exit(0 if sys.argv[1] in (sys.argv[2], sys.argv[3]) else 1)' "$(last_healthy)" "$lh" "$e"
  check interrupt "checkout stays clean after interruption" eq "$(vps git -C "$APP_PATH" status --porcelain --untracked-files=all)" ""
  run_workflow interrupt-build-rerun push "$e" || true
  check interrupt "re-running the interrupted deploy recovers (healthy, label/health/marker == E)" \
    eq "$(record_field status)/$(container_label)/$(health_commit)/$(marker)" "healthy/$e/$e/acceptance-E"
  # 2) Runner killed during 'compose up' (container recreate), after the image is built.
  f=$(push_marker_commit acceptance-F)
  run_workflow interrupt-compose push "$f" > "$LOGS/interrupt-compose.out" 2>&1 &
  pid=$!
  wait_for_output "$RUNS/interrupt-compose/deploy-output.log" 'Container aift-dashboard +(Recreate|Stopping|Stopped|Creating|Starting)' 900 || true
  kill_runner_tree "$pid"
  for _ in $(seq 1 300); do
    vps flock -n /var/lock/aift-dashboard-deploy.lock true 2> /dev/null && break
    sleep 1
  done
  sleep 2
  snapshot interrupt-compose
  echo "after kill mid-compose: last record: $(last_record)"
  check interrupt "lock released after kill during compose" vps flock -n /var/lock/aift-dashboard-deploy.lock true
  run_workflow interrupt-compose-rerun push "$f" || true
  check interrupt "re-run after kill during compose recovers to F" \
    eq "$(record_field status)/$(container_label)/$(health_commit)/$(last_healthy)" "healthy/$f/$f/$f"
  # 3) Remote deploy process killed with SIGKILL (server-side crash / OOM): no EXIT trap runs.
  local g
  g=$(push_marker_commit acceptance-G)
  lines=$(log_lines)
  run_workflow interrupt-sigkill push "$g" > "$LOGS/interrupt-sigkill.out" 2>&1 &
  pid=$!
  wait_for_output "$RUNS/interrupt-sigkill/deploy-output.log" 'npm|RUN|Building|load build' 180 || true
  sleep 3
  vps pkill -KILL -f 'bash -s -- /root/AIFT/VPS' || true
  wait "$pid" || true
  snapshot interrupt-sigkill
  check interrupt "SIGKILL of the server-side script fails the job" test "$(cat "$RUNS/interrupt-sigkill/exit_code")" != 0
  echo "after SIGKILL: lines $lines -> $(log_lines); HEAD $(server_head); last-healthy $(last_healthy)"
  check interrupt "lock released after SIGKILL" vps flock -n /var/lock/aift-dashboard-deploy.lock true
  check interrupt "last-healthy unchanged by the killed deploy" eq "$(last_healthy)" "$f"
  check interrupt "SIGKILL left the in-progress marker (no trap ran)" test -s "$STATE/dashboard-deploys/in-progress"
  run_workflow interrupt-sigkill-rerun push "$g" || true
  check interrupt "re-run after SIGKILL recovers to G" \
    eq "$(record_field status)/$(container_label)/$(health_commit)/$(last_healthy)" "healthy/$g/$g/$g"
  check interrupt "re-run first recorded the killed attempt as interrupted" \
    eq "$(tail -n 2 "$STATE/dashboard-deploys/deployments.jsonl" | head -n 1 | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["status"], d["deployed_sha"])')" "interrupted $g"
  check interrupt "no in-progress marker after a completed run" test ! -e "$STATE/dashboard-deploys/in-progress"
  check interrupt "whole provenance log is valid JSONL with known statuses" python3 -c '
import json, sys
ok = {"healthy", "unhealthy", "failed", "interrupted", "target_mismatch", "refused_downgrade",
      "refused_ancestry", "refused_rollback_target", "refused_unverifiable_target"}
for n, line in enumerate(open(sys.argv[1]), 1):
    d = json.loads(line)
    assert d["status"] in ok, (n, d["status"])
print("log lines:", n)
' "$STATE/dashboard-deploys/deployments.jsonl"
}

cleanup() {
  dk rm -f aift-dashboard "$SERVER" > /dev/null 2>&1 || true
  echo "Removed containers aift-dashboard and $SERVER. Kept $WORK_DIR (keys, origin, logs, runs)."
}

main() {
  if [ "${1:-}" = "cleanup" ]; then cleanup; return; fi
  for tool in git ssh ssh-keygen python3 curl; do command -v "$tool" > /dev/null || { echo "$tool is required" >&2; exit 2; }; done
  dk compose version > /dev/null
  local scenarios=("$@")
  [ "${#scenarios[@]}" -gt 0 ] || scenarios=(hostkey first forward rollback historical unhealthy concurrency interrupt)
  : > "$RESULTS"
  setup_keys
  setup_origin
  MAIN_SHA=$(git -C "$ORIGIN" rev-parse main)
  say "origin main = $MAIN_SHA (from $REPO HEAD); work dir $WORK_DIR"
  local s
  for s in "${scenarios[@]}"; do
    say "scenario: $s"
    # Process substitution (not a pipe) so scenarios share variables in this shell.
    "sc_$s" > >(tee "$LOGS/$s.log") 2>&1
  done
  FAILED=$(grep -c $'\tFAIL\t' "$RESULTS" || true)
  say "results: $(grep -c $'\tPASS\t' "$RESULTS" || true) passed, $FAILED failed ($RESULTS)"
  [ "$FAILED" -eq 0 ]
}
main "$@"
