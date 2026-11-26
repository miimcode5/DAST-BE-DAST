import { useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  Bell,
  BookOpen,
  Bookmark,
  ClipboardList,
  Download,
  HandHelping,
  Home,
  Info,
  LogIn,
  Menu,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  User,
  WifiOff,
  X,
} from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { useNotifications } from '../contexts/NotificationsContext';
import { usePwa } from '../contexts/PwaContext';
import { useContentProtection } from '../hooks/useContentProtection';
import { toPersianDigits } from '../lib/formatters';
import { isSupabaseConfigured } from '../lib/supabase';
import { BrandLogo } from './BrandLogo';
import { ProtectedImage } from './ProtectedImage';

export function Layout() {
  const { user, profile } = useAuth();
  const { unreadCount } = useChat();
  const { unreadNotificationsCount } = useNotifications();
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
  const [showScrollTop, setShowScrollTop] = useState(false);
  const protectedRootRef = useRef<HTMLDivElement | null>(null);

  useContentProtection(protectedRootRef);

  // Close mobile drawer automatically on route changes or Android hardware back
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleNativeBack = () => setMobileMenuOpen(false);
    window.addEventListener('dast:native-back', handleNativeBack);
    return () => window.removeEventListener('dast:native-back', handleNativeBack);
  }, [mobileMenuOpen]);

  const isChatRoomRoute = /^\/messages\/[^/]+$/.test(location.pathname);
  const isCreateRequestRoute = location.pathname === '/requests/new';

  useEffect(() => {
    if (isChatRoomRoute) {
      setShowScrollTop(false);
      return;
    }
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 380);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isChatRoomRoute]);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[13px] font-semibold transition-colors lg:px-3 lg:text-sm ${
      isActive
        ? 'bg-brand-surface text-brand-primary'
        : 'text-brand-text/80 hover:bg-brand-surface/50 hover:text-brand-primary'
    }`;

  const mobileNavClass = ({ isActive }: { isActive: boolean }) =>
    `relative flex min-h-[48px] flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-semibold transition-colors ${
      isActive ? 'text-brand-primary' : 'text-brand-text/70'
    }`;

  return (
    <div
      ref={protectedRootRef}
      className={`content-protected flex flex-col bg-brand-bg text-brand-text ${
        isChatRoomRoute ? 'h-dvh overflow-hidden md:h-auto md:min-h-dvh md:overflow-visible' : 'min-h-dvh'
      }`}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:right-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-brand-primary focus:px-4 focus:py-2 focus:text-xs focus:font-bold focus:text-white focus:shadow-md"
      >
        پرش به محتوای اصلی
      </a>
      {!isSupabaseConfigured && (
        <div className="border-b border-brand-surface bg-brand-surface px-4 py-2 text-center text-xs font-semibold text-brand-primary">
          پیکربندی اتصال Supabase تکمیل نشده است (متغیرهای VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY را تنظیم کنید).
        </div>
      )}

      {(!isOnline || pendingSyncCount > 0) && (
        <div
          className={`border-b px-3.5 py-2 text-xs font-medium sm:px-6 ${
            !isOnline
              ? 'border-brand-surface bg-white text-brand-text'
              : 'border-brand-soft/40 bg-brand-surface/70 text-brand-primary'
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
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-primary px-3 py-1 text-xs font-bold text-white hover:bg-brand-green disabled:opacity-60"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'در حال همگام‌سازی...' : 'همگام‌سازی اکنون'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Top Navigation */}
      <header className="sticky top-0 z-30 border-b border-brand-surface bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur-md">
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
                خانه
              </NavLink>
              <NavLink to="/requests" className={navLinkClass}>
                <Search className="h-4 w-4" />
                درخواست‌ها
              </NavLink>
              <NavLink to="/messages" className={navLinkClass}>
                <MessageCircle className="h-4 w-4" />
                <span>پیام‌ها</span>
                {unreadCount > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-primary px-1.5 text-[10px] font-extrabold text-white">
                    {toPersianDigits(unreadCount > 99 ? '99+' : unreadCount)}
                  </span>
                )}
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

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {canInstallPrompt && !isInstalled && (
              <button
                type="button"
                onClick={() => void promptInstall()}
                className="hidden items-center gap-1.5 rounded-xl border border-brand-soft bg-brand-surface/60 px-3 py-2 text-xs font-bold text-brand-primary transition hover:bg-brand-surface sm:inline-flex"
              >
                <Download className="h-3.5 w-3.5" />
                نصب اپلیکیشن
              </button>
            )}

            <Link
              to="/requests/new"
              className="hidden items-center gap-1.5 rounded-xl bg-brand-primary px-3 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-brand-green md:inline-flex lg:px-4 lg:text-sm"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="lg:hidden">ثبت درخواست</span>
              <span className="hidden lg:inline">ثبت درخواست کمک</span>
            </Link>

            {user && (
              <Link
                to="/notifications"
                aria-label="اعلان‌ها"
                className={`relative inline-flex h-10 w-10 items-center justify-center rounded-xl border transition ${
                  location.pathname === '/notifications'
                    ? 'border-brand-primary bg-brand-surface text-brand-primary'
                    : 'border-brand-surface bg-brand-bg text-brand-primary hover:border-brand-soft'
                }`}
              >
                <Bell className="h-4.5 w-4.5" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -left-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-brand-primary px-1 text-[9px] font-extrabold text-white ring-2 ring-white">
                    {toPersianDigits(unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount)}
                  </span>
                )}
              </Link>
            )}

            {user ? (
              <Link
                to="/profile"
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-brand-surface bg-brand-bg px-2.5 py-1.5 text-xs font-semibold text-brand-primary transition hover:border-brand-soft sm:gap-2 sm:px-3 sm:text-sm"
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
                <span className="max-w-[78px] truncate sm:max-w-[110px]">
                  {profile?.display_name ?? 'پروفایل'}
                </span>
              </Link>
            ) : (
              <Link
                to={`/auth/login?next=${encodeURIComponent(location.pathname)}`}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-brand-primary px-3 py-1.5 text-xs font-bold text-brand-primary transition hover:bg-brand-primary hover:text-white sm:px-3.5 sm:py-2 sm:text-sm"
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
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-brand-surface bg-brand-bg text-brand-primary transition hover:bg-brand-surface/60 md:hidden"
            >
              <Menu className="h-5 w-5" />
              {canInstallPrompt && !isInstalled && (
                <span
                  aria-hidden="true"
                  className="absolute left-1.5 top-1.5 h-2 w-2 rounded-full bg-brand-gold ring-2 ring-white"
                />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content — Edge-to-edge full-viewport flex container on mobile inside active chat room */}
      <main
        id="main-content"
        tabIndex={-1}
        className={
          isChatRoomRoute
            ? 'mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-0 py-0 pb-0 outline-none md:block md:px-6 md:py-6 md:pb-8'
            : 'mx-auto w-full max-w-6xl flex-1 px-3.5 py-4 pb-[calc(5.75rem+env(safe-area-inset-bottom))] outline-none sm:px-6 md:py-8 md:pb-12'
        }
      >
        <Outlet />
      </main>

      {/* Comfort Scroll-To-Top Floating Action */}
      {showScrollTop && !isChatRoomRoute && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="بازگشت به بالای صفحه"
          title="بازگشت به بالای صفحه"
          className="fixed left-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 inline-flex h-10 w-10 items-center justify-center rounded-full border border-brand-surface bg-white/95 text-brand-primary shadow-md backdrop-blur-xs transition hover:-translate-y-0.5 hover:border-brand-soft hover:bg-brand-surface md:bottom-6 md:left-6"
        >
          <ArrowUp className="h-4.5 w-4.5" />
        </button>
      )}

      {/* Desktop Footer */}
      <footer className="hidden border-t border-brand-surface bg-white/75 py-6 text-xs text-brand-text/70 md:block">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-2">
            <HandHelping className="h-4 w-4 text-brand-primary" />
            <span className="font-semibold text-brand-primary">دست‌به‌دست</span>
            <span>— توان ما، کنار هم معنا پیدا می‌کند.</span>
          </div>
          <div className="flex items-center gap-5">
            <Link to="/welcome" className="hover:text-brand-primary">
              معرفی پلتفرم
            </Link>
            <Link to="/messages" className="hover:text-brand-primary">
              پیام‌ها
            </Link>
            {user && (
              <Link to="/notifications" className="hover:text-brand-primary">
                اعلان‌ها
              </Link>
            )}
            <Link to="/kindness-chain" className="hover:text-brand-primary">
              زنجیره مهربانی
            </Link>
            <Link to="/about" className="hover:text-brand-primary">
              راهنما و حریم خصوصی
            </Link>
            <Link to="/settings" className="hover:text-brand-primary">
              تنظیمات و PWA
            </Link>
          </div>
        </div>
      </footer>

      {/* Mobile Fixed Bottom Navigation (Hidden inside /messages/:id chat room so keyboard & composer stay clean) */}
      {!isChatRoomRoute && (
        <nav
          aria-label="ناوبری موبایل"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-surface bg-white/95 px-2 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-4px_16px_rgba(23,77,53,0.06)] backdrop-blur-md md:hidden"
        >
          <div className="mx-auto grid max-w-md grid-cols-5 items-end">
            <NavLink to="/" end className={mobileNavClass}>
              {({ isActive }) => (
                <>
                  <span
                    className={`flex h-7 w-11 items-center justify-center rounded-full transition-colors ${
                      isActive ? 'bg-brand-surface text-brand-primary' : ''
                    }`}
                  >
                    <Home className="h-5 w-5" />
                  </span>
                  <span>خانه</span>
                </>
              )}
            </NavLink>

            <NavLink to="/requests" className={mobileNavClass}>
              {({ isActive }) => (
                <>
                  <span
                    className={`flex h-7 w-11 items-center justify-center rounded-full transition-colors ${
                      isActive ? 'bg-brand-surface text-brand-primary' : ''
                    }`}
                  >
                    <Search className="h-5 w-5" />
                  </span>
                  <span>درخواست‌ها</span>
                </>
              )}
            </NavLink>

            <Link
              to="/requests/new"
              className="-mt-4 flex flex-col items-center justify-center"
              aria-label="ثبت درخواست کمک"
            >
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-2xl border-4 border-brand-bg text-white shadow-sm transition active:scale-95 ${
                  isCreateRequestRoute
                    ? 'bg-brand-green ring-2 ring-brand-soft'
                    : 'bg-brand-primary ring-1 ring-brand-surface'
                }`}
              >
                <Plus className="h-5 w-5" />
              </span>
              <span className="mt-0.5 text-[11px] font-bold text-brand-primary">ثبت کمک</span>
            </Link>

            <NavLink to="/messages" className={mobileNavClass}>
              {({ isActive }) => (
                <>
                  <span
                    className={`relative flex h-7 w-11 items-center justify-center rounded-full transition-colors ${
                      isActive ? 'bg-brand-surface text-brand-primary' : ''
                    }`}
                  >
                    <MessageCircle className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute left-0.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-primary px-1 text-[9px] font-extrabold text-white ring-2 ring-white">
                        {toPersianDigits(unreadCount > 99 ? '99+' : unreadCount)}
                      </span>
                    )}
                  </span>
                  <span>پیام‌ها</span>
                </>
              )}
            </NavLink>

            <NavLink to="/profile" className={mobileNavClass}>
              {({ isActive }) => (
                <>
                  <span
                    className={`flex h-7 w-11 items-center justify-center rounded-full transition-colors ${
                      isActive ? 'bg-brand-surface text-brand-primary' : ''
                    }`}
                  >
                    <User className="h-5 w-5" />
                  </span>
                  <span>پروفایل</span>
                </>
              )}
            </NavLink>
          </div>
        </nav>
      )}

      {/* Mobile Bottom Sheet Menu for Secondary Routes & PWA Install */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/45 backdrop-blur-[2px] md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="منوی دسترسی سریع"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-full rounded-t-2xl border-t border-brand-surface bg-white px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-sm animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-brand-surface" />

            <div className="mb-4 flex items-center justify-between">
              <BrandLogo compact />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="بستن منو"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-bg text-brand-text/70"
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
                className="mb-4 flex w-full items-center justify-between gap-3 rounded-2xl border border-brand-soft bg-brand-surface/60 px-4 py-3 text-right"
              >
                <div className="flex items-center gap-2.5">
                  <Download className="h-5 w-5 shrink-0 text-brand-primary" />
                  <div>
                    <div className="text-xs font-extrabold text-brand-primary">نصب اپلیکیشن دست‌به‌دست</div>
                    <div className="text-[11px] text-brand-text/80">اجرای سریع‌تر و دسترسی آفلاین روی گوشی</div>
                  </div>
                </div>
                <span className="rounded-xl bg-brand-primary px-3 py-1.5 text-[11px] font-bold text-white">
                  نصب
                </span>
              </button>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <Link
                to="/notifications"
                className="flex items-center justify-between gap-2 rounded-2xl border border-brand-surface bg-brand-bg/75 p-3.5 text-xs font-bold text-brand-primary active:scale-[0.98]"
              >
                <span className="flex items-center gap-2.5">
                  <Bell className="h-4 w-4 shrink-0 text-brand-green" />
                  <span>اعلان‌ها</span>
                </span>
                {unreadNotificationsCount > 0 && (
                  <span className="rounded-full bg-brand-primary px-2 py-0.5 text-[10px] font-extrabold text-white">
                    {toPersianDigits(unreadNotificationsCount)}
                  </span>
                )}
              </Link>

              <Link
                to="/my-activities"
                className="flex items-center gap-2.5 rounded-2xl border border-brand-surface bg-brand-bg/75 p-3.5 text-xs font-bold text-brand-primary active:scale-[0.98]"
              >
                <ClipboardList className="h-4 w-4 shrink-0 text-brand-green" />
                <span>فعالیت‌های من</span>
              </Link>

              <Link
                to="/saved"
                className="flex items-center gap-2.5 rounded-2xl border border-brand-surface bg-brand-bg/75 p-3.5 text-xs font-bold text-brand-primary active:scale-[0.98]"
              >
                <Bookmark className="h-4 w-4 shrink-0 text-brand-green" />
                <span>ذخیره‌شده‌ها</span>
              </Link>

              <Link
                to="/kindness-chain"
                className="flex items-center gap-2.5 rounded-2xl border border-brand-surface bg-brand-bg/75 p-3.5 text-xs font-bold text-brand-primary active:scale-[0.98]"
              >
                <Sparkles className="h-4 w-4 shrink-0 text-brand-gold" />
                <span>زنجیره مهربانی</span>
              </Link>

              <Link
                to="/messages"
                className="flex items-center justify-between gap-2 rounded-2xl border border-brand-surface bg-brand-bg/75 p-3.5 text-xs font-bold text-brand-primary active:scale-[0.98]"
              >
                <span className="flex items-center gap-2.5">
                  <MessageCircle className="h-4 w-4 shrink-0 text-brand-green" />
                  <span>پیام‌های خصوصی</span>
                </span>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-brand-primary px-2 py-0.5 text-[10px] font-extrabold text-white">
                    {toPersianDigits(unreadCount)}
                  </span>
                )}
              </Link>

              <Link
                to="/settings"
                className="flex items-center gap-2.5 rounded-2xl border border-brand-surface bg-brand-bg/75 p-3.5 text-xs font-bold text-brand-primary active:scale-[0.98]"
              >
                <Settings className="h-4 w-4 shrink-0 text-brand-green" />
                <span>تنظیمات و PWA</span>
              </Link>

              <Link
                to="/about"
                className="flex items-center gap-2.5 rounded-2xl border border-brand-surface bg-brand-bg/75 p-3.5 text-xs font-bold text-brand-primary active:scale-[0.98]"
              >
                <Info className="h-4 w-4 shrink-0 text-brand-green" />
                <span>راهنما و حریم خصوصی</span>
              </Link>

              <Link
                to="/welcome"
                className="flex items-center gap-2.5 rounded-2xl border border-brand-surface bg-brand-bg/75 p-3.5 text-xs font-bold text-brand-primary active:scale-[0.98]"
              >
                <BookOpen className="h-4 w-4 shrink-0 text-brand-green" />
                <span>معرفی پلتفرم</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
