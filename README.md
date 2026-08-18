# AIFT Cloud App Foundry — VPS Infrastructure

**The infrastructure layer of the AI Freedom Trust Federation: nodes, deployment, relay, server systems, app building, routing, naming, and the provider fabric through which sovereign applications can actually run.**

| Federation metadata | Value |
| --- | --- |
| Layer | `infrastructure` |
| Role | infrastructure, nodes, deployment, relay, and server systems |
| Workspace | `AIFT/VPS` |
| Control plane | AIFT workspace / AIFT-OS |
| Verification | lint, typecheck, tests, and build when present |
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

Repository setup and verification remain explicit:

```bash
npm install
npm run qa:local
npm run dashboard:build
```

Common development surfaces include:

```bash
npm run dashboard:dev
npm run desktop:dev
npm run node-agent:build
npm run android:sync
npm run android:build
```

The infrastructure contract is strict: no fake green state, no hidden routing claim, no simulated production data presented as live, no traffic switch before health verification, and no destructive sync merely because automation can perform it.

Operating references include `docs/status.md`, `docs/validation.md`, `docs/security-and-privacy.md`, `docs/security-baseline.md`, `docs/secret-management-policy.md`, and `docs/production-readiness-rules.md`.

---

## Book IV — A Cloud That Can Name Its Own Reality

The long path of the Foundry is toward a provider network in which applications and names remain portable across infrastructure. Ordinary DNS and domains can continue to interoperate with the public web while AIFT develops signed service records, provider-node routing, gateways, health-aware fallback, and community-governed naming.

That architecture becomes credible only by proceeding from the working substrate outward. A local preview is not a production deployment. A registered node is not automatically a trustworthy node. A signed record is meaningful only if the signing and verification path is real. A decentralized ambition remains architectural direction until the deployed network proves it.

### The Return of the Word

In VPS, the Word returns as a service whose location and condition can be named. Source becomes build, build becomes workload, workload becomes deployment, deployment becomes route, and route returns as observable health and disclosure. Infrastructure serves sovereignty when it can answer not only “is it online?” but also “where is it, who authorized it, and what proves that answer?”
