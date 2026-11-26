import { useEffect, useRef } from 'react';
import { App as CapApp } from '@capacitor/app';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  configureNativeBars,
  hideNativeSplash,
  isNativePlatform,
  openExternalUrl,
  parseAppDeepLink,
} from '../lib/capacitorBridge';
import { supabase } from '../lib/supabase';

const EXIT_DOUBLE_BACK_WINDOW_MS = 2200;

export function NativeAppBridge() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const lastBackPressRef = useRef<number>(0);
  const splashHiddenRef = useRef<boolean>(false);
  const currentPathRef = useRef(location.pathname);

  useEffect(() => {
    currentPathRef.current = location.pathname;
  }, [location.pathname]);

  // Configure native StatusBar / NavigationBar on startup
  useEffect(() => {
    if (!isNativePlatform()) return;
    void configureNativeBars();
  }, []);

  // Hide native SplashScreen cleanly once auth bootstrap resolves (with safety timeout)
  useEffect(() => {
    if (!isNativePlatform() || splashHiddenRef.current) return;

    if (!authLoading) {
      splashHiddenRef.current = true;
      void hideNativeSplash();
      return;
    }

    const fallbackTimer = window.setTimeout(() => {
      if (!splashHiddenRef.current) {
        splashHiddenRef.current = true;
        void hideNativeSplash();
      }
    }, 1500);

    return () => window.clearTimeout(fallbackTimer);
  }, [authLoading]);

  // Intercept external HTTP(S) links so they open safely outside the Capacitor WebView
  useEffect(() => {
    if (!isNativePlatform()) return;

    const handleLinkClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;

      const rawHref = anchor.getAttribute('href');
      if (!rawHref) return;

      // Let tel:, mailto:, sms:, or internal hash/relative routes pass naturally
      if (/^(tel:|mailto:|sms:|#)/i.test(rawHref)) return;

      try {
        const resolved = new URL(rawHref, window.location.href);
        if (
          (resolved.protocol === 'http:' || resolved.protocol === 'https:') &&
          resolved.origin !== window.location.origin
        ) {
          event.preventDefault();
          void openExternalUrl(resolved.href);
        }
      } catch {
        // Ignore malformed hrefs
      }
    };

    document.addEventListener('click', handleLinkClick);
    return () => document.removeEventListener('click', handleLinkClick);
  }, []);

  // Handle Android hardware/gesture Back button & Supabase Deep Links
  useEffect(() => {
    if (!isNativePlatform()) return;

    const backPromise = CapApp.addListener('backButton', ({ canGoBack }) => {
      // 1. Allow open dialogs/drawers to close first
      const openDialog = document.querySelector('[role="dialog"][aria-modal="true"]');
      if (openDialog) {
        window.dispatchEvent(new CustomEvent('dast:native-back'));
        return;
      }

      // 2. Navigate back inside app routes when not on root Home screen
      const pathname = currentPathRef.current;
      if (pathname !== '/') {
        if (canGoBack && window.history.length > 1) {
          navigate(-1);
        } else {
          navigate('/', { replace: true });
        }
        return;
      }

      // 3. On root Home screen, require double back press to exit cleanly
      const now = Date.now();
      if (now - lastBackPressRef.current < EXIT_DOUBLE_BACK_WINDOW_MS) {
        void CapApp.exitApp();
      } else {
        lastBackPressRef.current = now;
        showToast('برای خروج از دست‌به‌دست، دوباره دکمه بازگشت را بزنید.', 'info');
      }
    });

    const urlOpenPromise = CapApp.addListener('appUrlOpen', async ({ url }) => {
      const deep = parseAppDeepLink(url);
      if (!deep) return;

      try {
        if (deep.code) {
          await supabase.auth.exchangeCodeForSession(deep.code);
        } else if (deep.accessToken && deep.refreshToken) {
          await supabase.auth.setSession({
            access_token: deep.accessToken,
            refresh_token: deep.refreshToken,
          });
        }
      } catch {
        // Allow navigation even if session link already expired; target page handles UX
      }

      if (deep.type === 'recovery' || deep.routePath.includes('reset-password')) {
        navigate('/auth/reset-password', { replace: true });
      } else if (deep.routePath && deep.routePath.startsWith('/')) {
        navigate(deep.routePath, { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    });

    return () => {
      void backPromise.then((h) => h.remove());
      void urlOpenPromise.then((h) => h.remove());
    };
  }, [navigate, showToast]);

  return null;
}
