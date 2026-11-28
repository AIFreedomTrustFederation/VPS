# Aetherion supervised provider node (draft deployment profile)

This profile is **not deployed**. It targets a dedicated Linux host with systemd, a
locally installed compatible llama-server binary, and an operator-provisioned GGUF.
It is separate from Termux/Ubuntu PRoot on Android, which does not provide a
normal host systemd boot environment.

## Installation prerequisites

1. Verify the host architecture, RAM, swap, storage and GGUF license; size the
   context, thread count and MemoryMax for the real machine.
2. Provision a non-login service account named `aetherion`, with read access
   to `/var/lib/aetherion/models/aetherion.gguf`. Never commit model weights or keys.
3. Install and verify a pinned llama.cpp build at `/usr/local/bin/llama-server`.
4. Review and copy `deploy/aetherion/aetherion.env.example` to
   `/etc/aift/aetherion.env`; restrict file permissions.
5. After review, install `deploy/aetherion/aetherion.service` into the systemd
   unit directory, run `systemctl daemon-reload`, then explicitly enable/start
   the unit. None of these steps run automatically from this repository.
6. Check `systemctl status aetherion`, local `/health`, and run the existing
   `scripts/aift-aetherion-preflight.py` against the actual model ID.

## Network and privacy boundary

The inference listener binds **only to 127.0.0.1:8080**. Do not port-forward
or publicly expose it. AIFT-OS on another host must use an independently
reviewed authenticated, encrypted transport (for example an operator-managed
private network and authenticated gateway) with explicit consent for off-device
prompt processing. A raw HTTP URL is not a safe remote deployment.

No automatic cloud fallback or prompt transfer is enabled by this PR. VPS may
advertise a node as ready only after real readiness, identity, capacity and
transport checks. The service restarts on failure, with rate limits; it does
not guarantee availability during host shutdown, storage failure, or resource
exhaustion.

## Phone integration

Termux requires its own supervisor/boot integration and Android battery
policy review. Do not run this systemd unit inside PRoot and do not claim that
an Android process is guaranteed to survive OS background termination.

## Acceptance criteria

- Host service starts only with an operator-provisioned valid GGUF.
- Health check fails closed when the process is absent or unready.
- Restart limits prevent unbounded crash loops.
- No public listener, remote inference, secrets, deployment or traffic
  switching occurs during CI.
- AIFT-OS browser-job durability and recovery are verified separately in
  its companion draft PR.
