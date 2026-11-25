import { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  ClipboardList,
  Download,
  HandHelping,
  HeartHandshake,
  Home,
  Info,
  LogIn,
  Menu,
  MessageCircle,
  Plus,
  RefreshCw,
  Settings,
  User,
  WifiOff,
  X,
} from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { usePwa } from '../contexts/PwaContext';
import { useContentProtection } from '../hooks/useContentProtection';
import { toPersianDigits } from '../lib/formatters';
import { isSupabaseConfigured } from '../lib/supabase';
import { BrandLogo } from './BrandLogo';
import { ProtectedImage } from './ProtectedImage';

export function Layout() {
  const { user, profile } = useAuth();
  const { unreadCount } = useChat();
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const protectedRootRef = useRef<HTMLDivElement | null>(null);

  useContentProtection(protectedRootRef);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen]);

  const isChatRoomRoute = /^\/messages\/[^/]+$/.test(location.pathname);
  const isMessagesRoute = location.pathname.startsWith('/messages');
  const isCreateRequestRoute = location.pathname === '/requests/new';

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
      isActive
        ? 'bg-[#DCEBDD]/85 font-semibold text-[#174D35]'
        : 'text-[#3A473A] hover:bg-[#DCEBDD]/45 hover:text-[#174D35]'
    }`;

  const mobileNavClass = ({ isActive }: { isActive: boolean }) =>
    `relative flex min-h-[50px] flex-col items-center justify-center gap-0.5 py-1 text-[11px] transition-all duration-200 ${
      isActive ? 'font-semibold text-[#174D35]' : 'font-medium text-[#5A695A]'
    }`;

  return (
    <div
      ref={protectedRootRef}
      className={`content-protected flex flex-col bg-[#F6F7F2] text-[#202820] ${
        isChatRoomRoute ? 'h-dvh overflow-hidden md:h-auto md:min-h-dvh md:overflow-visible' : 'min-h-dvh'
      }`}
    >
      {!isSupabaseConfigured && (
        <div className="bg-amber-100 px-4 py-2 text-center text-xs font-medium text-amber-950">
          پیکربندی اتصال Supabase تکمیل نشده است (متغیرهای VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY را تنظیم کنید).
        </div>
      )}

      {(!isOnline || pendingSyncCount > 0) && (
        <div
          className={`border-b px-3.5 py-2 text-xs font-medium sm:px-6 ${
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
                  حالت آفلاین؛ داده‌های ذخیره‌شده قبلی قابل مشاهده‌اند و ارسال‌های جدید پس از اتصال همگام می‌شوند.
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
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#174D35] px-3 py-1 text-xs font-semibold text-white hover:bg-[#26734B] disabled:opacity-60"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'در حال همگام‌سازی...' : 'همگام‌سازی اکنون'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Top Navigation */}
      <header className="sticky top-0 z-30 border-b border-[#DCEBDD]/90 bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3.5 py-2.5 sm:px-6 sm:py-3">
          <div className="flex min-w-0 items-center gap-5">
            <Link to="/" aria-label="صفحه اصلی دست‌به‌دست" className="shrink-0">
              <span className="sm:hidden">
                <BrandLogo compact />
              </span>
              <span className="hidden sm:inline-flex">
                <BrandLogo />
              </span>
            </Link>

            <nav className="hidden items-center gap-1 md:flex" aria-label="ناوبری اصلی">
              <NavLink to="/" end className={navLinkClass}>
                <Home className="h-4 w-4" />
                <span>خانه</span>
              </NavLink>
              <NavLink to="/requests" className={navLinkClass}>
                <HandHelping className="h-4 w-4" />
                <span>درخواست‌های کمک</span>
              </NavLink>
              <NavLink to="/kindness-chain" className={navLinkClass}>
                <HeartHandshake className="h-4 w-4" />
                <span>زنجیره مهربانی</span>
              </NavLink>
              <NavLink to="/messages" className={navLinkClass}>
                <MessageCircle className="h-4 w-4" />
                <span>پیام‌ها</span>
                {unreadCount > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#174D35] px-1.5 text-[10px] font-bold text-white">
                    {toPersianDigits(unreadCount > 99 ? '99+' : unreadCount)}
                  </span>
                )}
              </NavLink>
              <NavLink to="/my-activities" className={navLinkClass}>
                <ClipboardList className="h-4 w-4" />
                <span>فعالیت‌های من</span>
              </NavLink>
              <NavLink to="/about" className={navLinkClass}>
                <Info className="h-4 w-4" />
                <span>درباره ما</span>
              </NavLink>
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {canInstallPrompt && !isInstalled && (
              <button
                type="button"
                onClick={() => void promptInstall()}
                className="hidden items-center gap-1.5 rounded-xl border border-[#78B98A] bg-[#DCEBDD]/55 px-3 py-2 text-xs font-semibold text-[#174D35] transition hover:bg-[#DCEBDD] lg:inline-flex"
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
              <span>ثبت درخواست</span>
            </Link>

            {/* Clear one-tap Messages shortcut on Mobile Header */}
            {user && (
              <Link
                to="/messages"
                aria-label="پیام‌ها و گفت‌وگوهای خصوصی"
                title="پیام‌ها"
                className={`relative inline-flex h-10 w-10 items-center justify-center rounded-xl border transition md:hidden ${
                  isMessagesRoute
                    ? 'border-[#174D35] bg-[#DCEBDD] text-[#174D35]'
                    : 'border-[#DCEBDD] bg-[#F6F7F2] text-[#174D35] hover:bg-[#DCEBDD]/60'
                }`}
              >
                <MessageCircle className="h-[18px] w-[18px]" />
                {unreadCount > 0 && (
                  <span className="absolute -left-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E9B949] px-1 text-[10px] font-bold text-[#174D35] ring-2 ring-white">
                    {toPersianDigits(unreadCount > 99 ? '99+' : unreadCount)}
                  </span>
                )}
              </Link>
            )}

            {user ? (
              <Link
                to="/profile"
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#DCEBDD] bg-[#F6F7F2] px-2.5 py-1.5 text-xs font-medium text-[#174D35] transition hover:border-[#78B98A] sm:gap-2 sm:px-3 sm:text-sm"
              >
                {profile?.avatar_url ? (
                  <ProtectedImage
                    src={profile.avatar_url}
                    alt={profile.display_name}
                    wrapperClassName="relative block h-6 w-6 shrink-0 overflow-hidden rounded-full"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-4 w-4 shrink-0" />
                )}
                <span className="max-w-[74px] truncate sm:max-w-[110px]">
                  {profile?.display_name ?? 'پروفایل'}
                </span>
              </Link>
            ) : (
              <Link
                to={`/auth/login?next=${encodeURIComponent(location.pathname)}`}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#174D35] px-3 py-1.5 text-xs font-bold text-[#174D35] transition hover:bg-[#174D35] hover:text-white sm:px-3.5 sm:py-2 sm:text-sm"
              >
                <LogIn className="h-4 w-4" />
                <span>ورود</span>
                <span className="hidden sm:inline">/ ثبت‌نام</span>
              </Link>
            )}

            {/* Mobile Quick Menu / Drawer Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="باز کردن منوی دسترسی سریع"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#DCEBDD] bg-[#F6F7F2] text-[#174D35] transition hover:bg-[#DCEBDD]/60 md:hidden"
            >
              <Menu className="h-5 w-5" />
              {canInstallPrompt && !isInstalled && (
                <span
                  aria-hidden="true"
                  className="absolute left-1.5 top-1.5 h-2 w-2 rounded-full bg-[#E9B949] ring-2 ring-white"
                />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        className={
          isChatRoomRoute
            ? 'mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-0 py-0 pb-0 md:block md:px-6 md:py-6 md:pb-8'
            : 'mx-auto w-full max-w-6xl flex-1 px-3.5 py-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:px-6 md:py-8 md:pb-12'
        }
      >
        <Outlet />
      </main>

      {/* Desktop Footer */}
      <footer className="hidden border-t border-[#DCEBDD] bg-white/80 py-6 text-xs text-[#556455] md:block">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-2">
            <HandHelping className="h-4 w-4 text-[#174D35]" />
            <span className="font-semibold text-[#174D35]">دست‌به‌دست</span>
            <span className="font-normal">— توان ما، کنار هم معنا پیدا می‌کند.</span>
          </div>
          <div className="flex items-center gap-5 font-medium">
            <Link to="/welcome" className="hover:text-[#174D35]">
              معرفی پلتفرم
            </Link>
            <Link to="/messages" className="hover:text-[#174D35]">
              پیام‌ها
            </Link>
            <Link to="/kindness-chain" className="hover:text-[#174D35]">
              زنجیره مهربانی
            </Link>
            <Link to="/about" className="hover:text-[#174D35]">
              درباره ما و حریم خصوصی
            </Link>
            <Link to="/settings" className="hover:text-[#174D35]">
              تنظیمات و PWA
            </Link>
          </div>
        </div>
      </footer>

      {/* Mobile Floating Bottom Navigation (5 core tabs: خانه، درخواست‌ها، + ثبت درخواست، زنجیره مهربانی، پروفایل) */}
      {!isChatRoomRoute && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.55rem,env(safe-area-inset-bottom))] md:hidden">
          <nav
            aria-label="ناوبری موبایل"
            className="pointer-events-auto mx-auto grid max-w-md grid-cols-5 items-end rounded-3xl border border-[#DCEBDD] bg-white/95 px-1.5 pb-1 pt-1 shadow-[0_8px_28px_rgba(23,77,53,0.12)] backdrop-blur-md"
          >
            <NavLink to="/" end className={mobileNavClass}>
              {({ isActive }) => (
                <>
                  <span
                    className={`flex h-7 w-10 items-center justify-center rounded-full transition-all duration-200 ${
                      isActive ? 'scale-105 bg-[#DCEBDD] text-[#174D35]' : 'text-[#5A695A]'
                    }`}
                  >
                    <Home className="h-[19px] w-[19px]" />
                  </span>
                  <span>خانه</span>
                </>
              )}
            </NavLink>

            <NavLink to="/requests" className={mobileNavClass}>
              {({ isActive }) => (
                <>
                  <span
                    className={`flex h-7 w-10 items-center justify-center rounded-full transition-all duration-200 ${
                      isActive ? 'scale-105 bg-[#DCEBDD] text-[#174D35]' : 'text-[#5A695A]'
                    }`}
                  >
                    <HandHelping className="h-[19px] w-[19px]" />
                  </span>
                  <span>درخواست‌ها</span>
                </>
              )}
            </NavLink>

            <Link
              to="/requests/new"
              className="-mt-5 flex flex-col items-center justify-center pb-0.5"
              aria-label="ثبت درخواست کمک"
            >
              <span
                className={`flex h-13 w-13 items-center justify-center rounded-2xl border-4 border-[#F6F7F2] text-white shadow-[0_6px_18px_rgba(23,77,53,0.28)] transition-all duration-200 active:scale-95 ${
                  isCreateRequestRoute
                    ? 'bg-[#26734B] ring-2 ring-[#E9B949]'
                    : 'bg-[#174D35] ring-1 ring-[#E9B949]/65'
                }`}
              >
                <Plus className="h-6 w-6" />
              </span>
              <span className="mt-1 text-[10px] font-bold text-[#174D35]">ثبت درخواست</span>
            </Link>

            <NavLink to="/kindness-chain" className={mobileNavClass}>
              {({ isActive }) => (
                <>
                  <span
                    className={`flex h-7 w-10 items-center justify-center rounded-full transition-all duration-200 ${
                      isActive ? 'scale-105 bg-[#DCEBDD] text-[#174D35]' : 'text-[#5A695A]'
                    }`}
                  >
                    <HeartHandshake className="h-[19px] w-[19px]" />
                  </span>
                  <span>زنجیره مهربانی</span>
                </>
              )}
            </NavLink>

            <NavLink to="/profile" className={mobileNavClass}>
              {({ isActive }) => (
                <>
                  <span
                    className={`relative flex h-7 w-10 items-center justify-center rounded-full transition-all duration-200 ${
                      isActive ? 'scale-105 bg-[#DCEBDD] text-[#174D35]' : 'text-[#5A695A]'
                    }`}
                  >
                    <User className="h-[19px] w-[19px]" />
                    {unreadCount > 0 && (
                      <span
                        aria-hidden="true"
                        className="absolute left-1.5 top-0.5 h-2 w-2 rounded-full bg-[#E9B949] ring-2 ring-white"
                      />
                    )}
                  </span>
                  <span>پروفایل</span>
                </>
              )}
            </NavLink>
          </nav>
        </div>
      )}

      {/* Mobile Bottom Sheet Quick Menu */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-[#202820]/45 backdrop-blur-[2px] md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="منوی دسترسی سریع"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-full rounded-t-3xl border-t border-[#DCEBDD] bg-white px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl animate-sheet-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#DCEBDD]" />

            <div className="mb-4 flex items-center justify-between">
              <BrandLogo compact />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="بستن منو"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F6F7F2] text-[#556455]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {canInstallPrompt && !isInstalled && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  void promptInstall();
                }}
                className="mb-4 flex w-full items-center justify-between gap-3 rounded-2xl border border-[#78B98A] bg-[#DCEBDD]/60 px-4 py-3 text-right"
              >
                <div className="flex items-center gap-2.5">
                  <Download className="h-5 w-5 shrink-0 text-[#174D35]" />
                  <div>
                    <div className="text-xs font-bold text-[#174D35]">نصب اپلیکیشن دست‌به‌دست</div>
                    <div className="text-[11px] font-normal text-[#344634]">
                      اجرای سریع‌تر و دسترسی آفلاین روی گوشی
                    </div>
                  </div>
                </div>
                <span className="rounded-xl bg-[#174D35] px-3 py-1.5 text-[11px] font-bold text-white">
                  نصب
                </span>
              </button>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <Link
                to="/messages"
                className="flex items-center justify-between gap-2 rounded-2xl border border-[#DCEBDD] bg-[#F6F7F2]/75 p-3.5 text-xs font-semibold text-[#174D35] active:scale-[0.98]"
              >
                <span className="flex items-center gap-2.5">
                  <MessageCircle className="h-4 w-4 shrink-0 text-[#26734B]" />
                  <span>پیام‌های خصوصی</span>
                </span>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-[#E9B949] px-2 py-0.5 text-[10px] font-bold text-[#174D35]">
                    {toPersianDigits(unreadCount)}
                  </span>
                )}
              </Link>

              <Link
                to="/my-activities"
                className="flex items-center gap-2.5 rounded-2xl border border-[#DCEBDD] bg-[#F6F7F2]/75 p-3.5 text-xs font-semibold text-[#174D35] active:scale-[0.98]"
              >
                <ClipboardList className="h-4 w-4 shrink-0 text-[#26734B]" />
                <span>فعالیت‌های من</span>
              </Link>

              <Link
                to="/kindness-chain"
                className="flex items-center gap-2.5 rounded-2xl border border-[#DCEBDD] bg-[#F6F7F2]/75 p-3.5 text-xs font-semibold text-[#174D35] active:scale-[0.98]"
              >
                <HeartHandshake className="h-4 w-4 shrink-0 text-[#26734B]" />
                <span>زنجیره مهربانی</span>
              </Link>

              <Link
                to="/settings"
                className="flex items-center gap-2.5 rounded-2xl border border-[#DCEBDD] bg-[#F6F7F2]/75 p-3.5 text-xs font-semibold text-[#174D35] active:scale-[0.98]"
              >
                <Settings className="h-4 w-4 shrink-0 text-[#26734B]" />
                <span>تنظیمات و PWA</span>
              </Link>

              <Link
                to="/about"
                className="flex items-center gap-2.5 rounded-2xl border border-[#DCEBDD] bg-[#F6F7F2]/75 p-3.5 text-xs font-semibold text-[#174D35] active:scale-[0.98]"
              >
                <Info className="h-4 w-4 shrink-0 text-[#26734B]" />
                <span>درباره ما و راهنما</span>
              </Link>

              <Link
                to="/welcome"
                className="flex items-center gap-2.5 rounded-2xl border border-[#DCEBDD] bg-[#F6F7F2]/75 p-3.5 text-xs font-semibold text-[#174D35] active:scale-[0.98]"
              >
                <BookOpen className="h-4 w-4 shrink-0 text-[#26734B]" />
                <span>معرفی پلتفرم</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
