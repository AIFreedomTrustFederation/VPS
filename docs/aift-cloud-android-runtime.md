# AIFT Cloud Android Runtime Plan

## Problem

The installed AIFT Cloud PWA can only open `http://127.0.0.1:3001` after a local server is already listening. If Termux is fully closed, Chrome or a PWA cannot start Bash, Node, Git, or the local dashboard by itself.

The solution is a native Android runtime layer that starts before the WebView/PWA shell opens.

## Target behavior

Tap the AIFT Cloud app icon and the native layer should:

1. Start or wake the local runtime service.
2. Acquire a foreground-service notification so Android does not silently kill the process.
3. Start the handoff server on `127.0.0.1:3999`.
4. Open the handoff/loading screen immediately.
5. Sync the repository when allowed.
6. Launch the detached dashboard supervisor.
7. Wait for `http://127.0.0.1:3001/api/dashboard-ready`.
8. Open the dashboard WebView on `http://127.0.0.1:3001/sync`.
9. Keep the ports alive while the foreground service is active.
10. On app close, keep the runtime alive unless the user taps Stop Runtime.

## Phase 1: Termux bridge, no copy/paste

Use the existing Termux environment as the runtime but stop requiring manual typing.

Repo scripts:

- `scripts/aift-phone-launch.sh`
- `scripts/aift-install-phone-shortcut.sh`
- `scripts/aift-dashboard-supervisor.sh`
- `scripts/aift-start-dashboard.sh`
- `scripts/aift-sync-handshake.sh`

Flow:

- Android launcher shortcut starts `aift-phone-launch.sh`.
- `aift-phone-launch.sh` opens `3999/status` first.
- It pulls the repo, launches supervisor, waits for `3001`, then opens dashboard.

This is the immediate stable bridge.

## Phase 2: AIFT Cloud Android wrapper

Create a native Android app with:

- Foreground service named `AiftRuntimeService`.
- WebView shell named `AiftCloudActivity`.
- Runtime bootstrap manager named `AiftRuntimeManager`.
- Notification actions: Open, Restart, Export Logs, Stop Runtime.
- Local HTTP readiness polling.

The wrapper can either:

A. Integrate with installed Termux by intent/plugin where possible.
B. Fork/embed Termux app code and ship an AIFT-branded runtime.
C. Use a separate embedded native runtime distribution for Node/Git if Termux embedding proves too heavy.

## Phase 3: AIFT-branded Termux fork

If we need full ownership, create an AIFT Runtime APK based on the Termux open-source stack:

- Preload bootstrap packages needed for AIFT.
- First run clones or updates `AIFreedomTrustFederation/VPS`.
- Starts the foreground service automatically when the user launches AIFT Cloud.
- Runs `scripts/aift-phone-launch.sh` internally.
- Hosts the dashboard on `127.0.0.1:3001` and handoff on `127.0.0.1:3999`.
- Exposes logs through the AIFT Cloud UI.

## Native runtime state machine

```text
IDLE
  -> STARTING_HANDOFF
  -> HANDOFF_READY
  -> SYNCING_REPO
  -> STARTING_DASHBOARD
  -> WAITING_FOR_READY
  -> DASHBOARD_READY
  -> RUNNING
  -> ERROR
```

The UI must never show the WebView dashboard until the runtime reaches `DASHBOARD_READY`.

## Required Android permissions and components

- INTERNET
- FOREGROUND_SERVICE
- POST_NOTIFICATIONS on recent Android versions
- RECEIVE_BOOT_COMPLETED if boot start is enabled
- REQUEST_IGNORE_BATTERY_OPTIMIZATIONS as an optional guided setting, not forced

## User experience

When the user taps AIFT Cloud:

```text
AIFT Cloud is starting
[████░░░░░░] Starting handoff
[██████░░░░] Syncing repo
[████████░░] Starting dashboard
[██████████] Dashboard ready
```

Then the app opens the local dashboard.

If startup fails:

- Keep the handoff screen open.
- Show the exact failed phase.
- Offer Export Logs.
- Offer Restart Runtime.

## Why this matters

The web dashboard is excellent after the port is alive, but only a native Android runtime can start and preserve the local process when Android has killed Termux or the browser has no server to contact.
