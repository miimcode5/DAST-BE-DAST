import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

const BRAND_PRIMARY_HEX = '#174D35';

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export function isNativeAndroid(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export function getAuthRedirectUrl(routePath: string): string {
  const cleanPath = routePath.startsWith('/') ? routePath.slice(1) : routePath;
  if (isNativePlatform()) {
    return `com.rassa.dastbedast://${cleanPath}`;
  }
  const base = import.meta.env.BASE_URL || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${window.location.origin}${normalizedBase}${cleanPath}`;
}

export async function configureNativeBars(): Promise<void> {
  if (!isNativeAndroid()) return;
  try {
    const androidMatch =
      typeof navigator !== 'undefined' ? navigator.userAgent.match(/Android\s+(\d+)/i) : null;
    const androidMajor = androidMatch ? Number.parseInt(androidMatch[1], 10) : 0;

    if (androidMajor >= 15) {
      // Edge-to-edge mode enforced on Android 15+: keep dark status icons readable over light header
      await StatusBar.setStyle({ style: Style.Light });
    } else {
      // Android 7.0 - 14: solid brand primary status bar with crisp white icons
      await StatusBar.setOverlaysWebView({ overlay: false });
      await StatusBar.setBackgroundColor({ color: BRAND_PRIMARY_HEX });
      await StatusBar.setStyle({ style: Style.Dark });
    }
  } catch {
    // Ignore on platforms/WebViews without StatusBar support
  }
}

export async function hideNativeSplash(): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    await SplashScreen.hide({ fadeOutDuration: 280 });
  } catch {
    // Ignore if already hidden
  }
}

export async function openExternalUrl(url: string): Promise<void> {
  const trimmed = url.trim();
  if (!trimmed) return;

  if (isNativePlatform()) {
    try {
      await Browser.open({
        url: trimmed,
        toolbarColor: BRAND_PRIMARY_HEX,
        presentationStyle: 'popover',
      });
      return;
    } catch {
      // Fallback to standard browser navigation
    }
  }

  window.open(trimmed, '_blank', 'noopener,noreferrer');
}

export function parseAppDeepLink(rawUrl: string): {
  routePath: string;
  code: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  type: string | null;
} | null {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'com.rassa.dastbedast:') {
      return null;
    }

    const hostPart = parsed.host ? `/${parsed.host}` : '';
    const pathPart = parsed.pathname && parsed.pathname !== '/' ? parsed.pathname : '';
    const routePath = `${hostPart}${pathPart}` || '/';

    const hashStr = parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash;
    const hashParams = new URLSearchParams(hashStr);
    const queryParams = parsed.searchParams;

    return {
      routePath,
      code: queryParams.get('code'),
      accessToken: hashParams.get('access_token'),
      refreshToken: hashParams.get('refresh_token'),
      type: hashParams.get('type') || queryParams.get('type'),
    };
  } catch {
    return null;
  }
}
