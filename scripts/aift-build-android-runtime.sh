#!/usr/bin/env bash
set -uo pipefail

ROOT="${AIFT_ANDROID_RUNTIME_DIR:-android/aift-cloud-runtime}"
LOG_DIR="${AIFT_HOME:-$HOME/.aift-webai}/logs"
LOG_FILE="$LOG_DIR/android-runtime-build.log"
mkdir -p "$LOG_DIR"
: > "$LOG_FILE"

log() {
  printf '%s\n' "$*" | tee -a "$LOG_FILE"
}

log "AIFT ANDROID RUNTIME BUILD CHECK"
log "Started at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
log "Runtime dir: $ROOT"

if ! bash scripts/aift-android-runtime-bootstrap.sh 2>&1 | tee -a "$LOG_FILE"; then
  log "RED Android runtime bootstrap failed; aborting build. See $LOG_FILE"
  exit 1
fi

if ! command -v gradle >/dev/null 2>&1; then
  log "RED Gradle is unavailable. In Termux run: pkg install gradle openjdk-17"
  exit 1
fi

if ! command -v javac >/dev/null 2>&1; then
  log "RED Java compiler is unavailable. In Termux run: pkg install openjdk-17"
  exit 1
fi

if [ -z "${ANDROID_HOME:-}" ] && [ -z "${ANDROID_SDK_ROOT:-}" ]; then
  log "YELLOW Android SDK path is not set. Local phone builds may fail unless Android SDK is installed."
fi

cd "$ROOT" || {
  log "RED Android runtime directory missing: $ROOT"
  exit 1
}

APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
# Prevent an artifact left by an earlier build from masking a missing new APK.
if [ -e "$APK_PATH" ]; then
  rm -f -- "$APK_PATH" || { log "RED Cannot remove previous APK: $APK_PATH"; exit 1; }
fi

log "Running Gradle assembleDebug."
gradle assembleDebug 2>&1 | tee -a "$LOG_FILE"
STATUS=${PIPESTATUS[0]}
if [ "$STATUS" = "0" ] && [ -s "$APK_PATH" ]; then
  log "GREEN APK build completed."
  log "APK path: $APK_PATH"
else
  if [ "$STATUS" = "0" ]; then
    STATUS=1
    log "RED Gradle exited successfully but the expected APK is missing or empty: $APK_PATH"
  fi
  log "RED APK build failed with exit code $STATUS. See $LOG_FILE"
fi

exit "$STATUS"
