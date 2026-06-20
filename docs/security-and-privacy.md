# AIFT VPS Security And Privacy

`VPS` controls infrastructure, deployment records, node identity, app-source intake, and future routing. Treat it as sensitive infrastructure even while the network is still in foundation stages.

## Canonical Security Docs

- `docs/security-baseline.md`: server, firewall, SSH, backup, dashboard, and deployment safety baseline.
- `docs/secret-management-policy.md`: secret storage, display, logging, connector, and WebAI API-key boundaries.
- `docs/production-readiness-rules.md`: allowed states and non-negotiable production behavior.
- `docs/runtime-contract.md`: runtime capabilities and node workload safety levels.

## Current Boundaries

- No real secrets belong in Git.
- Public dashboards must not expose admin controls without authentication.
- Logs must not print tokens, keys, passwords, private credentials, connection strings, or raw user secrets.
- Community and phone nodes must not receive production secrets by default.
- Public workload routing must wait for signed service records, health checks, fallback preservation, and truthful disclosure.
- Closed AI APIs may only be optional adapters; core WebAI operation must remain open-source and local or node-routed by default.

## Human Approval Required

Require explicit human approval before:

- destructive sync or record deletion
- live route changes
- registry or name ownership changes
- security-claim changes
- secret migration or credential rotation
- force pushes, hard resets, or branch deletion

## Disclosure Rule

Every public service or deployment should disclose the node, operator class, trust level, region or local label, runtime type, backup status, and monitoring status when that data exists.
