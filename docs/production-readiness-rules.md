# AIFT VPS Production Readiness Rules

AIFT VPS must only present real, open-source, production-valid behavior in the product path.

## Non-negotiable rules

1. No fake deploys.
2. No simulated launch links.
3. No fake success states.
4. No mock nodes in production routes.
5. No mock app profiles in production routes.
6. No closed API dependency for core WebAI operation.
7. No third-party rate-limited core path.
8. No hidden user-required API key path.
9. No clickable app URL unless a real process is running or a real hosted service exists.
10. No build status unless a real command produced the result.

## Allowed states

A feature may show one of these states:

- `ready`: real implementation is available and tested.
- `blocked`: real implementation is not available yet.
- `needs-runtime`: the implementation is real, but the local device is missing a required runtime.
- `failed`: the real action was attempted and failed.

## Current production-valid flow

The current valid flow is:

1. Save a real GitHub repo source.
2. Generate a real app profile by reading GitHub files.
3. Create a real local workspace by cloning or pulling the repo.
4. Save real terminal output.
5. Save real workload records.

## Not production-valid yet

These must remain locked until real execution exists:

- dependency installation button
- build button
- start preview button
- public launch URL
- decentralized scheduling
- model runtime execution

## Open-source AI rule

The core WebAI runtime must be able to run with open-source model tooling. Closed APIs may only be optional adapters and must never be required for core operation.
