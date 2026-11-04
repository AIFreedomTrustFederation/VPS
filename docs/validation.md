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

The root `qa:local` script runs these checks in sequence:

```bash
npm run verify:structure
npm run verify:sources
npm run verify:installer-registry
npm run test:installer-registry
node --test tests/test-dashboard-router.mjs
```

The [hosted AIFT Local QA workflow](../.github/workflows/aift-local-qa.yml) runs that same root gate and **additionally** checks node-refresh behavior (`python3 tests/test-git-refresh.py`), blue/green promotion (`bash -n scripts/aift-bluegreen-sync.sh && python3 tests/test-bluegreen-sync.py`), heartbeat metadata (`bash -n scripts/aift-heartbeat.sh && python3 tests/test-heartbeat.py`), and a clean checkout. Those additional regressions require Python 3 and relevant shell/Git tools; they are not included in `npm run qa:local` itself.

The gate intentionally avoids installing the full workspace dependency stack. Passing these checks does not establish a successful dashboard build, live node health, production deployment, or Android release.

## Federation source evidence

See [the integration audit and acceptance criteria](federation-evidence-integration.md).
`python3 -B scripts/run_source_verification.py --output /tmp/aift-vps-verification.json`
runs the source gate and Local QA regressions, tests the evidence producer, and
writes an unsigned `aift.verification.v1` record outside the checkout. Run from a
clean checkout; failures remain failures in both the record and the exit code.
The separate Federation source evidence workflow tests real VPS and Runtime
records with the pinned AIFT-OS consumer. It does not deploy services.

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

### Android build regression tests (SDK-free)

Run the isolated build failure-handling tests without an Android SDK or Gradle installation:

```bash
bash -n scripts/aift-build-android-runtime.sh tests/test-android-build.sh
bash tests/test-android-build.sh
```

These tests use temporary mock `gradle` and `javac` commands to check bootstrap failures, Gradle failures, missing APKs, empty APKs, and a successful artifact path. They do **not** build or authenticate a real Android APK. GitHub Actions runs the same checks through `.github/workflows/android-build-regression.yml` when relevant files change. Verify the actual workflow run result before claiming CI is green.

## Public Claim Rule

A feature can be described as ready only when the relevant command, log, route health check, or artifact exists and has been verified. Otherwise use one of these states:

- `planned`
- `in progress`
- `blocked`
- `needs runtime`
- `failed`

Do not use simulated success states, mock production nodes, or unverified launch URLs in public-facing claims.
