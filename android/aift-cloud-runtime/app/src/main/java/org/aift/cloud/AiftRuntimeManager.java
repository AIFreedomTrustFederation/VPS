package org.aift.cloud;

import android.content.Context;

import java.net.HttpURLConnection;
import java.net.URL;

public final class AiftRuntimeManager {
    private static final String READY_URL = "http://127.0.0.1:3001/api/dashboard-ready";

    private AiftRuntimeManager() {}

    public static void startRuntime(Context context) {
        AiftTermuxBridge.start(context);
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
}
