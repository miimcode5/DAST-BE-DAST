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
        <h1 className="text-xl font-extrabold text-[#174D35]">تنظیمات و وضعیت برنامه</h1>
        <p className="mt-1 text-sm text-[#505E50]">
          مدیریت نصب اپلیکیشن (PWA)، حافظه آفلاین و امنیت حساب کاربری
        </p>
      </div>

      {/* PWA Install Card */}
      <section className="rounded-3xl border border-[#DCEBDD] bg-white p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Smartphone className="h-5 w-5 text-[#174D35]" />
            <h2 className="text-base font-bold text-[#202820]">نصب روی دستگاه (PWA)</h2>
          </div>
          {isInstalled ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900">
              <CheckCircle2 className="h-3.5 w-3.5" />
              در حالت اپلیکیشن نصب‌شده
            </span>
          ) : (
            <span className="rounded-full bg-[#F6F7F2] px-3 py-1 text-xs font-semibold text-[#556455]">
              اجرا در مرورگر
            </span>
          )}
        </div>

        <p className="text-xs leading-6 text-[#505E50] sm:text-sm">
          دست‌به‌دست به‌عنوان یک وب‌اپلیکیشن پیش‌رونده (PWA) طراحی شده است تا در گوشی‌های اندروید مانند یک اپلیکیشن مستقل اجرا شود و صفحات اصلی در نبود اینترنت نیز در دسترس باشند.
        </p>

        {!isInstalled && (
          <button
            type="button"
            onClick={() => void handleInstall()}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#174D35] px-5 py-3 text-xs font-bold text-white hover:bg-[#26734B]"
          >
            <Download className="h-4 w-4" />
            {canInstallPrompt ? 'نصب دست‌به‌دست روی دستگاه' : 'راهنمای نصب از مرورگر'}
          </button>
        )}
      </section>

      {/* Network & Offline Storage Card */}
      <section className="rounded-3xl border border-[#DCEBDD] bg-white p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Database className="h-5 w-5 text-[#174D35]" />
            <h2 className="text-base font-bold text-[#202820]">وضعیت شبکه و حافظه آفلاین (IndexedDB)</h2>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
              isOnline ? 'bg-[#DCEBDD] text-[#174D35]' : 'bg-amber-100 text-amber-900'
            }`}
          >
            {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {isOnline ? 'متصل به اینترنت' : 'آفلاین'}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-[#F6F7F2] p-4">
            <div className="text-xs text-[#556455]">درخواست‌های ذخیره‌شده محلی</div>
            <div className="mt-1 text-xl font-extrabold text-[#174D35]">
              {toPersianDigits(cacheStats.cachedRequestsCount)} مورد
            </div>
            {cacheStats.cachedRequestsUpdatedAt && (
              <div className="mt-1 text-[11px] text-[#667466]">
                آخرین به‌روزرسانی: {formatRelativeTimeFa(cacheStats.cachedRequestsUpdatedAt)}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-[#F6F7F2] p-4">
            <div className="text-xs text-[#556455]">عملیات در انتظار همگام‌سازی</div>
            <div className="mt-1 text-xl font-extrabold text-[#174D35]">
              {toPersianDigits(cacheStats.pendingSyncCount)} مورد
            </div>
            <div className="mt-1 text-[11px] text-[#667466]">
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
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#174D35] px-4 py-2 text-xs font-bold text-white hover:bg-[#26734B] disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
              همگام‌سازی اکنون
            </button>
          )}

          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
            پاک‌سازی حافظه موقت خواندنی
          </button>
        </div>
      </section>

      {/* Account Security Links */}
      <section className="rounded-3xl border border-[#DCEBDD] bg-white p-6 space-y-3">
        <div className="flex items-center gap-2 text-base font-bold text-[#202820]">
          <KeyRound className="h-5 w-5 text-[#174D35]" />
          <h2>حساب کاربری و امنیت</h2>
        </div>

        {user ? (
          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              to="/profile/edit"
              className="rounded-xl border border-[#DCEBDD] bg-[#F6F7F2] px-4 py-2.5 text-xs font-bold text-[#174D35] hover:border-[#78B98A]"
            >
              ویرایش اطلاعات پروفایل
            </Link>
            <Link
              to="/auth/reset-password"
              className="rounded-xl border border-[#DCEBDD] bg-[#F6F7F2] px-4 py-2.5 text-xs font-bold text-[#174D35] hover:border-[#78B98A]"
            >
              تغییر رمز عبور
            </Link>
          </div>
        ) : (
          <p className="text-xs text-[#556455]">
            برای مدیریت حساب کاربری، ابتدا{' '}
            <Link to="/auth/login" className="font-bold text-[#174D35] hover:underline">
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
