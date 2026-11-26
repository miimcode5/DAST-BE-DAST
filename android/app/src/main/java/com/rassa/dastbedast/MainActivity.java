package com.rassa.dastbedast;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.Window;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        configureSystemBars();
        configureWebViewDefaults();
    }

    @Override
    public void onResume() {
        super.onResume();
        configureSystemBars();
    }

    private void configureSystemBars() {
        Window window = getWindow();
        if (window == null) return;

        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(window, window.getDecorView());

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.VANILLA_ICE_CREAM) {
            // Android 7.0 (API 24) to Android 14 (API 34): branded status bar & crisp light nav bar
            @SuppressWarnings("deprecation")
            int primaryColor = Color.parseColor("#174D35");
            @SuppressWarnings("deprecation")
            int bgColor = Color.parseColor("#F6F7F2");

            window.setStatusBarColor(primaryColor);
            window.setNavigationBarColor(bgColor);

            if (controller != null) {
                controller.setAppearanceLightStatusBars(false);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    controller.setAppearanceLightNavigationBars(true);
                }
            }
        } else {
            // Android 15+ (API 35+): edge-to-edge enforced; ensure dark icons stay legible on light UI
            if (controller != null) {
                controller.setAppearanceLightStatusBars(true);
                controller.setAppearanceLightNavigationBars(true);
            }
        }
    }

    private void configureWebViewDefaults() {
        if (bridge == null) return;
        WebView webView = bridge.getWebView();
        if (webView == null) return;

        WebSettings settings = webView.getSettings();
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
    }
}
