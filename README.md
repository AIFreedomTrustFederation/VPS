# AI Freedom Trust Cloud App Foundry

AI Freedom Trust Cloud App Foundry is a mobile-first, open-source, decentralized VPS cloud, app builder, domain control panel, provider-node network, and future `.aft` registry system.

This repository is the source of truth for building AIFT Cloud from the ground up. Every new feature should support the mission below, and every phase should move us closer to a real decentralized cloud that can host applications, route names, disclose infrastructure, and reduce dependence on centralized registries, centralized clouds, and centralized DNS control points.

---

## Mission

Build an open, transparent, decentralized web provider where users can:

- reserve and manage AFT domains, local names, and future `.aft` names;
- build websites and apps with templates, WebAI, imported GitHub code, or local source folders;
- deploy sites and apps to the AIFT decentralized VPS cloud;
- turn phones, laptops, desktops, VPS servers, bare metal, and community hardware into provider nodes;
- manage DNS-like records, service records, redirects, SSL, hosting, deployments, backups, logs, analytics, and rollback;
- see exactly where every site or app runs through node disclosure and signed service records;
- keep websites online through health checks, blue/green deploys, fallback nodes, and portable app profiles;
- grow toward a decentralized naming and routing layer that can operate as an open alternative to centralized ICANN-style dependency.

The end goal is an AIFT provider console that feels as complete as a traditional domain registrar, DNS provider, website builder, hosting provider, deployment platform, and cloud control panel, but powered by a decentralized VPS network instead of one centralized hosting stack.

---

## Decentralized naming vision

AIFT is not only a VPS dashboard. It is the foundation for a community-governed naming, routing, and hosting network.

Today, most of the public web depends on centralized registries, registrars, DNS operators, certificate authorities, hosting platforms, and cloud providers. AIFT is building toward an alternative stack where identity, names, routes, deployments, and service records can be verified by an open network instead of controlled by a single gatekeeper.

The long-term vision is a decentralized ICANN alternative in practical phases:

```text
Local-first names
  -> signed service records
  -> provider-node routing
  -> public gateway resolution
  -> community registry governance
  -> portable domain and app ownership
  -> decentralized naming layer
```

This does not require pretending the current internet disappears overnight. AIFT should interoperate with normal DNS, normal domains, and normal browsers while building a parallel path for names and services that can be resolved through AIFT gateways, provider nodes, signed records, and community-governed registries.

The system should eventually support:

- human-readable names that resolve through AIFT gateways and node records;
- signed ownership records for sites, apps, names, deployments, and providers;
- portable app profiles that can move across nodes without losing identity;
- transparent node disclosure so users know where a service actually runs;
- community policy for reserved names, abuse review, transfers, and disputes;
- bridges between ordinary DNS domains and decentralized AIFT names;
- an open registry model that can become a real alternative to centralized naming authority.

AIFT should therefore be designed as both:

```text
A decentralized cloud provider
and
A decentralized naming and routing authority
```

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

AIFT will become one unified control panel for:

```text
Domains
AIFT names
Sites
Apps
DNS-like records
Signed service records
WebAI Builder
Deployments
Provider nodes
Logs
Analytics
Registry Governance
Settings
```

Users should be able to open the dashboard and do the full name-to-app lifecycle:

```text
Search or reserve a name
  -> create or import an app
  -> generate an app profile
  -> prepare a workspace
  -> install dependencies
  -> build the app
  -> start a local or provider-node runtime
  -> connect a domain or AIFT name
  -> route through the gateway
  -> pass health checks
  -> go live
  -> monitor logs, analytics, sync, and uptime
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
- App, template, build, deployment, node, sync, controls, logs, readiness, WebAI, and app profile dashboard routes.
- Native AFT Site Registry foundation.
- Dashboard sync flow with update, restart, readiness, and reload status.
- GitHub app-source intake and local workspace build pipeline.
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
  -> Sync Center
  -> Controls Center
  -> Domains UI
  -> Sites UI
  -> App Profiles UI
  -> WebAI Builder
  -> DNS Manager
  -> Service Records Manager
  -> Deployment Console
  -> Node Console
  -> Registry Admin Console

AFT Site, App, and Name Registry
  -> site ownership
  -> app ownership
  -> name reservations
  -> DNS-like records
  -> signed service records
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
  -> resolves domains, names, and slugs
  -> routes to healthy deployments
  -> performs blue/green handoff
  -> serves fallback deployment when needed
  -> exposes signed disclosure data

AFT Registry Governance
  -> reserved names
  -> abuse review
  -> ownership transfer
  -> policy enforcement
  -> dispute resolution
  -> decentralized naming policy
  -> future ICANN interoperability or independence
```

