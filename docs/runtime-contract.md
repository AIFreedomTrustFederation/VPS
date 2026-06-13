# AIFT VPS runtime contract

This contract defines what every AIFT VPS node runtime must provide, whether it runs through Termux, a bundled Android runtime, a desktop app, a laptop worker, a VPS, or a server.

## Purpose

The runtime is the local engine controlled by the AIFT VPS Node App.

It must let a device become a provider node without exposing the device owner to unsafe or unknown behavior.

## Required runtime capabilities

Every runtime must support:

- local application data directory
- local registry directory
- local log directory
- node identity file
- heartbeat file writer
- node card export/import
- HTTP download
- repository ZIP download
- optional git support
- Node.js runtime
- npm package install support
- local process start
- local process stop
- local process status
- local port binding
- local dashboard URL
- environment variables
- update channel
- safe cleanup

## Standard local folders

Phone and desktop app runtimes should map these paths internally:

```text
AIFT_HOME/
  identity/
  registry/
  heartbeats/
  node-cards/
  logs/
  runtime/
  apps/
  jobs/
  cache/
  tmp/
```

For Termux proof mode, `AIFT_HOME` may be:

```text
~/.aift-<node-name>
```

For production mobile apps, `AIFT_HOME` should be the app-private storage directory.

For desktop apps, `AIFT_HOME` should be the app data directory for the current user.

## Node identity

Each node must have an identity record:

```json
{
  "node_id": "termux-node-002",
  "display_name": "Termux Node 002",
  "node_class": "phone-experimental",
  "runtime_type": "termux-proof",
  "created_at": "2026-06-12T00:00:00Z"
}
```

## Heartbeat contract

Each node must write a heartbeat record:

```json
{
  "node_id": "termux-node-002",
  "display_name": "Termux Node 002",
  "node_class": "phone-experimental",
  "status": "online",
  "port": 3001,
  "local_url": "http://127.0.0.1:3001",
  "health_url": "http://127.0.0.1:3001/health",
  "last_seen_at": "2026-06-12T00:00:00Z"
}
```

## Node card contract

Each node may export a small discovery card:

```text
node=termux-node-002
display=Termux Node 002
port=3001
health=http://127.0.0.1:3001/health
created=2026-06-12T00:00:00Z
```

Node cards are for local discovery and bootstrap testing. Production registry sync should use signed API requests.

## Workload safety levels

The runtime must enforce workload levels:

```text
Level 1: static files and public previews
Level 2: frontend build output
Level 3: dynamic preview process
Level 4: approved background job
Level 5: stateful service, verified nodes only
```

Early phone nodes should default to Level 1 and Level 2 only.

## Runtime actions

The app should be able to call these actions:

```text
installRuntime
updateRuntime
createNodeIdentity
readNodeIdentity
startDashboard
stopDashboard
getDashboardStatus
writeHeartbeat
exportNodeCard
importNodeCard
listNodeCards
readLogs
clearTemporaryFiles
reportCapabilities
```

## Security rules

The runtime must not run arbitrary public code by default.

Allowed operations should be limited to:

- AIFT-owned bootstrap scripts
- approved templates
- signed job manifests
- user-approved local actions
- declared workload levels

## Production rule

Termux is the proof runtime. The production AIFT VPS Node App should bundle or manage its own runtime while preserving this same contract.
