#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${AIFT_ANDROID_RUNTIME_DIR:-android/aift-cloud-runtime}"
SRC_DIR="$ROOT/app/src/main/java/org/aift/cloud"
mkdir -p "$ROOT" "$SRC_DIR"

cat > "$ROOT/settings.gradle" <<'EOF'
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = 'AIFTCloudRuntime'
include ':app'
EOF

cat > "$ROOT/build.gradle" <<'EOF'
plugins {
    id 'com.android.application' version '8.7.3' apply false
}
EOF

cat > "$ROOT/gradle.properties" <<'EOF'
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=false
android.nonTransitiveRClass=true
EOF

if [ -f "$SRC_DIR/AiftTermuxBridge.java.template" ]; then
  sed \
    -e 's#__TERMUX_BASH_PATH__#/data/data/com.termux/files/usr/bin/bash#g' \
    -e 's#__AIFT_NODE_DIR__#/data/data/com.termux/files/home/aift-termux-node-002#g' \
    "$SRC_DIR/AiftTermuxBridge.java.template" > "$SRC_DIR/AiftTermuxBridge.java"
fi

printf 'AIFT Android runtime Gradle files written in %s\n' "$ROOT"
printf 'AIFT Android Termux bridge generated when template is present.\n'
printf 'Next: cd %s && gradle assembleDebug\n' "$ROOT"
