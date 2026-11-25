import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  HandHelping,
  HeartHandshake,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { BrandMark } from '../components/BrandLogo';
import { EmptyState } from '../components/EmptyState';
import { CardSkeleton } from '../components/LoadingState';
import { RequestCard } from '../components/RequestCard';
import { CategoryIcon } from '../components/StatusBadge';
import { HELP_CATEGORIES } from '../constants/categories';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { toPersianDigits } from '../lib/formatters';
import { scoreRequestForVolunteer } from '../lib/smartAssistant';
import { listPublicRequests } from '../services/requestsService';
import { getSavedRequestIds, toggleSavedRequest } from '../services/savedService';
import { getPlatformStats } from '../services/statsService';
import type { HelpRequestFeedItem, PlatformStats } from '../types/database';

export function HomePage() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();

  const [requests, setRequests] = useState<HelpRequestFeedItem[]>([]);
  const [fromOfflineCache, setFromOfflineCache] = useState(false);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadHome() {
      setLoading(true);
      setLoadError(null);
      try {
        const [reqRes, statsRes, savedList] = await Promise.all([
          listPublicRequests({ status: 'active', sort: 'newest', limit: 6 }),
          getPlatformStats(),
          user ? getSavedRequestIds(user.id).catch(() => []) : Promise.resolve([]),
        ]);

        if (!active) return;
        setRequests(reqRes.items);
        setFromOfflineCache(reqRes.fromOfflineCache);
        setStats(statsRes.stats);
        setSavedIds(new Set(savedList));
      } catch (err) {
        if (!active) return;
        setLoadError(err instanceof Error ? err.message : 'خطا در دریافت اطلاعات صفحه اصلی');
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadHome();
    return () => {
      active = false;
    };
  }, [user]);

  const handleToggleSave = async (requestId: string) => {
    if (!user) {
      showToast('برای ذخیره درخواست‌ها ابتدا وارد حساب کاربری شوید.', 'info');
      return;
    }
    const currentlySaved = savedIds.has(requestId);
    try {
      const nextSaved = await toggleSavedRequest(user.id, requestId, currentlySaved);
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (nextSaved) next.add(requestId);
        else next.delete(requestId);
        return next;
      });
      showToast(nextSaved ? 'درخواست ذخیره شد.' : 'از ذخیره‌شده‌ها حذف شد.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'خطا در ذخیره درخواست', 'error');
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-up">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl border border-[#78B98A]/35 bg-gradient-to-bl from-[#174D35] via-[#1C5B3F] to-[#26734B] p-4 text-white shadow-lg sm:p-8">
        <div className="pointer-events-none absolute -left-16 -top-16 h-60 w-60 rounded-full bg-[#78B98A]/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 right-10 h-48 w-48 rounded-full bg-[#E9B949]/10 blur-2xl" />

        <div className="relative z-10 flex flex-col justify-between gap-4 sm:gap-6 lg:flex-row lg:items-center">
          <div className="max-w-2xl space-y-3 sm:space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold text-[#DCEBDD] sm:text-xs">
                <MapPin className="h-3.5 w-3.5 text-[#E9B949]" />
                خراسان جنوبی · همیاری مردمی
              </div>
              {profile && (
                <span className="rounded-full bg-[#78B98A]/20 px-3 py-1 text-[11px] font-semibold text-white sm:text-xs">
                  سلام، {profile.display_name} عزیز
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <BrandMark className="h-10 w-10 shrink-0 rounded-2xl ring-2 ring-white/20 sm:h-12 sm:w-12" />
              <h1 className="text-lg font-extrabold leading-7 sm:text-3xl sm:leading-10">
                توان ما، کنار هم معنا پیدا می‌کند.
              </h1>
            </div>

            <p className="text-xs leading-6 text-[#DCEBDD] sm:text-base sm:leading-7">
              گاهی چیزی که برای تو ساده است، می‌تواند مشکل بزرگی را برای دیگری حل کند. در دست‌به‌دست نیازهای واقعی محله را ببینید یا درخواست کمک ثبت کنید.
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-1 sm:flex sm:flex-wrap sm:gap-3">
              <Link
                to="/requests/new"
                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl bg-[#E9B949] px-3.5 py-2.5 text-xs font-extrabold text-[#174D35] shadow-md transition hover:bg-[#F4C95D] sm:px-5 sm:py-3 sm:text-sm"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span>ثبت درخواست کمک</span>
              </Link>
              <Link
                to="/requests"
                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl border border-white/30 bg-white/12 px-3.5 py-2.5 text-xs font-bold text-white backdrop-blur-xs transition hover:bg-white/22 sm:px-5 sm:py-3 sm:text-sm"
              >
                <HandHelping className="h-4 w-4 shrink-0" />
                <span>می‌خواهم کمک کنم</span>
              </Link>
              {user && (
                <Link
                  to="/messages"
                  className="col-span-2 inline-flex min-h-[42px] items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-4 py-2.5 text-xs font-bold text-white backdrop-blur-xs transition hover:bg-white/20 sm:col-span-1 sm:text-sm"
                >
                  گفت‌وگوها و پیام‌ها
                </Link>
              )}
            </div>
          </div>

          {/* Live Community Stats Mini-Grid */}
          <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 lg:w-72 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-2.5 backdrop-blur-xs sm:p-3.5">
              <div className="flex items-center justify-between text-[#DCEBDD]">
                <span className="text-[11px] font-medium sm:text-xs">درخواست‌های فعال</span>
                <HandHelping className="h-3.5 w-3.5 text-[#E9B949] sm:h-4 sm:w-4" />
              </div>
              <div className="mt-1 text-lg font-extrabold sm:mt-1.5 sm:text-2xl">
                {stats ? toPersianDigits(stats.active_requests) : '—'}
              </div>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 p-2.5 backdrop-blur-xs sm:p-3.5">
              <div className="flex items-center justify-between text-[#DCEBDD]">
                <span className="text-[11px] font-medium sm:text-xs">کمک‌های تکمیل‌شده</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-[#78B98A] sm:h-4 sm:w-4" />
              </div>
              <div className="mt-1 text-lg font-extrabold sm:mt-1.5 sm:text-2xl">
                {stats ? toPersianDigits(stats.completed_helps) : '—'}
              </div>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 p-2.5 backdrop-blur-xs sm:p-3.5">
              <div className="flex items-center justify-between text-[#DCEBDD]">
                <span className="text-[11px] font-medium sm:text-xs">داوطلبان فعال</span>
                <Users className="h-3.5 w-3.5 text-[#78B98A] sm:h-4 sm:w-4" />
              </div>
              <div className="mt-1 text-lg font-extrabold sm:mt-1.5 sm:text-2xl">
                {stats ? toPersianDigits(stats.active_volunteers) : '—'}
              </div>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 p-2.5 backdrop-blur-xs sm:p-3.5">
              <div className="flex items-center justify-between text-[#DCEBDD]">
                <span className="text-[11px] font-medium sm:text-xs">کل ثبت‌شده‌ها</span>
                <HeartHandshake className="h-3.5 w-3.5 text-[#E9B949] sm:h-4 sm:w-4" />
              </div>
              <div className="mt-1 text-lg font-extrabold sm:mt-1.5 sm:text-2xl">
                {stats ? toPersianDigits(stats.total_requests) : '—'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Quick Explorer — Horizontal rail on mobile, grid on tablet/desktop */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-[#174D35] sm:text-lg">دسته‌بندی همیاری‌ها</h2>
          <Link
            to="/requests"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#26734B] hover:text-[#174D35]"
          >
            همه درخواست‌ها
            <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="no-scrollbar flex gap-2.5 overflow-x-auto pb-1 sm:grid sm:grid-cols-4 sm:overflow-visible sm:pb-0 lg:grid-cols-8">
          {HELP_CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              to={`/requests?category=${cat.id}`}
              className="group flex w-[84px] shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-[#DCEBDD] bg-white px-2 py-3 text-center transition hover:-translate-y-0.5 hover:border-[#78B98A] hover:bg-[#DCEBDD]/30 hover:shadow-xs sm:w-auto sm:px-2.5 sm:py-3.5"
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl border ${cat.accentBg} ${cat.accentText} ${cat.accentBorder}`}
              >
                <CategoryIcon category={cat.id} className="h-5 w-5" />
              </span>
              <span className="line-clamp-1 text-[11px] font-bold text-[#202820] group-hover:text-[#174D35] sm:text-xs">
                {cat.shortLabel}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Latest Active Requests */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-extrabold text-[#174D35] sm:text-lg">
              تازه‌ترین درخواست‌های نیازمند همیاری
            </h2>
            {fromOfflineCache && (
              <p className="mt-0.5 text-xs font-medium text-amber-700">
                نمایش آخرین درخواست‌های ذخیره‌شده در حافظه آفلاین
              </p>
            )}
          </div>
          <Link
            to="/requests"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCEBDD] bg-white px-3.5 py-2 text-xs font-bold text-[#174D35] hover:border-[#78B98A]"
          >
            <Search className="h-3.5 w-3.5" />
            جست‌وجو و فیلتر پیشرفته
          </Link>
        </div>

        {loading ? (
          <CardSkeleton count={3} />
        ) : loadError ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-800">
            <p className="mb-3 font-semibold">{loadError}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-rose-700 px-4 py-2 text-xs font-bold text-white"
            >
              تلاش مجدد
            </button>
          </div>
        ) : requests.length === 0 ? (
          <EmptyState
            title="هنوز درخواست فعالی ثبت نشده است"
            description="هرکس می‌تواند گرهی باز کند. اولین درخواست کمک را ثبت کنید تا داوطلبان و هم‌شهریان آن را ببینند."
            action={
              <Link
                to="/requests/new"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#174D35] px-5 py-3 text-sm font-bold text-white hover:bg-[#26734B]"
              >
                <Plus className="h-4 w-4" />
                ثبت اولین درخواست کمک
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {requests.map((req) => {
              const match = scoreRequestForVolunteer(req, profile);
              return (
                <RequestCard
                  key={req.id}
                  request={req}
                  isOwn={user?.id === req.user_id}
                  isSaved={savedIds.has(req.id)}
                  onToggleSave={handleToggleSave}
                  matchReasons={match.reasons}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* Kindness Chain Spotlight */}
      <section className="relative overflow-hidden rounded-3xl border border-[#78B98A]/50 bg-gradient-to-l from-[#DCEBDD]/70 via-white to-[#DCEBDD]/40 p-4 sm:p-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center sm:gap-5">
          <div className="max-w-xl space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#174D35] px-3 py-1 text-xs font-bold text-white">
              <Sparkles className="h-3.5 w-3.5 text-[#E9B949]" />
              زنجیره مهربانی
            </div>
            <h2 className="text-base font-extrabold text-[#174D35] sm:text-lg">
              هر کمک واقعی، جرقه‌ای برای کمک بعدی است
            </h2>
            <p className="text-xs leading-6 text-[#344634] sm:text-sm sm:leading-7">
              در زنجیره مهربانی می‌توانید پیوند واقعی کمک‌های تکمیل‌شده و تأییدشده میان اعضای جامعه را ببینید.
              {stats && stats.verified_participations > 0
                ? ` تاکنون ${toPersianDigits(stats.verified_participations)} مشارکت تأییدشده ثبت شده است.`
                : ' با تکمیل اولین همیاری، نخستین حلقه زنجیره ساخته می‌شود.'}
            </p>
          </div>
          <Link
            to="/kindness-chain"
            className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#174D35] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#26734B] sm:w-auto"
          >
            مشاهده زنجیره مهربانی
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
