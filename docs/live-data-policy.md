# AIFT VPS live data policy

AIFT VPS must use real data in the product path.

## Rule

Do not build operational pages around fake project records, fake nodes, fake deployments, fake build history, fake logs, fake connected repositories, or fake provider capacity.

The UI may show explanatory empty states and workflow labels, but any operational table, status card, deployment list, node list, project list, log view, or build result must be backed by real sources.

## Allowed data sources

Operational pages should read from:

- the AI Freedom Trust Federation VPS repository
- connected GitHub repositories authorized by the owner
- local AIFT registry files
- local heartbeat files
- local node cards
- local dashboard logs
- local runtime logs
- real build records
- real deployment records
- real template package records
- real node identity records
- future control-plane API records

## Current proof data sources

For Phase 0 and Phase 2A, real data means:

```text
~/.aift-<node-name>/registry/
~/.aift-<node-name>/heartbeats/
~/.aift-<node-name>/node-cards/
~/.aift-<node-name>/logs/
registry-examples/ only when explicitly labeled as examples
apps/aift-dashboard data loaded from repository files
```

## GitHub source rule

A project must point to a real repository before it can be treated as connected.

A connected project should include:

```text
repository owner
repository name
branch
commit sha when available
template or framework
build settings
workload level
node policy
```

## Empty state rule

If no data exists, show an empty state.

Use:

```text
No connected projects yet.
No live nodes discovered yet.
No heartbeat records found yet.
No builds have run yet.
No releases have been published yet.
```

Do not invent sample records.

## Example data rule

Example data is allowed only in documentation, registry example files, or clearly labeled examples. It must never be rendered as if it is a real project, node, build, deployment, release, or workload.

## Dashboard rule

Dashboard pages should prefer:

```text
real records
empty states
setup guidance
links to connect real sources
```

They should not pretend the network has capacity, apps, nodes, users, earnings, or deployments that do not exist.

## Long-term production rule

At production scale, real data should come from:

```text
AIFT VPS control plane
verified node registry
connected GitHub repositories
signed job records
build logs
release records
node heartbeats
runtime logs
disclosure records
```

This keeps AIFT VPS honest, technically credible, and disclosure-first.
