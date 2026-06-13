# AI Freedom Trust Cloud App Foundry

AI Freedom Trust Cloud App Foundry is a mobile-first, open-source, decentralized VPS cloud, website builder, domain control panel, and future `.aft` registry system.

This repository is the source of truth for building the AFT cloud from the ground up. We will follow this README as the operating roadmap. Every new feature should support the mission below, and every phase should be completed in order before moving too far ahead.

---

## Mission

Build an open, transparent, decentralized web provider where users can:

- reserve and manage AFT domains and future `.aft` names;
- build websites with templates, WebAI, or imported code;
- deploy sites and apps to the AFT decentralized VPS cloud;
- manage DNS-like records, redirects, SSL, hosting, deployments, backups, and analytics;
- see exactly where every site runs through node disclosure;
- keep websites online through blue/green deploys and fallback nodes;
- grow toward a real ICANN-ready `.aft` registry operator system.

The end goal is an AFT provider console that feels as complete as a traditional domain registrar, DNS provider, website builder, and hosting company, but powered by a decentralized VPS cloud instead of one centralized hosting stack.

---

## Core principle

```text
The registry decides what should exist.
The builder creates the website or app.
The scheduler chooses where it should run.
The node network hosts it.
The gateway routes users to the healthy deployment.
The disclosure system tells the truth about where it runs.
```

No feature should bypass this model.

---

## Product vision

AFT will become one unified control panel for:

```text
Domains
Sites
DNS
WebAI Builder
Deployments
Nodes
Analytics
Registry Governance
Settings
```

Users should be able to open the dashboard and do the full domain-to-website lifecycle:

```text
Search or reserve a domain
  -> build a website
  -> connect the domain
  -> deploy to AFT cloud
  -> pass health checks
  -> go live
  -> monitor analytics and uptime
  -> roll back safely if needed
```

---

## Current foundation

The project began as a VPS dashboard and has proven a Phase 0 mobile provider-node model where Android phones running Termux can become local AIFT compute nodes.

Working foundation pieces include:

- Next.js dashboard in `apps/aift-dashboard`.
- Webpack development mode for Android and Termux compatibility.
- Termux primary-node and join-node launchers.
- Local app registry examples.
- Local node logs.
- Mobile URL printer.
- Node card export/import helpers.
- App, template, build, deployment, node, sync, logs, readiness, and WebAI dashboard routes.
- Native AFT Site Registry foundation.
- Documentation for the native site registry in `docs/aft-site-registry.md`.

The first proven node model is:

```text
Verified servers = stable cloud backbone
Phones and edge devices = decentralized edge compute swarm
```

Production hosting should prioritize verified servers and trusted always-on nodes. Phones and edge devices are valuable for previews, cache, tests, lightweight jobs, mirrors, and future swarm work.

---

## Target architecture

```text
AIFT Dashboard
  -> Domains UI
  -> Sites UI
  -> WebAI Builder
  -> DNS Manager
  -> Deployment Console
  -> Node Console
  -> Registry Admin Console

AFT Site and Domain Registry
  -> site ownership
  -> domain reservations
  -> DNS-like records
  -> active deployment records
  -> fallback deployment records
  -> disclosure records

AIFT Scheduler
  -> evaluates node health
  -> selects eligible node
  -> assigns signed jobs
  -> tracks build and deploy status

AIFT Node Agent
  -> receives approved jobs
  -> builds or serves workloads
  -> reports heartbeat and capacity
  -> syncs artifacts and mirrors

AIFT Gateway
  -> resolves domains and slugs
  -> routes to healthy deployments
  -> performs blue/green handoff
  -> serves fallback deployment when needed

AFT Registry Governance
  -> reserved names
  -> abuse review
  -> ownership transfer
  -> policy enforcement
  -> future ICANN readiness
```

---

## Top-level roadmap

We will build the system in this order.

### Phase 0: Proven local node foundation

Status: mostly working.

Goals:

