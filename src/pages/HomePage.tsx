import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  HandHelping,
  HeartHandshake,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { KindnessIllustration } from '../components/KindnessIllustration';
import { CardSkeleton } from '../components/LoadingState';
import { RequestCard } from '../components/RequestCard';
import { CategoryIcon } from '../components/StatusBadge';
import { HELP_CATEGORIES } from '../constants/categories';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { useToast } from '../contexts/ToastContext';
import { toPersianDigits } from '../lib/formatters';
import { scoreRequestForVolunteer } from '../lib/smartAssistant';
import { listPublicRequests } from '../services/requestsService';
import { getSavedRequestIds, toggleSavedRequest } from '../services/savedService';
import { getPlatformStats } from '../services/statsService';
import type { HelpRequestFeedItem, PlatformStats } from '../types/database';

export function HomePage() {
  const { user, profile } = useAuth();
  const { unreadCount } = useChat();
  const { showToast } = useToast();

  const [requests, setRequests] = useState<HelpRequestFeedItem[]>([]);
  const [fromOfflineCache, setFromOfflineCache] = useState(false);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadHome = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [reqRes, statsRes, savedList] = await Promise.all([
        listPublicRequests({ status: 'active', sort: 'newest', limit: 6 }),
        getPlatformStats(),
        user ? getSavedRequestIds(user.id).catch(() => []) : Promise.resolve([]),
      ]);

      setRequests(reqRes.items);
      setFromOfflineCache(reqRes.fromOfflineCache);
      setStats(statsRes.stats);
      setSavedIds(new Set(savedList));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'خطا در دریافت اطلاعات صفحه اصلی');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);

    Promise.all([
      listPublicRequests({ status: 'active', sort: 'newest', limit: 6 }),
      getPlatformStats(),
      user ? getSavedRequestIds(user.id).catch(() => []) : Promise.resolve([]),
    ])
      .then(([reqRes, statsRes, savedList]) => {
        if (!active) return;
        setRequests(reqRes.items);
        setFromOfflineCache(reqRes.fromOfflineCache);
        setStats(statsRes.stats);
        setSavedIds(new Set(savedList));
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(err instanceof Error ? err.message : 'خطا در دریافت اطلاعات صفحه اصلی');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

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

  const greetingName = profile?.display_name?.trim();
  const userLocationLabel = profile?.city
    ? `${profile.city}${profile.neighborhood ? ` · ${profile.neighborhood}` : ''}`
    : 'خراسان جنوبی · همیاری مردمی';

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-up">
      {/* Section 1 & 2: Friendly Greeting + Clear Primary Actions */}
      <section className="rounded-3xl border border-[#DCEBDD] bg-white p-4 shadow-[0_2px_10px_rgba(23,77,53,0.04)] sm:p-7">
        <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr] lg:items-center lg:gap-8">
          <div className="space-y-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#DCEBDD]/70 px-3 py-1 text-xs font-medium text-[#174D35]">
                <MapPin className="h-3.5 w-3.5 text-[#26734B]" />
                {userLocationLabel}
              </span>
              {user && unreadCount > 0 && (
                <Link
                  to="/messages"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#E9B949]/25 px-3 py-1 text-xs font-semibold text-[#6F4E06] transition hover:bg-[#E9B949]/40"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  {toPersianDigits(unreadCount)} پیام خوانده‌نشده
                </Link>
              )}
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium text-[#26734B] sm:text-base">
                {greetingName ? `سلام، ${greetingName} عزیز 🌱` : 'سلام، خوش اومدی 🌱'}
              </p>
              <h1 className="text-xl font-bold leading-8 text-[#174D35] sm:text-2xl sm:leading-10">
                امروز می‌تونی حال یک نفر رو بهتر کنی.
              </h1>
              <p className="max-w-xl text-xs font-normal leading-6 text-[#4D5B4D] sm:text-sm sm:leading-7">
                در دست‌به‌دست نیازهای واقعی هم‌شهریان را ببینید، داوطلبانه گرهی باز کنید یا اگر به کمکی نیاز دارید با آرامش درخواست خود را ثبت کنید.
              </p>
            </div>

            {/* Primary & Secondary CTAs */}
            <div className="flex flex-col gap-2.5 pt-1 sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                to="/requests/new"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-[#174D35] px-5 py-3 text-sm font-bold text-white shadow-xs transition hover:bg-[#26734B] active:scale-[0.99]"
              >
                <Plus className="h-4 w-4 text-[#E9B949]" />
                <span>درخواست کمک دارم</span>
              </Link>

              <Link
                to="/requests"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-[#78B98A]/70 bg-[#DCEBDD]/50 px-5 py-3 text-sm font-semibold text-[#174D35] transition hover:bg-[#DCEBDD] active:scale-[0.99]"
              >
                <HandHelping className="h-4 w-4 text-[#26734B]" />
                <span>می‌خوام کمک کنم</span>
              </Link>
            </div>
          </div>

          {/* Desktop Quick Community Summary Panel */}
          <div className="rounded-2xl border border-[#DCEBDD] bg-[#F6F7F2]/85 p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold text-[#174D35]">نبض همیاری امروز</span>
              <Link
                to="/welcome"
                className="text-[11px] font-medium text-[#26734B] hover:text-[#174D35] hover:underline"
              >
                آشنایی با دست‌به‌دست ←
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl border border-[#DCEBDD]/80 bg-white p-3">
                <div className="text-[11px] font-medium text-[#556455]">درخواست‌های فعال</div>
                <div className="mt-1 text-xl font-extrabold text-[#174D35]">
                  {stats ? toPersianDigits(stats.active_requests) : '—'}
                </div>
              </div>
              <div className="rounded-2xl border border-[#DCEBDD]/80 bg-white p-3">
                <div className="text-[11px] font-medium text-[#556455]">کمک‌های انجام‌شده</div>
                <div className="mt-1 text-xl font-extrabold text-[#26734B]">
                  {stats ? toPersianDigits(stats.completed_helps) : '—'}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 text-xs text-[#465346]">
              <span>توان ما، کنار هم معنا پیدا می‌کند.</span>
              <span className="h-2 w-2 shrink-0 rounded-full bg-[#E9B949]" />
            </div>
          </div>
        </div>
      </section>

      {/* Quick Category Rail */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#174D35] sm:text-base">دسته‌بندی همیاری‌ها</h2>
          <Link
            to="/requests"
            className="inline-flex items-center gap-1 text-xs font-medium text-[#26734B] hover:text-[#174D35]"
          >
            همه درخواست‌ها
            <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-4 sm:gap-2.5 sm:overflow-visible sm:pb-0 lg:grid-cols-8">
          {HELP_CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              to={`/requests?category=${cat.id}`}
              className="group flex w-[84px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl border border-[#DCEBDD] bg-white px-2 py-3 text-center transition hover:-translate-y-0.5 hover:border-[#78B98A] hover:bg-[#DCEBDD]/25 sm:w-auto sm:px-2.5"
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-xl border ${cat.accentBg} ${cat.accentText} ${cat.accentBorder}`}
              >
                <CategoryIcon category={cat.id} className="h-[18px] w-[18px]" />
              </span>
              <span className="line-clamp-1 text-[11px] font-medium text-[#202820] group-hover:text-[#174D35] sm:text-xs">
                {cat.shortLabel}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Section 3: Recent & Nearby Real Help Requests */}
      <section className="space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-[#174D35] sm:text-lg">
              درخواست‌های نزدیک و تازه
            </h2>
            {fromOfflineCache && (
              <p className="mt-0.5 text-xs font-medium text-amber-700">
                نمایش آخرین درخواست‌های ذخیره‌شده در حافظه آفلاین
              </p>
            )}
          </div>
          <Link
            to="/requests"
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#DCEBDD] bg-white px-3.5 py-2 text-xs font-semibold text-[#174D35] transition hover:border-[#78B98A]"
          >
            <Search className="h-3.5 w-3.5 text-[#26734B]" />
            <span>جست‌وجو و فیلتر</span>
          </Link>
        </div>

        {loading ? (
          <CardSkeleton count={3} />
        ) : loadError ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-800">
            <p className="mb-3 font-medium">{loadError}</p>
            <button
              type="button"
              onClick={() => void loadHome()}
              className="min-h-[40px] rounded-xl bg-rose-700 px-4 py-2 text-xs font-bold text-white hover:bg-rose-800"
            >
              تلاش مجدد
            </button>
          </div>
        ) : requests.length === 0 ? (
          <EmptyState
            title="فعلاً در اینجا درخواستی ثبت نشده؛ شاید اولین قدم مهربانی با تو شروع بشه."
            description="نیازهای واقعی محله به‌محض ثبت توسط کاربران اینجا نمایش داده می‌شوند."
            action={
              <Link
                to="/requests/new"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-[#174D35] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#26734B]"
              >
                <Plus className="h-4 w-4" />
                ثبت اولین درخواست کمک
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
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

      {/* Section 4: Real Community Participation Stats */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-[#174D35] sm:text-lg">آمار واقعی مشارکت</h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3.5">
          <div className="rounded-3xl border border-[#DCEBDD] bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#556455]">درخواست‌های ثبت‌شده</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#DCEBDD]/70 text-[#174D35]">
                <ClipboardList className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 text-2xl font-extrabold text-[#174D35]">
              {stats ? toPersianDigits(stats.total_requests) : '—'}
            </div>
          </div>

          <div className="rounded-3xl border border-[#DCEBDD] bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#556455]">کمک‌های انجام‌شده</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#DCEBDD]/70 text-[#26734B]">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 text-2xl font-extrabold text-[#174D35]">
              {stats ? toPersianDigits(stats.completed_helps) : '—'}
            </div>
          </div>

          <div className="rounded-3xl border border-[#DCEBDD] bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#556455]">داوطلبان مشارکت‌کننده</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#DCEBDD]/70 text-[#26734B]">
                <Users className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 text-2xl font-extrabold text-[#174D35]">
              {stats ? toPersianDigits(stats.active_volunteers) : '—'}
            </div>
          </div>

          <div className="rounded-3xl border border-[#DCEBDD] bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#556455]">فعالیت‌های زنجیره</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#E9B949]/20 text-[#6F4E06]">
                <Sparkles className="h-4 w-4 text-[#E9B949]" />
              </span>
            </div>
            <div className="mt-2 text-2xl font-extrabold text-[#174D35]">
              {stats ? toPersianDigits(stats.verified_participations) : '—'}
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Kindness Chain Visual Story */}
      <section className="rounded-3xl border border-[#DCEBDD] bg-white p-4 shadow-[0_2px_10px_rgba(23,77,53,0.04)] sm:p-7">
        <div className="grid items-center gap-5 lg:grid-cols-[1.05fr_1fr] lg:gap-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#DCEBDD]/80 px-3 py-1 text-xs font-semibold text-[#174D35]">
              <HeartHandshake className="h-3.5 w-3.5 text-[#26734B]" />
              <span>زنجیره مهربانی</span>
            </div>
            <h2 className="text-lg font-bold leading-8 text-[#174D35] sm:text-xl">
              وقتی یک کمک، مسیر کمک بعدی را روشن می‌کند
            </h2>
            <p className="text-xs font-normal leading-7 text-[#465346] sm:text-sm">
              در زنجیره مهربانی، تنها همیاری‌های واقعی و تأییدشده ثبت می‌شوند؛ هر وقت کسی دست یاری می‌گیرد و خودش به دیگری کمک می‌کند، یک حلقه تازه به پیوند انسانی شهر اضافه می‌شود.
            </p>
            <div className="pt-1">
              <Link
                to="/kindness-chain"
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-[#174D35] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#26734B] sm:w-auto"
              >
                <span>مشاهده زنجیره مهربانی</span>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <KindnessIllustration
            compact
            verifiedCount={stats?.verified_participations ?? 0}
          />
        </div>
      </section>
    </div>
  );
}
