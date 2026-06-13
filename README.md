# AI Freedom Trust Cloud App Foundry

AI Freedom Trust Cloud App Foundry is a mobile-first, open-source, decentralized cloud app foundry. The project began as a VPS dashboard and has now proven a Phase 0 mobile provider-node model where Android phones running Termux can become local AIFT compute nodes.

The long-term goal is a hybrid provider network:

```text
Verified servers = stable cloud backbone
Phones and edge devices = decentralized edge compute swarm
```

This repository is the source of truth for the dashboard, node launchers, registry examples, templates, deployment scripts, and production roadmap.

---

## What we have working now

We have proven that multiple Android devices can run the AIFT dashboard locally:

```text
Phone 1 -> Sacramento Node 001 -> http://127.0.0.1:3000
Phone 2 -> Termux Node 002 -> http://127.0.0.1:3001
```

Current working pieces:

- Next.js AIFT dashboard in `apps/aift-dashboard`.
- Webpack development mode for Android/Termux compatibility.
- Termux phone provider-node launcher.
- Termux multi-device join launcher.
- No-git ZIP bootstrap fallback for devices with broken Termux Git HTTPS.
- Local registry folders per node.
- Local node logs per node.
- Mobile URL printer.
- Node card export/import helper for discovery experiments.
- VS Code browser tasks for install/build/dev when a terminal is available.
- GitHub Actions build/deploy pipeline foundation.
- Production phase roadmap.

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

If Termux Git HTTPS is broken, the unified join command uses the ZIP bootstrap path through `scripts/termux-join-provider-node-zip.sh`.

---

## Local command wrapper

Once the repo exists locally on a device, run commands through the root wrapper:

```bash
bash aift local primary
bash aift local join
bash aift local urls
bash aift node-card export
bash aift node-card list
bash aift node-card import path/to/card
```

Example for Node 002:

```bash
NODE_NAME=termux-node-002 NODE_DISPLAY="Termux Node 002" APP_PORT=3001 bash aift local join
NODE_NAME=termux-node-002 NODE_DISPLAY="Termux Node 002" APP_PORT=3001 bash aift node-card export
```

---

## Important Android/Termux note

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
├── apps/
│   ├── aift-dashboard/
│   └── aift-node-agent/
├── docs/
│   ├── production-phases.md
│   ├── browser-vscode-run.md
│   ├── source-control-setup.md
│   └── node-enrollment-standard.md
├── registry-examples/
│   ├── nodes.yml
│   ├── templates.yml
│   ├── builds.yml
│   └── deployments.yml
├── scripts/
│   ├── aift-node-card.sh
│   ├── aift-termux.sh
│   ├── termux-phone-provider-node.sh
│   ├── termux-join-provider-node.sh
│   ├── termux-join-provider-node-zip.sh
│   ├── phase-zero-mobile-live.sh
│   ├── print-mobile-urls.sh
│   └── enroll-node.sh
├── templates/
│   ├── static-site/
│   └── vite-react/
├── aift.schema.yml
├── aift.node.schema.yml
└── README.md
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
/settings
/disclosures/[app]
```

Current API foundation includes:

```text
/api/status
/api/apps
/api/apps/create
/api/nodes
/api/nodes/heartbeat
/api/templates
/api/builds
/api/deployments
/api/health
/api/tenant-secrets/bootstrap
```

---

## Current node model

AIFT has three node categories:

```text
Managed AIFT Node
Verified Community Node
Self-Hosted Node
```

For the phone-based proof, nodes are experimental Termux provider nodes. They are useful for local dashboards, edge experiments, temporary compute, and future lightweight jobs. They are not yet equivalent to always-on production VPS servers.

Production model:

```text
Class A: verified always-on servers
Class B: plugged-in Wi-Fi phones
Class C: mobile battery phones
Class D: experimental nodes
```

Suggested use:

```text
Class A/B -> hosting, build jobs, routing
Class C/D -> background compute, caching, tests, lightweight jobs
```

---

## Full disclosure principle

Every deployment should disclose where it runs:

```text
App name
Deployment id
Node name
Node operator class
Node trust level
Region
Runtime type
Backup status
Monitoring status
Whether the node is managed, verified community-operated, self-hosted, or experimental
```

Phone nodes must be clearly disclosed as experimental or edge nodes until they meet uptime, security, and routing standards.

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

## Scaling to many phones

AIFT should scale phones as an edge compute swarm, not as a direct replacement for stable servers.

Production architecture:

```text
AIFT Control Plane
  -> Node Registry
  -> Phone Node Agents
  -> Local phone runtime
  -> Workload results, previews, cache, or edge tasks
```

A phone node should report:

```text
node_id
device_type
region/network class
battery and charging state
available memory
available storage
runtime capabilities
last_seen_at
reputation score
allowed workload classes
```

At scale, phones should receive signed, approved jobs only. Arbitrary shell execution is not part of the public model.

---

## App packaging path

Current templates:

```text
templates/static-site
templates/vite-react
```

Current app standard:

```text
aift.app.yml
Dockerfile or static output
build command
runtime port
health route
disclosure record
```

Near-term app package goals:

```text
1. Static site package
2. Vite React package
3. Next.js package
4. Simple API package
5. Job manifest for approved node tasks
6. Per-app logs and status page
7. Disclosure page for every app
```

The first production app package should be a static or Vite app because those are safer for phone nodes than long-running databases or private backends.

---

## Safety and limits

This project is currently in proof and foundation phases. It is not yet ready for public customer workloads.

Before public users, AIFT needs:

```text
real authentication
tenant registry
node registry sync
job queue
safe workload runner
routing layer
HTTPS/domain automation
resource limits
abuse controls
backups
audit logs
support process
```

---

## Immediate next milestone

The next repo milestone is Phase 2A: heartbeat registry.

Goal:

```text
Each phone node reports status.
The dashboard shows live nodes.
Node 001 can know Node 002 exists.
Imported node cards become dashboard-visible node records.
```

This moves AIFT from independent local phones to a true multi-device provider network.