- Run dashboard locally on Android or VPS nodes.
- Keep Termux compatibility.
- Show health, apps, deployments, nodes, logs, sync, and readiness.
- Avoid fragile localhost assumptions when accessed from another device.

Exit criteria:

- Primary node can run the dashboard.
- Join node can run independently.
- Logs and health pages are usable from mobile.

---

### Phase 1: Native AFT Site Registry

Status: started.

Goals:

- Create a native site registry inside the VPS app.
- Store site records.
- Store deployment records.
- Track active and fallback deployments.
- Write static artifacts.
- Serve browser-safe URLs under `/s/<slug>`.
- Never switch traffic until the new deployment is healthy.

Required routes:

```text
/sites
/s/[slug]
/api/sites
/api/sites/[id]
/api/sites/[id]/deploy
/api/resolve/[slug]
/api/sync/status/[deploymentId]
```

Exit criteria:

- A site can be created.
- A static artifact can be deployed.
- `/s/<slug>` serves the active deployment.
- A failed deployment leaves the old active deployment in place.

---

### Phase 2: Domain Control Panel UX

Goals:

Build a full provider-style dashboard for domain and website control.

Required pages:

```text
/domains
/domains/[domain]
/sites
/sites/[siteId]
/builder
/dns
/deployments
/nodes
/registry
```

Domain detail tabs:

```text
Overview
DNS Records
Website
Hosting
SSL and Security
Email
Redirects
Subdomains
Ownership
Compliance
Analytics
Advanced
```

Exit criteria:

- Users can see every domain and site they control.
- Users can connect a domain to a site.
- Users can see DNS health, deployment health, hosting node, fallback status, and disclosure links.

---

### Phase 3: DNS-like records and AFT resolver

Goals:

Add internal DNS-style control before real `.aft` delegation.

Supported record types:

```text
A
AAAA
CNAME
TXT
MX
NS
SRV
CAA
ALIAS
AFT-LINK
AFT-NODE
AFT-MIRROR
AFT-CID
AFT-APP
```

Exit criteria:

- AFT domains can resolve internally to sites and deployments.
- Standard DNS-compatible records can be represented.
- AFT-specific records can link domains to nodes, mirrors, CIDs, and deployments.

---

### Phase 4: WebAI website builder

Goals:

Make WebAI the native builder for AFT sites.

Builder modes:

```text
AI build from prompt
Choose template
Import from GitHub
Upload static site
Clone existing site
Build business site
Build trust portal
Build app landing page
```

Exit criteria:

- User can generate a site from a prompt.
- User can preview before deploy.
- Generated site creates a normal registry record and deployment record.
- WebAI output follows the same blue/green deployment rules.

---

### Phase 5: Decentralized node hosting

Goals:

Connect sites to the AFT VPS cloud node network.

Node classes:

```text
Class A: verified always-on servers
Class B: plugged-in trusted edge nodes
Class C: mobile battery nodes
Class D: experimental nodes
```

Hosting rule:

```text
Public production websites run on Class A or trusted Class B nodes.
Class C and D nodes may preview, cache, test, mirror, or run lightweight approved jobs.
```

Exit criteria:

- Deployments have node assignments.
- Nodes report heartbeat, capacity, runtime support, and trust class.
- Scheduler can choose eligible nodes.
- Gateway routes to healthy assigned nodes.

---

### Phase 6: Gateway, failover, and blue/green deployment

Goals:

Make handoff seamless.

Rules:

```text
Current live deployment stays online.
New deployment builds separately.
New deployment is health checked.
Traffic switches only after health passes.
Failed deployment never takes the site down.
Fallback deployment remains available.
```

Exit criteria:

- Users never see localhost errors during sync.
- Users never see broken deployments during handoff.
- Rollback is available from the deployment timeline.

---

### Phase 7: Security, ownership, and disclosure

Goals:

Every domain and site must have transparent ownership and hosting disclosure.

Required records:

