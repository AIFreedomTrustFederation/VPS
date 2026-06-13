# AIFT VPS Node App

AIFT VPS Node App is the planned cross-platform device application for the AIFT VPS decentralized provider network.

It will replace one-off proof scripts with a real app experience for phones, tablets, laptops, desktops, mini PCs, VPS servers, and bare-metal servers.

## Product identity

```text
AIFT VPS Node App = installed provider-node app
AIFT VPS Dashboard = control center
Bundled runtime = local Linux-style engine
AIFT Node Core = shared action model
```

## Purpose

The node app lets a device join the AIFT VPS network as a provider node.

It should support:

- Android phones and tablets
- laptops
- desktops
- local mini PCs
- always-on servers
- VPS nodes

## Selected runtime direction

The selected production direction is a bundled Linux-style runtime.

The app should not require normal users to manually install Termux. Termux remains the proof and developer runtime, while the production app bundles or manages its own runtime internally.

## First perfect milestone

The first thing to make perfect is the AIFT VPS Node App Foundation:

```text
1. Runtime Contract
2. Node App Screen Flow
3. Node Core Action List
```

Foundation docs:

```text
docs/runtime-contract.md
docs/node-app-screen-flow.md
docs/bundled-runtime-node-app.md
packages/aift-node-core/README.md
apps/aift-node-app/foundation-checklist.yml
```

## First-launch flow

```text
Install app
Open app
Create node identity
Prepare bundled runtime
Choose provider mode
Start local node
Write heartbeat
Show node online
Open local dashboard
```

## Responsibilities

The node app should handle:

- node enrollment
- node identity
- local status
- local logs
- heartbeat
- resource reporting
- capability reporting
- approved workload levels
- result reporting
- pause and resume
- local dashboard link
- update flow

## Current proof mode

Current proof mode uses Termux scripts:

```text
scripts/aift-termux.sh
scripts/termux-phone-provider-node.sh
scripts/termux-join-provider-node-zip.sh
scripts/aift-heartbeat.sh
scripts/aift-node-card.sh
scripts/aift-discover.sh
```

## Future package options

Candidate stacks:

```text
Tauri desktop app
Android app
React Native mobile app
Electron desktop app
Flutter mobile and desktop app
```

Recommended direction:

```text
Tauri for desktop nodes
Android app for mobile nodes
Shared web dashboard UI where possible
```

## Node classes

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

## First app shell screens

The first app shell should model these screens:

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

## What comes after the foundation

After the foundation is perfect, build:

```text
1. app shell mockup
2. local runtime installer screen
3. node identity storage
4. dashboard start and stop controls
5. heartbeat loop
6. local logs viewer
7. discovery view
8. control-plane enrollment
9. signed job runner
```
