import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Database,
  Download,
  KeyRound,
  RefreshCw,
  Smartphone,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useAuth } from '../contexts/AuthContext';
import { usePwa } from '../contexts/PwaContext';
import { useToast } from '../contexts/ToastContext';
import { formatRelativeTimeFa, toPersianDigits } from '../lib/formatters';
import { clearOfflineCache, getOfflineCacheStats } from '../lib/offlineDb';

export function SettingsPage() {
  const { user } = useAuth();
  const {
    isOnline,
    isInstalled,
    canInstallPrompt,
    pendingSyncCount,
    syncing,
    promptInstall,
    triggerSync,
  } = usePwa();
  const { showToast } = useToast();

  const [cacheStats, setCacheStats] = useState({
    cachedRequestsCount: 0,
    cachedRequestsUpdatedAt: null as string | null,
    pendingSyncCount: 0,
  });
  const [confirmClear, setConfirmClear] = useState(false);

  const loadCacheStats = async () => {
    const stats = await getOfflineCacheStats();
    setCacheStats(stats);
  };

  useEffect(() => {
    void loadCacheStats();
  }, [pendingSyncCount]);

  const handleInstall = async () => {
    const outcome = await promptInstall();
    if (outcome === 'unavailable') {
      showToast('از منوی مرورگر موبایل گزینه «Install App» یا «افزودن به صفحه اصلی» را انتخاب کنید.', 'info');
    }
  };

  const handleClearCache = async () => {
    await clearOfflineCache();
    await loadCacheStats();
    setConfirmClear(false);
    showToast('حافظه موقت آفلاین با موفقیت پاک شد.', 'success');
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-up">
      <div>
        <h1 className="text-xl font-extrabold text-brand-primary">تنظیمات و وضعیت برنامه</h1>
        <p className="mt-1 text-sm text-brand-text/70">
          مدیریت نصب اپلیکیشن (PWA)، حافظه آفلاین و امنیت حساب کاربری
        </p>
      </div>

      {/* PWA Install Card */}
      <section className="space-y-4 rounded-2xl border border-brand-surface bg-white p-4 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Smartphone className="h-5 w-5 text-brand-primary" />
            <h2 className="text-base font-bold text-brand-text">نصب روی دستگاه (PWA)</h2>
          </div>
          {isInstalled ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-surface px-3 py-1 text-xs font-bold text-brand-primary">
              <CheckCircle2 className="h-3.5 w-3.5" />
              در حالت اپلیکیشن نصب‌شده
            </span>
          ) : (
            <span className="rounded-full bg-brand-bg px-3 py-1 text-xs font-semibold text-brand-text/70">
              اجرا در مرورگر
            </span>
          )}
        </div>

        <p className="text-xs leading-6 text-brand-text/75 sm:text-sm">
          دست‌به‌دست به‌عنوان یک وب‌اپلیکیشن پیش‌رونده (PWA) طراحی شده است تا در گوشی‌های اندروید مانند یک اپلیکیشن مستقل اجرا شود و صفحات اصلی در نبود اینترنت نیز در دسترس باشند.
        </p>

        {!isInstalled && (
          <button
            type="button"
            onClick={() => void handleInstall()}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-3 text-xs font-bold text-white hover:bg-brand-green"
          >
            <Download className="h-4 w-4" />
            {canInstallPrompt ? 'نصب دست‌به‌دست روی دستگاه' : 'راهنمای نصب از مرورگر'}
          </button>
        )}
      </section>

      {/* Network & Offline Storage Card */}
      <section className="space-y-4 rounded-2xl border border-brand-surface bg-white p-4 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Database className="h-5 w-5 text-brand-primary" />
            <h2 className="text-base font-bold text-brand-text">وضعیت شبکه و حافظه آفلاین (IndexedDB)</h2>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
              isOnline ? 'bg-brand-surface text-brand-primary' : 'border border-brand-gold/60 bg-brand-bg text-brand-text'
            }`}
          >
            {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {isOnline ? 'متصل به اینترنت' : 'آفلاین'}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-brand-bg p-4">
            <div className="text-xs text-brand-text/70">درخواست‌های ذخیره‌شده محلی</div>
            <div className="mt-1 text-xl font-extrabold text-brand-primary">
              {toPersianDigits(cacheStats.cachedRequestsCount)} مورد
            </div>
            {cacheStats.cachedRequestsUpdatedAt && (
              <div className="mt-1 text-[11px] text-brand-text/60">
                آخرین به‌روزرسانی: {formatRelativeTimeFa(cacheStats.cachedRequestsUpdatedAt)}
              </div>
            )}
          </div>

          <div className="rounded-xl bg-brand-bg p-4">
            <div className="text-xs text-brand-text/70">عملیات در انتظار همگام‌سازی</div>
            <div className="mt-1 text-xl font-extrabold text-brand-primary">
              {toPersianDigits(cacheStats.pendingSyncCount)} مورد
            </div>
            <div className="mt-1 text-[11px] text-brand-text/60">
              ارسال خودکار به محض برقراری اتصال
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {isOnline && cacheStats.pendingSyncCount > 0 && (
            <button
              type="button"
              onClick={() => void triggerSync()}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-white hover:bg-brand-green disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
              همگام‌سازی اکنون
            </button>
          )}

          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-brand-text/25 bg-white px-4 py-2 text-xs font-bold text-brand-text hover:bg-brand-bg"
          >
            <Trash2 className="h-3.5 w-3.5" />
            پاک‌سازی حافظه موقت خواندنی
          </button>
        </div>
      </section>

      {/* Account Security Links */}
      <section className="space-y-3 rounded-2xl border border-brand-surface bg-white p-4 sm:p-6">
        <div className="flex items-center gap-2 text-base font-bold text-brand-text">
          <KeyRound className="h-5 w-5 text-brand-primary" />
          <h2>حساب کاربری و امنیت</h2>
        </div>

        {user ? (
          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              to="/profile/edit"
              className="rounded-xl border border-brand-surface bg-brand-bg px-4 py-2.5 text-xs font-bold text-brand-primary hover:border-brand-soft"
            >
              ویرایش اطلاعات پروفایل
            </Link>
            <Link
              to="/auth/reset-password"
              className="rounded-xl border border-brand-surface bg-brand-bg px-4 py-2.5 text-xs font-bold text-brand-primary hover:border-brand-soft"
            >
              تغییر رمز عبور
            </Link>
          </div>
        ) : (
          <p className="text-xs text-brand-text/70">
            برای مدیریت حساب کاربری، ابتدا{' '}
            <Link to="/auth/login" className="font-bold text-brand-primary hover:underline">
              وارد حساب خود شوید
            </Link>
            .
          </p>
        )}
      </section>

      <ConfirmDialog
        open={confirmClear}
        title="پاک‌سازی حافظه آفلاین"
        description="اطلاعات کش‌شده برای مشاهده آفلاین حذف می‌شوند (موارد در انتظار همگام‌سازی حفظ خواهند شد). ادامه می‌دهید؟"
        confirmLabel="پاک‌سازی"
        tone="danger"
        onConfirm={handleClearCache}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
}
