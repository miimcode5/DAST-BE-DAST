import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bookmark,
  CheckCircle2,
  ClipboardList,
  Clock,
  HandHelping,
  MessageCircle,
  Plus,
  RefreshCw,
  Trash2,
  XCircle,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { RequestCard } from '../components/RequestCard';
import { CategoryBadge, RequestStatusBadge, ResponseStatusBadge } from '../components/StatusBadge';
import { CATEGORY_MAP } from '../constants/categories';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { usePwa } from '../contexts/PwaContext';
import { useToast } from '../contexts/ToastContext';
import { formatRelativeTimeFa, toPersianDigits } from '../lib/formatters';
import {
  getPendingOfflineRequests,
  removePendingOfflineRequest,
  type PendingCreateRequest,
} from '../lib/offlineDb';
import { ensureConversationForResponse, getMyConversations } from '../services/chatService';
import { listMyRequests } from '../services/requestsService';
import { getMyResponses, withdrawVolunteerResponse } from '../services/responsesService';
import { getSavedRequestsFeed, toggleSavedRequest } from '../services/savedService';
import type {
  ConversationItem,
  HelpRequestFeedItem,
  VolunteerResponseWithRequest,
} from '../types/database';

export type ActivityTab =
  | 'requests'
  | 'offers'
  | 'in_progress'
  | 'completed'
  | 'saved'
  | 'cancelled';

