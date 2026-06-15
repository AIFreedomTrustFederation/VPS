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

## Current bridge scripts

- `scripts/aift-phone-launch.sh`
- `scripts/aift-dashboard-supervisor.sh`
- `scripts/aift-sync-handshake.sh`
- `scripts/aift-start-dashboard.sh`

## Android source tree

The normal Android app source files now live under:

```text
android/aift-cloud-runtime/app/src/main/
```

Important files:

```text
app/src/main/AndroidManifest.xml
app/src/main/java/org/aift/cloud/AiftCloudActivity.java
app/src/main/java/org/aift/cloud/AiftRuntimeService.java
app/src/main/java/org/aift/cloud/AiftRuntimeManager.java
app/src/main/res/values/styles.xml
app/build.gradle
```

## Generate root Gradle files

The repository includes a bootstrap script because the connector blocked committing the root Gradle files directly.

From the repository root:

```bash
bash scripts/aift-android-runtime-bootstrap.sh
```

That writes:

```text
android/aift-cloud-runtime/settings.gradle
android/aift-cloud-runtime/build.gradle
android/aift-cloud-runtime/gradle.properties
```

Then build from inside the Android runtime folder:

```bash
cd android/aift-cloud-runtime
gradle assembleDebug
```

## Native runtime state machine

```text
TAP APP ICON
  -> AiftCloudActivity opens handoff URL
  -> AiftRuntimeService starts as foreground service
  -> AiftRuntimeManager starts or wakes local runtime
  -> wait for /api/dashboard-ready
  -> WebView opens /sync only after 3001 is alive
```

## Next implementation step

Replace the placeholder in `AiftRuntimeManager.startRuntime()` with the first real bridge:

```text
invoke Termux-compatible AIFT launcher
scripts/aift-phone-launch.sh
```

The long-term target is an AIFT-branded runtime APK that embeds or vendors the required Linux runtime pieces directly.