---

## Top-level roadmap

We will build the system in this order.

### Phase 0: Proven local node foundation

Status: mostly working.

Goals:

- Run dashboard locally on Android or VPS nodes.
- Keep Termux compatibility.
- Show health, apps, deployments, nodes, logs, sync, controls, readiness, and WebAI.
- Avoid fragile localhost assumptions when accessed from another device.
- Update and restart the running dashboard from inside the dashboard itself.

Exit criteria:

- Primary node can run the dashboard.
- Join node can run independently.
- Logs and health pages are usable from mobile.
- Sync Center can update dashboard files, restart the dashboard, wait for ready status, and expose a reload action.

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

### Phase 2: App Foundry and Provider-Node Builds

Goals:

- Paste a GitHub repository URL.
- Generate an app profile from real repository files.
- Prepare or sync a real local workspace.
- Install dependencies only after workspace sync succeeds.
- Build only after dependencies succeed.
- Start a local or provider-node runtime only after the build succeeds.
- Show a clickable local or routed URL only after the runtime is actually responding.

Required pages and routes:

```text
/app-profiles
/source-links
/api/app-sources
/api/app-sources/[sourceId]
/api/app-sources/[sourceId]/profile
/api/workspaces/prepare
/api/workspaces/install
/api/workspaces/run-build
/api/workspaces/start-preview
```

Exit criteria:

- A GitHub app source can be saved.
- A real profile can be generated.
- Workspace sync reports whether the local repo is up to date, behind, ahead, or diverged.
- Dependencies install from the real workspace.
- Build output is captured in logs.
- Runtime URL appears only when the real process has started.

---

### Phase 3: Domain and Name Control Panel UX

Goals:

Build a full provider-style dashboard for domain, name, site, and app control.

Required pages:

```text
/domains
/domains/[domain]
/names
/names/[name]
/sites
/sites/[siteId]
/apps
/apps/[appId]
/builder
/dns
/records
/deployments
/nodes
/sync
/logs
```

Exit criteria:

- Users can manage normal DNS domains and AIFT names from one control panel.
- AIFT names can map to signed service records.
- Public gateways can resolve AIFT records.
- Ownership and routing changes are logged and auditable.

---

### Phase 4: Decentralized Registry and Gateway Network

Goals:

- Create signed name records.
- Create signed service records.
- Publish gateway-readable registry snapshots.
- Let provider nodes verify records before serving traffic.
- Support fallback gateways and multi-node routes.
- Define governance for reserved names, disputes, transfers, and abuse.

Exit criteria:

- Names resolve through AIFT gateway logic.
- Service records are signed and verifiable.
- A node can refuse unsigned or invalid routing records.
- The system can operate as a decentralized naming layer alongside ordinary DNS.

---

## Non-negotiables

- No fake green status.
- No mock production data in live operational paths.
- No hidden infrastructure claims.
- No switching traffic until health checks pass.
- No automatic destructive sync when a repo is ahead or diverged.
- No browser button should pretend the node updated until the local action actually completed.
- No reload prompt should appear until the dashboard reports ready after restart.

---

## Near-term operator flow

```text
/sync
  -> Update dashboard files
  -> Restart dashboard
  -> Wait for Ready
  -> Reload app

/app-profiles
  -> Save repo and create profile
  -> Sync workspace
  -> Install dependencies
  -> Run build
  -> Start local URL
  -> Open app

/logs
  -> Read real output
  -> Fix first reported issue
  -> Retry the failed step
```

This is how AIFT becomes a real node-operated cloud instead of a demo UI.
