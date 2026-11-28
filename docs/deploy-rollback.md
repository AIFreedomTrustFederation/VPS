# Dashboard deploy: provenance and rollback

Every deploy attempt that reaches the server appends one JSON line to
`/var/lib/aift/dashboard-deploys/deployments.jsonl` (override only for tests). The same line is shown in
the job summary and uploaded as the `vps-dashboard-deployment-record-<run id>` artifact.

```json
{"timestamp_utc":"2026-11-28T10:30:00Z","status":"healthy","deployed_sha":"<40 hex>","previous_sha":"<40 hex>","server_head":"<40 hex>","running_commit":"<40 hex>","last_healthy_before":"<40 hex or none>","run_id":"123","run_url":"https://github.com/.../actions/runs/123","actor":"login","event":"workflow_dispatch","rollback":false}
```

`status` is one of:

* `healthy`: deployed, health JSON valid, and checkout, container label and app all report the SHA
* `unhealthy`: deployed but failed the bounded health check (including the app reporting another commit)
* `target_mismatch`: healthy, but the checkout or container label is not the requested SHA
* `failed`: stopped part-way, for example a build error
* `refused_downgrade`: a normal deploy whose target does not descend from what is deployed
* `refused_rollback_target`: a rollback target that is not an ancestor of `origin/main`
* `refused_ancestry`: `git merge-base` could not decide, so the deploy refused

Refusals that happen before the server is touched (bad input, dirty or shallow tree, missing tool,
unreadable state) leave no record. `previous_sha` is the checkout's `HEAD` immediately before the
deploy. `running_commit` is the container's `org.opencontainers.image.revision` label.

## Last known healthy revision (the suggested rollback target)

Only a fully verified deploy writes `/var/lib/aift/dashboard-deploys/last-healthy-sha` (atomically,
one SHA). It is separate from the log, so it is not moved by unhealthy or refused attempts. Each record
carries `last_healthy_before`, and the job summary of a failed deploy prints it as
**Suggested rollback target (last known healthy)**. Prefer it over `previous_sha`: if the previous
deploy was itself unhealthy, `previous_sha` is not a good target.

```sh
cat /var/lib/aift/dashboard-deploys/last-healthy-sha
tail -n 5 /var/lib/aift/dashboard-deploys/deployments.jsonl
```

A corrupt `last-healthy-sha` (anything but one 40-character lowercase SHA) blocks deploys until fixed.

## A. Redeploy a previous SHA with the workflow (preferred)

1. Make sure the repository variable `VPS_DEPLOY_ENABLED` is `true` and the secrets are set.
2. Actions -> **Deploy AIFT Dashboard to VPS** -> **Run workflow** on `main`.
3. Put the previous 40-character lowercase SHA in **rollback_sha** and run it.
4. Approve the `production` environment if reviewers are required.

`rollback_sha` is validated strictly (exactly 40 lowercase hex characters, a real commit, and an
**ancestor of `main`**); anything else fails before connecting. It is passed through an environment
variable, never interpolated into a script. The server then fetches and checks out that exact SHA, runs
the same dirty-tree check and provenance record (with `"rollback":true`). The server re-checks that the
target is an ancestor of `origin/main`, then verifies the exact target: the checkout `HEAD`, the
container label and the `commit` reported by `/api/health` must all equal `rollback_sha`, or the run
fails. A verified rollback becomes the new last-known-healthy revision.

Rolling back is the only way to move to an older commit: a normal run refuses any target that does not
descend from what is already deployed (`refused_downgrade`), so a delayed or re-run job cannot undo a
newer deployment.

**After a rollback, keep main from redeploying the bad commit.** A later push to `main` auto-deploys
the new tip. Either land a `git revert` of the bad commit on `main` (best), or set
`VPS_DEPLOY_ENABLED` to anything other than `true` until a fix lands. A queued manual rollback can also
be replaced by a newer queued run in the same concurrency group, so confirm the rollback run actually
started.

## B. Manual rollback on the server

Use this if GitHub Actions is unavailable. Take the same lock the workflow uses so a deploy cannot run
at the same time:

```sh
ssh <user>@<host>
flock -w 1800 /var/lock/aift-dashboard-deploy.lock bash
cd /root/AIFT/VPS                      # your VPS_APP_PATH
git status --porcelain --untracked-files=all   # must print nothing
PREV=$(cat /var/lib/aift/dashboard-deploys/last-healthy-sha)   # or a SHA from the log
git fetch origin "$PREV"
git checkout --detach "$PREV"
test "$(git rev-parse HEAD)" = "$PREV"
cd apps/aift-dashboard
AIFT_COMMIT_SHA="$PREV" docker compose -f compose.yml up -d --build
docker compose -f compose.yml ps
docker inspect -f '{{ index .Config.Labels "org.opencontainers.image.revision" }}' aift-dashboard   # must print $PREV
for i in $(seq 1 30); do
  curl -fsS --max-time 5 http://127.0.0.1:3000/api/health \
    | python3 -c 'import json,sys; d=json.load(sys.stdin); sys.exit(0 if d.get("ok") is True and d.get("commit")==sys.argv[1] else 1)' "$PREV" \
    && echo healthy && break
  sleep 2
done
```

Only if it printed `healthy`: `printf '%s\n' "$PREV" > /var/lib/aift/dashboard-deploys/last-healthy-sha`.

Record it by hand so history stays complete (all values are yours to fill in):

```sh
printf '%s\n' '{"timestamp_utc":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","status":"healthy","deployed_sha":"'"$PREV"'","previous_sha":"<sha before>","server_head":"'"$PREV"'","running_commit":"'"$PREV"'","last_healthy_before":"<sha>","run_id":"0","run_url":"manual","actor":"<you>","event":"manual","rollback":true}' \
  >> /var/lib/aift/dashboard-deploys/deployments.jsonl
```

The checkout is left on a detached `HEAD` after any deploy or rollback. When you want the server on the
branch again, with nothing running a deploy: `git checkout main && git pull --ff-only`.

## C. When a deploy ends `unhealthy` or `failed`

The server may already be on the new SHA with a container that is not serving. Roll back with A or B
using the suggested target (`last_healthy_before`) from that run's summary or record. `docker compose -f compose.yml logs --tail 100` on the
server shows why; logs are intentionally not copied into the Actions log.

## Keep the log append-only

The workflow only ever appends. To make that enforceable by the OS (as root):

```sh
chattr +a /var/lib/aift/dashboard-deploys/deployments.jsonl
```
