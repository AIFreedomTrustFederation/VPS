# AIFT VPS Node App with bundled runtime

This is the selected production direction for Android and future mobile devices.

## Decision

AIFT VPS should build a branded node app that includes or manages its own Termux-like Linux runtime instead of requiring users to manually install Termux, curl, git, or bash scripts.

## Product goal

The user experience should be:

```text
Install AIFT VPS Node App
Open app
Tap Join AIFT VPS Network
App prepares runtime
App starts local node
App reports heartbeat
App shows node online
```

## Architecture

```text
AIFT VPS Node App
  -> bundled Linux-style runtime
  -> AIFT VPS bootstrap scripts
  -> local node service
  -> local dashboard
  -> heartbeat and discovery
  -> control plane registration
```

## Why bundled runtime

A bundled runtime gives AIFT:

- one branded app experience
- no manual Termux dependency
- access to a Linux-style userspace
- reuse of current repo scripts
- path to Node.js, npm, git, curl, logs, registries, and dashboard runtime
- easier onboarding for non-technical users

## What the runtime should provide

The bundled runtime should provide:

- shell-compatible command runner
- local file system area
- Node.js runtime
- npm package support
- git or repository ZIP download support
- curl or HTTP download support
- process manager
- log storage
- local port binding
- background task control

## App responsibilities

The AIFT VPS Node App should handle:

- install runtime
- update runtime
- install AIFT scripts
- create node identity
- create local registry
- start node dashboard
- write heartbeat
- export node card
- register with control plane
- show local status
- show logs
- pause or resume provider mode
- enforce allowed workload levels

## Current proof mapping

Current script proof:

```text
scripts/aift-termux.sh
scripts/termux-phone-provider-node.sh
scripts/termux-join-provider-node-zip.sh
scripts/aift-heartbeat.sh
scripts/aift-node-card.sh
scripts/aift-discover.sh
```

Future app actions:

```text
Install Runtime -> prepare bundled runtime
Start Node -> run provider bootstrap internally
Discover -> write heartbeat and node card internally
Open Dashboard -> open local dashboard URL
View Logs -> show local log files
```

## Device classes

The app should identify the node class:

```text
phone-experimental
phone-plugged-in
tablet-node
laptop-worker
desktop-worker
mini-pc-node
server-node
verified-provider-node
```

## Runtime safety

The app should not run arbitrary public code. It should only run AIFT-approved bootstraps, signed job manifests, known templates, and workload levels permitted by the device owner.

## Development path

1. Keep Termux scripts working as developer mode.
2. Define bundled runtime requirements.
3. Build AIFT VPS Node App shell.
4. Add runtime installation screen.
5. Add node identity screen.
6. Add start/stop node controls.
7. Add heartbeat and node-card controls.
8. Add dashboard link and logs.
9. Add control plane enrollment.
10. Add signed job runner.

## Short-term repo task

Create a minimal `apps/aift-node-app` skeleton that documents screens and runtime service boundaries before choosing final mobile framework.
