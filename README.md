# AI Freedom Trust Cloud App Foundry

**Repository description:** Mobile-first, fully disclosed decentralized cloud app foundry for creating, building, rebuilding, deploying, monitoring, and hosting web applications across AIFT compute nodes from GitHub.

AI Freedom Trust Cloud App Foundry is a sovereign, open-source, phone-controlled cloud platform. It begins as one VPS, then grows into a decentralized compute network where approved node operators can contribute servers, VPS instances, and infrastructure to build and host applications under clear disclosure, security standards, and trust levels.

> Create apps from a phone. Store every file in GitHub. Build with AIFT Cloud. Deploy across disclosed compute nodes. Rebuild like Vercel. Stay transparent about where each app runs.

---

## Mission

AI Freedom Trust Cloud exists to make app creation and deployment accessible from a mobile device while preserving transparency, portability, and infrastructure sovereignty.

The platform must allow users to:

- Create apps from templates.
- Generate and edit app files with AI-assisted workflows.
- Store source code in GitHub.
- Build and rebuild apps like Vercel.
- Deploy to custom domains or AIFT subdomains.
- Run apps on managed, verified, or self-hosted AIFT compute nodes.
- View logs, status, builds, deployments, and node disclosures from a phone.
- Avoid hidden infrastructure and vendor lock-in.
- Understand exactly what kind of node is hosting each workload.

---

## Product Definition

**AI Freedom Trust Cloud App Foundry is a mobile-first decentralized cloud compute platform where applications are created from templates or AI-assisted workflows, stored in GitHub, built with Docker-compatible infrastructure, deployed across disclosed AIFT compute nodes, and managed from a browser-based dashboard.**

This is not only a VPS dashboard. The VPS is node one. The product is the cloud foundry.

---

## Full Disclosure Principle

AIFT Cloud must be transparent about where applications run.

Every deployment should disclose:

- App name
- Deployment ID
- Node name
- Node operator class
- Node trust level
- Region
- Runtime type
- Backup status
- Monitoring status
- Whether the node is AIFT-managed, verified community-operated, or self-hosted

Example:

```text
App: capital-city-provisions
Node: sacramento-node-001
Operator class: AIFT managed
Region: US West
Trust level: verified
Runtime: Docker container
Backups: enabled
Monitoring: enabled
```

For community nodes, the disclosure must clearly say that the node is independently operated and should only receive workloads that match its trust level.

---

## Platform Model

```text
Phone Browser
   ↓
AIFT Dashboard
   ↓
AIFT Control Plane
   ↓
GitHub Source Repositories
   ↓
Build Queue
   ↓
AIFT Compute Nodes
   ↓
Docker Runtime / Reverse Proxy / HTTPS
   ↓
Live Applications
```

---

## Core Components

### AIFT Dashboard

Location:

```text
apps/aift-dashboard
```

The mobile-first web control panel for apps, templates, builds, deployments, logs, domains, nodes, and disclosures.

### AIFT Control Plane

Coordinates app records, node records, templates, build jobs, deployment jobs, domains, logs, and disclosure records. The first version may use YAML registries. Later versions should move to a database.

### AIFT Node Agent

Planned location:

```text
apps/aift-node-agent
```

The software each compute node runs to register, report health, report resources, accept approved jobs, build containers, run apps, and report logs.

### GitHub Source Layer

GitHub is the source of truth for app files. Every app should be reproducible from a GitHub repo, `aift.app.yml`, build settings, and deployment record.

### Runtime Layer

The runtime should be Docker-first with isolated containers, HTTPS, health checks, logs, rollback, resource limits, and deployment disclosure.

---

## Node Types

### Managed AIFT Node

Owned or directly controlled by AI Freedom Trust Federation. Use for client apps, business apps, sensitive dashboards, databases, and paid production workloads.

### Verified Community Node

Operated by an approved third party under AIFT standards. Use for public websites, demo apps, low-risk workloads, distributed capacity, and future revenue-share compute.

### Self-Hosted Node

Operated by the app owner or builder. Use for sovereign deployments, private builders, personal apps, development environments, and customers who want control of their own server.

---

## Workload Trust Classes

### Class 1: Public Static

Landing pages, brochures, public docs, marketing pages. Can run on managed, verified community, or self-hosted nodes.

### Class 2: Public Dynamic

React apps, Next.js apps, public dashboards, and basic APIs. Can run on managed nodes, self-hosted nodes, or verified community nodes if no sensitive data is involved.

### Class 3: Business App

Client portals, booking apps, CRM-like tools, and admin dashboards. Should run on managed nodes or explicitly trusted self-hosted nodes.

### Class 4: Sensitive App

Apps with private customer data, payments, identity, or internal administration. Managed nodes only at first.

### Class 5: Database Workload

Postgres, MySQL, Redis, uploads, and storage services. Managed nodes only at first, unless the customer explicitly self-hosts.

