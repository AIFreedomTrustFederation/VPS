package org.aift.cloud;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class AiftCloudActivity extends Activity {
    private static final String HANDOFF_URL = "http://127.0.0.1:3999/status";
    private static final String DASHBOARD_URL = "http://127.0.0.1:3001/sync";
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        startService(new Intent(this, AiftRuntimeService.class));
        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        webView.setWebViewClient(new WebViewClient());
        setContentView(webView);
        webView.loadUrl(HANDOFF_URL);
        AiftRuntimeManager.waitForDashboard(() -> runOnUiThread(() -> webView.loadUrl(DASHBOARD_URL)));
    }
}
