import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Bookmark,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Edit3,
  HandHelping,
  MapPin,
  MessageCircle,
  Play,
  RotateCcw,
  ShieldCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LoadingState } from '../components/LoadingState';
import { ProtectedImage } from '../components/ProtectedImage';
import { CategoryBadge, RequestStatusBadge, ResponseStatusBadge } from '../components/StatusBadge';
import { HELP_TYPE_MAP, RESPONSE_STATUS_META } from '../constants/categories';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { useToast } from '../contexts/ToastContext';
import { formatDateFa, formatRelativeTimeFa, getInitials, toPersianDigits } from '../lib/formatters';
import { ensureConversationForResponse, getMyConversations } from '../services/chatService';
import {
  cancelHelpRequest,
  getRequestById,
  reopenHelpRequest,
} from '../services/requestsService';
import {
  acceptVolunteerResponse,
  confirmHelpCompletion,
  getMyResponseForRequest,
  getResponsesForRequest,
  markVolunteerDone,
  rejectVolunteerResponse,
  startVolunteerResponse,
  submitVolunteerResponse,
  withdrawVolunteerResponse,
} from '../services/responsesService';
import { getSavedRequestIds, toggleSavedRequest } from '../services/savedService';
import type {
  ConversationItem,
  HelpRequestFeedItem,
  VolunteerResponse,
  VolunteerResponseWithProfile,
} from '../types/database';

type DialogAction =
  | { type: 'cancel_request' }
  | { type: 'withdraw_response'; responseId: string }
  | { type: 'reject_response'; responseId: string }
  | { type: 'confirm_completion'; responseId: string; volunteerName: string }
  | null;