---

## Current Repository Structure

```text
.
├── apps/
│   └── aift-dashboard/
├── bin/
│   └── aift
├── docs/
├── scripts/
├── templates/
│   ├── static-site/
│   └── vite-react/
├── aift.schema.yml
└── README.md
```

Current coded product:

```text
apps/aift-dashboard
```

Current templates:

```text
templates/static-site
templates/vite-react
```

Current setup scripts:

```text
scripts/setup-vps.sh
scripts/create-aift-folders.sh
scripts/mobile-realworld-setup.sh
```

---

## Planned Repository Structure

```text
.
├── apps/
│   ├── aift-dashboard/
│   ├── aift-node-agent/
│   ├── aift-control-api/
│   └── aift-builder-worker/
├── registry-examples/
│   ├── apps.yml
│   ├── nodes.yml
│   ├── templates.yml
│   ├── builds.yml
│   └── deployments.yml
├── scripts/
│   ├── install-node-agent.sh
│   ├── register-node.sh
│   ├── create-app-from-template.sh
│   └── deploy-app.sh
├── templates/
│   ├── static-site/
│   ├── vite-react/
│   ├── nextjs/
│   ├── node-api/
│   └── fastapi/
├── aift.schema.yml
├── aift.node.schema.yml
└── README.md
```

---

## Node Directory Standard

Each AIFT node should use this structure:

```text
/opt/aift/
├── apps/
├── builds/
├── deployments/
├── registry/
│   ├── apps.yml
│   ├── nodes.yml
│   ├── templates.yml
│   ├── builds.yml
│   └── deployments.yml
├── builder/
├── proxy/
├── logs/
├── backups/
├── secrets/
├── node-agent/
└── scripts/
```

---

## Registry Standards

### Apps Registry

```yaml
apps:
  aift-launch-test:
    repo: https://github.com/AIFreedomTrustFederation/aift-launch-test
    branch: main
    domain: test.aifreedomtrust.com
    framework: vite
    status: running
    node: sacramento-node-001
    trust_class: public-static
    last_successful_release: 2026-06-12-1435
```

### Nodes Registry

```yaml
nodes:
  sacramento-node-001:
    operator: AI Freedom Trust Federation
    operator_class: managed
    region: us-west
    status: online
    trust_level: verified
    cpu_cores: 4
    memory_gb: 8
    storage_gb: 100
    supports:
      - static
      - vite
      - nextjs
      - docker
```

### Templates Registry

```yaml
templates:
  static-site:
    name: Static Website
    framework: static
    path: templates/static-site
  vite-react:
    name: React App
    framework: vite
    path: templates/vite-react
```

---

## App Configuration Standard

Every app should include `aift.app.yml`.

```yaml
name: aift-launch-test
repo: https://github.com/AIFreedomTrustFederation/aift-launch-test
domain: test.aifreedomtrust.com
branch: main
framework: vite
trust_class: public-static
node_selector:
  operator_class: managed
  region: us-west
build:
  install: npm ci
  command: npm run build
  output: dist
runtime:
  type: static
  port: 3000
  healthcheck: /
preview:
  enabled: true
  domain_pattern: "{branch}.preview.aifreedomtrust.com"
```

---

## Node Configuration Standard

Every node should include `aift.node.yml`.

```yaml
node:
  name: sacramento-node-001
  operator: AI Freedom Trust Federation
  operator_class: managed
  region: us-west
  trust_level: verified
  public_hostname: node-001.aiftcloud.com
  supports:
    - static
    - vite
    - nextjs
    - node
    - docker
  resources:
    cpu_cores: 4
    memory_gb: 8
    storage_gb: 100
  disclosure:
    public_node_identity: true
    public_operator_class: true
    public_region: true
```

---

## Mobile-First Cloud Workflow

```text
1. Open AIFT Cloud from phone browser.
2. Login.
3. Tap Create New App.
4. Choose template.
5. Describe the app.
6. Generate or edit files.
7. Push source to GitHub.
8. Select workload trust class.
9. Select eligible node type.
10. Build the app.
11. Deploy to a domain.
12. View deployment disclosure.
13. Rebuild after changes.
14. Roll back if needed.
```

---

## Dashboard Pages to Build

```text
/
/apps
/new
/templates
/builds
/deployments
/nodes
/domains
/logs
/settings
/disclosures/[app]
```

Minimum v0.1:

- `/` dashboard overview
- `/new` new app page
- `/apps` app registry
- `/nodes` node registry
- `/templates` template registry
- `/api/status`
- `/api/apps`
- `/api/nodes`
- `/api/templates`

---

## API Routes to Build

```text
GET  /api/status
GET  /api/apps
GET  /api/nodes
GET  /api/templates
GET  /api/builds
GET  /api/deployments
POST /api/apps/create
POST /api/builds/start
POST /api/deployments/start
POST /api/deployments/rebuild
POST /api/deployments/rollback
POST /api/nodes/register
POST /api/nodes/heartbeat
GET  /api/disclosures/[app]
```

