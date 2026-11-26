import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  HandHelping,
  HeartHandshake,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

  const [quickQuery, setQuickQuery] = useState('');
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

  const handleQuickSearch = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = quickQuery.trim();
    navigate(trimmed ? `/requests?q=${encodeURIComponent(trimmed)}` : '/requests');
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-up">
      {/* Hero Section — Clean white-dominant card with official brand greens */}
      <section className="rounded-2xl border border-brand-surface bg-white p-5 sm:p-8">
        <div className="flex flex-col justify-between gap-5 sm:gap-6 lg:flex-row lg:items-center">
          <div className="max-w-2xl space-y-3 sm:space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-surface bg-brand-surface/60 px-3 py-1 text-[11px] font-semibold text-brand-primary sm:text-xs">
                <MapPin className="h-3.5 w-3.5 text-brand-green" />
                خراسان جنوبی · همیاری مردمی
              </div>
              {profile && (
                <span className="rounded-full border border-brand-surface bg-brand-bg px-3 py-1 text-[11px] font-semibold text-brand-green sm:text-xs">
                  سلام، {profile.display_name} عزیز
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <BrandMark className="h-10 w-10 shrink-0 rounded-xl sm:h-12 sm:w-12" />
              <h1 className="text-lg font-extrabold leading-7 text-brand-primary sm:text-3xl sm:leading-10">
                توان ما، کنار هم معنا پیدا می‌کند.
              </h1>
            </div>

            <p className="text-xs leading-6 text-brand-text/80 sm:text-base sm:leading-7">
              گاهی چیزی که برای تو ساده است، می‌تواند مشکل بزرگی را برای دیگری حل کند. در دست‌به‌دست نیازهای واقعی محله را ببینید یا درخواست کمک ثبت کنید.
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-1 sm:flex sm:flex-wrap sm:gap-3">
              <Link
                to="/requests/new"
                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-brand-primary px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-brand-green sm:px-5 sm:py-3 sm:text-sm"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span>ثبت درخواست کمک</span>
              </Link>
              <Link
                to="/requests"
                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-brand-soft/60 bg-brand-surface/50 px-3.5 py-2.5 text-xs font-bold text-brand-primary transition hover:bg-brand-surface sm:px-5 sm:py-3 sm:text-sm"
              >
                <HandHelping className="h-4 w-4 shrink-0 text-brand-green" />
                <span>می‌خواهم کمک کنم</span>
              </Link>
              {user && (
                <Link
                  to="/messages"
                  className="col-span-2 inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-brand-surface bg-brand-bg px-4 py-2.5 text-xs font-bold text-brand-green transition hover:border-brand-soft hover:bg-brand-surface/40 sm:col-span-1 sm:text-sm"
                >
                  گفت‌وگوها و پیام‌ها
                </Link>
              )}
            </div>
          </div>

          {/* Live Community Stats Mini-Grid */}
          <div className="grid shrink-0 grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3 lg:w-72 lg:grid-cols-2">
            <div className="rounded-xl border border-brand-surface bg-brand-bg p-3 sm:p-3.5">
              <div className="flex items-center justify-between text-brand-text/75">
                <span className="text-[11px] font-medium sm:text-xs">درخواست‌های فعال</span>
                <HandHelping className="h-3.5 w-3.5 text-brand-soft sm:h-4 sm:w-4" />
              </div>
              <div className="mt-1 text-lg font-extrabold text-brand-primary sm:mt-1.5 sm:text-2xl">
                {stats ? toPersianDigits(stats.active_requests) : '—'}
              </div>
            </div>

            <div className="rounded-xl border border-brand-surface bg-brand-bg p-3 sm:p-3.5">
              <div className="flex items-center justify-between text-brand-text/75">
                <span className="text-[11px] font-medium sm:text-xs">کمک‌های تکمیل‌شده</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-brand-soft sm:h-4 sm:w-4" />
              </div>
              <div className="mt-1 text-lg font-extrabold text-brand-primary sm:mt-1.5 sm:text-2xl">
                {stats ? toPersianDigits(stats.completed_helps) : '—'}
              </div>
            </div>

            <div className="rounded-xl border border-brand-surface bg-brand-bg p-3 sm:p-3.5">
              <div className="flex items-center justify-between text-brand-text/75">
                <span className="text-[11px] font-medium sm:text-xs">داوطلبان فعال</span>
                <Users className="h-3.5 w-3.5 text-brand-soft sm:h-4 sm:w-4" />
              </div>
              <div className="mt-1 text-lg font-extrabold text-brand-primary sm:mt-1.5 sm:text-2xl">
                {stats ? toPersianDigits(stats.active_volunteers) : '—'}
              </div>
            </div>

            <div className="rounded-xl border border-brand-surface bg-brand-bg p-3 sm:p-3.5">
              <div className="flex items-center justify-between text-brand-text/75">
                <span className="text-[11px] font-medium sm:text-xs">کل ثبت‌شده‌ها</span>
                <HeartHandshake className="h-3.5 w-3.5 text-brand-soft sm:h-4 sm:w-4" />
              </div>
              <div className="mt-1 text-lg font-extrabold text-brand-primary sm:mt-1.5 sm:text-2xl">
                {stats ? toPersianDigits(stats.total_requests) : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Instant Quick Search & Shortcut Chips */}
        <div className="mt-5 border-t border-brand-surface/80 pt-4">
          <form onSubmit={handleQuickSearch} className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-text/60" />
              <input
                type="search"
                value={quickQuery}
                onChange={(e) => setQuickQuery(e.target.value)}
                placeholder="جست‌وجوی سریع نیاز، مهارت یا محله (مثلاً: تدریس، خرید، بیرجند)..."
                className="min-h-[42px] w-full rounded-xl border border-brand-surface bg-brand-bg/75 py-2 pr-10 pl-3 text-[15px] outline-none transition focus:border-brand-green focus:bg-white sm:text-sm"
              />
            </div>
            <button
              type="submit"
              className="inline-flex min-h-[42px] shrink-0 items-center justify-center gap-1.5 rounded-xl bg-brand-surface px-4 py-2 text-xs font-extrabold text-brand-primary transition hover:bg-brand-primary hover:text-white"
            >
              <Search className="h-3.5 w-3.5" />
              <span>جست‌وجو</span>
            </button>
          </form>

          <div className="no-scrollbar mt-2.5 flex items-center gap-2 overflow-x-auto pb-0.5 text-[11px]">
            <span className="shrink-0 font-semibold text-brand-text/65">دسترسی سریع:</span>
            {profile?.city && (
              <Link
                to={`/requests?city=${encodeURIComponent(profile.city)}`}
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-brand-surface bg-brand-bg px-3 py-1 font-bold text-brand-primary transition hover:border-brand-soft hover:bg-brand-surface/50"
              >
                <MapPin className="h-3 w-3 text-brand-green" />
                نیازهای {profile.city}
              </Link>
            )}
            <Link
              to="/requests?category=elderly"
              className="shrink-0 rounded-full border border-brand-surface bg-brand-bg px-3 py-1 font-semibold text-brand-text transition hover:border-brand-soft hover:text-brand-primary"
            >
              کمک به سالمندان
            </Link>
            <Link
              to="/requests?category=education"
              className="shrink-0 rounded-full border border-brand-surface bg-brand-bg px-3 py-1 font-semibold text-brand-text transition hover:border-brand-soft hover:text-brand-primary"
            >
              آموزش و یادگیری
            </Link>
            <Link
              to="/requests?category=repair"
              className="shrink-0 rounded-full border border-brand-surface bg-brand-bg px-3 py-1 font-semibold text-brand-text transition hover:border-brand-soft hover:text-brand-primary"
            >
              فنی و تعمیرات
            </Link>
          </div>
        </div>
      </section>

      {/* Compact 3-Step Quick Guide */}
      <section className="grid gap-2.5 sm:grid-cols-3 sm:gap-3">
        <div className="flex items-start gap-3 rounded-2xl border border-brand-surface bg-white p-3.5 sm:p-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-surface text-xs font-black text-brand-primary">
            ۱
          </span>
          <div className="min-w-0">
            <h2 className="text-xs font-extrabold text-brand-primary sm:text-sm">نیاز را ثبت یا پیدا کنید</h2>
            <p className="mt-0.5 text-[11px] leading-5 text-brand-text/75">
              بدون شماره تماس عمومی و تنها با ذکر محدوده تقریبی محله.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-brand-surface bg-white p-3.5 sm:p-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-surface text-xs font-black text-brand-primary">
            <MessageCircle className="h-4 w-4 text-brand-green" />
          </span>
          <div className="min-w-0">
            <h2 className="text-xs font-extrabold text-brand-primary sm:text-sm">هماهنگی در گفت‌وگوی خصوصی</h2>
            <p className="mt-0.5 text-[11px] leading-5 text-brand-text/75">
              پس از اعلام آمادگی، هر داوطلب گفت‌وگوی امن و مجزا دارد.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-brand-surface bg-white p-3.5 sm:p-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-surface text-xs font-black text-brand-primary">
            <Sparkles className="h-4 w-4 text-brand-gold" />
          </span>
          <div className="min-w-0">
            <h2 className="text-xs font-extrabold text-brand-primary sm:text-sm">تأیید انجام و زنجیره مهربانی</h2>
            <p className="mt-0.5 text-[11px] leading-5 text-brand-text/75">
              با تأیید درخواست‌کننده، امتیاز و نشان افتخار مشارکت ثبت می‌شود.
            </p>
          </div>
        </div>
      </section>

      {/* Categories Quick Explorer — Horizontal rail on mobile, grid on tablet/desktop */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-brand-primary sm:text-lg">دسته‌بندی همیاری‌ها</h2>
          <Link
            to="/requests"
            className="inline-flex items-center gap-1 text-xs font-bold text-brand-green hover:text-brand-primary"
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
              className="group flex w-[84px] shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-brand-surface bg-white px-2 py-3 text-center transition hover:-translate-y-0.5 hover:border-brand-soft hover:bg-brand-surface/30 hover:shadow-xs sm:w-auto sm:px-2.5 sm:py-3.5"
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl border ${cat.accentBg} ${cat.accentText} ${cat.accentBorder}`}
              >
                <CategoryIcon category={cat.id} className="h-5 w-5" />
              </span>
              <span className="line-clamp-1 text-[11px] font-bold text-brand-text group-hover:text-brand-primary sm:text-xs">
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
            <h2 className="text-base font-extrabold text-brand-primary sm:text-lg">
              تازه‌ترین درخواست‌های نیازمند همیاری
            </h2>
            {fromOfflineCache && (
              <p className="mt-0.5 text-xs font-medium text-brand-green">
                نمایش آخرین درخواست‌های ذخیره‌شده در حافظه آفلاین
              </p>
            )}
          </div>
          <Link
            to="/requests"
            className="inline-flex items-center gap-1.5 rounded-xl border border-brand-surface bg-white px-3.5 py-2 text-xs font-bold text-brand-primary hover:border-brand-soft"
          >
            <Search className="h-3.5 w-3.5 text-brand-soft" />
            جست‌وجو و فیلتر پیشرفته
          </Link>
        </div>

        {loading ? (
          <CardSkeleton count={3} />
        ) : loadError ? (
          <div className="rounded-2xl border border-brand-text/20 bg-white p-6 text-center text-sm text-brand-text">
            <p className="mb-3 font-semibold">{loadError}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-white hover:bg-brand-green"
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
                className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-3 text-sm font-bold text-white hover:bg-brand-green"
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

      {/* Kindness Chain Spotlight — Clean white card with subtle mist surface */}
      <section className="rounded-2xl border border-brand-surface bg-white p-5 sm:p-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center sm:gap-5">
          <div className="max-w-xl space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-surface px-3 py-1 text-xs font-bold text-brand-primary">
              <Sparkles className="h-3.5 w-3.5 text-brand-gold" />
              زنجیره مهربانی
            </div>
            <h2 className="text-base font-extrabold text-brand-primary sm:text-lg">
              هر کمک واقعی، جرقه‌ای برای کمک بعدی است
            </h2>
            <p className="text-xs leading-6 text-brand-text/80 sm:text-sm sm:leading-7">
              در زنجیره مهربانی می‌توانید پیوند واقعی کمک‌های تکمیل‌شده و تأییدشده میان اعضای جامعه را ببینید.
              {stats && stats.verified_participations > 0
                ? ` تاکنون ${toPersianDigits(stats.verified_participations)} مشارکت تأییدشده ثبت شده است.`
                : ' با تکمیل اولین همیاری، نخستین حلقه زنجیره ساخته می‌شود.'}
            </p>
          </div>
          <Link
            to="/kindness-chain"
            className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-green sm:w-auto"
          >
            مشاهده زنجیره مهربانی
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
