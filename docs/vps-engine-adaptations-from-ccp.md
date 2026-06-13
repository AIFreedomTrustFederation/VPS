# VPS engine adaptations from Capital City Provisions

Capital City Provisions gives AIFT VPS a real working business-app architecture that can be rebranded into the VPS engine.

The goal is not to copy the CCP business. The goal is to adapt the useful engine pieces into AIFT VPS as reusable decentralized app-building primitives.

## 1. PostgreSQL adapter -> durable VPS engine storage

CCP already has a PostgreSQL path for saving lifecycle records when production storage is required.

AIFT VPS adaptation:

```text
CCP PostgreSQL order storage
-> AIFT durable app source storage
-> AIFT workload lifecycle storage
-> AIFT build record storage
-> AIFT provider-node event storage
-> AIFT user workspace storage
```

What to build:

```text
packages/aift-data-core
apps/aift-dashboard/app/api/storage/status
apps/aift-dashboard/app/api/app-sources
apps/aift-dashboard/app/api/build-records
apps/aift-dashboard/app/api/workload-records
```

AIFT tables to design:

```text
app_sources
app_profiles
build_runs
workloads
provider_nodes
node_heartbeats
node_cards
webai_conversations
webai_actions
learning_events
operator_reports
```

## 2. Lead intake -> app source intake

CCP lead intake classifies customer requests and decides the next owner action.

AIFT VPS adaptation:

```text
customer lead
-> app source request
-> repo analysis request
-> build request
-> provider placement request
-> support request
```

AIFT request buckets:

```text
repo-source
app-profile
build-preview
provider-node
runtime-support
release-review
compliance-check
system-support
```

## 3. Order lifecycle -> workload lifecycle

CCP has lifecycle states for order movement from lead to delivery.

AIFT VPS adaptation:

```text
lead -> source-added
quoted -> profile-created
ordered -> build-requested
paid -> resources-approved
scheduled -> node-assigned
packed -> dependencies-installed
loaded -> build-running
out-for-delivery -> preview-running
partially-fulfilled -> build-partial
restock-needed -> dependency-needed
issue -> build-failed
cancelled -> stopped
```

AIFT lifecycle states:

```text
source-added
profile-created
build-requested
resources-approved
node-assigned
dependencies-installed
build-running
preview-running
build-passed
build-failed
release-ready
released
stopped
```

## 4. Driver updates -> provider node updates

CCP driver updates track delivery status, partial fulfillment, restock issues, route efficiency, fuel, and notes.

AIFT VPS adaptation:

```text
driver update
-> provider node update
```

Provider node update fields:

```text
node_id
workload_id
status
runtime_status
build_status
resource_status
dependency_issue
logs_path
cpu_class
memory_class
storage_class
battery_status
network_status
created_at
```

## 5. Restock issues -> dependency and capacity issues

CCP restock issues are blockers before the next delivery promise.

AIFT VPS adaptation:

```text
restock issue
-> dependency issue
-> capacity issue
-> runtime issue
```

AIFT issue buckets:

```text
missing-package
missing-runtime
missing-model
insufficient-memory
insufficient-storage
network-unavailable
battery-limited
build-error
secret-required
approval-required
```

## 6. Route efficiency -> node efficiency

CCP route efficiency measures route quality.

AIFT VPS adaptation:

```text
route efficiency
-> node efficiency
```

AIFT node efficiency can track:

```text
build success rate
average build time
heartbeat consistency
available memory
available storage
thermal/battery limits
network reachability
runtime uptime
log quality
```

## 7. Owner report -> operator report

CCP owner reports summarize revenue, cost, profit, route efficiency, restock issues, and owner actions.

AIFT VPS adaptation:

```text
owner report
-> operator report
```

AIFT operator report fields:

```text
date
connected_sources
active_builds
successful_builds
failed_builds
active_nodes
healthy_nodes
stale_nodes
capacity_warnings
runtime_warnings
dependency_warnings
recommended_actions
learning_notes
```

## 8. Learning events -> WebAI memory signals

CCP records learning events from orders, driver updates, and route outcomes.

AIFT VPS adaptation:

```text
learning event
-> WebAI reusable pattern signal
```

AIFT learning event examples:

```text
repo-analysis-success
build-fix-applied
dependency-fix-needed
node-placement-success
node-placement-failed
runtime-started
runtime-unreachable
license-warning
secret-boundary-warning
release-approved
```

Important privacy boundary:

AIFT should learn reusable patterns and system outcomes, not expose private user data.

## 9. Training dataset exporter -> pattern dataset exporter

CCP can export structured training records from operations state.

AIFT VPS adaptation:

```text
training dataset
-> reusable pattern dataset
```

AIFT exports should include:

```text
input: repo feature or system event
output: build result or recommended fix
signal: quality score
context: source type, runtime class, node class
```

Do not export raw secrets, private messages, private customer data, or private repo contents without explicit permission.

## 10. Local AI concierge -> WebAI role workspace

CCP has customer, driver, and owner role modes.

AIFT VPS adaptation:

```text
customer -> app builder
owner -> operator
driver -> provider node
```

AIFT WebAI roles:

```text
builder
operator
provider-node
support
repo-reviewer
release-reviewer
```

## 11. ZIP zone -> node region policy

CCP ZIP zone logic can become a generic location or region policy adapter.

AIFT VPS adaptation:

```text
ZIP zone
-> node region
-> provider placement zone
-> latency or availability policy
```

AIFT region policy fields:

```text
region
status
node_count
latency_class
capacity_class
priority
message
notes
```

## 12. License audit -> open-source compliance gate

CCP has an open-source license audit script that blocks problematic dependency licenses.

AIFT VPS adaptation:

```text
license audit
-> connected repo compliance gate
```

AIFT should run compliance checks before building or publishing apps.

## First engine package to create

```text
packages/aift-engine-core
```

Suggested modules:

```text
app-sources.ts
app-profiles.ts
workloads.ts
provider-node-updates.ts
dependency-issues.ts
node-efficiency.ts
operator-reports.ts
learning-events.ts
pattern-datasets.ts
region-policy.ts
compliance-audit.ts
```

## First PostgreSQL package to create

```text
packages/aift-postgres
```

Suggested exports:

```text
postgresConfigured
connectPostgres
saveAppSource
saveAppProfile
saveBuildRun
saveWorkload
saveNodeHeartbeat
saveNodeCard
saveWebAIConversation
saveLearningEvent
loadOperatorReport
```

## Build order

1. Define AIFT engine types.
2. Add file-backed storage first.
3. Add PostgreSQL adapter second.
4. Add API routes using the storage interface.
5. Add WebAI commands that write approved records.
6. Add Termux build runner records.
7. Add operator report page.
8. Add provider node update page.

## Bottom line

The CCP repo gives AIFT VPS a complete blueprint for turning a public app into an operations engine.

AIFT should rebrand the concepts as:

```text
sources
profiles
builds
workloads
nodes
updates
issues
reports
learning events
compliance checks
```

That becomes the heart of the decentralized VPS engine.
