import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Bookmark,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Edit3,
  Flag,
  HandHelping,
  MapPin,
  MessageCircle,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LoadingState } from '../components/LoadingState';
import { ProtectedImage } from '../components/ProtectedImage';
import { CategoryBadge, RequestStatusBadge, ResponseStatusBadge } from '../components/StatusBadge';
import { CONTENT_REPORT_REASONS, HELP_TYPE_MAP, RESPONSE_STATUS_META } from '../constants/categories';
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
import { submitContentReport } from '../services/safetyService';
import { getSavedRequestIds, toggleSavedRequest } from '../services/savedService';
import type {
  ContentReportReason,
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
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ContentReportReason>('privacy_violation');
  const [reportDetails, setReportDetails] = useState('');
  const [reportBusy, setReportBusy] = useState(false);

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

  const handleSubmitRequestReport = async (e: FormEvent) => {
    e.preventDefault();
    if (!request) return;
    setReportBusy(true);
    try {
      await submitContentReport('request', request.id, reportReason, reportDetails);
      showToast('گزارش شما درباره این درخواست ثبت و برای بررسی تیم نظارت نگهداری شد.', 'success');
      setReportOpen(false);
      setReportDetails('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'ثبت گزارش انجام نشد.', 'error');
    } finally {
      setReportBusy(false);
    }
  };

  if (loading) {
    return <LoadingState label="در حال دریافت جزئیات درخواست..." />;
  }

  if (errorMsg || !request) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-brand-surface bg-white p-8 text-center">
        <h1 className="mb-2 text-lg font-bold text-brand-primary">درخواست یافت نشد</h1>
        <p className="mb-5 text-sm text-brand-text/75">
          {errorMsg ?? 'ممکن است این درخواست حذف شده یا نشانی آن نادرست باشد.'}
        </p>
        <div className="flex flex-wrap justify-center gap-2.5">
          <button
            type="button"
            onClick={() => void loadAll()}
            className="inline-flex items-center gap-2 rounded-xl border border-brand-primary bg-white px-5 py-2.5 text-sm font-bold text-brand-primary hover:bg-brand-surface/35"
          >
            <RefreshCw className="h-4 w-4" />
            تلاش مجدد
          </button>
          <Link
            to="/requests"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-bold text-white"
          >
            <ArrowRight className="h-4 w-4" />
            بازگشت به فهرست درخواست‌ها
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 sm:space-y-6 animate-fade-up">
      <div className="flex items-center justify-between gap-2">
        <Link
          to="/requests"
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-brand-surface bg-white px-3.5 py-2 text-xs font-bold text-brand-primary hover:bg-brand-surface/30"
        >
          <ArrowRight className="h-4 w-4" />
          بازگشت به درخواست‌ها
        </Link>

        {user && (
          <div className="flex items-center gap-2">
            {!isOwner && !fromOfflineCache && (
              <button
                type="button"
                onClick={() => setReportOpen(true)}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-brand-surface bg-white px-3 py-2 text-xs font-bold text-brand-text/75 hover:border-brand-text/30 hover:text-brand-text"
              >
                <Flag className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">گزارش درخواست</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleToggleSave}
              className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
                isSaved
                  ? 'border-brand-primary bg-brand-surface text-brand-primary'
                  : 'border-brand-surface bg-white text-brand-text hover:border-brand-soft'
              }`}
            >
              <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
              {isSaved ? 'ذخیره‌شده' : 'ذخیره درخواست'}
            </button>
          </div>
        )}
      </div>

      {fromOfflineCache && (
        <div className="rounded-xl border border-brand-soft/60 bg-brand-surface/50 px-4 py-3 text-xs font-medium text-brand-primary">
          شما در حال مشاهده نسخه ذخیره‌شده آفلاین هستید. برای ثبت یا مدیریت اعلام آمادگی باید به اینترنت متصل باشید.
        </div>
      )}

      {/* Main Request Card */}
      <article className="rounded-2xl border border-brand-surface bg-white p-4 sm:p-7">
        <div className="mb-3.5 flex flex-wrap items-center gap-2">
          <CategoryBadge category={request.category} />
          <RequestStatusBadge status={request.status} />
          <span className="rounded-full bg-brand-bg px-3 py-1 text-xs font-semibold text-brand-green">
            {HELP_TYPE_MAP[request.help_type]?.label ?? request.help_type}
          </span>
        </div>

        <h1 className="mb-3.5 text-lg font-extrabold leading-8 text-brand-text sm:mb-4 sm:text-2xl sm:leading-9">
          {request.title}
        </h1>

        {request.image_url && (
          <div className="mb-4 overflow-hidden rounded-2xl border border-brand-surface sm:mb-5">
            <ProtectedImage
              src={request.image_url}
              alt={request.title}
              wrapperClassName="relative block w-full overflow-hidden"
              className="max-h-80 w-full object-cover sm:max-h-96"
            />
          </div>
        )}

        <p className="mb-5 whitespace-pre-line text-sm leading-7 text-brand-text/80 sm:mb-6 sm:text-base sm:leading-8">
          {request.description}
        </p>

        <div className="grid gap-2.5 rounded-2xl bg-brand-bg p-3.5 text-xs sm:grid-cols-2 sm:gap-3 sm:p-4">
          <div className="flex items-center gap-2 text-brand-text">
            <MapPin className="h-4 w-4 shrink-0 text-brand-green" />
            <span>
              <strong className="font-bold">موقعیت تقریبی:</strong> {request.province}، {request.city} — {request.area}
            </span>
          </div>
          <div className="flex items-center gap-2 text-brand-text">
            <Clock className="h-4 w-4 shrink-0 text-brand-green" />
            <span>
              <strong className="font-bold">زمان موردنیاز:</strong> {request.needed_at}
            </span>
          </div>
          <div className="flex items-center gap-2 text-brand-text">
            <Calendar className="h-4 w-4 shrink-0 text-brand-green" />
            <span>
              <strong className="font-bold">تاریخ ثبت:</strong> {formatDateFa(request.created_at)} ({formatRelativeTimeFa(request.created_at)})
            </span>
          </div>
          <div className="flex items-center gap-2 text-brand-text">
            <Users className="h-4 w-4 shrink-0 text-brand-green" />
            <span>
              <strong className="font-bold">اعلام آمادگی‌ها:</strong> {toPersianDigits(request.responses_count)} داوطلب
            </span>
          </div>
        </div>

        {/* Requester Info & Privacy Note */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-brand-bg pt-5">
          <div className="flex items-center gap-3">
            {request.requester_avatar ? (
              <ProtectedImage
                src={request.requester_avatar}
                alt={request.requester_name}
                wrapperClassName="relative block h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-brand-surface"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-surface text-sm font-extrabold text-brand-primary">
                {getInitials(request.requester_name)}
              </div>
            )}
            <div>
              <div className="text-sm font-bold text-brand-text">
                {isOwner ? 'درخواست ثبت‌شده توسط شما' : request.requester_name}
              </div>
              <div className="text-xs text-brand-text/70">
                کمک‌های تکمیل‌شده قبلی: {toPersianDigits(request.requester_completed_helps)} مورد
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-brand-text/70">
            <ShieldCheck className="h-4 w-4 text-brand-green" />
            مکان دقیق و اطلاعات تماس محرمانه می‌ماند
          </div>
        </div>

        {/* Owner Quick Controls */}
        {isOwner && !fromOfflineCache && (
          <div className="mt-5 flex flex-wrap gap-2.5 border-t border-brand-bg pt-5">
            {(request.status === 'open' || request.status === 'in_progress') && (
              <>
                <Link
                  to={`/requests/${request.id}/edit`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-brand-surface bg-brand-bg px-4 py-2.5 text-xs font-bold text-brand-primary hover:border-brand-soft"
                >
                  <Edit3 className="h-4 w-4" />
                  ویرایش درخواست
                </Link>
                <button
                  type="button"
                  onClick={() => setDialog({ type: 'cancel_request' })}
                  disabled={actionBusy}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-brand-text/25 bg-white px-4 py-2.5 text-xs font-bold text-brand-text hover:bg-brand-bg"
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
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-green"
              >
                <RotateCcw className="h-4 w-4" />
                بازگشایی درخواست
              </button>
            )}
          </div>
        )}
      </article>

      {/* VOLUNTEER INTERACTION PANEL (Non-Owner) */}
      {!isOwner && !fromOfflineCache && (
        <section className="rounded-2xl border border-brand-surface bg-white p-4 sm:p-6">
          {!user ? (
            <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-right">
              <div>
                <h2 className="text-base font-extrabold text-brand-primary">می‌خواهید در این مورد کمک کنید؟</h2>
                <p className="mt-1 text-xs leading-6 text-brand-text/70 sm:text-sm">
                  برای ثبت اعلام آمادگی و هماهنگی با درخواست‌کننده، ابتدا وارد حساب خود شوید.
                </p>
              </div>
              <Link
                to={`/auth/login?next=${encodeURIComponent(`/requests/${request.id}`)}`}
                className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-brand-primary px-5 py-3 text-sm font-bold text-white hover:bg-brand-green sm:w-auto"
              >
                ورود و اعلام آمادگی
              </Link>
            </div>
          ) : myResponse && myResponse.status !== 'cancelled' ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-extrabold text-brand-primary">وضعیت اعلام آمادگی شما</h2>
                <ResponseStatusBadge status={myResponse.status} />
              </div>

              <p className="text-xs leading-6 text-brand-text/80 sm:text-sm sm:leading-7">
                {RESPONSE_STATUS_META[myResponse.status].description}
              </p>

              {myResponse.message && (
                <div className="rounded-2xl bg-brand-bg p-3.5 text-xs leading-6 text-brand-text">
                  <strong className="font-bold">پیام شما: </strong>
                  {myResponse.message}
                </div>
              )}

              {myResponse.volunteer_confirmed && myResponse.status !== 'completed' && (
                <div className="rounded-2xl border border-brand-soft/50 bg-brand-surface/45 px-4 py-3 text-xs font-semibold text-brand-primary">
                  شما انجام کمک را اعلام کرده‌اید؛ در انتظار تأیید نهایی از طرف ثبت‌کننده درخواست هستید.
                </div>
              )}

              <div className="flex flex-col gap-2.5 pt-1 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => void handleOpenChat(myResponse.id, convByVolunteer[user.id]?.id)}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-green disabled:opacity-60 sm:w-auto"
                >
                  <MessageCircle className="h-4 w-4 text-brand-gold" />
                  <span>گفت‌وگوی خصوصی با درخواست‌کننده</span>
                  {(convByVolunteer[user.id]?.unread_count ?? 0) > 0 && (
                    <span className="rounded-full bg-brand-gold px-1.5 py-0.5 text-[10px] font-extrabold text-brand-primary">
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
                      className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl bg-brand-green px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-primary disabled:opacity-60 sm:w-auto"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      اعلام انجام کمک از طرف من
                    </button>
                  )}

                {(myResponse.status === 'pending' || myResponse.status === 'accepted') && (
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() =>
                      setDialog({ type: 'withdraw_response', responseId: myResponse.id })
                    }
                    className="inline-flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-xl border border-brand-text/25 bg-white px-4 py-2.5 text-xs font-bold text-brand-text hover:bg-brand-bg disabled:opacity-60 sm:w-auto"
                  >
                    <XCircle className="h-4 w-4" />
                    لغو اعلام آمادگی
                  </button>
                )}
              </div>
            </div>
          ) : canVolunteerOffer ? (
            <div className="space-y-4">
              {!showOfferForm ? (
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="text-base font-extrabold text-brand-primary">
                      آماده یاری هستید؟
                    </h2>
                    <p className="mt-1 text-xs leading-6 text-brand-text/70 sm:text-sm">
                      با ثبت اعلام آمادگی، درخواست‌کننده درخواست شما را مشاهده و بررسی می‌کند.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowOfferForm(true)}
                    className="inline-flex min-h-[46px] w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-brand-primary px-6 py-3.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-brand-green sm:w-auto"
                  >
                    <HandHelping className="h-5 w-5 text-brand-gold" />
                    من می‌توانم کمک کنم
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitOffer} className="space-y-3">
                  <h2 className="text-base font-extrabold text-brand-primary">
                    ثبت اعلام آمادگی برای کمک
                  </h2>
                  <p className="text-xs leading-6 text-brand-text/70">
                    پس از ثبت، یک گفت‌وگوی خصوصی با درخواست‌کننده ایجاد می‌شود. در صورت نوشتن پیام زیر، به‌عنوان اولین پیام گفت‌وگو ارسال خواهد شد (اختیاری).
                  </p>
                  <textarea
                    rows={3}
                    value={offerMessage}
                    onChange={(e) => setOfferMessage(e.target.value)}
                    placeholder="مثلاً: سلام، من در محدوده خیابان معلم هستم و فردا عصر می‌توانم برای انجام این کار کمک کنم."
                    className="w-full rounded-2xl border border-brand-surface bg-brand-bg/60 p-3.5 text-[15px] leading-6 outline-none focus:border-brand-green focus:bg-white sm:text-sm"
                  />
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-2.5">
                    <button
                      type="submit"
                      disabled={actionBusy}
                      className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-green disabled:opacity-60 sm:w-auto"
                    >
                      <Check className="h-4 w-4" />
                      {actionBusy ? 'در حال ثبت...' : 'تأیید و ارسال اعلام آمادگی'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowOfferForm(false)}
                      disabled={actionBusy}
                      className="min-h-[42px] w-full rounded-xl border border-brand-surface px-4 py-2.5 text-xs font-bold text-brand-text/80 hover:bg-brand-bg sm:w-auto"
                    >
                      انصراف
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <p className="text-sm text-brand-text/70">
              این درخواست در حال حاضر برای اعلام آمادگی جدید باز نیست.
            </p>
          )}
        </section>
      )}

      {/* REQUEST OWNER VOLUNTEER MANAGEMENT PANEL */}
      {isOwner && !fromOfflineCache && (
        <section className="space-y-4 rounded-2xl border border-brand-surface bg-white p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-extrabold text-brand-primary">
              داوطلبان اعلام آمادگی‌کرده ({toPersianDigits(responses.length)})
            </h2>
            <span className="text-xs text-brand-text/70">
              تنها شما به‌عنوان ثبت‌کننده درخواست می‌توانید وضعیت داوطلبان را مدیریت کنید
            </span>
          </div>

          {responses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-brand-surface bg-brand-bg/60 p-6 text-center text-sm text-brand-text/70">
              هنوز داوطلبی برای این درخواست اعلام آمادگی نکرده است. به محض اعلام آمادگی کاربران، نام و توضیحات آن‌ها اینجا نمایش داده می‌شود.
            </div>
          ) : (
            <div className="space-y-3">
              {responses.map((resp) => {
                const volName = resp.volunteer?.display_name ?? 'داوطلب دست‌به‌دست';
                return (
                  <div
                    key={resp.id}
                    className="rounded-2xl border border-brand-surface bg-brand-bg/50 p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {resp.volunteer?.avatar_url ? (
                          <ProtectedImage
                            src={resp.volunteer.avatar_url}
                            alt={volName}
                            wrapperClassName="relative block h-10 w-10 shrink-0 overflow-hidden rounded-2xl border border-brand-surface"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-surface text-xs font-extrabold text-brand-primary">
                            {getInitials(volName)}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-bold text-brand-text">{volName}</div>
                          <div className="text-xs text-brand-text/70">
                            {resp.volunteer?.city ? `${resp.volunteer.city}` : 'خراسان جنوبی'}
                            {resp.volunteer?.completed_helps_count
                              ? ` · ${toPersianDigits(resp.volunteer.completed_helps_count)} کمک تکمیل‌شده`
                              : ''}
                            {' · '}
                            {formatRelativeTimeFa(resp.created_at)}
                          </div>
                        </div>
                      </div>

                      <ResponseStatusBadge status={resp.status} />
                    </div>

                    {resp.volunteer?.skills && resp.volunteer.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {resp.volunteer.skills.slice(0, 5).map((s) => (
                          <span
                            key={s}
                            className="rounded-lg bg-white px-2.5 py-0.5 text-[11px] font-medium text-brand-primary"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    {resp.message && (
                      <p className="rounded-xl bg-white p-3 text-xs leading-6 text-brand-text">
                        {resp.message}
                      </p>
                    )}

                    {resp.volunteer_confirmed && resp.status !== 'completed' && (
                      <div className="rounded-xl border border-brand-soft bg-brand-surface/50 px-3 py-2 text-xs font-semibold text-brand-primary">
                        داوطلب انجام کمک را اعلام کرده است. در صورت انجام صحیح کمک، تکمیل را تأیید کنید.
                      </div>
                    )}

                    {/* Owner Actions */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        disabled={actionBusy}
                        onClick={() =>
                          void handleOpenChat(
                            resp.id,
                            convByVolunteer[resp.volunteer_id]?.id
                          )
                        }
                        className="inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-xl border border-brand-primary bg-white px-3.5 py-2 text-xs font-bold text-brand-primary hover:bg-brand-surface/50 disabled:opacity-60 sm:w-auto"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        <span>گفت‌وگوی خصوصی</span>
                        {(convByVolunteer[resp.volunteer_id]?.unread_count ?? 0) > 0 && (
                          <span className="rounded-full bg-brand-primary px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                            {toPersianDigits(convByVolunteer[resp.volunteer_id].unread_count)}
                          </span>
                        )}
                      </button>

                      {resp.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            disabled={actionBusy}
                            onClick={() => handleAccept(resp.id)}
                            className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-white hover:bg-brand-green disabled:opacity-60 sm:flex-initial"
                          >
                            <Check className="h-3.5 w-3.5" />
                            پذیرفتن داوطلب
                          </button>
                          <button
                            type="button"
                            disabled={actionBusy}
                            onClick={() =>
                              setDialog({ type: 'reject_response', responseId: resp.id })
                            }
                            className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-brand-text/25 bg-white px-4 py-2 text-xs font-bold text-brand-text hover:bg-brand-bg disabled:opacity-60 sm:flex-initial"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            رد کردن
                          </button>
                        </>
                      )}

                      {resp.status === 'accepted' && (
                        <>
                          <button
                            type="button"
                            disabled={actionBusy}
                            onClick={() => handleStart(resp.id)}
                            className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-brand-green bg-white px-4 py-2 text-xs font-bold text-brand-primary hover:bg-brand-surface/40 disabled:opacity-60 sm:flex-initial"
                          >
                            <Play className="h-3.5 w-3.5" />
                            شروع همکاری
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
                            className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-green px-4 py-2 text-xs font-bold text-white hover:bg-brand-primary disabled:opacity-60 sm:flex-initial"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            تأیید تکمیل کمک
                          </button>
                          <button
                            type="button"
                            disabled={actionBusy}
                            onClick={() =>
                              setDialog({ type: 'reject_response', responseId: resp.id })
                            }
                            className="inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-xl border border-brand-surface bg-white px-3.5 py-2 text-xs font-semibold text-brand-text/75 hover:bg-brand-bg sm:w-auto"
                          >
                            لغو انتخاب
                          </button>
                        </>
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
                          className="inline-flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-white hover:bg-brand-green disabled:opacity-60 sm:w-auto"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-brand-gold" />
                          تأیید نهایی تکمیل کمک
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

      {reportOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-brand-text/50 p-0 backdrop-blur-xs sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-t-2xl border border-brand-surface bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-sm animate-fade-up sm:rounded-2xl sm:p-6">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-brand-surface sm:hidden" />
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-extrabold text-brand-primary">گزارش درخواست</h2>
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className="rounded-xl p-1 text-brand-text/70 hover:bg-brand-bg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRequestReport} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-brand-text">
                  علت گزارش
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value as ContentReportReason)}
                  className="min-h-[44px] w-full rounded-2xl border border-brand-surface bg-brand-bg/60 px-3.5 py-2.5 text-[15px] outline-none focus:border-brand-green sm:text-sm"
                >
                  {CONTENT_REPORT_REASONS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-brand-text">
                  توضیحات تکمیلی (اختیاری)
                </label>
                <textarea
                  rows={3}
                  value={reportDetails}
                  maxLength={1000}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="توضیح مختصری درباره مورد مشکوک یا نقض حریم خصوصی بنویسید..."
                  className="w-full rounded-2xl border border-brand-surface bg-brand-bg/60 p-3 text-[15px] outline-none focus:border-brand-green sm:text-sm"
                />
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setReportOpen(false)}
                  disabled={reportBusy}
                  className="min-h-[42px] rounded-xl border border-brand-surface px-4 py-2 text-xs font-bold text-brand-text/80"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={reportBusy}
                  className="min-h-[42px] rounded-xl bg-brand-text px-4 py-2 text-xs font-bold text-white hover:bg-brand-text/90 disabled:opacity-60"
                >
                  {reportBusy ? 'در حال ثبت...' : 'ثبت گزارش'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
