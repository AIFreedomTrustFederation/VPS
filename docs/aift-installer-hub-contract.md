# AIFT One-Click Installer Hub Contract

## Purpose

The AIFT Installer Hub is the app that coordinates all AIFT Android APK installs and updates from one button.

The phone is the runtime device. GitHub builds the APKs in the cloud. The hub downloads release APKs and guides Android install confirmations in the correct order.

## Android security boundary

Android does not allow a normal browser or app to silently install arbitrary APKs without user confirmation. The hub can automate download order, readiness checks, and runtime startup, but Android may still show an Install or Update confirmation for each APK.

## Registry source

The canonical registry is:

```text
android/aift-installer-registry.json
```

Each installer entry defines:

```text
id
title
package_name
release_tag
apk_name
download_url
install_order
requires
can_install_async
start_after_install
health_check_url
handoff_url
start_url
```

## Install state machine

```text
LOAD_REGISTRY
  -> SORT_BY_INSTALL_ORDER
  -> INSTALL_REQUIRED_SYNC_ITEMS
  -> START_RUNTIME
  -> WAIT_FOR_RUNTIME_HEALTH
  -> INSTALL_ASYNC_MODULES
  -> VERIFY_MODULE_HEALTH
  -> READY
  -> EXPORT_INSTALL_LOG
```

## Synchronous rules

The hub must install synchronously when:

- `can_install_async` is false.
- `requires` has missing or unhealthy dependencies.
- `start_after_install` is true.
- The installer is the core runtime.

## Asynchronous rules

The hub may install asynchronously when:

- `can_install_async` is true.
- All `requires` dependencies are installed and healthy.
- The entry is a module app, not the runtime.

## First-run install order

Current first-run order:

1. `aift-cloud-runtime`
2. `capital-city-provisions-runtime`
3. `aift-provider-node-runtime`
4. `aift-webai-runtime`

## Runtime health

The core runtime is healthy only when:

```text
http://127.0.0.1:3001/api/dashboard-ready
```

returns HTTP 2xx.

The handoff page remains:

```text
http://127.0.0.1:3999/status
```

## One button UX

The installer hub main button should be:

```text
Install / Update AIFT Suite
```

It should show ordered phases:

```text
Reading registry
Downloading runtime
Install runtime confirmation
Starting runtime
Waiting for dashboard port
Downloading modules
Install module confirmations
Verifying health checks
Ready
```

## Stable APK links

Each app gets a stable release link:

```text
https://github.com/AIFreedomTrustFederation/VPS/releases/download/<release_tag>/<apk_name>
```

This lets users keep one bookmark/link while GitHub Actions replaces the release asset with the newest build.
