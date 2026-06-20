# AIFT VPS Validation

This repository has multiple runtime targets. Use the smallest truthful check for the area changed, then run broader checks before release work.

## Required First Step

Before editing or publishing changes:

```bash
git fetch origin
git status --short --branch
```

Read `README.md`, `AGENTS.md`, `docs/status.md`, this file, and the area-specific docs for the files being changed.

## Lightweight Local Gate

Run this for docs, manifests, scripts, registry metadata, workspace wiring, and repo-structure changes:

```bash
npm run qa:local
```

This runs:

```bash
npm run verify:structure
npm run verify:installer-registry
```

The gate intentionally avoids installing the full workspace dependency stack.

## Dashboard Checks

When changing `apps/aift-dashboard` or dashboard-facing registry logic:

```bash
npm install
npm run dashboard:build
```

If dashboard lint is needed and the local Next.js stack supports it, run:

```bash
npm --workspace apps/aift-dashboard run lint
```

Document any toolchain failure exactly. Do not mark the dashboard green unless the command actually passes.

## Node Agent Check

When changing `apps/aift-node-agent`:

```bash
npm install
npm run node-agent:build
```

## Android Runtime Checks

For Android runtime source or bootstrap changes:

```bash
npm run android:sync
npm run android:build
```

`android:build` requires Bash, Java, Gradle, and an Android SDK. If any are unavailable, record the missing dependency and the next repair step.

## Public Claim Rule

A feature can be described as ready only when the relevant command, log, route health check, or artifact exists and has been verified. Otherwise use one of these states:

- `planned`
- `in progress`
- `blocked`
- `needs runtime`
- `failed`

Do not use simulated success states, mock production nodes, or unverified launch URLs in public-facing claims.
