import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Filter, Plus, RotateCcw, Search, SlidersHorizontal, Sparkles, X } from 'lucide-react';
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

  const hasInitialAdvancedFilters =
    city !== 'all' || helpType !== 'all' || status !== 'active' || sort !== 'newest';
  const [filtersExpanded, setFiltersExpanded] = useState(hasInitialAdvancedFilters);

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

  const activeAdvancedCount =
    (city !== 'all' ? 1 : 0) +
    (helpType !== 'all' ? 1 : 0) +
    (status !== 'active' ? 1 : 0) +
    (sort !== 'newest' ? 1 : 0) +
    (onlyMatched ? 1 : 0);

  const hasAnyFilter =
    Boolean(search.trim()) || category !== 'all' || activeAdvancedCount > 0;

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
    <div className="space-y-4 sm:space-y-5 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-brand-primary sm:text-xl">درخواست‌های کمک مردمی</h1>
          <p className="mt-0.5 text-xs text-brand-text/70 sm:mt-1 sm:text-sm">
            جست‌وجو و فیلتر بر اساس دسته‌بندی، شهر، وضعیت و نوع همیاری
          </p>
        </div>
        <Link
          to="/requests/new"
          className="hidden items-center gap-1.5 rounded-2xl bg-brand-primary px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-green sm:inline-flex sm:text-sm"
        >
          <Plus className="h-4 w-4" />
          ثبت درخواست جدید
        </Link>
      </div>

      {/* Search & Filter Panel */}
      <section className="space-y-3 rounded-2xl border border-brand-surface bg-white p-3.5 sm:space-y-4 sm:p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-text/70" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جست‌وجو در عنوان، توضیحات یا محله..."
            className="min-h-[44px] w-full rounded-2xl border border-brand-surface bg-brand-bg/70 py-2.5 pr-10 pl-10 text-[15px] outline-none transition focus:border-brand-green focus:bg-white sm:text-sm"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setDebouncedSearch('');
              }}
              aria-label="پاک کردن متن جست‌وجو"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-brand-text/70 hover:bg-brand-surface/50 hover:text-brand-primary"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Category horizontal pills */}
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-0.5">
          <button
            type="button"
            onClick={() => setCategory('all')}
            className={`min-h-[36px] shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
              category === 'all'
                ? 'border-brand-primary bg-brand-primary text-white'
                : 'border-brand-surface bg-brand-bg text-brand-text hover:border-brand-soft'
            }`}
          >
            همه دسته‌ها
          </button>
          {HELP_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={`min-h-[36px] shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
                category === cat.id
                  ? 'border-brand-primary bg-brand-primary text-white'
                  : 'border-brand-surface bg-brand-bg text-brand-text hover:border-brand-soft'
              }`}
            >
              {cat.shortLabel}
            </button>
          ))}
        </div>

        {/* Collapsible Select Filters on Mobile, always visible on sm+ */}
        <div className={`${filtersExpanded ? 'grid' : 'hidden sm:grid'} grid-cols-2 gap-2.5 sm:grid-cols-4`}>
          <div>
            <label htmlFor="filter-city" className="mb-1 block text-[11px] font-semibold text-brand-text/70">
              شهر
            </label>
            <select
              id="filter-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="min-h-[42px] w-full rounded-xl border border-brand-surface bg-brand-bg/60 px-3 py-2 text-[13px] font-medium outline-none focus:border-brand-green focus:bg-white sm:text-xs"
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
            <label htmlFor="filter-type" className="mb-1 block text-[11px] font-semibold text-brand-text/70">
              نوع کمک
            </label>
            <select
              id="filter-type"
              value={helpType}
              onChange={(e) => setHelpType(e.target.value as HelpType | 'all')}
              className="min-h-[42px] w-full rounded-xl border border-brand-surface bg-brand-bg/60 px-3 py-2 text-[13px] font-medium outline-none focus:border-brand-green focus:bg-white sm:text-xs"
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
            <label htmlFor="filter-status" className="mb-1 block text-[11px] font-semibold text-brand-text/70">
              وضعیت
            </label>
            <select
              id="filter-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as RequestStatus | 'active' | 'all')}
              className="min-h-[42px] w-full rounded-xl border border-brand-surface bg-brand-bg/60 px-3 py-2 text-[13px] font-medium outline-none focus:border-brand-green focus:bg-white sm:text-xs"
            >
              <option value="active">فعال (باز و در حال انجام)</option>
              <option value="open">فقط باز</option>
              <option value="in_progress">در حال انجام</option>
              <option value="completed">تکمیل‌شده</option>
              <option value="all">همه (به‌جز لغوشده)</option>
            </select>
          </div>

          <div>
            <label htmlFor="filter-sort" className="mb-1 block text-[11px] font-semibold text-brand-text/70">
              مرتب‌سازی
            </label>
            <select
              id="filter-sort"
              value={sort}
              onChange={(e) =>
                setSort(e.target.value as 'newest' | 'oldest' | 'in_progress_first')
              }
              className="min-h-[42px] w-full rounded-xl border border-brand-surface bg-brand-bg/60 px-3 py-2 text-[13px] font-medium outline-none focus:border-brand-green focus:bg-white sm:text-xs"
            >
              <option value="newest">جدیدترین</option>
              <option value="oldest">قدیمی‌ترین</option>
              <option value="in_progress_first">در حال انجام اول</option>
            </select>
          </div>
        </div>

        {/* Filter summary & mobile filter drawer toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-brand-bg pt-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="inline-flex items-center gap-1 font-semibold text-brand-text/80">
              <Filter className="h-3.5 w-3.5 text-brand-green" />
              {toPersianDigits(displayedItems.length)} درخواست
            </span>

            <button
              type="button"
              onClick={() => setFiltersExpanded((prev) => !prev)}
              className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-xl border px-3 py-1 font-bold transition sm:hidden ${
                filtersExpanded || activeAdvancedCount > 0
                  ? 'border-brand-primary bg-brand-surface/70 text-brand-primary'
                  : 'border-brand-surface bg-brand-bg text-brand-text'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>فیلتر پیشرفته</span>
              {activeAdvancedCount > 0 && (
                <span className="rounded-full bg-brand-primary px-1.5 py-0.5 text-[10px] text-white">
                  {toPersianDigits(activeAdvancedCount)}
                </span>
              )}
              {filtersExpanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>

            {profile && (
              <button
                type="button"
                onClick={() => setOnlyMatched((prev) => !prev)}
                className={`${
                  filtersExpanded ? 'inline-flex' : 'hidden sm:inline-flex'
                } min-h-[34px] items-center gap-1.5 rounded-xl border px-3 py-1.5 font-semibold transition ${
                  onlyMatched
                    ? 'border-brand-gold/70 bg-brand-gold/15 text-brand-text'
                    : 'border-brand-surface bg-brand-bg text-brand-text hover:border-brand-soft'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-brand-gold" />
                متناسب با شهر و مهارت من
              </button>
            )}
          </div>

          {hasAnyFilter && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex min-h-[34px] items-center gap-1 font-semibold text-brand-green hover:text-brand-primary"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              پاک‌کردن فیلترها
            </button>
          )}
        </div>
      </section>

      {fromOfflineCache && (
        <div className="rounded-xl border border-brand-soft/60 bg-brand-surface/50 px-4 py-2.5 text-xs font-medium text-brand-primary">
          درخواست‌ها از حافظه آفلاین مرورگر نمایش داده می‌شوند
          {cachedAt ? ` (آخرین همگام‌سازی: ${formatRelativeTimeFa(cachedAt)})` : ''}.
        </div>
      )}

      {loading ? (
        <CardSkeleton count={6} />
      ) : errorMsg ? (
        <div className="rounded-2xl border border-brand-text/25 bg-white p-6 text-center text-sm text-brand-text">
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
              className="rounded-2xl bg-brand-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-green"
            >
              نمایش همه درخواست‌ها
            </button>
          }
        />
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
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
