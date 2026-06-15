#!/usr/bin/env bash
set -Eeuo pipefail

APP_SLUG="${1:-}"
APP_TITLE="${2:-}"
START_PATH="${3:-/sync}"

if [ -z "$APP_SLUG" ]; then
  echo "Usage: bash scripts/aift-new-android-installer.sh <app-slug> [App Title] [start-path]"
  echo "Example: bash scripts/aift-new-android-installer.sh capital-city-provisions 'Capital City Provisions' /sites"
  exit 1
fi

if [ -z "$APP_TITLE" ]; then
  APP_TITLE="$(printf '%s' "$APP_SLUG" | tr '-' ' ' | sed 's/\b\([a-z]\)/\u\1/g')"
fi

CLASS_BASE="$(printf '%s' "$APP_SLUG" | tr '-' ' ' | sed 's/\b\([a-z]\)/\u\1/g' | tr -d ' ')"
PACKAGE_SUFFIX="$(printf '%s' "$APP_SLUG" | tr '-' '_' | tr -cd '[:alnum:]_')"
PROJECT_DIR="android/${APP_SLUG}-runtime"
APP_DIR="$PROJECT_DIR/app"
SRC_DIR="$APP_DIR/src/main/java/org/aift/${PACKAGE_SUFFIX}"
RES_DIR="$APP_DIR/src/main/res/values"
WORKFLOW_FILE=".github/workflows/${APP_SLUG}-runtime-release.yml"
RELEASE_TAG="${APP_SLUG}-runtime-latest"
APK_NAME="${APP_SLUG}-runtime-debug.apk"

mkdir -p "$SRC_DIR" "$RES_DIR" ".github/workflows"

cat > "$APP_DIR/build.gradle" <<EOF
plugins {
    id 'com.android.application'
}

android {
    namespace 'org.aift.${PACKAGE_SUFFIX}'
    compileSdk 35

    defaultConfig {
        applicationId 'org.aift.${PACKAGE_SUFFIX}'
        minSdk 26
        targetSdk 35
        versionCode 1
        versionName '0.1.0'
    }
}
EOF

cat > "$APP_DIR/src/main/AndroidManifest.xml" <<EOF
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <application
        android:allowBackup="false"
        android:label="$APP_TITLE"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true">
        <activity
            android:name=".${CLASS_BASE}Activity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <service
            android:name=".${CLASS_BASE}RuntimeService"
            android:exported="false"
            android:foregroundServiceType="dataSync" />
    </application>
</manifest>
EOF

cat > "$RES_DIR/styles.xml" <<'EOF'
<resources>
    <style name="AppTheme" parent="android:style/Theme.Material.NoActionBar">
        <item name="android:windowNoTitle">true</item>
        <item name="android:windowActionBar">false</item>
        <item name="android:statusBarColor">#050810</item>
        <item name="android:navigationBarColor">#050810</item>
        <item name="android:windowBackground">#050810</item>
    </style>
</resources>
EOF

cat > "$SRC_DIR/${CLASS_BASE}Activity.java" <<EOF
package org.aift.${PACKAGE_SUFFIX};

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class ${CLASS_BASE}Activity extends Activity {
    private static final String HANDOFF_URL = "http://127.0.0.1:3999/status";
    private static final String START_URL = "http://127.0.0.1:3001${START_PATH}";
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        startService(new Intent(this, ${CLASS_BASE}RuntimeService.class));
        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        webView.setWebViewClient(new WebViewClient());
        setContentView(webView);
        webView.loadUrl(HANDOFF_URL);
        ${CLASS_BASE}RuntimeManager.waitForDashboard(() -> runOnUiThread(() -> webView.loadUrl(START_URL)));
    }
}
EOF

cat > "$SRC_DIR/${CLASS_BASE}RuntimeService.java" <<EOF
package org.aift.${PACKAGE_SUFFIX};

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;

