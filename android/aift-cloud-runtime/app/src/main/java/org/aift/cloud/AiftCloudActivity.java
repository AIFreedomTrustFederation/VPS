package org.aift.cloud;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.util.Collections;

public class AiftCloudActivity extends Activity {
    private static final String HANDOFF_URL = "http://127.0.0.1:3999/status";
    private static final String DASHBOARD_URL = "http://127.0.0.1:3001/sync";
    private WebView webView;

    private static boolean isAllowedLocalUrl(Uri uri) {
        if (!"http".equals(uri.getScheme()) || !"127.0.0.1".equals(uri.getHost())) return false;
        return uri.getPort() == 3001 || uri.getPort() == 3999;
    }

    private static WebResourceResponse blockedResponse() {
        return new WebResourceResponse(
                "text/plain",
                "UTF-8",
                403,
                "Blocked",
                Collections.emptyMap(),
                new ByteArrayInputStream(new byte[0]));
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        startService(new Intent(this, AiftRuntimeService.class));
        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (isAllowedLocalUrl(request.getUrl())) {
                    return super.shouldInterceptRequest(view, request);
                }
                return blockedResponse();
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !isAllowedLocalUrl(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return !isAllowedLocalUrl(Uri.parse(url));
            }
        });
        setContentView(webView);
        webView.loadUrl(HANDOFF_URL);
        AiftRuntimeManager.waitForDashboard(() -> runOnUiThread(() -> webView.loadUrl(DASHBOARD_URL)));
    }
}
