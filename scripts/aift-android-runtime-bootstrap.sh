#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${AIFT_ANDROID_RUNTIME_DIR:-android/aift-cloud-runtime}"
mkdir -p "$ROOT"

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

printf 'AIFT Android runtime Gradle files written in %s\n' "$ROOT"
printf 'Next: cd %s && gradle assembleDebug\n' "$ROOT"
