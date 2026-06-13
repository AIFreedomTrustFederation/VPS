# AIFT cross-platform node app

The production product is not only a web dashboard and not only Termux scripts.

The production product is a cross-platform AIFT Node App that can run on:

- Android phones
- Android tablets
- laptops
- desktops
- mini PCs
- home servers
- VPS servers
- bare-metal servers

The app turns approved devices into AIFT provider nodes for decentralized cloud computing.

## Product split

AIFT should have two user-facing apps:

### 1. AIFT Cloud Dashboard

The dashboard is the control surface for builders, tenants, apps, nodes, deployments, templates, health, and disclosures.

Current location:

```text
apps/aift-dashboard
```

### 2. AIFT Node App

The node app is the device-side app that enrolls a device, reports health, receives approved work, runs safe workloads, stores logs, and reports results.

Future location:

```text
apps/aift-node-app
```

## Runtime targets

### Android

Phase 0 uses Termux. Production should move toward an Android app package.

Android node roles:

- local dashboard preview
- lightweight edge compute
- static app preview
- background tasks
- cache node
- test node

### Laptop and desktop

Laptops and desktops are stronger node candidates than phones because they usually have more CPU, memory, storage, and stable networking.

Desktop node roles:

- build worker
- static app host
- preview host
- AI-assisted build worker
- local development node
- verified community node

### Server and VPS

Always-on servers remain the stable backbone.

Server node roles:

- public web hosting
- API hosting
- databases
- routing gateway
- backup node
- production customer workloads

## Recommended app stack

The first production-friendly node app should be built with a cross-platform stack.

Suggested options:

```text
Tauri + Rust + Web UI
Electron + Node.js
Flutter + native helpers
React Native + local service bridge
```

Recommended first path:

```text
Tauri for desktop
Android native or React Native for mobile
Shared TypeScript dashboard UI where possible
```

Termux remains the proof and developer mode.

## Node app responsibilities

The AIFT Node App should handle:

- device enrollment
- node identity
- local registry
- local logs
- heartbeat
- capability report
- approved job polling
- workload execution rules
- result reporting
- local dashboard link
- update channel
- pause/resume compute
- battery and network policy

## Node capability model

Each device reports capabilities:

```text
runtime type
CPU class
memory class
storage class
network type
battery status
charging status
screen state
available hours
allowed workload levels
public routing eligibility
```

## Safe workload levels

### Level 1

Static files, local previews, public content.

### Level 2

Frontend builds and cache tasks.

### Level 3

Dynamic app previews.

### Level 4

Approved background jobs.

### Level 5

Stateful services. Use verified servers first.

## Scale model

At large scale, AIFT should treat devices as an edge compute swarm.

```text
Control Plane
  -> Node Registry
  -> Scheduler
  -> Node Apps
  -> Work Results
  -> Reputation and Credits
```

Phones are mobile and interruptible. Laptops are stronger. Servers are stable. The scheduler should assign work based on node class and reputation.

## Near-term milestones

1. Termux proof works on multiple phones.
2. Node cards export/import between devices.
3. Heartbeat registry.
4. Dashboard shows discovered nodes.
5. Approved job manifest.
6. Simple static workload package.
7. Desktop node app skeleton.
8. Android node app skeleton.
9. Gateway/routing layer.
10. Tenant and account system.
