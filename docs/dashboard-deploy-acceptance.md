# Dashboard deploy: end-to-end acceptance harness

`scripts/acceptance/dashboard-deploy-acceptance.sh` runs the **real** deploy pipeline against a
disposable stand-in for the VPS. It is opt-in, is not part of required CI, and alters the machine it runs on:
run it only on a throwaway Linux box with Docker and the compose plugin.

```sh
AIFT_ACCEPTANCE=1 WORK_DIR=/tmp/vps-acceptance [DOCKER="sudo docker"] \
  scripts/acceptance/dashboard-deploy-acceptance.sh            # all scenarios, ~10 minutes
scripts/acceptance/dashboard-deploy-acceptance.sh cleanup       # remove its containers
```

It never contacts GitHub or the production VPS and uses no real credentials. Throwaway SSH keys are
generated under `$WORK_DIR/keys`; never commit them.

## What is real and what is simulated

| Part | In the harness |
| --- | --- |
| Runner side | The real `scripts/deploy-dashboard-runner.sh`, driven with the same environment variables and subcommands as `deploy-aift-dashboard.yml` (`validate`, `resolve-target`, `ssh-setup`, `deploy`, `summarize`). GitHub Actions itself, the `production` environment approval and concurrency groups are **not** exercised. |
| SSH | Real OpenSSH client and `sshd` (key-only root login), with a pinned `[127.0.0.1]:<port>` known_hosts line, `StrictHostKeyChecking=yes`. |
| Server | An Ubuntu 24.04 container (`scripts/acceptance/vps-server.Dockerfile`) on the host network, with `git`, `curl`, `python3`, `flock`, and the Docker CLI using the host daemon. It is not a real VPS: no systemd, firewall, reverse proxy or TLS. |
| Git | A bare `origin` cloned from this checkout (`main` = its `HEAD`), a full server clone at `/root/AIFT/VPS`, and harness-only commits pushed to that local origin. |
| Dashboard | The real image built from `apps/aift-dashboard/Dockerfile` and `compose.yml` (container `aift-dashboard`, `127.0.0.1:3000`, `/opt/aift` mounts), with the real `/api/health` response. |
| Server script | The real `scripts/deploy-dashboard-remote.sh` streamed over ssh under `flock`, with production defaults (no test overrides reach it over ssh). |

## Scenarios

| Scenario | Verifies |
| --- | --- |
| `hostkey` | A portless known_hosts line is refused by `ssh-setup`. (OpenSSH itself would accept it: "found matching key w/out port". The runner is deliberately stricter.) A wrong pinned key fails with `Host key verification failed` and leaves the server untouched. An empty `VPS_KNOWN_HOSTS` is refused by `validate`. |
| `first` | A fresh clone, no state directory and no container. The first deploy is healthy and `last_healthy_before` is `none`. The real `/api/health` returns `ok: true` and `commit` equal to the SHA, the image label equals the SHA, `last-healthy-sha` is written, and the port binds loopback only. |
| `forward` | Forward deploys serve the target's code (marker file, label, health commit, HEAD). A stale older push is `refused_downgrade`, nothing changes, and the refusal is recorded. |
| `rollback` | `rollback_sha` rebuilds and serves exactly the target's code. HEAD, label, health commit and `last-healthy-sha` all equal the target. A later push moves forward again. |
| `historical` | Rollback to `458dfe50` (before #51) is `refused_unverifiable_target`. The running app, HEAD and `last-healthy-sha` are unchanged. |
| `unhealthy` | A commit whose health returns `ok: false` fails the job twice. `last-healthy-sha` is preserved and the summary suggests it. The manual rollback to it recovers a verified app; landing a revert makes `main` deployable again. |
| `concurrency` | While a deploy runs, the server lock is held (`flock -n` refused). A second, stale run queues on the lock, then is `refused_downgrade`. Records are serialized. |
| `interrupt` | Runner killed mid-build (records `failed`; re-run recovers). Runner killed during `compose up` (server finishes on its own; re-run converges). Server script SIGKILLed (no record, marker left; the next run records `interrupted`, then deploys healthy). The lock is released, the checkout stays clean, and the whole log is valid JSONL. |

Evidence: `$WORK_DIR/results.tsv` (one PASS/FAIL line per check), `$WORK_DIR/logs/<scenario>.log`,
`$WORK_DIR/runs/<run>/` (workflow log, deploy output, job summary, record, exit code) and
`$WORK_DIR/server-state/dashboard-deploys/` (the server's `deployments.jsonl` and `last-healthy-sha`).