```text
Owner
Admins
Editors
Billing contact
Technical contact
Recovery contact
Node operator
Deployment id
Node class
Runtime type
Backup status
Monitoring status
Audit log
```

Exit criteria:

- Every site has a disclosure page.
- Every ownership change is logged.
- Every deployment records where it runs.
- Domain locks and transfer locks are supported.

---

### Phase 8: Registry governance and abuse control

Goals:

Prepare AFT for responsible domain operation.

Admin tools:

```text
Reserved names
Premium names
Domain applications
Registrants
Abuse reports
Disputes
Suspensions
Ownership transfers
Launch phases
Audit logs
```

Exit criteria:

- Admins can reserve, approve, suspend, and transfer names.
- Abuse reports can be filed and reviewed.
- Domain status can be changed with an audit trail.

---

### Phase 9: IPFS, Filecoin, and decentralized mirrors

Goals:

Add decentralized storage as a mirror and backup layer after the local gateway is stable.

Artifact mirrors:

```text
Primary AFT node
Fallback AFT node
Gateway cache
IPFS CID
Filecoin deal
Optional repository artifact backup
```

Exit criteria:

- A deployment can be mirrored outside the primary node.
- IPFS/Filecoin failure does not break the browser-safe gateway.
- Mirror status is visible in the dashboard.

---

### Phase 10: `.aft` registry readiness

Goals:

Prepare the system and organization for a future official `.aft` TLD application.

Workstreams:

```text
Legal entity readiness
AFT mission and eligibility policy
Acceptable use policy
Abuse response policy
Trademark and reserved names policy
Registrant agreement
Registry operator plan
Registrar or registrar-partner plan
RSP integration plan
RDAP data model
DNSSEC plan
Data escrow plan
Sunrise and launch plan
```

Exit criteria:

- AFT can operate an internal `.aft` namespace.
- AFT has policy documents.
- AFT has technical architecture for registry, DNS, RDAP, DNSSEC, and abuse handling.
- AFT can approach an evaluated Registry Service Provider and prepare for an ICANN application window.

---

## Development discipline

We will follow this order:

```text
1. Registry foundation
2. Serving route
3. API routes
4. Control panel UX
5. DNS records
6. Builder
7. Node scheduler
8. Gateway failover
9. Governance
10. Mirrors
11. ICANN readiness
```

Do not build advanced AI, billing, marketplace, or public customer onboarding before the registry, serving, deployment, and failover foundation are stable.

---

## Immediate milestone

The immediate milestone is **AFT Domains and Sites v0.1**.

Required work:

```text
1. Finish native site registry.
2. Add `/s/[slug]` serving route.
3. Add create/list/deploy API routes.
4. Add `/sites` dashboard with real registry data.
5. Add `/domains` dashboard skeleton.
6. Add domain-to-site connection model.
7. Add internal DNS record model.
8. Add deployment status endpoint.
9. Add rollback/fallback logic.
10. Add disclosure page for every site.
```

When this milestone is complete, AFT will have the first working version of a domain-control and website-hosting provider panel.

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

Important: `127.0.0.1` only works from the same device that is running the node. Other devices must use the node's LAN IP, public URL, tunnel, or gateway URL.

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

## Current repository structure

```text
.
├── aift
├── apps/
│   ├── aift-dashboard/
│   └── aift-node-agent/
├── docs/
│   ├── aft-site-registry.md
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
├── templates/
├── aift.schema.yml
├── aift.node.schema.yml
└── README.md
```

---

## Safety rule

AFT must not become a system that runs arbitrary commands from untrusted users on community devices.

At scale, nodes should receive signed, approved jobs only. Public workloads must be sandboxed, limited, logged, and tied to a disclosure record.

---

## Success definition

AFT succeeds when a user can:

```text
reserve a name
build a website
connect DNS
deploy to the decentralized VPS cloud
see where it runs
roll back safely
mirror it for resilience
manage ownership and compliance
```

and the system can do all of that without hiding infrastructure risk or crashing during handoff.