public class ${CLASS_BASE}RuntimeService extends Service {
    private static final String CHANNEL_ID = "${APP_SLUG}-runtime";

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();
        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? new Notification.Builder(this, CHANNEL_ID)
                : new Notification.Builder(this);
        Notification notification = builder
                .setContentTitle("$APP_TITLE runtime")
                .setContentText("Keeping AIFT local ports open")
                .setSmallIcon(android.R.drawable.stat_sys_upload_done)
                .build();
        startForeground(1001, notification);
        ${CLASS_BASE}RuntimeManager.startRuntime(this);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        ${CLASS_BASE}RuntimeManager.startRuntime(this);
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "$APP_TITLE Runtime", NotificationManager.IMPORTANCE_LOW);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }
}
EOF

cat > "$SRC_DIR/${CLASS_BASE}RuntimeManager.java" <<EOF
package org.aift.${PACKAGE_SUFFIX};

import android.content.Context;
import android.content.Intent;
import android.net.Uri;

import java.net.HttpURLConnection;
import java.net.URL;

public final class ${CLASS_BASE}RuntimeManager {
    private static final String READY_URL = "http://127.0.0.1:3001/api/dashboard-ready";
    private static final String HANDOFF_URL = "http://127.0.0.1:3999/status";

    private ${CLASS_BASE}RuntimeManager() {}

    public static void startRuntime(Context context) {
        openUrl(context, HANDOFF_URL);
    }

    public static void waitForDashboard(Runnable onReady) {
        Thread thread = new Thread(() -> {
            for (int i = 0; i < 90; i++) {
                if (isReady()) {
                    onReady.run();
                    return;
                }
                try {
                    Thread.sleep(2000);
                } catch (InterruptedException ignored) {
                    Thread.currentThread().interrupt();
                    return;
                }
            }
        });
        thread.setDaemon(true);
        thread.start();
    }

    private static boolean isReady() {
        try {
            HttpURLConnection connection = (HttpURLConnection) new URL(READY_URL).openConnection();
            connection.setConnectTimeout(1200);
            connection.setReadTimeout(1200);
            int code = connection.getResponseCode();
            return code >= 200 && code < 300;
        } catch (Exception ignored) {
            return false;
        }
    }

    private static void openUrl(Context context, String url) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
        } catch (Exception ignored) {}
    }
}
EOF

cat > "$PROJECT_DIR/README.md" <<EOF
# $APP_TITLE Android Runtime

Generated by:

\`\`\`bash
bash scripts/aift-new-android-installer.sh $APP_SLUG "$APP_TITLE" "$START_PATH"
\`\`\`

Stable APK link after release workflow succeeds:

\`\`\`text
https://github.com/AIFreedomTrustFederation/VPS/releases/download/$RELEASE_TAG/$APK_NAME
\`\`\`
EOF

cat > "$WORKFLOW_FILE" <<EOF
name: Release $APP_TITLE Runtime APK

on:
  workflow_dispatch:
  push:
    paths:
      - '$PROJECT_DIR/**'
      - 'scripts/aift-android-runtime-bootstrap.sh'
      - '$WORKFLOW_FILE'

permissions:
  contents: write

jobs:
  release-apk:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Set up Java
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '17'
      - name: Set up Android SDK
        uses: android-actions/setup-android@v3
      - name: Bootstrap Android runtime build files
        run: bash scripts/aift-android-runtime-bootstrap.sh
      - name: Set up Gradle
        uses: gradle/actions/setup-gradle@v4
        with:
          gradle-version: '8.10.2'
      - name: Build debug APK
        working-directory: $PROJECT_DIR
        run: gradle assembleDebug
      - name: Prepare release APK
        run: |
          mkdir -p dist
          cp $PROJECT_DIR/app/build/outputs/apk/debug/app-debug.apk dist/$APK_NAME
      - name: Publish latest APK release
        uses: softprops/action-gh-release@v2
        with:
          tag_name: $RELEASE_TAG
          name: $APP_TITLE Runtime Latest
          files: dist/$APK_NAME
          draft: false
          prerelease: true
          make_latest: true
EOF

printf 'Generated Android installer runtime: %s\n' "$PROJECT_DIR"
printf 'Generated release workflow: %s\n' "$WORKFLOW_FILE"
printf 'Stable APK link after release: https://github.com/AIFreedomTrustFederation/VPS/releases/download/%s/%s\n' "$RELEASE_TAG" "$APK_NAME"
