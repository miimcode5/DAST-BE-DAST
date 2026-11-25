import {
  ClipboardList,
  Download,
  HandHelping,
  Home,
  Info,
  LogIn,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  User,
  WifiOff,
} from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePwa } from '../contexts/PwaContext';
import { toPersianDigits } from '../lib/formatters';
import { isSupabaseConfigured } from '../lib/supabase';
import { BrandLogo } from './BrandLogo';

export function Layout() {
  const { user, profile } = useAuth();
  const {
    isOnline,
    isInstalled,
    canInstallPrompt,
    pendingSyncCount,
    syncing,
    promptInstall,
    triggerSync,
  } = usePwa();
  const location = useLocation();

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
      isActive
        ? 'bg-[#DCEBDD] text-[#174D35]'
        : 'text-[#334133] hover:bg-[#DCEBDD]/50 hover:text-[#174D35]'
    }`;

  const mobileNavClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center gap-1 py-1.5 text-[11px] font-semibold transition-colors ${
      isActive ? 'text-[#174D35]' : 'text-[#5A695A]'
    }`;

  return (
    <div className="flex min-h-dvh flex-col bg-[#F6F7F2] text-[#202820]">
      {!isSupabaseConfigured && (
        <div className="bg-amber-100 px-4 py-2 text-center text-xs font-semibold text-amber-950">
          پیکربندی اتصال Supabase تکمیل نشده است (متغیرهای VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY را تنظیم کنید).
        </div>
      )}

      {(!isOnline || pendingSyncCount > 0) && (
        <div
          className={`border-b px-4 py-2 text-xs font-medium ${
            !isOnline
              ? 'border-amber-200 bg-amber-50 text-amber-900'
              : 'border-[#78B98A]/40 bg-[#DCEBDD]/70 text-[#174D35]'
          }`}
        >
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <WifiOff className="h-4 w-4 shrink-0" />
              {!isOnline ? (
                <span>
                  در حالت آفلاین هستید؛ اطلاعات ذخیره‌شده قبلی قابل مشاهده‌اند و عملیات نیازمند اینترنت پس از اتصال انجام می‌شوند.
                </span>
              ) : (
                <span>
                  {toPersianDigits(pendingSyncCount)} مورد در انتظار همگام‌سازی با سرور است.
                </span>
              )}
            </div>
            {isOnline && pendingSyncCount > 0 && (
              <button
                type="button"
                onClick={() => void triggerSync()}
                disabled={syncing}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#174D35] px-3 py-1 text-xs font-bold text-white hover:bg-[#26734B] disabled:opacity-60"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'در حال همگام‌سازی...' : 'همگام‌سازی اکنون'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Desktop / Tablet Top Navigation */}
      <header className="sticky top-0 z-30 border-b border-[#DCEBDD] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6">
            <Link to="/" aria-label="صفحه اصلی دست‌به‌دست">
              <BrandLogo />
            </Link>

            <nav className="hidden items-center gap-1 md:flex" aria-label="ناوبری اصلی">
              <NavLink to="/" end className={navLinkClass}>
                <Home className="h-4 w-4" />
                خانه
              </NavLink>
              <NavLink to="/requests" className={navLinkClass}>
                <Search className="h-4 w-4" />
                درخواست‌ها
              </NavLink>
              <NavLink to="/my-activities" className={navLinkClass}>
                <ClipboardList className="h-4 w-4" />
                فعالیت‌های من
              </NavLink>
              <NavLink to="/kindness-chain" className={navLinkClass}>
                <Sparkles className="h-4 w-4" />
                زنجیره مهربانی
              </NavLink>
              <NavLink to="/about" className={navLinkClass}>
                <Info className="h-4 w-4" />
                درباره ما
              </NavLink>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {canInstallPrompt && !isInstalled && (
              <button
                type="button"
                onClick={() => void promptInstall()}
                className="hidden items-center gap-1.5 rounded-xl border border-[#78B98A] bg-[#DCEBDD]/60 px-3 py-2 text-xs font-bold text-[#174D35] transition hover:bg-[#DCEBDD] sm:inline-flex"
              >
                <Download className="h-3.5 w-3.5" />
                نصب اپلیکیشن
              </button>
            )}

            <Link
              to="/requests/new"
              className="hidden items-center gap-1.5 rounded-xl bg-[#174D35] px-4 py-2 text-sm font-bold text-white shadow-xs transition hover:bg-[#26734B] md:inline-flex"
            >
              <Plus className="h-4 w-4" />
              ثبت درخواست کمک
            </Link>

            {user ? (
              <Link
                to="/profile"
                className="inline-flex items-center gap-2 rounded-xl border border-[#DCEBDD] bg-[#F6F7F2] px-3 py-1.5 text-sm font-semibold text-[#174D35] transition hover:border-[#78B98A]"
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.display_name}
                    className="h-6 w-6 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-4 w-4" />
                )}
                <span className="max-w-[110px] truncate">
                  {profile?.display_name ?? 'پروفایل'}
                </span>
              </Link>
            ) : (
              <Link
                to={`/auth/login?next=${encodeURIComponent(location.pathname)}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#174D35] px-3.5 py-2 text-xs font-bold text-[#174D35] transition hover:bg-[#174D35] hover:text-white sm:text-sm"
              >
                <LogIn className="h-4 w-4" />
                ورود / ثبت‌نام
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 pb-28 sm:px-6 md:py-8 md:pb-12">
        <Outlet />
      </main>

      {/* Desktop Footer */}
      <footer className="hidden border-t border-[#DCEBDD] bg-white/75 py-6 text-xs text-[#556455] md:block">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-2">
            <HandHelping className="h-4 w-4 text-[#174D35]" />
            <span className="font-semibold text-[#174D35]">دست‌به‌دست</span>
            <span>— توان ما، کنار هم معنا پیدا می‌کند.</span>
          </div>
          <div className="flex items-center gap-5">
            <Link to="/welcome" className="hover:text-[#174D35]">
              معرفی پلتفرم
            </Link>
            <Link to="/kindness-chain" className="hover:text-[#174D35]">
              زنجیره مهربانی
            </Link>
            <Link to="/about" className="hover:text-[#174D35]">
              راهنما و حریم خصوصی
            </Link>
            <Link to="/settings" className="hover:text-[#174D35]">
              تنظیمات و PWA
            </Link>
          </div>
        </div>
      </footer>

      {/* Mobile Fixed Bottom Navigation (5 exact items, elevated center CTA) */}
      <nav
        aria-label="ناوبری موبایل"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#DCEBDD] bg-white/95 px-2 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-6px_24px_rgba(23,77,53,0.08)] backdrop-blur-md md:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 items-end">
          <NavLink to="/" end className={mobileNavClass}>
            <Home className="h-5 w-5" />
            <span>خانه</span>
          </NavLink>

          <NavLink to="/requests" className={mobileNavClass}>
            <Search className="h-5 w-5" />
            <span>درخواست‌ها</span>
          </NavLink>

          <Link
            to="/requests/new"
            className="flex flex-col items-center justify-center -mt-5"
            aria-label="ثبت درخواست کمک"
          >
            <span className="flex h-13 w-13 items-center justify-center rounded-2xl border-4 border-[#F6F7F2] bg-[#174D35] text-white shadow-lg ring-1 ring-[#E9B949]/60 transition active:scale-95">
              <Plus className="h-6 w-6" />
            </span>
            <span className="mt-1 text-[11px] font-extrabold text-[#174D35]">ثبت کمک</span>
          </Link>

          <NavLink to="/my-activities" className={mobileNavClass}>
            <ClipboardList className="h-5 w-5" />
            <span>فعالیت‌های من</span>
          </NavLink>

          <NavLink to="/profile" className={mobileNavClass}>
            <User className="h-5 w-5" />
            <span>پروفایل</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
