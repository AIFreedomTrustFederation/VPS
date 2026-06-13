# AIFT production phases

This document turns the current multi-device proof into a production path.

## Phase 0: local proof

Goal: prove that a phone can run the AIFT dashboard locally.

Done when:

- Termux can install packages.
- The public repository can be downloaded.
- The dashboard starts with Webpack on Android.
- `/health` loads locally.
- A second device can join on a different port.

## Phase 1: easy node onboarding

Goal: make every new device join with one command.

Build:

- One launcher for primary devices.
- One launcher for temporary join devices.
- No-git zip fallback.
- Automatic port selection.
- Local node profile.
- Local registry folder.
- Local log folder.
- Clear live URL report.

## Phase 2: node discovery

Goal: let devices see each other.

Build:

- Shared node registry format.
- Local export command.
- Import command for another node.
- Heartbeat file per node.
- Dashboard view for discovered nodes.

## Phase 3: workload runner

Goal: run approved workloads safely.

Build:

- Approved job manifest.
- Per-job working folders.
- Per-job logs.
- Time limits.
- Port assignment.
- Kill/cleanup command.

## Phase 4: app deployment

Goal: deploy simple apps to one node.

Build:

- Static site template.
- Vite template.
- Build logs.
- App status page.
- Disclosure page.

## Phase 5: multi-node routing

Goal: route users to apps running on different devices.

Build:

- Public tunnel option.
- Domain mapping.
- HTTPS setup.
- Node availability checks.
- Failover rules.

## Phase 6: tenants and accounts

Goal: support real users.

Build:

- Login.
- Tenant registry.
- Per-user apps.
- Per-user secrets.
- Roles.
- Audit log.

## Phase 7: production provider network

Goal: operate AIFT as a real decentralized provider system.

Build:

- Verified node program.
- Resource accounting.
- Billing or credits.
- Backups.
- Abuse controls.
- Security reviews.
- Support process.
