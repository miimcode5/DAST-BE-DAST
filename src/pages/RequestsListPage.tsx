import { useEffect, useMemo, useState } from 'react';
import { Filter, Plus, RotateCcw, Search, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { BottomSheet } from '../components/BottomSheet';
import { EmptyState } from '../components/EmptyState';
import { CardSkeleton } from '../components/LoadingState';
import { RequestCard } from '../components/RequestCard';
import { CategoryIcon } from '../components/StatusBadge';
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

  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  const [items, setItems] = useState<HelpRequestFeedItem[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [fromOfflineCache, setFromOfflineCache] = useState(false);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
    }, 260);
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
    setLoading(true);
    setErrorMsg(null);
    Promise.all([
      listPublicRequests({
        search: debouncedSearch,
        category,
        helpType,
        city,
        status,
        sort,
      }),
      user ? getSavedRequestIds(user.id).catch(() => []) : Promise.resolve([]),
    ])
      .then(([res, saved]) => {
        if (!active) return;
        setItems(res.items);
        setFromOfflineCache(res.fromOfflineCache);
        setCachedAt(res.cachedAt);
        setSavedIds(new Set(saved));
      })
      .catch((err) => {
        if (!active) return;
        setErrorMsg(err instanceof Error ? err.message : 'خطا در دریافت درخواست‌ها');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

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

  const renderFilterControls = (idPrefix: string) => (
    <div className="space-y-4">
      <div>
        <label htmlFor={`${idPrefix}-city`} className="mb-1.5 block text-xs font-semibold text-[#202820]">
          شهر
        </label>
        <select
          id={`${idPrefix}-city`}
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="min-h-[42px] w-full rounded-xl border border-[#DCEBDD] bg-[#F6F7F2]/70 px-3 py-2 text-sm font-normal outline-none focus:border-[#26734B] focus:bg-white"
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
        <label htmlFor={`${idPrefix}-type`} className="mb-1.5 block text-xs font-semibold text-[#202820]">
          نوع کمک
        </label>
        <select
          id={`${idPrefix}-type`}
          value={helpType}
          onChange={(e) => setHelpType(e.target.value as HelpType | 'all')}
          className="min-h-[42px] w-full rounded-xl border border-[#DCEBDD] bg-[#F6F7F2]/70 px-3 py-2 text-sm font-normal outline-none focus:border-[#26734B] focus:bg-white"
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
        <label htmlFor={`${idPrefix}-status`} className="mb-1.5 block text-xs font-semibold text-[#202820]">
          وضعیت درخواست
        </label>
        <select
          id={`${idPrefix}-status`}
          value={status}
          onChange={(e) => setStatus(e.target.value as RequestStatus | 'active' | 'all')}
          className="min-h-[42px] w-full rounded-xl border border-[#DCEBDD] bg-[#F6F7F2]/70 px-3 py-2 text-sm font-normal outline-none focus:border-[#26734B] focus:bg-white"
        >
          <option value="active">فعال (باز و در حال انجام)</option>
          <option value="open">فقط باز</option>
          <option value="in_progress">در حال انجام</option>
          <option value="completed">تکمیل‌شده</option>
          <option value="all">همه (به‌جز لغوشده)</option>
        </select>
      </div>

      <div>
        <label htmlFor={`${idPrefix}-sort`} className="mb-1.5 block text-xs font-semibold text-[#202820]">
          مرتب‌سازی
        </label>
        <select
          id={`${idPrefix}-sort`}
          value={sort}
          onChange={(e) =>
            setSort(e.target.value as 'newest' | 'oldest' | 'in_progress_first')
          }
          className="min-h-[42px] w-full rounded-xl border border-[#DCEBDD] bg-[#F6F7F2]/70 px-3 py-2 text-sm font-normal outline-none focus:border-[#26734B] focus:bg-white"
        >
          <option value="newest">جدیدترین</option>
          <option value="oldest">قدیمی‌ترین</option>
          <option value="in_progress_first">در حال انجام اول</option>
        </select>
      </div>

      {profile && (
        <button
          type="button"
          onClick={() => setOnlyMatched((prev) => !prev)}
          className={`flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
            onlyMatched
              ? 'border-[#E9B949] bg-[#E9B949]/20 text-[#6F4E06]'
              : 'border-[#DCEBDD] bg-[#F6F7F2] text-[#202820] hover:border-[#78B98A]'
          }`}
        >
          <Sparkles className="h-4 w-4 text-[#E9B949]" />
          <span>متناسب با شهر و مهارت من</span>
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-5 animate-fade-up">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[#174D35] sm:text-2xl">درخواست‌های کمک مردمی</h1>
          <p className="mt-0.5 text-xs font-normal text-[#505E50] sm:text-sm">
            همیاری‌های واقعی ثبت‌شده بر اساس دسته‌بندی، محدوده و نوع نیاز
          </p>
        </div>
        <Link
          to="/requests/new"
          className="hidden items-center gap-1.5 rounded-2xl bg-[#174D35] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#26734B] sm:inline-flex"
        >
          <Plus className="h-4 w-4" />
          ثبت درخواست جدید
        </Link>
      </div>

      {/* Search & Category Chips */}
      <section className="space-y-3 rounded-3xl border border-[#DCEBDD] bg-white p-3.5 shadow-[0_1px_4px_rgba(23,77,53,0.03)] sm:p-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5A695A]" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جست‌وجو در عنوان، توضیحات یا محله..."
              className="min-h-[44px] w-full rounded-2xl border border-[#DCEBDD] bg-[#F6F7F2]/70 py-2.5 pr-10 pl-10 text-[15px] font-normal outline-none transition focus:border-[#26734B] focus:bg-white sm:text-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setDebouncedSearch('');
                }}
                aria-label="پاک کردن متن جست‌وجو"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[#5A695A] hover:bg-[#DCEBDD]/50 hover:text-[#174D35]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileSheetOpen(true)}
            className={`inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-2xl border px-3.5 text-xs font-semibold transition lg:hidden ${
              activeAdvancedCount > 0
                ? 'border-[#174D35] bg-[#DCEBDD]/80 text-[#174D35]'
                : 'border-[#DCEBDD] bg-[#F6F7F2] text-[#202820]'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">فیلتر</span>
            {activeAdvancedCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#174D35] px-1 text-[10px] font-bold text-white">
                {toPersianDigits(activeAdvancedCount)}
              </span>
            )}
          </button>
        </div>

        {/* Category horizontal pills */}
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-0.5">
          <button
            type="button"
            onClick={() => setCategory('all')}
            className={`min-h-[36px] shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
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
              className={`inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                category === cat.id
                  ? 'border-[#174D35] bg-[#174D35] text-white'
                  : 'border-[#DCEBDD] bg-[#F6F7F2] text-[#202820] hover:border-[#78B98A]'
              }`}
            >
              <CategoryIcon category={cat.id} className="h-3.5 w-3.5" />
              <span>{cat.shortLabel}</span>
            </button>
          ))}
        </div>

        {/* Summary bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#F6F7F2] pt-2.5 text-xs">
          <span className="inline-flex items-center gap-1.5 font-medium text-[#465346]">
            <Filter className="h-3.5 w-3.5 text-[#26734B]" />
            {toPersianDigits(displayedItems.length)} درخواست پیدا شد
          </span>

          {hasAnyFilter && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex min-h-[32px] items-center gap-1 font-semibold text-[#26734B] hover:text-[#174D35]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              پاک‌کردن فیلترها
            </button>
          )}
        </div>
      </section>

      {fromOfflineCache && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-900">
          درخواست‌ها از حافظه آفلاین مرورگر نمایش داده می‌شوند
          {cachedAt ? ` (آخرین همگام‌سازی: ${formatRelativeTimeFa(cachedAt)})` : ''}.
        </div>
      )}

      {/* Desktop 2-column layout (Sidebar Filters + Cards Grid) */}
      <div className="grid gap-5 lg:grid-cols-[260px_1fr] lg:items-start">
        <aside className="hidden rounded-3xl border border-[#DCEBDD] bg-white p-5 shadow-[0_1px_4px_rgba(23,77,53,0.03)] lg:sticky lg:top-20 lg:block">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#174D35]">فیلترهای پیشرفته</h2>
            {activeAdvancedCount > 0 && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-[11px] font-medium text-[#26734B] hover:underline"
              >
                بازنشانی
              </button>
            )}
          </div>
          {renderFilterControls('desktop')}
        </aside>

        <div>
          {loading ? (
            <CardSkeleton count={6} />
          ) : errorMsg ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-800">
              {errorMsg}
            </div>
          ) : displayedItems.length === 0 ? (
            <EmptyState
              title={
                hasAnyFilter
                  ? 'درخواستی با این فیلترها پیدا نشد'
                  : 'فعلاً در اینجا درخواستی ثبت نشده؛ شاید اولین قدم مهربانی با تو شروع بشه.'
              }
              description={
                hasAnyFilter
                  ? 'فیلترهای جست‌وجو را تغییر دهید یا تمام درخواست‌های فعال را مشاهده کنید.'
                  : 'اولین درخواست کمک را ثبت کنید تا هم‌شهریان و داوطلبان به شما یاری برسانند.'
              }
              action={
                hasAnyFilter ? (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="min-h-[42px] rounded-2xl bg-[#174D35] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#26734B]"
                  >
                    نمایش همه درخواست‌ها
                  </button>
                ) : (
                  <Link
                    to="/requests/new"
                    className="inline-flex min-h-[42px] items-center gap-2 rounded-2xl bg-[#174D35] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#26734B]"
                  >
                    <Plus className="h-4 w-4" />
                    ثبت اولین درخواست
                  </Link>
                )
              }
            />
          ) : (
            <div className="grid gap-3.5 sm:grid-cols-2 sm:gap-4">
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
      </div>

      {/* Mobile Bottom Sheet for Filters */}
      <BottomSheet
        open={mobileSheetOpen}
        onClose={() => setMobileSheetOpen(false)}
        title="فیلتر درخواست‌های کمک"
        subtitle="نتایج بلافاصله بر اساس انتخاب شما به‌روزرسانی می‌شوند."
        footer={
          <div className="flex items-center gap-2.5">
            {activeAdvancedCount > 0 && (
              <button
                type="button"
                onClick={resetFilters}
                className="min-h-[44px] rounded-2xl border border-[#DCEBDD] bg-white px-4 text-xs font-semibold text-[#465346]"
              >
                پاک‌کردن
              </button>
            )}
            <button
              type="button"
              onClick={() => setMobileSheetOpen(false)}
              className="min-h-[44px] flex-1 rounded-2xl bg-[#174D35] px-5 text-sm font-bold text-white hover:bg-[#26734B]"
            >
              نمایش {toPersianDigits(displayedItems.length)} درخواست
            </button>
          </div>
        }
      >
        {renderFilterControls('mobile')}
      </BottomSheet>
    </div>
  );
}
