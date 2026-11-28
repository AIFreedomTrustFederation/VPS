# Dashboard deploy: provenance and rollback

Every deploy attempt that reaches the server appends one JSON line to
`/var/lib/aift/dashboard-deploys/deployments.jsonl` (override only for tests). The same line is shown in
the job summary and uploaded as the `vps-dashboard-deployment-record-<run id>` artifact.

```json
{"timestamp_utc":"2026-11-28T10:30:00Z","status":"healthy","deployed_sha":"<40 hex>","previous_sha":"<40 hex>","server_head":"<40 hex>","run_id":"123","run_url":"https://github.com/.../actions/runs/123","actor":"login","event":"workflow_dispatch","rollback":false}
```

`status` is `healthy`, `unhealthy` (deployed but failed the health budget), `failed` (stopped part-way,
for example a build error) or `refused_downgrade`. Refusals that happen before the server is touched
(bad input, dirty tree, unreadable log directory) leave no record. `previous_sha` is the checkout's
`HEAD` immediately before the deploy, i.e. what to roll back to.

## Find the previous SHA

```sh
tail -n 5 /var/lib/aift/dashboard-deploys/deployments.jsonl
# last healthy deployment before the bad one:
grep '"status":"healthy"' /var/lib/aift/dashboard-deploys/deployments.jsonl | tail -n 2
```

Or open the failed run's job summary / artifact and copy `previous_sha`.

## A. Redeploy a previous SHA with the workflow (preferred)

1. Make sure the repository variable `VPS_DEPLOY_ENABLED` is `true` and the secrets are set.
2. Actions -> **Deploy AIFT Dashboard to VPS** -> **Run workflow** on `main`.
3. Put the previous 40-character lowercase SHA in **rollback_sha** and run it.
4. Approve the `production` environment if reviewers are required.

`rollback_sha` is validated strictly (exactly 40 lowercase hex characters, a real commit, and an
**ancestor of `main`**); anything else fails before connecting. It is passed through an environment
variable, never interpolated into a script. The server then fetches and checks out that exact SHA, runs
the same dirty-tree check, health verification and provenance record (with `"rollback":true`).

Rolling back is the only way to move to an older commit: a normal run refuses to deploy a commit that is
older than what is already deployed (`refused_downgrade`), so a delayed or re-run job cannot undo a
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
PREV=<previous_sha from the record>
git fetch origin "$PREV"
git checkout --detach "$PREV"
test "$(git rev-parse HEAD)" = "$PREV"
cd apps/aift-dashboard
docker compose -f compose.yml up -d --build
docker compose -f compose.yml ps
for i in $(seq 1 30); do
  curl -fsS --max-time 5 http://127.0.0.1:3000/api/health | grep -q '"ok":true' && echo healthy && break
  sleep 2
done
```

Record it by hand so history stays complete (all values are yours to fill in):

```sh
printf '%s\n' '{"timestamp_utc":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","status":"healthy","deployed_sha":"'"$PREV"'","previous_sha":"<sha before>","server_head":"'"$PREV"'","run_id":"0","run_url":"manual","actor":"<you>","event":"manual","rollback":true}' \
  >> /var/lib/aift/dashboard-deploys/deployments.jsonl
```

The checkout is left on a detached `HEAD` after any deploy or rollback. When you want the server on the
branch again, with nothing running a deploy: `git checkout main && git pull --ff-only`.

## C. When a deploy ends `unhealthy` or `failed`

The server may already be on the new SHA with a container that is not serving. Roll back with A or B
using `previous_sha` from that run's record. `docker compose -f compose.yml logs --tail 100` on the
server shows why; logs are intentionally not copied into the Actions log.

## Keep the log append-only

The workflow only ever appends. To make that enforceable by the OS (as root):

```sh
chattr +a /var/lib/aift/dashboard-deploys/deployments.jsonl
```
