# AIFT VPS Node App Foundation

This is the current focus of the project.

The goal is to make one device become one AIFT VPS Node through an installed app with a bundled Linux-style runtime.

## Product model

```text
AIFT VPS Dashboard = control center
AIFT VPS Node App = installed provider-node app
Bundled Runtime = local Linux-style engine
AIFT Node Core = shared action model
AIFT Scripts = proof and developer bootstraps
```

## Perfect first flow

```text
Install AIFT VPS Node App
Open app
Create node identity
Prepare bundled runtime
Choose provider mode
Start local node
Write heartbeat
Show node online
Open local dashboard
```

## Foundation files

```text
docs/runtime-contract.md
docs/node-app-screen-flow.md
docs/bundled-runtime-node-app.md
docs/cross-platform-node-app.md
apps/aift-node-app/README.md
apps/aift-node-app/foundation-checklist.yml
packages/aift-node-core/README.md
```

## First app shell screens

```text
Welcome
Node Identity
Runtime Setup
Provider Mode
Start Node
Node Online
Discovery
Logs
Settings
```

## Current proof files

```text
scripts/aift-termux.sh
scripts/termux-phone-provider-node.sh
scripts/termux-join-provider-node-zip.sh
scripts/aift-heartbeat.sh
scripts/aift-node-card.sh
scripts/aift-discover.sh
```

## What to build next

Build the first AIFT VPS Node App shell from this foundation. Do not prioritize payments, marketplace, routing, or public workloads before the app-controlled node foundation is working.
