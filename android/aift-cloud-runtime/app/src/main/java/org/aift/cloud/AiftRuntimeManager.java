package org.aift.cloud;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;

import java.net.HttpURLConnection;
import java.net.URL;

public final class AiftRuntimeManager {
    private static final String READY_URL = "http://127.0.0.1:3001/api/dashboard-ready";
    private static final String HANDOFF_URL = "http://127.0.0.1:3999/status";

    private AiftRuntimeManager() {}

    public static void startRuntime(Context context) {
        openUrl(context, HANDOFF_URL);
        // Phase 1 bridge target: invoke Termux-compatible launcher.
        // Phase 2 target: replace this with embedded AIFT runtime bootstrap.
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
        } catch (Exception ignored) {
            // The WebView activity still loads the same URL.
        }
    }
}
