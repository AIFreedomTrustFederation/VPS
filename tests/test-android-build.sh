#!/usr/bin/env bash
set -Eeuo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_SCRIPT="$REPO_ROOT/scripts/aift-build-android-runtime.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/bin" "$TMP/project/scripts"
cp "$BUILD_SCRIPT" "$TMP/project/scripts/aift-build-android-runtime.sh"
cat > "$TMP/bin/javac" <<'SH'
#!/usr/bin/env bash
exit 0
SH
cat > "$TMP/bin/gradle" <<'SH'
#!/usr/bin/env bash
case "$TEST_MODE" in
  gradle-fail) exit 7 ;;
  valid) mkdir -p app/build/outputs/apk/debug; printf 'mock-apk' > app/build/outputs/apk/debug/app-debug.apk ;;
  empty) mkdir -p app/build/outputs/apk/debug; : > app/build/outputs/apk/debug/app-debug.apk ;;
esac
SH
chmod +x "$TMP/bin/"*
cat > "$TMP/project/scripts/aift-android-runtime-bootstrap.sh" <<'SH'
#!/usr/bin/env bash
if [ "$TEST_MODE" = bootstrap-fail ]; then exit 9; fi
mkdir -p "$AIFT_ANDROID_RUNTIME_DIR"
SH
run_case() {
  local mode="$1" expected="$2" status=0
  rm -rf "$TMP/runtime"
  (cd "$TMP/project" && TEST_MODE="$mode" AIFT_HOME="$TMP/home" AIFT_ANDROID_RUNTIME_DIR="$TMP/runtime" PATH="$TMP/bin:$PATH" bash scripts/aift-build-android-runtime.sh) > "$TMP/output" 2>&1 || status=$?
  if [ "$expected" = success ]; then
    [ "$status" -eq 0 ] && grep -q 'GREEN APK build completed' "$TMP/output" || { cat "$TMP/output"; echo "FAIL: $mode"; exit 1; }
  else
    [ "$status" -ne 0 ] && ! grep -q 'GREEN APK build completed' "$TMP/output" || { cat "$TMP/output"; echo "FAIL: $mode"; exit 1; }
  fi
  echo "PASS: $mode"
}
run_case bootstrap-fail failure
run_case gradle-fail failure
run_case missing failure
run_case empty failure
run_case valid success