export function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const { notifyMessagesChanged } = useChat();
  const { showToast } = useToast();

  const [request, setRequest] = useState<HelpRequestFeedItem | null>(null);
  const [fromOfflineCache, setFromOfflineCache] = useState(false);
  const [responses, setResponses] = useState<VolunteerResponseWithProfile[]>([]);
  const [myResponse, setMyResponse] = useState<VolunteerResponse | null>(null);
  const [convByVolunteer, setConvByVolunteer] = useState<Record<string, ConversationItem>>({});
  const [isSaved, setIsSaved] = useState(false);

  const [offerMessage, setOfferMessage] = useState('');
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogAction>(null);

  const loadAll = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const { item, fromOfflineCache: offline } = await getRequestById(id);
      setRequest(item);
      setFromOfflineCache(offline);

      if (!item || offline) {
        setLoading(false);
        return;
      }

      if (user) {
        const savedPromise = getSavedRequestIds(user.id).catch((): string[] => []);
        const convPromise = getMyConversations(user.id).catch(() => ({
          items: [] as ConversationItem[],
        }));

        if (item.user_id === user.id) {
          const [respList, savedList, convs] = await Promise.all([
            getResponsesForRequest(item.id),
            savedPromise,
            convPromise,
          ]);
          setResponses(respList);
          setMyResponse(null);
          setIsSaved(savedList.includes(item.id));
          const map: Record<string, ConversationItem> = {};
          for (const c of convs.items) {
            if (c.request_id === item.id) map[c.volunteer_id] = c;
          }
          setConvByVolunteer(map);
        } else {
          const [mine, savedList, convs] = await Promise.all([
            getMyResponseForRequest(item.id, user.id),
            savedPromise,
            convPromise,
          ]);
          setMyResponse(mine);
          setResponses([]);
          setIsSaved(savedList.includes(item.id));
          const map: Record<string, ConversationItem> = {};
          for (const c of convs.items) {
            if (c.request_id === item.id) map[c.volunteer_id] = c;
          }
          setConvByVolunteer(map);
        }
      } else {
        setResponses([]);
        setMyResponse(null);
        setConvByVolunteer({});
        setIsSaved(false);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'خطا در بارگذاری جزئیات درخواست');
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const isOwner = Boolean(user && request && user.id === request.user_id);

  const canVolunteerOffer =
    Boolean(user && request && !isOwner) &&
    (request?.status === 'open' ||
      (request?.status === 'in_progress' && request?.help_type === 'group_activity')) &&
    (!myResponse || myResponse.status === 'cancelled');

  const handleToggleSave = async () => {
    if (!user || !request) {
      showToast('برای ذخیره درخواست ابتدا وارد حساب شوید.', 'info');
      return;
    }
    try {
      const next = await toggleSavedRequest(user.id, request.id, isSaved);
      setIsSaved(next);
      showToast(next ? 'درخواست در فهرست ذخیره‌شده‌ها قرار گرفت.' : 'از ذخیره‌شده‌ها حذف شد.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'خطا در ذخیره درخواست', 'error');
    }
  };

  const handleSubmitOffer = async (e: FormEvent) => {
    e.preventDefault();
    if (!request || !user) return;
    setActionBusy(true);
    try {
      const created = await submitVolunteerResponse(request.id, offerMessage);
      setMyResponse(created);
      setShowOfferForm(false);
      setOfferMessage('');
      notifyMessagesChanged();
      showToast('اعلام آمادگی شما ثبت و گفت‌وگوی خصوصی با درخواست‌کننده ایجاد شد.', 'success');
      await loadAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'ثبت اعلام آمادگی ناموفق بود', 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const handleOpenChat = async (responseId: string, existingConvId?: string) => {
    if (existingConvId) {
      navigate(`/messages/${existingConvId}`);
      return;
    }
    setActionBusy(true);
    try {
      const convId = await ensureConversationForResponse(responseId);
      navigate(`/messages/${convId}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'باز کردن گفت‌وگو ناموفق بود', 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const handleAccept = async (responseId: string) => {
    setActionBusy(true);
    try {
      await acceptVolunteerResponse(responseId);
      showToast('اعلام آمادگی داوطلب پذیرفته شد و درخواست به حالت «در حال انجام» درآمد.', 'success');
      await loadAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'خطا در پذیرش داوطلب', 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const handleStart = async (responseId: string) => {
    setActionBusy(true);
    try {
      await startVolunteerResponse(responseId);
      showToast('وضعیت همکاری به «در حال انجام» تغییر یافت.', 'success');
      await loadAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'خطا در به‌روزرسانی وضعیت', 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const handleMarkVolunteerDone = async (responseId: string) => {
    setActionBusy(true);
    try {
      await markVolunteerDone(responseId);
      showToast('اعلام اتمام کمک ثبت شد؛ منتظر تأیید نهایی ثبت‌کننده درخواست هستید.', 'success');
      await loadAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'ثبت اتمام همکاری ناموفق بود', 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const handleReopenRequest = async () => {
    if (!request) return;
    setActionBusy(true);
    try {
      await reopenHelpRequest(request.id);
      showToast('درخواست دوباره بازگشایی شد.', 'success');
      await loadAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'بازگشایی ناموفق بود', 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const executeDialogAction = async () => {
    if (!dialog || !request) return;
    setActionBusy(true);
    try {
      if (dialog.type === 'cancel_request') {
        await cancelHelpRequest(request.id);
        showToast('درخواست لغو شد.', 'info');
      } else if (dialog.type === 'withdraw_response') {
        await withdrawVolunteerResponse(dialog.responseId);
        showToast('اعلام آمادگی شما لغو شد.', 'info');
      } else if (dialog.type === 'reject_response') {
        await rejectVolunteerResponse(dialog.responseId);
        showToast('اعلام آمادگی رد شد.', 'info');
      } else if (dialog.type === 'confirm_completion') {
        await confirmHelpCompletion(dialog.responseId);
        await refreshProfile();
        showToast('تکمیل همیاری تأیید شد و در زنجیره مهربانی ثبت گردید.', 'success');
      }
      setDialog(null);
      notifyMessagesChanged();
      await loadAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'اجرای عملیات با خطا مواجه شد', 'error');
    } finally {
      setActionBusy(false);
    }
  };

  if (loading) {
    return <LoadingState label="در حال دریافت جزئیات درخواست..." />;
  }

  if (errorMsg || !request) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-[#DCEBDD] bg-white p-8 text-center">
        <h1 className="mb-2 text-lg font-bold text-[#174D35]">درخواست یافت نشد</h1>
        <p className="mb-5 text-sm font-normal text-[#505E50]">
          {errorMsg ?? 'ممکن است این درخواست حذف شده یا نشانی آن نادرست باشد.'}
        </p>
        <Link
          to="/requests"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-[#174D35] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#26734B]"
        >
          <ArrowRight className="h-4 w-4" />
          بازگشت به فهرست درخواست‌ها
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between gap-2">
        <Link
          to="/requests"
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#DCEBDD] bg-white px-3.5 py-2 text-xs font-semibold text-[#174D35] hover:bg-[#DCEBDD]/30"
        >
          <ArrowRight className="h-4 w-4" />
          بازگشت به درخواست‌ها
        </Link>

        {user && (
          <button
            type="button"
            onClick={handleToggleSave}
            className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
              isSaved
                ? 'border-[#174D35] bg-[#DCEBDD] text-[#174D35]'
                : 'border-[#DCEBDD] bg-white text-[#202820] hover:border-[#78B98A]'
            }`}
          >
            <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
            {isSaved ? 'ذخیره‌شده' : 'ذخیره درخواست'}
          </button>
        )}
      </div>

      {fromOfflineCache && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900">
          شما در حال مشاهده نسخه ذخیره‌شده آفلاین هستید. برای ثبت یا مدیریت اعلام آمادگی باید به اینترنت متصل باشید.
        </div>
      )}

      {/* Desktop 2-column grid (Details + Action/Volunteer panel) */}
      <div className="grid gap-5 lg:grid-cols-[1fr_360px] lg:items-start">
        {/* Main Request Details Column */}
        <article className="rounded-3xl border border-[#DCEBDD] bg-white p-4 shadow-[0_2px_10px_rgba(23,77,53,0.03)] sm:p-7">
          <div className="mb-3.5 flex flex-wrap items-center gap-2">
            <CategoryBadge category={request.category} />
            <RequestStatusBadge status={request.status} />
            <span className="rounded-full bg-[#F6F7F2] px-3 py-1 text-xs font-medium text-[#26734B]">
              {HELP_TYPE_MAP[request.help_type]?.label ?? request.help_type}
            </span>
          </div>

          <h1 className="mb-4 text-lg font-bold leading-8 text-[#202820] sm:text-2xl sm:leading-10">
            {request.title}
          </h1>

          {request.image_url && (
            <div className="mb-5 overflow-hidden rounded-2xl border border-[#DCEBDD]">
              <ProtectedImage
                src={request.image_url}
                alt={request.title}
                wrapperClassName="relative block w-full overflow-hidden"
                className="max-h-80 w-full object-cover sm:max-h-96"
              />
            </div>
          )}

          <p className="mb-6 whitespace-pre-line text-sm font-normal leading-8 text-[#344234] sm:text-[15px]">
            {request.description}
          </p>

          <div className="grid gap-2.5 rounded-2xl bg-[#F6F7F2] p-4 text-xs sm:grid-cols-2 sm:gap-3">
            <div className="flex items-center gap-2 text-[#202820]">
              <MapPin className="h-4 w-4 shrink-0 text-[#26734B]" />
              <span>
                <strong className="font-semibold">موقعیت تقریبی:</strong> {request.province}، {request.city} — {request.area}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[#202820]">
              <Clock className="h-4 w-4 shrink-0 text-[#26734B]" />
              <span>
                <strong className="font-semibold">زمان موردنیاز:</strong> {request.needed_at}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[#202820]">
              <Calendar className="h-4 w-4 shrink-0 text-[#26734B]" />
              <span>
                <strong className="font-semibold">تاریخ ثبت:</strong> {formatDateFa(request.created_at)}{' '}
                <span className="font-light text-[#5E6C5E]">({formatRelativeTimeFa(request.created_at)})</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-[#202820]">
              <Users className="h-4 w-4 shrink-0 text-[#26734B]" />
              <span>
                <strong className="font-semibold">اعلام آمادگی‌ها:</strong> {toPersianDigits(request.responses_count)} داوطلب
              </span>
            </div>
          </div>

          {/* Requester Info & Privacy Note */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-[#F6F7F2] pt-5">
            <div className="flex items-center gap-3">
              {request.requester_avatar ? (
                <ProtectedImage
                  src={request.requester_avatar}
                  alt={request.requester_name}
                  wrapperClassName="relative block h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-[#DCEBDD]"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#DCEBDD] text-sm font-bold text-[#174D35]">
                  {getInitials(request.requester_name)}
                </div>
              )}
              <div>
                <div className="text-sm font-semibold text-[#202820]">
                  {isOwner ? 'درخواست ثبت‌شده توسط شما' : request.requester_name}
                </div>
                <div className="text-xs font-normal text-[#556455]">
                  کمک‌های تکمیل‌شده قبلی: {toPersianDigits(request.requester_completed_helps)} مورد
                </div>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 text-[11px] font-normal text-[#556455]">
              <ShieldCheck className="h-4 w-4 shrink-0 text-[#26734B]" />
              <span>مکان دقیق و اطلاعات تماس محرمانه می‌ماند</span>
            </div>
          </div>

          {/* Owner Quick Controls */}
          {isOwner && !fromOfflineCache && (
            <div className="mt-5 flex flex-wrap gap-2.5 border-t border-[#F6F7F2] pt-5">
              {(request.status === 'open' || request.status === 'in_progress') && (
                <>
                  <Link
                    to={`/requests/${request.id}/edit`}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#DCEBDD] bg-[#F6F7F2] px-4 py-2 text-xs font-semibold text-[#174D35] hover:border-[#78B98A]"
                  >
                    <Edit3 className="h-4 w-4" />
                    ویرایش درخواست
                  </Link>
                  <button
                    type="button"
                    onClick={() => setDialog({ type: 'cancel_request' })}
                    disabled={actionBusy}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    <XCircle className="h-4 w-4" />
                    لغو درخواست
                  </button>
                </>
              )}

              {request.status === 'cancelled' && (
                <button
                  type="button"
                  onClick={handleReopenRequest}
                  disabled={actionBusy}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#174D35] px-4 py-2 text-xs font-bold text-white hover:bg-[#26734B]"
                >
                  <RotateCcw className="h-4 w-4" />
                  بازگشایی درخواست
                </button>
              )}
            </div>
          )}
        </article>

        {/* Sticky Sidebar / Mobile Bottom Action Column */}
        <aside className="space-y-4 lg:sticky lg:top-20">
          {!isOwner && !fromOfflineCache && (
            <section className="rounded-3xl border border-[#DCEBDD] bg-white p-4 shadow-[0_2px_10px_rgba(23,77,53,0.04)] sm:p-6">
              {!user ? (
                <div className="space-y-4 text-center lg:text-right">
                  <div>
                    <h2 className="text-base font-bold text-[#174D35]">می‌خواهید در این مورد کمک کنید؟</h2>
                    <p className="mt-1 text-xs font-normal leading-6 text-[#505E50]">
                      برای ثبت اعلام آمادگی و هماهنگی در گفت‌وگوی خصوصی با درخواست‌کننده، وارد حساب کاربری شوید.
                    </p>
                  </div>
                  <Link
                    to={`/auth/login?next=${encodeURIComponent(`/requests/${request.id}`)}`}
                    className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-[#174D35] px-5 py-3 text-sm font-bold text-white hover:bg-[#26734B]"
                  >
                    <HandHelping className="h-5 w-5 text-[#E9B949]" />
                    <span>ورود و اعلام آمادگی</span>
                  </Link>
                </div>
              ) : myResponse && myResponse.status !== 'cancelled' ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-base font-bold text-[#174D35]">وضعیت اعلام آمادگی شما</h2>
                    <ResponseStatusBadge status={myResponse.status} />
                  </div>

                  <p className="text-xs font-normal leading-6 text-[#465346]">
                    {RESPONSE_STATUS_META[myResponse.status].description}
                  </p>

                  {myResponse.message && (
                    <div className="rounded-2xl bg-[#F6F7F2] p-3.5 text-xs font-normal leading-6 text-[#202820]">
                      <strong className="font-semibold">پیام شما: </strong>
                      {myResponse.message}
                    </div>
                  )}

                  {myResponse.volunteer_confirmed && myResponse.status !== 'completed' && (
                    <div className="rounded-2xl border border-[#78B98A]/50 bg-[#DCEBDD]/45 px-4 py-3 text-xs font-medium text-[#174D35]">
                      شما انجام کمک را اعلام کرده‌اید؛ در انتظار تأیید نهایی ثبت‌کننده درخواست هستید.
                    </div>
                  )}

                  <div className="flex flex-col gap-2.5 pt-1">
                    <button
                      type="button"
                      disabled={actionBusy}
                      onClick={() => void handleOpenChat(myResponse.id, convByVolunteer[user.id]?.id)}
                      className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl bg-[#174D35] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#26734B] disabled:opacity-60"
                    >
                      <MessageCircle className="h-4 w-4 text-[#E9B949]" />
                      <span>گفت‌وگوی خصوصی با درخواست‌کننده</span>
                      {(convByVolunteer[user.id]?.unread_count ?? 0) > 0 && (
                        <span className="rounded-full bg-[#E9B949] px-2 py-0.5 text-[10px] font-bold text-[#174D35]">
                          {toPersianDigits(convByVolunteer[user.id].unread_count)}
                        </span>
                      )}
                    </button>

                    {(myResponse.status === 'accepted' || myResponse.status === 'in_progress') &&
                      !myResponse.volunteer_confirmed && (
                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={() => handleMarkVolunteerDone(myResponse.id)}
                          className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-2xl bg-[#26734B] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#174D35] disabled:opacity-60"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>اعلام انجام کمک از طرف من</span>
                        </button>
                      )}

                    {(myResponse.status === 'pending' || myResponse.status === 'accepted') && (
                      <button
                        type="button"
                        disabled={actionBusy}
                        onClick={() =>
                          setDialog({ type: 'withdraw_response', responseId: myResponse.id })
                        }
                        className="inline-flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                      >
                        <XCircle className="h-4 w-4" />
                        <span>لغو اعلام آمادگی</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : canVolunteerOffer ? (
                <div className="space-y-4">
                  {!showOfferForm ? (
                    <div className="space-y-3.5">
                      <div>
                        <h2 className="text-base font-bold text-[#174D35]">آماده یاری هستید؟</h2>
                        <p className="mt-1 text-xs font-normal leading-6 text-[#505E50]">
                          با اعلام آمادگی، گفت‌وگوی خصوصی با درخواست‌کننده ساخته می‌شود تا با آرامش هماهنگ شوید.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowOfferForm(true)}
                        className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-[#174D35] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#26734B]"
                      >
                        <HandHelping className="h-5 w-5 text-[#E9B949]" />
                        <span>من می‌تونم کمک کنم</span>
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitOffer} className="space-y-3">
                      <h2 className="text-base font-bold text-[#174D35]">ثبت اعلام آمادگی</h2>
                      <p className="text-xs font-normal leading-6 text-[#556455]">
                        پیام زیر به‌عنوان اولین پیام گفت‌وگوی خصوصی با درخواست‌کننده ارسال می‌شود (اختیاری):
                      </p>
                      <textarea
                        rows={3}
                        value={offerMessage}
                        onChange={(e) => setOfferMessage(e.target.value)}
                        placeholder="مثلاً: سلام، من در محدوده خیابان معلم هستم و فردا عصر می‌توانم کمک کنم."
                        className="w-full rounded-2xl border border-[#DCEBDD] bg-[#F6F7F2]/60 p-3.5 text-[15px] font-normal leading-6 outline-none focus:border-[#26734B] focus:bg-white sm:text-sm"
                      />
                      <div className="flex flex-col gap-2">
                        <button
                          type="submit"
                          disabled={actionBusy}
                          className="inline-flex min-h-[46px] w-full items-center justify-center gap-1.5 rounded-2xl bg-[#174D35] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#26734B] disabled:opacity-60"
                        >
                          <Check className="h-4 w-4" />
                          <span>{actionBusy ? 'در حال ثبت...' : 'تأیید و شروع گفت‌وگو'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowOfferForm(false)}
                          disabled={actionBusy}
                          className="min-h-[40px] w-full rounded-2xl border border-[#DCEBDD] px-4 py-2 text-xs font-semibold text-[#465346] hover:bg-[#F6F7F2]"
                        >
                          انصراف
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                <p className="text-xs font-normal leading-6 text-[#556455]">
                  این درخواست در حال حاضر برای اعلام آمادگی جدید باز نیست.
                </p>
              )}
            </section>
          )}

          {/* REQUEST OWNER VOLUNTEER MANAGEMENT PANEL */}
          {isOwner && !fromOfflineCache && (
            <section className="space-y-4 rounded-3xl border border-[#DCEBDD] bg-white p-4 shadow-[0_2px_10px_rgba(23,77,53,0.04)] sm:p-5">
              <div>
                <h2 className="text-base font-bold text-[#174D35]">
                  داوطلبان ({toPersianDigits(responses.length)})
                </h2>
                <p className="mt-0.5 text-xs font-light text-[#556455]">
                  مدیریت اعلام آمادگی‌ها و گفت‌وگوی خصوصی با داوطلبان
                </p>
              </div>

              {responses.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#DCEBDD] bg-[#F6F7F2]/60 p-5 text-center text-xs leading-6 text-[#556455]">
                  هنوز داوطلبی برای این درخواست اعلام آمادگی نکرده است.
                </div>
              ) : (
                <div className="space-y-3">
                  {responses.map((resp) => {
                    const volName = resp.volunteer?.display_name ?? 'داوطلب دست‌به‌دست';
                    return (
                      <div
                        key={resp.id}
                        className="space-y-3 rounded-2xl border border-[#DCEBDD] bg-[#F6F7F2]/55 p-3.5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2.5">
                          <div className="flex items-center gap-2.5">
                            {resp.volunteer?.avatar_url ? (
                              <ProtectedImage
                                src={resp.volunteer.avatar_url}
                                alt={volName}
                                wrapperClassName="relative block h-10 w-10 shrink-0 overflow-hidden rounded-2xl border border-[#DCEBDD]"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#DCEBDD] text-xs font-bold text-[#174D35]">
                                {getInitials(volName)}
                              </div>
                            )}
                            <div>
                              <div className="text-sm font-semibold text-[#202820]">{volName}</div>
                              <div className="text-[11px] font-normal text-[#556455]">
                                {resp.volunteer?.city ? resp.volunteer.city : 'خراسان جنوبی'}
                                {resp.volunteer?.completed_helps_count
                                  ? ` · ${toPersianDigits(resp.volunteer.completed_helps_count)} کمک`
                                  : ''}
                              </div>
                            </div>
                          </div>

                          <ResponseStatusBadge status={resp.status} />
                        </div>

                        {resp.volunteer?.skills && resp.volunteer.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {resp.volunteer.skills.slice(0, 4).map((s) => (
                              <span
                                key={s}
                                className="rounded-lg bg-white px-2 py-0.5 text-[11px] font-medium text-[#174D35]"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        )}

                        {resp.message && (
                          <p className="rounded-xl bg-white p-3 text-xs font-normal leading-6 text-[#202820]">
                            {resp.message}
                          </p>
                        )}

                        {resp.volunteer_confirmed && resp.status !== 'completed' && (
                          <div className="rounded-xl border border-[#78B98A] bg-[#DCEBDD]/50 px-3 py-2 text-xs font-medium text-[#174D35]">
                            داوطلب انجام کمک را اعلام کرده است. در صورت انجام، تکمیل را تأیید کنید.
                          </div>
                        )}

                        <div className="flex flex-col gap-2 pt-0.5">
                          <button
                            type="button"
                            disabled={actionBusy}
                            onClick={() =>
                              void handleOpenChat(
                                resp.id,
                                convByVolunteer[resp.volunteer_id]?.id
                              )
                            }
                            className="inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-xl border border-[#174D35] bg-white px-3.5 py-2 text-xs font-semibold text-[#174D35] hover:bg-[#DCEBDD]/50 disabled:opacity-60"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            <span>گفت‌وگوی خصوصی</span>
                            {(convByVolunteer[resp.volunteer_id]?.unread_count ?? 0) > 0 && (
                              <span className="rounded-full bg-[#E9B949] px-1.5 py-0.5 text-[10px] font-bold text-[#174D35]">
                                {toPersianDigits(convByVolunteer[resp.volunteer_id].unread_count)}
                              </span>
                            )}
                          </button>

                          {resp.status === 'pending' && (
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                disabled={actionBusy}
                                onClick={() => handleAccept(resp.id)}
                                className="inline-flex min-h-[40px] items-center justify-center gap-1 rounded-xl bg-[#174D35] px-3 py-2 text-xs font-bold text-white hover:bg-[#26734B] disabled:opacity-60"
                              >
                                <Check className="h-3.5 w-3.5" />
                                <span>پذیرفتن</span>
                              </button>
                              <button
                                type="button"
                                disabled={actionBusy}
                                onClick={() =>
                                  setDialog({ type: 'reject_response', responseId: resp.id })
                                }
                                className="inline-flex min-h-[40px] items-center justify-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                <span>رد کردن</span>
                              </button>
                            </div>
                          )}

                          {resp.status === 'accepted' && (
                            <div className="space-y-2">
                              <button
                                type="button"
                                disabled={actionBusy}
                                onClick={() => handleStart(resp.id)}
                                className="inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-xl border border-[#26734B] bg-white px-4 py-2 text-xs font-semibold text-[#174D35] hover:bg-[#DCEBDD]/40 disabled:opacity-60"
                              >
                                <Play className="h-3.5 w-3.5" />
                                <span>شروع همکاری</span>
                              </button>
                              <button
                                type="button"
                                disabled={actionBusy}
                                onClick={() =>
                                  setDialog({
                                    type: 'confirm_completion',
                                    responseId: resp.id,
                                    volunteerName: volName,
                                  })
                                }
                                className="inline-flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-xl bg-[#26734B] px-4 py-2 text-xs font-bold text-white hover:bg-[#174D35] disabled:opacity-60"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>تأیید تکمیل کمک</span>
                              </button>
                              <button
                                type="button"
                                disabled={actionBusy}
                                onClick={() =>
                                  setDialog({ type: 'reject_response', responseId: resp.id })
                                }
                                className="inline-flex min-h-[38px] w-full items-center justify-center rounded-xl border border-stone-300 bg-white px-3.5 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100"
                              >
                                لغو انتخاب
                              </button>
                            </div>
                          )}

                          {resp.status === 'in_progress' && (
                            <button
                              type="button"
                              disabled={actionBusy}
                              onClick={() =>
                                setDialog({
                                  type: 'confirm_completion',
                                  responseId: resp.id,
                                  volunteerName: volName,
                                })
                              }
                              className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl bg-[#174D35] px-4 py-2 text-xs font-bold text-white hover:bg-[#26734B] disabled:opacity-60"
                            >
                              <CheckCircle2 className="h-4 w-4 text-[#E9B949]" />
                              <span>تأیید نهایی تکمیل کمک</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={dialog !== null}
        busy={actionBusy}
        title={
          dialog?.type === 'cancel_request'
            ? 'لغو درخواست کمک'
            : dialog?.type === 'withdraw_response'
              ? 'لغو اعلام آمادگی'
              : dialog?.type === 'reject_response'
                ? 'رد اعلام آمادگی داوطلب'
                : 'تأیید نهایی تکمیل کمک'
        }
        description={
          dialog?.type === 'cancel_request'
            ? 'آیا مطمئن هستید که می‌خواهید این درخواست را لغو کنید؟ اعلام آمادگی‌های فعال نیز لغو می‌شوند.'
            : dialog?.type === 'withdraw_response'
              ? 'آیا از لغو اعلام آمادگی خود مطمئن هستید؟'
              : dialog?.type === 'reject_response'
                ? 'آیا مطمئن هستید که می‌خواهید این اعلام آمادگی را رد کنید؟'
                : `آیا تأیید می‌کنید که «${dialog?.volunteerName ?? 'داوطلب'}» این کمک را به انجام رسانده است؟ با تأیید شما درخواست تکمیل‌شده ثبت و در زنجیره مهربانی منظور می‌شود.`
        }
        confirmLabel={
          dialog?.type === 'confirm_completion' ? 'بله، کمک انجام شد' : 'تأیید و انجام'
        }
        tone={dialog?.type === 'confirm_completion' ? 'primary' : 'danger'}
        onConfirm={executeDialogAction}
        onCancel={() => setDialog(null)}
      />
    </div>
  );
}