---

## CLI Commands to Build

```bash
aift status
aift apps
aift nodes
aift templates
aift create app-name --template vite-react
aift deploy app-name
aift rebuild app-name
aift rollback app-name
aift logs app-name
aift register-node
aift node-status
aift backup
aift disclosure app-name
```

---

## Build and Deployment Flow

```text
1. User creates app from dashboard.
2. Dashboard writes app registry record.
3. Source files are committed to GitHub.
4. Build job is created.
5. Control plane selects eligible node.
6. Node pulls source.
7. Node builds app.
8. Node runs health check.
9. Domain is routed.
10. Deployment record is written.
11. Disclosure record is published.
12. Dashboard shows app as running.
```

Failure rules:

- Failed build must not replace the live app.
- Failed health check must not become production.
- Last known good deployment must remain available.
- Logs must be preserved.
- Deployment status must be visible from phone.

---

## Security Principles

- Never expose raw shell execution in the browser UI.
- Never commit production secrets.
- Use `.env.example` only for examples.
- Store production secrets outside source control.
- Use HTTPS for every app and dashboard.
- Use SSH keys instead of passwords.
- Use firewall rules.
- Use Fail2ban.
- Isolate apps in containers.
- Do not run sensitive workloads on low-trust community nodes.
- Every node must declare operator class and trust level.
- Every deployment must disclose node class.

---

## Bootstrap From Phone

The intended first-server setup is from a mobile SSH app such as Termius.

```bash
apt update && apt install -y git curl
git clone https://github.com/AIFreedomTrustFederation/VPS.git /root/VPS
cd /root/VPS
chmod +x scripts/*.sh bin/aift
sudo bash scripts/mobile-realworld-setup.sh
```

For private repos, authenticate with a GitHub token or configure deploy keys.

---

## First Milestone

> From a phone, deploy a GitHub-hosted AIFT app to a live HTTPS domain on the first managed AIFT node, then rebuild it after a GitHub change.

Definition of done:

- VPS baseline installed
- Dashboard builds
- Dashboard deploys
- Registry is readable
- First app template exists
- First test app deploys
- App has HTTPS
- App can rebuild
- Deployment disclosure is visible

---

## Roadmap

### Phase 0: Foundation

- [x] README product direction
- [x] VPS bootstrap scripts
- [x] Mobile setup script
- [x] Static template
- [x] Vite React template
- [x] Initial dashboard app
- [x] App registry reader
- [ ] Node registry examples
- [ ] Template registry examples
- [ ] Build registry examples

### Phase 1: First Managed Node

- [ ] Provision first VPS
- [ ] Run mobile setup script
- [ ] Install selected deployment controller
- [ ] Deploy dashboard
- [ ] Deploy launch test app
- [ ] Add app disclosure record
- [ ] Confirm rebuild from GitHub

### Phase 2: Dashboard MVP

- [ ] Add `/apps`
- [ ] Add `/nodes`
- [ ] Add `/templates`
- [ ] Add `/builds`
- [ ] Add `/deployments`
- [ ] Add disclosure page
- [ ] Add safe rebuild adapter
- [ ] Add logs viewer

### Phase 3: Node Agent MVP

- [ ] Create `apps/aift-node-agent`
- [ ] Register node
- [ ] Heartbeat
- [ ] Resource report
- [ ] Docker report
- [ ] Job polling
- [ ] App status report

### Phase 4: Decentralized Test Network

- [ ] Add second node
- [ ] Register both nodes
- [ ] Select node for app deployment
- [ ] Show node disclosure in dashboard
- [ ] Deploy public static app to second node
- [ ] Confirm monitoring and logs

### Phase 5: Cloud Builder

- [ ] New app wizard
- [ ] Template selector
- [ ] GitHub repo creation flow
- [ ] Build queue
- [ ] Deployment queue
- [ ] Rollback
- [ ] Preview deployments

### Phase 6: Commercial Readiness

- [ ] User accounts
- [ ] Team access
- [ ] Billing
- [ ] Node operator agreements
- [ ] Customer terms
- [ ] Support workflows
- [ ] Backups
- [ ] Restore testing
- [ ] Security audit

---

## Public Positioning

```text
AIFT Cloud App Foundry is a mobile-first decentralized cloud platform for creating, building, deploying, and managing web applications from GitHub across fully disclosed compute nodes.
```

Short version:

```text
Build apps from your phone. Deploy across a transparent decentralized cloud.
```

---

## What This Repo Is

This repository is the seed of the AIFT Cloud network.

It contains the first dashboard, the first app templates, the first setup scripts, the first app configuration schema, and the future node and deployment standards.

The first VPS is not the whole cloud. It is node one.

This is the beginning of the AI Freedom Trust decentralized cloud app foundry.
