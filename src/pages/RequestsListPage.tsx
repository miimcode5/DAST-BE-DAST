import { useEffect, useMemo, useState } from 'react';
import { Filter, Plus, RotateCcw, Search, Sparkles } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { CardSkeleton } from '../components/LoadingState';
import { RequestCard } from '../components/RequestCard';
import { HELP_CATEGORIES, HELP_TYPES } from '../constants/categories';
import { SOUTH_KHORASAN_CITIES } from '../constants/locations';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { formatRelativeTimeFa, toPersianDigits } from '../lib/formatters';
import { scoreRequestForVolunteer } from '../lib/smartAssistant';
import { listPublicRequests } from '../services/requestsService';
import { getSavedRequestIds, toggleSavedRequest } from '../services/savedService';
import type { HelpCategory, HelpRequestFeedItem, HelpType, RequestStatus } from '../types/database';

export function RequestsListPage() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [category, setCategory] = useState<HelpCategory | 'all'>(
    (searchParams.get('category') as HelpCategory | null) ?? 'all'
  );
  const [helpType, setHelpType] = useState<HelpType | 'all'>(
    (searchParams.get('type') as HelpType | null) ?? 'all'
  );
  const [city, setCity] = useState(searchParams.get('city') ?? 'all');
  const [status, setStatus] = useState<RequestStatus | 'active' | 'all'>(
    (searchParams.get('status') as RequestStatus | 'active' | 'all' | null) ?? 'active'
  );
  const [sort, setSort] = useState<'newest' | 'oldest' | 'in_progress_first'>(
    (searchParams.get('sort') as 'newest' | 'oldest' | 'in_progress_first' | null) ?? 'newest'
  );
  const [onlyMatched, setOnlyMatched] = useState(false);

  const [items, setItems] = useState<HelpRequestFeedItem[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [fromOfflineCache, setFromOfflineCache] = useState(false);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (debouncedSearch.trim()) next.set('q', debouncedSearch.trim());
    if (category !== 'all') next.set('category', category);
    if (helpType !== 'all') next.set('type', helpType);
    if (city !== 'all') next.set('city', city);
    if (status !== 'active') next.set('status', status);
    if (sort !== 'newest') next.set('sort', sort);
    setSearchParams(next, { replace: true });
  }, [debouncedSearch, category, helpType, city, status, sort, setSearchParams]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const [res, saved] = await Promise.all([
          listPublicRequests({
            search: debouncedSearch,
            category,
            helpType,
            city,
            status,
            sort,
          }),
          user ? getSavedRequestIds(user.id).catch(() => []) : Promise.resolve([]),
        ]);
        if (!active) return;
        setItems(res.items);
        setFromOfflineCache(res.fromOfflineCache);
        setCachedAt(res.cachedAt);
        setSavedIds(new Set(saved));
      } catch (err) {
        if (!active) return;
        setErrorMsg(err instanceof Error ? err.message : 'خطا در دریافت درخواست‌ها');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [debouncedSearch, category, helpType, city, status, sort, user]);

  const availableCities = useMemo(() => {
    const set = new Set<string>(SOUTH_KHORASAN_CITIES);
    items.forEach((item) => {
      if (item.city) set.add(item.city);
    });
    return Array.from(set);
  }, [items]);

  const displayedItems = useMemo(() => {
    const withMatches = items.map((req) => ({
      req,
      match: scoreRequestForVolunteer(req, profile),
    }));
    if (!onlyMatched) return withMatches;
    return withMatches
      .filter((entry) => entry.match.score > 0)
      .sort((a, b) => b.match.score - a.match.score);
  }, [items, profile, onlyMatched]);

  const resetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setCategory('all');
    setHelpType('all');
    setCity('all');
    setStatus('active');
    setSort('newest');
    setOnlyMatched(false);
  };

  const handleToggleSave = async (requestId: string) => {
    if (!user) {
      showToast('برای ذخیره درخواست ابتدا وارد حساب کاربری شوید.', 'info');
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
    <div className="space-y-5 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-[#174D35]">درخواست‌های کمک مردمی</h1>
          <p className="mt-1 text-sm text-[#505E50]">
            جست‌وجو و فیلتر بر اساس دسته‌بندی، شهر، وضعیت و نوع همیاری
          </p>
        </div>
        <Link
          to="/requests/new"
          className="inline-flex items-center gap-1.5 rounded-2xl bg-[#174D35] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#26734B] sm:text-sm"
        >
          <Plus className="h-4 w-4" />
          ثبت درخواست جدید
        </Link>
      </div>

      {/* Search & Filter Panel */}
      <section className="space-y-4 rounded-3xl border border-[#DCEBDD] bg-white p-4 shadow-xs sm:p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute right-3.5 top-3.5 h-4 w-4 text-[#5A695A]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جست‌وجو در عنوان، توضیحات یا نام محله (مثلاً: تدریس ریاضی، کولر، بیرجند)..."
            className="w-full rounded-2xl border border-[#DCEBDD] bg-[#F6F7F2]/70 py-3 pr-10 pl-4 text-sm outline-none transition focus:border-[#26734B] focus:bg-white"
          />
        </div>

        {/* Category horizontal pills */}
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setCategory('all')}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
              category === 'all'
                ? 'border-[#174D35] bg-[#174D35] text-white'
                : 'border-[#DCEBDD] bg-[#F6F7F2] text-[#202820] hover:border-[#78B98A]'
            }`}
          >
            همه دسته‌ها
          </button>
          {HELP_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
                category === cat.id
                  ? 'border-[#174D35] bg-[#174D35] text-white'
                  : 'border-[#DCEBDD] bg-[#F6F7F2] text-[#202820] hover:border-[#78B98A]'
              }`}
            >
              {cat.shortLabel}
            </button>
          ))}
        </div>

        {/* Select Filters */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <div>
            <label htmlFor="filter-city" className="mb-1 block text-[11px] font-semibold text-[#556455]">
              شهر
            </label>
            <select
              id="filter-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-xl border border-[#DCEBDD] bg-[#F6F7F2]/60 px-3 py-2 text-xs font-medium outline-none focus:border-[#26734B] focus:bg-white"
            >
              <option value="all">همه شهرها</option>
              {availableCities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-type" className="mb-1 block text-[11px] font-semibold text-[#556455]">
              نوع کمک
            </label>
            <select
              id="filter-type"
              value={helpType}
              onChange={(e) => setHelpType(e.target.value as HelpType | 'all')}
              className="w-full rounded-xl border border-[#DCEBDD] bg-[#F6F7F2]/60 px-3 py-2 text-xs font-medium outline-none focus:border-[#26734B] focus:bg-white"
            >
              <option value="all">همه انواع</option>
              {HELP_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-status" className="mb-1 block text-[11px] font-semibold text-[#556455]">
              وضعیت
            </label>
            <select
              id="filter-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as RequestStatus | 'active' | 'all')}
              className="w-full rounded-xl border border-[#DCEBDD] bg-[#F6F7F2]/60 px-3 py-2 text-xs font-medium outline-none focus:border-[#26734B] focus:bg-white"
            >
              <option value="active">فعال (باز و در حال انجام)</option>
              <option value="open">فقط باز</option>
              <option value="in_progress">در حال انجام</option>
              <option value="completed">تکمیل‌شده</option>
              <option value="all">همه (به‌جز لغوشده)</option>
            </select>
          </div>

          <div>
            <label htmlFor="filter-sort" className="mb-1 block text-[11px] font-semibold text-[#556455]">
              مرتب‌سازی
            </label>
            <select
              id="filter-sort"
              value={sort}
              onChange={(e) =>
                setSort(e.target.value as 'newest' | 'oldest' | 'in_progress_first')
              }
              className="w-full rounded-xl border border-[#DCEBDD] bg-[#F6F7F2]/60 px-3 py-2 text-xs font-medium outline-none focus:border-[#26734B] focus:bg-white"
            >
              <option value="newest">جدیدترین</option>
              <option value="oldest">قدیمی‌ترین</option>
              <option value="in_progress_first">در حال انجام اول</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#F6F7F2] pt-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1 font-semibold text-[#465346]">
              <Filter className="h-3.5 w-3.5 text-[#26734B]" />
              {toPersianDigits(displayedItems.length)} درخواست یافت شد
            </span>

            {profile && (
              <button
                type="button"
                onClick={() => setOnlyMatched((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-semibold transition ${
                  onlyMatched
                    ? 'border-[#E9B949] bg-[#E9B949]/20 text-[#7A5807]'
                    : 'border-[#DCEBDD] bg-[#F6F7F2] text-[#202820] hover:border-[#78B98A]'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-[#E9B949]" />
                پیشنهادهای متناسب با شهر و مهارت من
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1 font-semibold text-[#26734B] hover:text-[#174D35]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            پاک‌کردن فیلترها
          </button>
        </div>
      </section>

      {fromOfflineCache && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-900">
          درخواست‌ها از حافظه آفلاین مرورگر نمایش داده می‌شوند
          {cachedAt ? ` (آخرین همگام‌سازی: ${formatRelativeTimeFa(cachedAt)})` : ''}.
        </div>
      )}

      {loading ? (
        <CardSkeleton count={6} />
      ) : errorMsg ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-800">
          {errorMsg}
        </div>
      ) : displayedItems.length === 0 ? (
        <EmptyState
          title="درخواستی با این فیلترها پیدا نشد"
          description="فیلترهای جست‌وجو را تغییر دهید یا اگر خودتان نیازی دارید، درخواست جدیدی ثبت کنید."
          action={
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-2xl bg-[#174D35] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#26734B]"
            >
              نمایش همه درخواست‌ها
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayedItems.map(({ req, match }) => (
            <RequestCard
              key={req.id}
              request={req}
              isOwn={user?.id === req.user_id}
              isSaved={savedIds.has(req.id)}
              onToggleSave={handleToggleSave}
              matchReasons={match.reasons}
            />
          ))}
        </div>
      )}
    </div>
  );
}
