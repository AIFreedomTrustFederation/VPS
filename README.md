# AIFT Cloud App Foundry — VPS Infrastructure

**The infrastructure layer of the AI Freedom Trust Federation: nodes, deployment, relay, server systems, app building, routing, naming, and the provider fabric through which sovereign applications can actually run.**

| Federation metadata | Value |
| --- | --- |
| Layer | `infrastructure` |
| Role | infrastructure, nodes, deployment, relay, and server systems |
| Workspace | `AIFT/VPS` |
| Control plane | AIFT workspace / AIFT-OS |
| Verification | `npm run qa:local` for repository metadata and installer tests; target-specific builds require separate checks |
| Operating standards | local-first, inspectable, sovereign by default, AI behind governed provider interfaces |

VPS is where Federation architecture touches machines, networks, routes, deployments, and service availability. It owns the provider-node and deployment problem: how an application moves from source to a real runtime, how a node proves health, how traffic reaches a healthy deployment, how names and service records remain portable, and how infrastructure tells the truth about where a service actually runs.

The constitutional reason for that work comes from the [One Eternal Scroll of ALO'ha](https://aifreedomtrustfederation.github.io/AI-Freedom-Trust/docs/pdf/one-eternal-scroll-of-aloha.pdf). The shared operating discipline is [SOP-ALOHA-001](https://github.com/AIFreedomTrustFederation/AI-Freedom-Trust/blob/main/SOP-ALOHA-001.md).

---

## Book I — Infrastructure as Stewardship

Infrastructure becomes trustworthy when availability does not require invisibility. The user should be able to know where an application runs, which node is serving it, what health evidence justified the route, what record identifies the deployment, and what fallback path exists when a node fails.

That is why the Cloud App Foundry is more than a VPS dashboard. Its architecture joins app intake, workspace preparation, build, deployment, provider nodes, signed service records, naming, gateway routing, health checks, rollback, and disclosure into one governed lifecycle.

The core relationship can be expressed plainly:

```text
Registry names what should exist.
Builder prepares the application.
Scheduler chooses an eligible node.
Node hosts the workload.
Gateway routes to a healthy deployment.
Disclosure tells the truth about where it runs.
```

### Illuminated passage — the shield around the service boundary

![Security and Privacy Shield](https://raw.githubusercontent.com/AIFreedomTrustFederation/AI-Freedom-Trust/main/docs/images/aetherion/security-privacy-shield.png)

The shield does not promise invulnerability. It represents a visible boundary: secrets remain outside public source, health must be observed rather than assumed, production traffic should not switch before verification, and a node should never claim readiness it cannot demonstrate.

---

## Book II — The Infrastructure Layer in the Federation

VPS owns infrastructure while depending on other layers for meaning and authority.

- **AIFT-Genesis → VPS:** Genesis provides identity, trust, governance, and sovereignty structures that infrastructure must not erase when it creates sites, apps, nodes, names, or service records.
- **AIFT-Forge → VPS:** Forge supplies reusable package, build, agent, and coordination patterns. VPS specializes them for deployment and provider operations.
- **AIFT-OS ↔ VPS:** AIFT-OS discovers and orchestrates infrastructure from evidence; VPS remains the source of truth for node health, deployment state, routing, and provider behavior.
- **AIFT-Runtime ↔ VPS:** Runtime gives local devices and machines a governed execution surface. VPS can treat those machines as provider nodes only when their actual capabilities and health are known.
- **Aether_Coin_biozonecurrency ↔ VPS:** the economy layer may attach value, identity, settlement, or stewardship relationships to infrastructure services, but VPS does not gain wallet or custody authority. Likewise, the economy layer does not gain the right to reroute infrastructure simply because value is associated with a service.
- **BookSmith / portals / other apps → VPS:** application projects may deploy through this layer while preserving their own source repositories, identity, data policy, and release authority.

The provider-node model therefore keeps two ideas in tension: stable verified servers form the dependable backbone; phones and edge devices can contribute decentralized compute where the workload and health evidence actually fit.

### Illuminated passage — circulation through the provider network

![Harmonic Krystal Torus](https://raw.githubusercontent.com/AIFreedomTrustFederation/AI-Freedom-Trust/main/docs/images/aetherion/harmonic-krystal-torus.png)

For VPS, circulation means source enters the foundry, becomes a build, moves to an eligible node, becomes a routed service, and returns as health, logs, disclosure, and rollback evidence.

---

## Book III — SOP-ALOHA-001 in the Cloud Foundry

The shared loop becomes the deployment lifecycle:

```text
Receive → Inspect → Name → Propose → Consent → Act → Verify → Record → Return
```

**Receive** accepts source, app profile, deployment intent, domain/name request, or node registration. **Inspect** reads the framework, dependencies, runtime requirements, secrets boundary, node capacity, and current route state. **Name** identifies the app, build, workload, node, domain, service record, risk, and owner. **Propose** selects a build/deployment path and eligible node. **Consent** gates production release, secret use, traffic switching, name transfer, destructive synchronization, and other high-impact actions. **Act** performs the real build, deployment, registration, or routing change. **Verify** requires health checks and actual readiness before declaring success. **Record** preserves deployment, node, service-record, disclosure, log, and rollback state. **Return** tells the operator what went live, where it runs, what evidence supports it, and what remains unresolved.

The Android installer registry uses `install_order` for first-run sequencing. `npm run qa:local` checks that each prerequisite appears at a strictly earlier, nonnegative integer order, rejecting cycles and impossible dependency plans. This validates registry metadata only; it does not download or install APKs.

The same validator now requires each `download_url` to match its declared `release_tag` and `apk_name` exactly, with safe single-segment release tags and `.apk` filenames. This rejects misleading release links and URL suffixes. It does **not** confirm that an asset exists, that its bytes match a checksum, or that the APK is signed by an expected publisher.

Repository setup and verification remain explicit:

```bash
npm install
npm run qa:local
npm run dashboard:build
```

### Node heartbeat metadata integrity

`bash scripts/aift-heartbeat.sh` writes a local JSON heartbeat to
`$AIFT_HOME/heartbeats/$NODE_NAME.json`. The script requires Bash and
Node.js; `curl` is optional for its local HTTP health probe. It now rejects
node identifiers that are not single alphanumeric-leading filename components
and ports outside canonical decimal 1–65535 **before** creating directories.
It serializes display names and node classes as JSON strings, so quotes,
backslashes, Unicode, and line breaks cannot corrupt or inject heartbeat fields.
Run `bash -n scripts/aift-heartbeat.sh && python3 tests/test-heartbeat.py`
(Python 3 is required for the regression tests). Hosted local QA runs these
tests with stubbed curl responses and checks that a failed probe reports
`warning`.

This validates the generated local metadata, **not** the identity of the
process responding on the port, remote reachability, signed node identity,
or successful provider enrollment. The separate `aift-node-card.sh` export
and import formats are not covered by this heartbeat validation.

The node refresh helper, `bash scripts/aift-git-refresh.sh`, stages a replacement
clone before moving a preexisting non-Git node directory to a timestamped
backup. If cloning fails, the original node directory remains in place.
Existing Git checkouts still use `git pull --ff-only`. This helper refreshes
source files; it does not verify a running deployment. Run
`python3 tests/test-git-refresh.py` (Python 3, Git, and Bash required) to
exercise the failure-preservation and successful-refresh regressions.

The dashboard router reads the active target from `dashboard-active.json`. An
explicit invalid `target_port` or legacy `port` (outside 1–65535, noninteger,
or nonnumeric) now produces HTTP 502 without terminating the router or silently
routing to a fallback. The `/__aift_router/status` response reports `ok: false`
for an invalid port. An `ok: true` status only confirms valid port configuration;
it does **not** prove that the upstream is reachable or healthy. Missing or
unreadable active-state files retain the existing fallback behavior. Run
`node --test tests/test-dashboard-router.mjs` to check malformed targets and
successful proxy recovery; this test does not validate production deployment.

### Blue/green candidate health and promotion

`bash scripts/aift-bluegreen-sync.sh` builds a detached candidate worktree and
promotes its port through `dashboard-active.json` only after an HTTP health
response. The sync now fails closed if the candidate port remains occupied
after attempting to stop a previously tracked candidate, or if the newly
spawned candidate process exits before or during the health probe. In these
cases, the existing active-target file is not rewritten. Run
`python3 tests/test-bluegreen-sync.py` (Python 3, Git, Bash, and curl required)
for isolated real-Git regressions covering an unrelated listener, an exited
candidate, and a live candidate. These tests use temporary local Git remotes
and stubbed build commands; they do not deploy a real Next.js dashboard.

A passing PID check plus HTTP 200 is a limited readiness signal, not
cryptographic service identity, a full end-to-end router test, or a guarantee
against concurrent port replacement. Inspect the candidate logs and actual
public router health before treating a production promotion as verified.

### What the default CI run actually verifies

The [AIFT Local QA workflow](.github/workflows/aift-local-qa.yml) runs on pushes to `main` and pull requests. It executes `npm run qa:local` (repository structure, source references, installer registry validation, installer regression tests, and dashboard-router regression tests), runs the [real-Git node-refresh tests](tests/test-git-refresh.py), runs the [blue/green promotion regressions](tests/test-bluegreen-sync.py), runs the [heartbeat metadata regressions](tests/test-heartbeat.py), and checks that the checkout remains clean. This is a dependency-light repository gate, **not** a complete application or deployment verification. It does not install the dashboard dependencies, build the dashboard or node agent, compile an Android APK, deploy services, authenticate release artifacts, or run a dependency-vulnerability scan. Use the target-specific commands below and inspect their separate workflow results before claiming build or release readiness.

### Federation capability metadata versus execution

The [capability manifest](.aift/capabilities.json) marks `sync` as `ready`, but its `git remote/status` descriptor is not an executable synchronization command. The only script in `.aift/commands/` is [status.sh](.aift/commands/status.sh), which reports `git status --short`. Separately, [aift.repo.json](aift.repo.json) advertises `git pull --ff-only` and a `verify` chain with `--if-present`; the root [package.json](package.json) has no `typecheck` or `build` script, so those checks can be skipped. None of these declarations proves completed synchronization, a full application build, deployment health, or authorization. Verify the actual command, source revision, and outcome independently before promoting a capability claim.

### Dashboard build and deployment evidence

The [AIFT Auto Pipeline](.github/workflows/aift-auto-pipeline.yml) is separate from [AIFT Local QA](.github/workflows/aift-local-qa.yml). Its dashboard build uses temporary example registries, including an `apps.yml` entry marked `status: running`; that value is a **test fixture**, not an observation that a production service is running. On `main`, its deployment job checks for `VPS_HOST`, `VPS_USER`, and `VPS_SSH_KEY`. If any are missing, the job reports that deployment was skipped and can still complete successfully. A green pipeline therefore does **not** establish that anything was deployed.

When deployment credentials are present, the pipeline runs a remote Git update, `docker compose up -d --build`, and `docker compose ps`. It does not perform an HTTP health check or verify external routing after those steps. Confirm the actual deployment-job steps, running container health, and externally reachable service separately. The [manual dashboard deployment workflow](.github/workflows/deploy-aift-dashboard.yml) is a distinct, manually triggered path and must be evaluated independently.


### Manual dashboard deployment: bootstrap state and credential boundary

The [manual dashboard deployment workflow](.github/workflows/deploy-aift-dashboard.yml) is `workflow_dispatch`-only. It builds the dashboard on the runner, then uses SSH to clone or update the remote checkout and run `docker compose up -d --build` and `docker compose ps`. Unlike the auto pipeline, it has no preliminary credential-presence gate. It does not probe the remote HTTP endpoint, verify public routing, or perform rollback. On first setup, it writes an `apps.yml` entry with `status: running` **before** verifying that a dashboard process is healthy; this is seeded registry data, not measured service status.

The [dashboard Compose file](apps/aift-dashboard/compose.yml) supplies publicly documented placeholder defaults for `AIFT_DASHBOARD_TOKEN` and `AIFT_NODE_TOKEN` when the remote Compose environment does not provide real values. The workflow does not provision those tokens. The [API authentication handler](apps/aift-dashboard/lib/auth.ts) and [node heartbeat handler](apps/aift-dashboard/app/api/nodes/heartbeat/route.ts) compare bearer tokens with the configured values, so deploying with placeholders is unsafe. The [health checks](apps/aift-dashboard/lib/health.ts) check token **presence**, not token strength, and registry-file existence, not actual deployment readiness.

Before using this path on a real host, configure unique credentials outside source control, verify the SSH host key independently (the workflow currently populates `known_hosts` with `ssh-keyscan`), inspect container logs, test the deployed health and authenticated endpoints, and verify external routing. The non-root deployment and rollback protections required by the [security baseline](docs/security-baseline.md) are not enforced by this workflow.

Common development surfaces include:

```bash
npm run dashboard:dev
npm run desktop:dev
npm run node-agent:build
npm run android:sync
npm run android:build
```

The infrastructure contract is strict: no fake green state, no hidden routing claim, no simulated production data presented as live, no traffic switch before health verification, and no destructive sync merely because automation can perform it.

### Android runtime APK release boundary

The [Android runtime release workflow](.github/workflows/aift-android-runtime-release.yml) runs on changes to `android/aift-cloud-runtime/**`, its bootstrap script, or the workflow itself on `main`, and can also be started manually. It uses Java 17, bootstraps Android build files, runs Gradle 8.10.2 `assembleDebug`, and publishes `aift-cloud-runtime-debug.apk` with a SHA-256 checksum to the `aift-cloud-runtime-latest` prerelease tag.

The [build-only Android APK workflow](.github/workflows/aift-android-runtime-apk.yml) is separate: on matching pushes (without a branch filter) or manual dispatch, it uploads `app-debug.apk` as the `aift-cloud-runtime-debug-apk` Actions artifact. It does **not** publish a GitHub Release or a checksum. By contrast, successful release-workflow runs update the `aift-cloud-runtime-latest` prerelease assets, so `latest` is mutable rather than an immutable, versioned build. Record the source commit and workflow run with any downloaded APK for traceability; the accompanying `.sha256` verifies consistency with its paired checksum file, not independent publisher authenticity.

**Android SDK setup and historical failure:** The workflow explicitly sets `packages: platform-tools` for `android-actions/setup-android@v3`. This avoids the action's default legacy `tools` package request, which can fail with `sdkmanager` reporting `Failed to find package 'tools'`. The command-line SDK tools used by `sdkmanager` are provisioned by the action itself; `platform-tools` is an additional package. This configuration change addresses that specific setup failure, **not** the success of Gradle compilation, artifact publishing, or installation on an Android device. For local troubleshooting, inspect the `Set up Android SDK` step in the latest workflow run before diagnosing build failures, and validate the bootstrap script syntax without modifying Android build files:

```bash
bash -n scripts/aift-android-runtime-bootstrap.sh
```

**This is a debug APK, not a signed production release.** The workflow's release publication step is reached only after the build and artifact preparation succeed; its presence in the repository does not establish that a recent run passed. Download both the APK and `.sha256` asset from the release and verify them in the same directory before installation:

```bash
sha256sum --check aift-cloud-runtime-debug.apk.sha256
```

The checksum checks file integrity against the accompanying checksum file; it does **not** independently authenticate the publisher or establish production signing, device compatibility, or runtime security. Check the actual workflow run and release provenance before distributing or trusting an artifact.

Operating references include `docs/status.md`, `docs/validation.md`, `docs/security-and-privacy.md`, `docs/security-baseline.md`, `docs/secret-management-policy.md`, and `docs/production-readiness-rules.md`.

---

## Book IV — A Cloud That Can Name Its Own Reality

The long path of the Foundry is toward a provider network in which applications and names remain portable across infrastructure. Ordinary DNS and domains can continue to interoperate with the public web while AIFT develops signed service records, provider-node routing, gateways, health-aware fallback, and community-governed naming.

That architecture becomes credible only by proceeding from the working substrate outward. A local preview is not a production deployment. A registered node is not automatically a trustworthy node. A signed record is meaningful only if the signing and verification path is real. A decentralized ambition remains architectural direction until the deployed network proves it.

### The Return of the Word

In VPS, the Word returns as a service whose location and condition can be named. Source becomes build, build becomes workload, workload becomes deployment, deployment becomes route, and route returns as observable health and disclosure. Infrastructure serves sovereignty when it can answer not only “is it online?” but also “where is it, who authorized it, and what proves that answer?”
