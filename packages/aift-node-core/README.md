# AIFT Node Core

`packages/aift-node-core` is the planned shared logic package for AIFT VPS nodes.

It should define the reusable actions used by:

- Termux proof scripts
- bundled Android runtime
- desktop node app
- laptop workers
- server and VPS installers

## Purpose

The goal is to make all device types follow one node model.

```text
One node identity model
One heartbeat model
One discovery model
One runtime action list
One safety policy model
```

## Planned exports

```text
createNodeIdentity()
readNodeIdentity()
writeHeartbeat()
readHeartbeat()
exportNodeCard()
importNodeCard()
listNodeCards()
startDashboard()
stopDashboard()
getDashboardStatus()
readLogs()
reportCapabilities()
readRuntimeConfig()
writeRuntimeConfig()
```

## Data models

### NodeIdentity

```ts
type NodeIdentity = {
  nodeId: string;
  displayName: string;
  nodeClass: string;
  runtimeType: string;
  createdAt: string;
};
```

### Heartbeat

```ts
type Heartbeat = {
  nodeId: string;
  displayName: string;
  nodeClass: string;
  status: "online" | "warning" | "offline" | "unknown";
  port: number;
  localUrl: string;
  healthUrl: string;
  lastSeenAt: string;
};
```

### RuntimeConfig

```ts
type RuntimeConfig = {
  aiftHome: string;
  registryDir: string;
  heartbeatDir: string;
  nodeCardsDir: string;
  logsDir: string;
  runtimeDir: string;
  appsDir: string;
  jobsDir: string;
};
```

## Implementation rule

The first version can wrap existing shell scripts. Later versions should provide native TypeScript/Rust/mobile implementations behind the same action names.

## Safety rule

Node Core should never expose arbitrary execution as a default public action. Work must be represented by approved templates or signed job manifests.