export function MyActivitiesPage({ defaultTab = 'requests' }: { defaultTab?: ActivityTab }) {
  const { user } = useAuth();
  const { notifyMessagesChanged } = useChat();
  const { isOnline, triggerSync, refreshPendingCount } = usePwa();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState<ActivityTab>(defaultTab);
  const [myRequests, setMyRequests] = useState<HelpRequestFeedItem[]>([]);
  const [myResponses, setMyResponses] = useState<VolunteerResponseWithRequest[]>([]);
  const [savedRequests, setSavedRequests] = useState<HelpRequestFeedItem[]>([]);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [pendingOffline, setPendingOffline] = useState<PendingCreateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [withdrawTargetId, setWithdrawTargetId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTab(defaultTab);
  }, [defaultTab]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const pending = await getPendingOfflineRequests(user.id);
      setPendingOffline(pending);

      if (!navigator.onLine) {
        setLoading(false);
        return;
      }

      const [reqs, resps, saved, convResult] = await Promise.all([
        listMyRequests(user.id),
        getMyResponses(user.id),
        getSavedRequestsFeed(user.id),
        getMyConversations(user.id).catch(() => ({ items: [] as ConversationItem[] })),
      ]);

      setMyRequests(reqs);
      setMyResponses(resps);
      setSavedRequests(saved);
      setConversations(convResult.items);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'خطا در بارگذاری فعالیت‌ها');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const savedIdsSet = useMemo(() => new Set(savedRequests.map((s) => s.id)), [savedRequests]);

  const convByResponseId = useMemo(() => {
    const map: Record<string, ConversationItem> = {};
    for (const c of conversations) {
      if (c.response_id) map[c.response_id] = c;
    }
    return map;
  }, [conversations]);

  const convsByRequestId = useMemo(() => {
    const map: Record<string, ConversationItem[]> = {};
    for (const c of conversations) {
      if (!map[c.request_id]) map[c.request_id] = [];
      map[c.request_id].push(c);
    }
    return map;
  }, [conversations]);

  const openChatForResponse = async (responseId: string) => {
    const existing = convByResponseId[responseId];
    if (existing) {
      navigate(`/messages/${existing.id}`);
      return;
    }
    try {
      const convId = await ensureConversationForResponse(responseId);
      navigate(`/messages/${convId}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'باز کردن گفت‌وگو ناموفق بود', 'error');
    }
  };

  const activeRequests = useMemo(
    () => myRequests.filter((r) => r.status === 'open' || r.status === 'in_progress'),
    [myRequests]
  );

  const inProgressItems = useMemo(() => {
    const asRequester = myRequests.filter((r) => r.status === 'in_progress');
    const asVolunteer = myResponses.filter(
      (r) => r.status === 'accepted' || r.status === 'in_progress'
    );
    return { asRequester, asVolunteer };
  }, [myRequests, myResponses]);

  const completedItems = useMemo(() => {
    const asRequester = myRequests.filter((r) => r.status === 'completed');
    const asVolunteer = myResponses.filter((r) => r.status === 'completed');
    return { asRequester, asVolunteer };
  }, [myRequests, myResponses]);

  const cancelledItems = useMemo(() => {
    const reqs = myRequests.filter((r) => r.status === 'cancelled');
    const resps = myResponses.filter((r) => r.status === 'cancelled' || r.status === 'rejected');
    return { reqs, resps };
  }, [myRequests, myResponses]);

  const handleToggleSave = async (requestId: string) => {
    if (!user) return;
    const currentlySaved = savedIdsSet.has(requestId);
    try {
      const next = await toggleSavedRequest(user.id, requestId, currentlySaved);
      showToast(next ? 'درخواست ذخیره شد.' : 'از ذخیره‌شده‌ها حذف شد.', 'info');
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'خطا در تغییر وضعیت ذخیره', 'error');
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawTargetId) return;
    setBusy(true);
    try {
      await withdrawVolunteerResponse(withdrawTargetId);
      setWithdrawTargetId(null);
      notifyMessagesChanged();
      showToast('اعلام آمادگی شما لغو شد.', 'info');
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'خطا در لغو اعلام آمادگی', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleRemovePending = async (clientMutationId: string) => {
    await removePendingOfflineRequest(clientMutationId);
    await refreshPendingCount();
    await loadData();
    showToast('مورد صف آفلاین حذف شد.', 'info');
  };

  const handleSyncNow = async () => {
    await triggerSync();
    await loadData();
  };

  const tabs: { id: ActivityTab; label: string; count: number }[] = [
    { id: 'requests', label: 'درخواست‌های من', count: activeRequests.length + pendingOffline.length },
    { id: 'offers', label: 'اعلام آمادگی‌های من', count: myResponses.filter((r) => r.status !== 'cancelled').length },
    {
      id: 'in_progress',
      label: 'در حال انجام',
      count: inProgressItems.asRequester.length + inProgressItems.asVolunteer.length,
    },
    {
      id: 'completed',
      label: 'تکمیل‌شده‌ها',
      count: completedItems.asRequester.length + completedItems.asVolunteer.length,
    },
    { id: 'saved', label: 'ذخیره‌شده‌ها', count: savedRequests.length },
    {
      id: 'cancelled',
      label: 'لغوشده‌ها',
      count: cancelledItems.reqs.length + cancelledItems.resps.length,
    },
  ];

  if (loading) {
    return <LoadingState label="در حال دریافت فعالیت‌های شما..." />;
  }

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-[#174D35]">فعالیت‌های من</h1>
          <p className="mt-1 text-sm text-[#505E50]">
            پیگیری درخواست‌ها، اعلام آمادگی‌های داوطلبانه، کمک‌های در جریان و موارد ذخیره‌شده
          </p>
        </div>
        <Link
          to="/requests/new"
          className="inline-flex items-center gap-1.5 rounded-2xl bg-[#174D35] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#26734B]"
        >
          <Plus className="h-4 w-4" />
          ثبت درخواست جدید
        </Link>
      </div>

      {/* Offline Pending Sync Queue */}
      {pendingOffline.length > 0 && (
        <section className="space-y-3 rounded-3xl border border-[#E9B949] bg-amber-50/75 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-extrabold text-[#7A5807]">
              <Clock className="h-4 w-4" />
              <span>درخواست‌های در انتظار همگام‌سازی ({toPersianDigits(pendingOffline.length)})</span>
            </div>
            {isOnline && (
              <button
                type="button"
                onClick={() => void handleSyncNow()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#174D35] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#26734B]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                ارسال به سرور
              </button>
            )}
          </div>
          <p className="text-xs text-[#6E5314]">
            این موارد هنوز در سرور ثبت نشده‌اند و پس از برقراری ارتباط پایدار ارسال می‌شوند.
          </p>
          <div className="space-y-2">
            {pendingOffline.map((item) => (
              <div
                key={item.clientMutationId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-white p-3.5"
              >
                <div>
                  <div className="text-sm font-bold text-[#202820]">{item.payload.title}</div>
                  <div className="mt-0.5 text-xs text-[#556455]">
                    {CATEGORY_MAP[item.payload.category]?.label} · {item.payload.city} ({item.payload.area})
                  </div>
                  {item.lastError && (
                    <div className="mt-1 text-xs font-medium text-rose-700">{item.lastError}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-900">
                    در انتظار همگام‌سازی
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleRemovePending(item.clientMutationId)}
                    className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"
                    title="حذف از صف آفلاین"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tabs */}
      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-2 text-xs font-bold transition ${
              tab === t.id
                ? 'border-[#174D35] bg-[#174D35] text-white shadow-xs'
                : 'border-[#DCEBDD] bg-white text-[#202820] hover:border-[#78B98A]'
            }`}
          >
            <span>{t.label}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] ${
                tab === t.id ? 'bg-white/20 text-white' : 'bg-[#DCEBDD]/70 text-[#174D35]'
              }`}
            >
              {toPersianDigits(t.count)}
            </span>
          </button>
        ))}
      </div>

      {errorMsg && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {errorMsg}
        </div>
      )}

      {/* Tab Content */}
      {tab === 'requests' && (
        <section className="space-y-4">
          {activeRequests.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="h-7 w-7" />}
              title="درخواست فعالی ثبت نکرده‌اید"
              description="اگر نیاز به کمک یا همراهی دارید، می‌توانید درخواست جدید ثبت کنید تا داوطلبان به شما کمک کنند."
              action={
                <Link
                  to="/requests/new"
                  className="rounded-2xl bg-[#174D35] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#26734B]"
                >
                  ثبت درخواست کمک
                </Link>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeRequests.map((req) => (
                <RequestCard
                  key={req.id}
                  request={req}
                  isOwn
                  isSaved={savedIdsSet.has(req.id)}
                  onToggleSave={handleToggleSave}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'offers' && (
        <section className="space-y-3">
          {myResponses.filter((r) => r.status !== 'cancelled').length === 0 ? (
            <EmptyState
              icon={<HandHelping className="h-7 w-7" />}
              title="هنوز برای درخواستی اعلام آمادگی نکرده‌اید"
              description="درخواست‌های کمک را مرور کنید و با زدن دکمه «من می‌توانم کمک کنم» نخستین همیاری خود را آغاز کنید."
              action={
                <Link
                  to="/requests"
                  className="rounded-2xl bg-[#174D35] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#26734B]"
                >
                  مشاهده درخواست‌ها
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {myResponses
                .filter((r) => r.status !== 'cancelled')
                .map((resp) => (
                  <div
                    key={resp.id}
                    className="flex flex-col justify-between gap-4 rounded-3xl border border-[#DCEBDD] bg-white p-5 sm:flex-row sm:items-center"
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <ResponseStatusBadge status={resp.status} />
                        {resp.request && <CategoryBadge category={resp.request.category} />}
                        <span className="text-xs text-[#667466]">
                          {formatRelativeTimeFa(resp.updated_at)}
                        </span>
                      </div>
                      <Link
                        to={`/requests/${resp.request_id}`}
                        className="block text-base font-bold text-[#174D35] hover:underline"
                      >
                        {resp.request?.title ?? 'مشاهده درخواست'}
                      </Link>
                      {resp.request && (
                        <p className="text-xs text-[#556455]">
                          {resp.request.city}، {resp.request.area} · ثبت‌کننده: {resp.request.requester_name}
                        </p>
                      )}
                      {resp.message && (
                        <p className="rounded-xl bg-[#F6F7F2] px-3 py-2 text-xs text-[#202820]">
                          پیام شما: {resp.message}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void openChatForResponse(resp.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#174D35] px-4 py-2 text-xs font-bold text-white hover:bg-[#26734B]"
                      >
                        <MessageCircle className="h-3.5 w-3.5 text-[#E9B949]" />
                        <span>ادامه گفت‌وگو</span>
                        {(convByResponseId[resp.id]?.unread_count ?? 0) > 0 && (
                          <span className="rounded-full bg-[#E9B949] px-1.5 py-0.5 text-[10px] font-extrabold text-[#174D35]">
                            {toPersianDigits(convByResponseId[resp.id].unread_count)}
                          </span>
                        )}
                      </button>
                      <Link
                        to={`/requests/${resp.request_id}`}
                        className="rounded-xl bg-[#DCEBDD]/80 px-4 py-2 text-xs font-bold text-[#174D35] hover:bg-[#174D35] hover:text-white"
                      >
                        صفحه درخواست
                      </Link>
                      {(resp.status === 'pending' || resp.status === 'accepted') && (
                        <button
                          type="button"
                          onClick={() => setWithdrawTargetId(resp.id)}
                          className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
                        >
                          لغو اعلام آمادگی
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>
      )}

      {tab === 'in_progress' && (
        <section className="space-y-6">
          {inProgressItems.asRequester.length === 0 && inProgressItems.asVolunteer.length === 0 ? (
            <EmptyState
              icon={<Clock className="h-7 w-7" />}
              title="همکاری در حال انجامی ندارید"
              description="پس از پذیرش اعلام آمادگی بین درخواست‌کننده و داوطلب، همکاری‌ها اینجا نمایش داده می‌شوند."
            />
          ) : (
            <>
              {inProgressItems.asRequester.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-extrabold text-[#174D35]">
                    درخواست‌های در جریان شما (به‌عنوان درخواست‌کننده)
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {inProgressItems.asRequester.map((req) => {
                      const reqConvs = convsByRequestId[req.id] ?? [];
                      const activeConv = reqConvs.find((c) => c.status === 'active') ?? reqConvs[0];
                      return (
                        <div key={req.id} className="space-y-2">
                          <RequestCard request={req} isOwn />
                          {activeConv && (
                            <Link
                              to={
                                reqConvs.length === 1
                                  ? `/messages/${activeConv.id}`
                                  : `/requests/${req.id}`
                              }
                              className="flex items-center justify-center gap-1.5 rounded-2xl border border-[#78B98A] bg-[#DCEBDD]/60 px-4 py-2 text-xs font-bold text-[#174D35] hover:bg-[#DCEBDD]"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              <span>
                                {reqConvs.length === 1 ? 'ادامه گفت‌وگو با داوطلب' : 'گفت‌وگوها و داوطلبان'}
                              </span>
                            </Link>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {inProgressItems.asVolunteer.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-extrabold text-[#174D35]">
                    کمک‌های در جریان شما (به‌عنوان داوطلب)
                  </h2>
                  <div className="space-y-3">
                    {inProgressItems.asVolunteer.map((resp) => (
                      <div
                        key={resp.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-[#DCEBDD] bg-white p-5"
                      >
                        <div>
                          <div className="mb-1 flex items-center gap-2">
                            <ResponseStatusBadge status={resp.status} />
                            <span className="text-xs text-[#556455]">
                              {resp.request?.city} · {resp.request?.area}
                            </span>
                          </div>
                          <Link
                            to={`/requests/${resp.request_id}`}
                            className="text-base font-bold text-[#174D35] hover:underline"
                          >
                            {resp.request?.title ?? 'جزئیات همکاری'}
                          </Link>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void openChatForResponse(resp.id)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#174D35] px-4 py-2 text-xs font-bold text-white hover:bg-[#26734B]"
                          >
                            <MessageCircle className="h-3.5 w-3.5 text-[#E9B949]" />
                            <span>ادامه گفت‌وگو</span>
                            {(convByResponseId[resp.id]?.unread_count ?? 0) > 0 && (
                              <span className="rounded-full bg-[#E9B949] px-1.5 py-0.5 text-[10px] font-extrabold text-[#174D35]">
                                {toPersianDigits(convByResponseId[resp.id].unread_count)}
                              </span>
                            )}
                          </button>
                          <Link
                            to={`/requests/${resp.request_id}`}
                            className="rounded-xl border border-[#DCEBDD] bg-[#F6F7F2] px-4 py-2 text-xs font-bold text-[#174D35] hover:border-[#78B98A]"
                          >
                            مدیریت همکاری
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {tab === 'completed' && (
        <section className="space-y-6">
          {completedItems.asRequester.length === 0 && completedItems.asVolunteer.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="h-7 w-7" />}
              title="هنوز کمک تکمیل‌شده‌ای ثبت نشده است"
              description="پس از پایان همیاری و تأیید درخواست‌کننده، سوابق موفق شما اینجا ثبت می‌شوند."
            />
          ) : (
            <>
              {completedItems.asRequester.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-extrabold text-[#174D35]">
                    درخواست‌های تکمیل‌شده من
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {completedItems.asRequester.map((req) => (
                      <RequestCard key={req.id} request={req} isOwn />
                    ))}
                  </div>
                </div>
              )}

              {completedItems.asVolunteer.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-extrabold text-[#174D35]">
                    کمک‌هایی که به‌عنوان داوطلب تکمیل کردید
                  </h2>
                  <div className="space-y-3">
                    {completedItems.asVolunteer.map((resp) => (
                      <div
                        key={resp.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-emerald-200 bg-white p-5"
                      >
                        <div>
                          <div className="mb-1 flex items-center gap-2">
                            <ResponseStatusBadge status={resp.status} />
                            <span className="text-xs text-[#556455]">
                              {formatRelativeTimeFa(resp.updated_at)}
                            </span>
                          </div>
                          <Link
                            to={`/requests/${resp.request_id}`}
                            className="text-base font-bold text-[#174D35] hover:underline"
                          >
                            {resp.request?.title ?? 'مشاهده جزئیات'}
                          </Link>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void openChatForResponse(resp.id)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCEBDD] bg-[#F6F7F2] px-3.5 py-2 text-xs font-bold text-[#174D35] hover:border-[#78B98A]"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            تاریخچه گفت‌وگو
                          </button>
                          <Link
                            to="/kindness-chain"
                            className="rounded-xl bg-[#DCEBDD] px-4 py-2 text-xs font-bold text-[#174D35]"
                          >
                            مشاهده در زنجیره مهربانی
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {tab === 'saved' && (
        <section>
          {savedRequests.length === 0 ? (
            <EmptyState
              icon={<Bookmark className="h-7 w-7" />}
              title="درخواست ذخیره‌شده‌ای ندارید"
              description="با زدن آیکون نشانک روی هر درخواست، می‌توانید آن را برای پیگیری بعدی ذخیره کنید."
              action={
                <Link
                  to="/requests"
                  className="rounded-2xl bg-[#174D35] px-5 py-2.5 text-sm font-bold text-white"
                >
                  مرور درخواست‌ها
                </Link>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {savedRequests.map((req) => (
                <RequestCard
                  key={req.id}
                  request={req}
                  isSaved
                  isOwn={user?.id === req.user_id}
                  onToggleSave={handleToggleSave}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'cancelled' && (
        <section className="space-y-4">
          {cancelledItems.reqs.length === 0 && cancelledItems.resps.length === 0 ? (
            <EmptyState
              icon={<XCircle className="h-7 w-7" />}
              title="مورد لغوشده‌ای وجود ندارد"
              description="درخواست‌ها یا اعلام آمادگی‌های لغوشده در این بخش نگهداری می‌شوند."
            />
          ) : (
            <div className="space-y-3">
              {cancelledItems.reqs.map((req) => (
                <div
                  key={req.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#DCEBDD] bg-white p-4"
                >
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <RequestStatusBadge status={req.status} />
                      <span className="text-xs text-[#667466]">{req.city}</span>
                    </div>
                    <Link
                      to={`/requests/${req.id}`}
                      className="text-sm font-bold text-[#202820] hover:text-[#174D35]"
                    >
                      {req.title}
                    </Link>
                  </div>
                  <Link
                    to={`/requests/${req.id}`}
                    className="rounded-xl border border-[#DCEBDD] px-3.5 py-2 text-xs font-bold text-[#174D35]"
                  >
                    جزئیات / بازگشایی
                  </Link>
                </div>
              ))}

              {cancelledItems.resps.map((resp) => (
                <div
                  key={resp.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#DCEBDD] bg-white p-4"
                >
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <ResponseStatusBadge status={resp.status} />
                      <span className="text-xs text-[#667466]">
                        {formatRelativeTimeFa(resp.updated_at)}
                      </span>
                    </div>
                    <Link
                      to={`/requests/${resp.request_id}`}
                      className="text-sm font-bold text-[#202820] hover:text-[#174D35]"
                    >
                      {resp.request?.title ?? 'درخواست مرتبط'}
                    </Link>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void openChatForResponse(resp.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCEBDD] bg-[#F6F7F2] px-3.5 py-2 text-xs font-bold text-[#174D35]"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      تاریخچه گفت‌وگو
                    </button>
                    <Link
                      to={`/requests/${resp.request_id}`}
                      className="rounded-xl border border-[#DCEBDD] px-3.5 py-2 text-xs font-bold text-[#174D35]"
                    >
                      مشاهده درخواست
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <ConfirmDialog
        open={withdrawTargetId !== null}
        busy={busy}
        title="لغو اعلام آمادگی"
        description="آیا از لغو اعلام آمادگی خود برای این درخواست مطمئن هستید؟"
        confirmLabel="لغو اعلام آمادگی"
        tone="danger"
        onConfirm={handleWithdraw}
        onCancel={() => setWithdrawTargetId(null)}
      />
    </div>
  );
}
