# GitHub Secrets, Variables and Environment for VPS Deployment

The dashboard deploy workflows (`deploy-aift-dashboard.yml` and `aift-auto-pipeline.yml`) use the
configuration below. **Deployment is off by default.** Build and verification always run; only the
production deploy job is gated.

## Repository variable (the deploy switch)

| Variable | Value | Purpose |
| --- | --- | --- |
| `VPS_DEPLOY_ENABLED` | exactly `true` | Authorizes production deploys. The check is exact and case-sensitive: `True`, `TRUE`, ` true`, `true ` (or a trailing newline), `1`, `yes` and unset all mean disabled. |

The comparison runs in bash on the raw value, because GitHub expression `==` comparisons are
case-insensitive. Pull request runs evaluate the gate but can never deploy.

Set it under `Repo -> Settings -> Secrets and variables -> Actions -> Variables`. It must be a
**repository** variable (the gate job does not use an environment, so an environment-level variable is
not seen and the gate stays closed).

What happens for each run:

| Trigger | `VPS_DEPLOY_ENABLED` | Required secrets | Result |
| --- | --- | --- | --- |
| push to `main` (auto pipeline) | not `true` | any | Build/verify run; deploy is skipped with a notice. Run succeeds. |
| push to `main` | `true` | all present | Build/verify, wait for `production` approval (if configured), then deploy. |
| push to `main` | `true` | any missing or malformed | Deploy job **fails** naming the missing secrets. Nothing on the server changes. |
| manual (`workflow_dispatch`) | not `true`, or ref is not `main` | any | Workflow **fails** (it never reports success or skips quietly). |
| manual | `true` | any missing or malformed | Deploy job **fails** naming the missing secrets. |

A push with the gate on and configuration missing fails on purpose: a red run is a visible signal that
production is not receiving changes you authorized, and a green skip would hide it.

## Required secrets

Needed whenever a deploy is attempted (names are checked; values are never printed):

| Secret name | Purpose |
| --- | --- |
| `VPS_HOST` | VPS public IPv4 address or hostname. |
| `VPS_USER` | SSH username. Usually `root` for the first setup. |
| `VPS_SSH_KEY` | Private SSH key that can log into the VPS. |
| `VPS_APP_PATH` | Absolute path to the existing VPS git checkout on the server. On the current host this is `/root/AIFT/VPS`. There is no default and nothing is cloned; an empty value or a path that is not a git repository refuses the deploy. |
| `VPS_KNOWN_HOSTS` | Pinned SSH host key line(s) for the server (format below). |

Optional: `VPS_PORT` (SSH port, defaults to `22`).

Secrets may be repository secrets or `production` environment secrets.

## `VPS_KNOWN_HOSTS` format and how to get it

The deploy pins the server's host key and uses `StrictHostKeyChecking=yes`. The workflow refuses to
connect unless `VPS_KNOWN_HOSTS` contains an entry that matches the host **and port** it will use.

* Port 22: `host keytype key`
* Any other port: `[host]:port keytype key` (the brackets and port are required)

`ssh-keyscan -p <port> -t ed25519 <host>` already prints the correct format for the port you pass
(a plain `host keytype key` line for 22, `[host]:port keytype key` otherwise). Run it from a network
you trust, and compare the fingerprint with the server's own console if possible:

```sh
ssh-keyscan -p <port> -t ed25519 <host>
```

From the server itself (no network trust needed), build the line from its host key. For port 22:

```sh
echo "<host> $(cat /etc/ssh/ssh_host_ed25519_key.pub)"
```

For a nonstandard port, use `[<host>]:<port>` in place of `<host>`:

```sh
echo "[<host>]:<port> $(cat /etc/ssh/ssh_host_ed25519_key.pub)"
```

`<host>` must be exactly the value of `VPS_HOST`. Do not use unauthenticated `ssh-keyscan` from CI.
The deploy step fails with a clear message if the entry is missing or in the wrong form.

## `production` environment (optional, recommended)

The deploy job declares `environment: production` (url `https://vps.aifreedomtrust.com`). This
repository does not create or configure it. To require a human approval before every deploy:

1. `Repo -> Settings -> Environments -> New environment` named exactly `production`.
2. Enable **Required reviewers** and add yourself (and anyone else allowed to approve).
3. Under **Deployment branches and tags**, restrict to `main`.

If the environment does not exist, GitHub creates it **without protection** the first time a deploy job
runs. Create and protect it before turning on `VPS_DEPLOY_ENABLED`. A run that waits for approval holds
the `vps-dashboard-deploy` concurrency slot; the server also refuses to move a deployment backwards
(see `docs/deploy-rollback.md`).

## What a deploy does

1. Validates configuration, then the target SHA (the run's commit, or `rollback_sha`).
2. Over pinned SSH, under `flock` on the server, in `VPS_APP_PATH`: refuses a dirty or shallow
   checkout, fetches that SHA and checks ancestry (fail-closed: a normal deploy must descend from the
   deployed commit; a rollback must be an ancestor of `origin/main`; any `git merge-base` error
   refuses), checks it out detached, verifies `HEAD`, and rebuilds with `docker compose`, passing the
   SHA as the `AIFT_COMMIT_SHA` build arg (image label `org.opencontainers.image.revision`, and the
   `commit` field of `/api/health`).
3. Verifies health on the server's loopback (`http://127.0.0.1:3000/api/health`, matching the
   loopback-only port binding) with a bounded retry budget (30 attempts, 2 s apart, 5 s timeout each).
   The response is parsed as JSON with a strict schema (`python3` on the server is required): `ok` must
   be the boolean `true`, `status` `healthy`/`warning`, `checked_at` and `checks` present, and `commit`
   equal to the deployed SHA. Then the checkout `HEAD` and the container label must both equal the
   SHA. Any failure fails the job.
4. Appends a provenance record (deployed SHA, previous SHA, running commit, last-known-healthy before
   the deploy, run id/URL, actor, UTC time, status) to
   `/var/lib/aift/dashboard-deploys/deployments.jsonl` on the server, prints it in the job summary with
   a suggested rollback target, and uploads it as the `vps-dashboard-deployment-record-<run id>`
   artifact. Only a fully verified deploy updates `/var/lib/aift/dashboard-deploys/last-healthy-sha`.

The server needs `git`, `docker` (with compose), `curl` and `python3`; a missing tool refuses the
deploy before anything changes.

Targets older than the running-commit contract (#51) are refused before anything changes
(`refused_unverifiable_target`). The whole pipeline (real sshd with a pinned `[host]:port` key, real
Docker build of the dashboard, health, labels, provenance, rollback, locking and interruptions) can be
reproduced on a disposable machine with `scripts/acceptance/dashboard-deploy-acceptance.sh`; see
[`docs/dashboard-deploy-acceptance.md`](dashboard-deploy-acceptance.md).

Rollback procedures are in [`docs/deploy-rollback.md`](deploy-rollback.md).

## Naming standard

First node name:

`Sacramento Node 001`

Machine registry name:

`sacramento-node-001`

Dashboard domain:

`vps.aifreedomtrust.com`

## Important security rule

Never paste private keys, passwords, or VPS secrets into chat. Add them only inside GitHub repository
(or environment) secrets.

GitHub path:

`Repo -> Settings -> Secrets and variables -> Actions -> New repository secret`
