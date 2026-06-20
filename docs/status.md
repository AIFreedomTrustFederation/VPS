# AIFT VPS Status

Last reviewed: 2026-06-20

## Current Role

`VPS` is the federation infrastructure repository for AIFT Cloud App Foundry, provider-node experiments, dashboard workflows, Android runtime foundations, app/source registries, deployment records, and future AIFT naming and routing work.

## Current Verified Foundation

- The root repository is public and active.
- The dashboard application lives in `apps/aift-dashboard`.
- The node agent package lives in `apps/aift-node-agent`.
- The planned node app foundation is documented in `apps/aift-node-app`, `packages/aift-node-core`, and the node-app foundation docs.
- The Android runtime target lives in `android/aift-cloud-runtime` and builds through Gradle after running the bootstrap script.
- Registry examples live under `registry-examples`.
- Security, secret handling, and production-readiness rules are documented under `docs`.
- Lightweight local repo verification is available through `npm run qa:local`.

## Not Yet Claimed

Do not claim these as production-ready until the implementation and verification path are documented and passing:

- decentralized public routing
- `.aft` or AIFT name authority
- signed service-record enforcement
- production workload scheduling
- unattended multi-node failover
- production secret distribution
- public gateway reliability
- verified community-node trust scoring

## Current Validation Boundary

`npm run qa:local` is the current dependency-light local gate. It validates repository structure, root workspace wiring, Android runtime file placement, registry example presence, and installer registry integrity.

Dashboard, node-agent, desktop, and Android builds require their runtime stacks and should be run when those areas change. See `docs/validation.md`.

## Next Best Work

1. Keep `npm run qa:local` green on every structural change.
2. Build the first AIFT VPS Node App shell from `docs/aift-vps-node-app-foundation.md`.
3. Add signed node identity and heartbeat verification before public workload scheduling.
4. Harden app-source intake, workspace sync, dependency install, build, preview, and route promotion.
5. Keep public claims tied to working checks and logs.
