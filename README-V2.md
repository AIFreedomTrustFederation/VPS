# AIFT VPS

**AIFT VPS** is a decentralized virtual private server network. It turns phones, tablets, laptops, desktops, mini PCs, VPS instances, and servers into provider nodes for cloud apps, edge compute, previews, builds, and verified hosting.

The app foundry, dashboard, templates, build system, node app, node scripts, and routing layer are features of AIFT VPS.

```text
AIFT VPS
  -> AIFT VPS Dashboard
  -> AIFT VPS Node App
  -> AIFT VPS Provider Nodes
  -> AIFT VPS App Foundry
  -> AIFT VPS Edge Compute
```

---

## Current focus

The first thing to make perfect is the **AIFT VPS Node App Foundation**.

This foundation defines how an installed device app turns one device into one AIFT VPS Node through an app-controlled bundled runtime.

Foundation files:

```text
docs/aift-vps-node-app-foundation.md
docs/runtime-contract.md
docs/node-app-screen-flow.md
docs/bundled-runtime-node-app.md
docs/cross-platform-node-app.md
apps/aift-node-app/README.md
apps/aift-node-app/foundation-checklist.yml
packages/aift-node-core/README.md
```

The perfect first product flow is:

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

---

## What we have working now

We have proven that multiple Android devices can run the AIFT VPS dashboard locally through Termux proof mode:

```text
Phone 1 -> Sacramento Node 001 -> http://127.0.0.1:3000
Phone 2 -> Termux Node 002 -> http://127.0.0.1:3001
```

Current working pieces:

- Next.js AIFT VPS dashboard in `apps/aift-dashboard`.
- Webpack development mode for Android/Termux compatibility.
- Termux phone provider-node launcher.
- Termux multi-device join launcher.
- No-git ZIP bootstrap fallback for devices with broken Termux Git HTTPS.
- Local registry folders per node.
- Local node logs per node.
- Mobile URL printer.
- Node card export/import helper for discovery experiments.
- Heartbeat writer.
- Simple discovery script.
- `/discovered-nodes` dashboard route.
- VS Code browser tasks for install/build/dev when a terminal is available.
- Production phase roadmap.
- VPS branding guide.
- Cross-platform node app architecture.
- Bundled runtime node app direction.

---

## Runtime strategy

The selected production direction is:

```text
AIFT VPS Node App
  -> bundled Linux-style runtime
  -> AIFT VPS bootstrap logic
  -> local node service
  -> local dashboard
  -> heartbeat and discovery
  -> future control-plane registration
```

Termux remains the proof and developer runtime. The production app should bundle or manage its own runtime so normal users do not manually install Termux, curl, git, npm, or shell scripts.

---

## Product components

### AIFT VPS Dashboard

Location:

```text
apps/aift-dashboard
```

The dashboard is the control center for apps, nodes, templates, builds, deployments, health, disclosures, and settings.

### AIFT VPS Node App

Location:

```text
apps/aift-node-app
```

The node app is the future installable app that prepares the runtime, creates node identity, starts the node service, writes heartbeat status, shows logs, and lets the owner control provider mode.

### AIFT Node Core

Location:

```text
packages/aift-node-core
```

The shared action model for Termux proof mode, bundled Android runtime, desktop runtime, laptop workers, VPS nodes, and servers.

### Scripts

Location:

```text
scripts
```

Current scripts are proof and developer bootstraps. They are still important because the future app can wrap or replace them behind a cleaner UI.

---

## Fast start: first phone as primary node

Run this in Termux on the first phone:

```bash
curl -fsSL https://raw.githubusercontent.com/AIFreedomTrustFederation/VPS/main/scripts/aift-termux.sh -o aift-termux.sh
bash aift-termux.sh primary
```

Open on the same phone:

```text
http://127.0.0.1:3000/health
http://127.0.0.1:3000/connect-node
http://127.0.0.1:3000/nodes
http://127.0.0.1:3000/deployments
```

Primary identity:

```text
Display name: Sacramento Node 001
Machine name: sacramento-node-001
Port: 3000
```

---

## Fast start: second phone or temporary node

Run this in Termux on another Android device:

```bash
curl -fsSL https://raw.githubusercontent.com/AIFreedomTrustFederation/VPS/main/scripts/aift-termux.sh -o aift-termux.sh
NODE_NAME=termux-node-002 NODE_DISPLAY="Termux Node 002" APP_PORT=3001 bash aift-termux.sh join
```

Open on that second device:

```text
http://127.0.0.1:3001/health
http://127.0.0.1:3001/connect-node
http://127.0.0.1:3001/nodes
http://127.0.0.1:3001/deployments
```

---

## Local command wrapper

Once the repo exists locally on a device, run commands through the root wrapper:

```bash
bash aift local primary
bash aift local join
bash aift local urls
bash aift heartbeat
bash aift node-card export
bash aift node-card list
bash aift node-card import path/to/card
```

Discovery helper:

```bash
NODE_NAME=termux-node-002 NODE_DISPLAY="Termux Node 002" APP_PORT=3001 bash scripts/aift-discover.sh
```

---

## Important Android and Termux note

Next.js Turbopack is not supported on Android/Termux. The dashboard uses Webpack for Termux compatibility:

```json
"dev": "next dev --webpack --hostname 0.0.0.0"
```

If a node refuses connection, inspect the local log:

```bash
tail -120 ~/.aift-termux-node-002/logs/dashboard.log
```

or for the primary phone:

```bash
tail -120 ~/.aift/logs/aift-dashboard-termux.log
```

---

## Repository structure

```text
.
├── aift
├── BRAND.md
├── README.md
├── README-V2.md
├── apps/
│   ├── aift-dashboard/
│   ├── aift-node-agent/
│   └── aift-node-app/
├── docs/
│   ├── aift-vps-node-app-foundation.md
│   ├── runtime-contract.md
│   ├── node-app-screen-flow.md
│   ├── bundled-runtime-node-app.md
│   ├── cross-platform-node-app.md
│   ├── production-phases.md
│   ├── phase-2a-node-discovery.md
│   ├── template-packaging.md
│   └── vps-branding.md
├── packages/
│   └── aift-node-core/
├── registry-examples/
├── scripts/
├── templates/
├── aift.schema.yml
└── aift.node.schema.yml
```

---

## Current dashboard routes

The dashboard currently includes:

```text
/
/apps
/templates
/builds
/deployments
/nodes
/health
/connect-node
/phase-zero
/discovered-nodes
/settings
/disclosures/[app]
```

---

## Production phases

See `docs/production-phases.md` for the full roadmap.

Summary:

```text
Phase 0: local proof
Phase 1: easy node onboarding
Phase 2: node discovery
Phase 3: workload runner
Phase 4: app deployment
Phase 5: multi-node routing
Phase 6: tenants and accounts
Phase 7: production provider network
```

---

## Node classes

AIFT VPS should support many device classes:

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

Phones are mobile and interruptible. Laptops and desktops are stronger workers. Servers and VPS nodes are the stable backbone. The scheduler should assign work based on node class, uptime, trust, and capability.

---

## Workload safety levels

The runtime contract defines workload levels:

```text
Level 1: static files and public previews
Level 2: frontend build output
Level 3: dynamic preview process
Level 4: approved background job
Level 5: stateful service, verified nodes only
```

Early phone nodes should default to Level 1 and Level 2 only.

---

## Full disclosure principle

AIFT VPS must disclose where workloads run.

Every deployment should disclose:

```text
App name
Deployment id
Node name
Node operator class
Node trust level
Region or local label
Runtime type
Backup status
Monitoring status
Whether the node is managed, verified community-operated, self-hosted, or experimental
```

Phone nodes must be clearly disclosed as experimental or edge nodes until they meet uptime, security, and routing standards.

---

## Immediate next milestone

Build the first **AIFT VPS Node App shell** using the foundation docs.

The shell should model these screens first:

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

Do not prioritize payments, marketplace, public routing, or public workloads until one device can reliably become one app-controlled AIFT VPS Node.

---

## Brand rule

Keep **VPS** visible in the project name, UI, README files, docs, scripts, and onboarding language so technical builders immediately understand the category.

```text
AIFT VPS = decentralized virtual private server network
```
