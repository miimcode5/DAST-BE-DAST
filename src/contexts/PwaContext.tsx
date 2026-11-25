import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { getPendingOfflineRequests } from '../lib/offlineDb';
import { syncPendingOfflineRequests } from '../services/requestsService';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PwaContextValue {
  isOnline: boolean;
  isInstalled: boolean;
  canInstallPrompt: boolean;
  pendingSyncCount: number;
  syncing: boolean;
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
  refreshPendingCount: () => Promise<void>;
  triggerSync: () => Promise<void>;
}

const PwaContext = createContext<PwaContextValue | undefined>(undefined);

export function PwaProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true
    );
  });
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshPendingCount = useCallback(async () => {
    if (!user) {
      setPendingSyncCount(0);
      return;
    }
    const items = await getPendingOfflineRequests(user.id);
    setPendingSyncCount(items.length);
  }, [user]);

  const triggerSync = useCallback(async () => {
    if (!user || !navigator.onLine) return;
    setSyncing(true);
    try {
      const { syncedCount, failedCount } = await syncPendingOfflineRequests(user.id);
      await refreshPendingCount();
      if (syncedCount > 0) {
        showToast(
          `${syncedCount} درخواست ذخیره‌شده در حالت آفلاین با موفقیت در سرور ثبت شد.`,
          'success'
        );
      }
      if (failedCount > 0) {
        showToast(
          `${failedCount} مورد در همگام‌سازی خطا داشت. از بخش «فعالیت‌های من» بررسی کنید.`,
          'warning'
        );
      }
    } finally {
      setSyncing(false);
    }
  }, [user, refreshPendingCount, showToast]);

  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('اتصال اینترنت دوباره برقرار شد.', 'info');
      void triggerSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('اتصال اینترنت قطع شد؛ داده‌های ذخیره‌شده محلی همچنان قابل مشاهده‌اند.', 'warning');
    };
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      showToast('اپلیکیشن دست‌به‌دست با موفقیت نصب شد.', 'success');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [showToast, triggerSync]);

  // Also sync automatically on login if online and items exist
  useEffect(() => {
    if (user && isOnline) {
      void triggerSync();
    }
  }, [user, isOnline, triggerSync]);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return 'unavailable';
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
    return outcome;
  }, [deferredPrompt]);

  return (
    <PwaContext.Provider
      value={{
        isOnline,
        isInstalled,
        canInstallPrompt: Boolean(deferredPrompt),
        pendingSyncCount,
        syncing,
        promptInstall,
        refreshPendingCount,
        triggerSync,
      }}
    >
      {children}
    </PwaContext.Provider>
  );
}

export function usePwa() {
  const ctx = useContext(PwaContext);
  if (!ctx) {
    throw new Error('usePwa must be used within PwaProvider');
  }
  return ctx;
}
