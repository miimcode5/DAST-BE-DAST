import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';
import { isNativePlatform } from './lib/capacitorBridge';

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  if (isNativePlatform()) {
    // Native Capacitor APK serves bundled assets directly from dist; avoid stale SW cache in WebView
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        for (const registration of registrations) {
          void registration.unregister();
        }
      })
      .catch(() => {
        // Ignore SW cleanup errors in restricted WebViews
      });
  } else {
    registerSW({
      immediate: true,
      onOfflineReady() {
        // Service Worker cached core shell for offline usage
      },
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
