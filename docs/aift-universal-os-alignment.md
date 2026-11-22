# VPS Cloud App Foundry — Hosted AIFT-OS Integration

> **Proposed hosted-OS architecture; no production deployment or hardware boot evidence.** This repository owns provider infrastructure, app foundry, nodes, routing, verifiable deployment and rollback. Native Linux boot and firmware compatibility remain primarily with AIFT-OS, not VPS. See the draft [central platform architecture and infographics](https://github.com/AIFreedomTrustFederation/AIFT-OS/pull/92).

## Architectural role

Provide isolated, authenticated hosted AIFT operating-system sessions using provider nodes and transparent service routes. A browser-based Living Universe desktop is a client, **not** a kernel. Privileged service operations must be behind reviewed authenticated backend APIs and device-specific capabilities, never exposed from a public static portal.

~~~mermaid
flowchart LR
  USER["Authenticated owner"] --> SHELL["Living Universe hosted desktop"]
  SHELL --> AUTH["Session permission boundary"]
  AUTH --> API["AIFT app + file + agent APIs"]
  API --> NODE["VPS isolated workload / host node"]
  NODE --> STORE["Encrypted persistent data / verified backups"]
  OBS["Health, provenance and audit evidence"] --> API
  ROUTE["Approved route release / rollback"] --> NODE
~~~

## Proposed service contracts

| Platform capability | Minimum implementation evidence |
|---|---|
| Session isolation | Authenticated creation/expiry, cross-user denial test, audit and logout |
| Application runtime | Per-app manifests, isolated process/container scope, reliable stop/restart and truthful readiness |
| Persistent storage | User-scoped export, backup/restore, secret isolation and deletion |
| Network routing | Route only after verified health; rollback on deployment failure |
| Hosted/local federation | Versioned API and explicit user consent, offline/degraded behavior |
| Update and release | Source/artifact SHA, dependency/license review, staging CI and manual production go/no-go |

## Boot and hardware boundary

VPS may build and host **artifacts** for a future AIFT Linux/UEFI image only through separately reviewed release contracts. Never present an uploaded ISO, static boot-menu mock or cloud-init script as physically booted hardware. No BIOS flashing, ESP writes, Secure Boot key management, Apple policy changes, disk repartition or real hardware deployment is authorized by this documentation.

## Acceptance milestones

**HOST-01:** Verified isolated user session + real app API; **HOST-02:** persistent workspace and recovery; **HOST-03:** local-first Aetherion provider with scoped tools; **RELEASE-01:** rollback, deployment health, signed provenance. Keep the current VPS labeled auto-merge policy restricted to approved, exact-head green, ordinary non-sensitive changes; exclude native/firmware/installer/security/identity changes.

Validate according to VPS AGENTS.md, npm run qa:local, area-specific docs/validation.md and exact-head CI; never claim a production endpoint without checking the actual URL and provider deployment state.

[Platform architecture PR #92](https://github.com/AIFreedomTrustFederation/AIFT-OS/pull/92) · [Runtime](https://github.com/AIFreedomTrustFederation/AIFT-Runtime) · [Living Universe](https://github.com/AIFreedomTrustFederation/www.aifreedomtrust.com).