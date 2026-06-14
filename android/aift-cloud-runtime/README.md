# AIFT Cloud Android Runtime

This folder is the native Android runtime target for AIFT Cloud.

The goal is to move from a browser-only PWA to a phone app that owns the startup sequence:

1. Start an Android foreground service.
2. Start or wake the local AIFT runtime.
3. Open the handoff/loading URL first.
4. Launch the dashboard supervisor.
5. Wait for `127.0.0.1:3001` to answer.
6. Open the dashboard WebView only after the port is live.
7. Keep runtime ports alive while the service notification is active.

Current bridge scripts in the main repo:

- `scripts/aift-phone-launch.sh`
- `scripts/aift-dashboard-supervisor.sh`
- `scripts/aift-sync-handshake.sh`
- `scripts/aift-start-dashboard.sh`

The first APK target should wrap those scripts through a Termux-compatible runtime bridge. The long-term target is an AIFT-branded runtime APK that embeds or vendors the required Linux runtime pieces directly.
