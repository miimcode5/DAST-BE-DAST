import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  Ban,
  Check,
  CheckCheck,
  Clock,
  Flag,
  Loader2,
  Lock,
  RefreshCw,
  Send,
  ShieldAlert,
  Trash2,
  WifiOff,
  X,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LoadingState } from '../components/LoadingState';
import { ProtectedImage } from '../components/ProtectedImage';
import { ConversationStatusBadge, RequestStatusBadge } from '../components/StatusBadge';
import {
  CONVERSATION_REPORT_REASONS,
  CONVERSATION_STATUS_META,
} from '../constants/categories';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { useNotifications } from '../contexts/NotificationsContext';
import { usePwa } from '../contexts/PwaContext';
import { useToast } from '../contexts/ToastContext';
import {
  formatChatDayLabelFa,
  formatTimeFa,
  getInitials,
  toPersianDigits,
} from '../lib/formatters';
import { supabase } from '../lib/supabase';
import {
  detectSensitivePrivacyText,
  MAX_CHAT_MESSAGE_LENGTH,
  validateChatMessage,
} from '../lib/validation';
import {
  getConversationDetails,
  getMessagesPage,
  getMessagesSince,
  markConversationMessagesRead,
  mergeSortedMessages,
  sendChatMessage,
  submitConversationReport,
} from '../services/chatService';
import { blockUser, getBlockStatusWith, unblockUser } from '../services/safetyService';
import type {
  BlockStatus,
  ChatMessage,
  ConversationItem,
  ConversationReportReason,
  PendingOutgoingMessage,
} from '../types/database';

type RealtimeConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'offline';

const PAGE_SIZE = 30;

export function ChatPage() {
  const { id: conversationId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { notifyMessagesChanged, refreshUnreadCount } = useChat();
  const { refreshNotifications } = useNotifications();
  const { isOnline } = usePwa();
  const { showToast } = useToast();

  const [conversation, setConversation] = useState<ConversationItem | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingOutbox, setPendingOutbox] = useState<PendingOutgoingMessage[]>([]);
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [draft, setDraft] = useState('');
  const [firstUnreadMessageId, setFirstUnreadMessageId] = useState<string | null>(null);
  const [realtimeState, setRealtimeState] = useState<RealtimeConnectionState>('connecting');
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const [hasUnseenBelow, setHasUnseenBelow] = useState(false);

  // Report modal state
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ConversationReportReason>('privacy_violation');
  const [reportDetails, setReportDetails] = useState('');
  const [reportBusy, setReportBusy] = useState(false);

  // Block / Unblock safety state
  const [blockStatus, setBlockStatus] = useState<BlockStatus>({
    blocked_by_me: false,
    blocked_by_other: false,
    any_block: false,
  });
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);

  const scrollBoxRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const latestMessageTimestampRef = useRef<string | null>(null);
  const hasSubscribedOnceRef = useRef(false);

  useEffect(() => {
    const last = messages[messages.length - 1];
    latestMessageTimestampRef.current = last ? last.created_at : null;
  }, [messages]);

  const isNearBottom = useCallback(() => {
    const el = scrollBoxRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 140;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const el = scrollBoxRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    setHasUnseenBelow(false);
    setShowJumpToBottom(false);
  }, []);

  const markAsReadAndSync = useCallback(async () => {
    if (!conversationId) return;
    const count = await markConversationMessagesRead(conversationId);
    if (count > 0) {
      await Promise.all([refreshUnreadCount(), refreshNotifications()]);
      notifyMessagesChanged();
    }
  }, [conversationId, notifyMessagesChanged, refreshNotifications, refreshUnreadCount]);

  // Initial load of conversation header + newest page of messages
  const loadInitialChat = useCallback(async () => {
    if (!conversationId || !user) return;
    setLoadingInitial(true);
    setErrorMsg(null);
    setFirstUnreadMessageId(null);
    hasSubscribedOnceRef.current = false;

    try {
      const [details, page] = await Promise.all([
        getConversationDetails(conversationId),
        getMessagesPage(conversationId, { limit: PAGE_SIZE }),
      ]);

      if (!details) {
        setErrorMsg('گفت‌وگوی موردنظر یافت نشد.');
        setLoadingInitial(false);
        return;
      }

      setConversation(details);
      setMessages(page.messages);
      setHasMoreOlder(page.hasMore);

      const blk = await getBlockStatusWith(details.other_user_id);
      setBlockStatus(blk);

      const firstUnread = page.messages.find(
        (m) => m.sender_id !== user.id && m.read_at === null
      );
      setFirstUnreadMessageId(firstUnread ? firstUnread.id : null);

      if (firstUnread) {
        await markAsReadAndSync();
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'خطا در بارگذاری گفت‌وگو');
    } finally {
      setLoadingInitial(false);
    }
  }, [conversationId, user, markAsReadAndSync]);

  useEffect(() => {
    void loadInitialChat();
  }, [loadInitialChat]);

  // Scroll to bottom once initial messages render
  useEffect(() => {
    if (!loadingInitial && messages.length > 0) {
      requestAnimationFrame(() => scrollToBottom('auto'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingInitial]);

  // Reconcile messages after reconnect or coming back online without duplicates or missing messages
  const reconcileMissedMessages = useCallback(async () => {
    if (!conversationId || !user || !navigator.onLine) return;
    try {
      const [details, fresh] = await Promise.all([
        getConversationDetails(conversationId),
        latestMessageTimestampRef.current
          ? getMessagesSince(conversationId, latestMessageTimestampRef.current)
          : getMessagesPage(conversationId, { limit: PAGE_SIZE }).then((r) => r.messages),
      ]);

      if (details) {
        setConversation(details);
      }
      if (fresh.length > 0) {
        setMessages((prev) => mergeSortedMessages(prev, fresh));
        const hasUnreadIncoming = fresh.some(
          (m) => m.sender_id !== user.id && m.read_at === null
        );
        if (hasUnreadIncoming) {
          await markAsReadAndSync();
        }
      }
    } catch {
      // Keep existing loaded state gracefully
    }
  }, [conversationId, user, markAsReadAndSync]);

  // Supabase Realtime channel for this specific conversation
  useEffect(() => {
    if (!conversationId || !user) return;

    if (!isOnline) {
      setRealtimeState('offline');
      return;
    }

    setRealtimeState('connecting');

    const channel = supabase
      .channel(`chat-room-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const incoming = payload.new as ChatMessage;
          const wasNearBottom = isNearBottom();

          setMessages((prev) => mergeSortedMessages(prev, [incoming]));

          if (incoming.sender_id !== user.id) {
            void markAsReadAndSync();
          }

          requestAnimationFrame(() => {
            if (wasNearBottom || incoming.sender_id === user.id) {
              scrollToBottom('smooth');
            } else {
              setHasUnseenBelow(true);
            }
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as ChatMessage;
          setMessages((prev) => mergeSortedMessages(prev, [updated]));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `id=eq.${conversationId}`,
        },
        (payload) => {
          const updatedConv = payload.new as Partial<ConversationItem>;
          setConversation((prev) =>
            prev
              ? {
                  ...prev,
                  status: updatedConv.status ?? prev.status,
                  last_message_preview:
                    updatedConv.last_message_preview ?? prev.last_message_preview,
                  last_message_at: updatedConv.last_message_at ?? prev.last_message_at,
                }
              : prev
          );
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeState('connected');
          if (hasSubscribedOnceRef.current) {
            void reconcileMissedMessages();
          }
          hasSubscribedOnceRef.current = true;
        } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
          setRealtimeState('reconnecting');
        } else if (status === 'CLOSED') {
          setRealtimeState((prev) => (isOnline ? 'reconnecting' : prev));
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [
    conversationId,
    user,
    isOnline,
    isNearBottom,
    scrollToBottom,
    markAsReadAndSync,
    reconcileMissedMessages,
  ]);

  useEffect(() => {
    const onOnline = () => {
      void reconcileMissedMessages();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [reconcileMissedMessages]);

  const handleLoadOlder = async () => {
    if (!conversationId || loadingOlder || !hasMoreOlder || messages.length === 0) return;
    const oldest = messages[0];
    const scrollEl = scrollBoxRef.current;
    const prevScrollHeight = scrollEl?.scrollHeight ?? 0;

    setLoadingOlder(true);
    try {
      const page = await getMessagesPage(conversationId, {
        limit: PAGE_SIZE,
        beforeCreatedAt: oldest.created_at,
        beforeId: oldest.id,
      });

      setMessages((prev) => mergeSortedMessages(page.messages, prev));
      setHasMoreOlder(page.hasMore);

      requestAnimationFrame(() => {
        if (scrollEl) {
          const delta = scrollEl.scrollHeight - prevScrollHeight;
          scrollEl.scrollTop += delta;
        }
      });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'خطا در بارگذاری پیام‌های قدیمی‌تر', 'error');
    } finally {
      setLoadingOlder(false);
    }
  };

  const dispatchMessage = async (content: string, existingTempId?: string) => {
    if (!conversationId || !user) return;
    const validationError = validateChatMessage(content);
    if (validationError) {
      showToast(validationError, 'error');
      return;
    }

    const trimmed = content.trim();
    const tempId = existingTempId ?? crypto.randomUUID();
    const nowIso = new Date().toISOString();

    if (!navigator.onLine) {
      if (existingTempId) {
        setPendingOutbox((prev) =>
          prev.map((m) =>
            m.clientTempId === tempId
              ? { ...m, status: 'failed', errorMessage: 'اتصال اینترنت قطع است.' }
              : m
          )
        );
      } else {
        setPendingOutbox((prev) => [
          ...prev,
          {
            clientTempId: tempId,
            content: trimmed,
            createdAt: nowIso,
            status: 'failed',
            errorMessage: 'اتصال اینترنت قطع است؛ پیام به سرور ارسال نشد.',
          },
        ]);
        setDraft('');
      }
      requestAnimationFrame(() => scrollToBottom('smooth'));
      return;
    }

    if (existingTempId) {
      setPendingOutbox((prev) =>
        prev.map((m) =>
          m.clientTempId === tempId
            ? { ...m, status: 'sending', errorMessage: undefined }
            : m
        )
      );
    } else {
      setPendingOutbox((prev) => [
        ...prev,
        {
          clientTempId: tempId,
          content: trimmed,
          createdAt: nowIso,
          status: 'sending',
        },
      ]);
      setDraft('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }

    requestAnimationFrame(() => scrollToBottom('smooth'));

    try {
      const savedMsg = await sendChatMessage(conversationId, trimmed);
      setPendingOutbox((prev) => prev.filter((m) => m.clientTempId !== tempId));
      setMessages((prev) => mergeSortedMessages(prev, [savedMsg]));
      notifyMessagesChanged();
      requestAnimationFrame(() => scrollToBottom('smooth'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ارسال پیام با خطا مواجه شد.';
      setPendingOutbox((prev) =>
        prev.map((m) =>
          m.clientTempId === tempId ? { ...m, status: 'failed', errorMessage: msg } : m
        )
      );
      showToast(msg, 'error');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    await dispatchMessage(draft);
  };

  const handleTextareaKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (draft.trim()) {
        void dispatchMessage(draft);
      }
    }
  };

  const handleDraftChange = (val: string) => {
    setDraft(val);
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
    }
  };

  const handleSubmitReport = async (e: FormEvent) => {
    e.preventDefault();
    if (!conversationId) return;
    setReportBusy(true);
    try {
      await submitConversationReport(conversationId, reportReason, reportDetails);
      showToast('گزارش شما با موفقیت ثبت شد و برای بررسی نگهداری گردید.', 'success');
      setReportOpen(false);
      setReportDetails('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'ثبت گزارش با خطا مواجه شد.', 'error');
    } finally {
      setReportBusy(false);
    }
  };

  const handleToggleBlock = async () => {
    if (!conversation) return;
    setBlockBusy(true);
    try {
      if (blockStatus.blocked_by_me) {
        await unblockUser(conversation.other_user_id);
        showToast(`مسدودیت «${conversation.other_user_name}» برداشته شد.`, 'success');
      } else {
        await blockUser(conversation.other_user_id);
        showToast(`«${conversation.other_user_name}» مسدود شد و امکان ارسال پیام جدید وجود ندارد.`, 'info');
      }
      const nextStatus = await getBlockStatusWith(conversation.other_user_id);
      setBlockStatus(nextStatus);
      setBlockDialogOpen(false);
      await reconcileMissedMessages();
      notifyMessagesChanged();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'تغییر وضعیت مسدودسازی انجام نشد.', 'error');
    } finally {
      setBlockBusy(false);
    }
  };

  const privacyHint = useMemo(() => detectSensitivePrivacyText(draft), [draft]);

  const handleScrollBox = () => {
    const nearBottom = isNearBottom();
    setShowJumpToBottom(!nearBottom);
    if (nearBottom) setHasUnseenBelow(false);
  };

  if (loadingInitial) {
    return <LoadingState label="در حال بارگذاری گفت‌وگو..." />;
  }

  if (errorMsg || !conversation) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-brand-surface bg-white p-8 text-center">
        <AlertCircle className="mx-auto mb-3 h-10 w-10 text-brand-text" />
        <h1 className="mb-2 text-lg font-extrabold text-brand-primary">دسترسی به گفت‌وگو امکان‌پذیر نیست</h1>
        <p className="mb-5 text-sm leading-7 text-brand-text/75">
          {errorMsg ?? 'این گفت‌وگو وجود ندارد یا شما مجاز به مشاهده آن نیستید.'}
        </p>
        <div className="flex flex-wrap justify-center gap-2.5">
          <button
            type="button"
            onClick={() => void loadInitialChat()}
            className="inline-flex items-center gap-2 rounded-xl border border-brand-primary bg-white px-5 py-2.5 text-sm font-bold text-brand-primary hover:bg-brand-surface/35"
          >
            <RefreshCw className="h-4 w-4" />
            تلاش مجدد
          </button>
          <Link
            to="/messages"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-green"
          >
            <ArrowRight className="h-4 w-4" />
            بازگشت به پیام‌ها
          </Link>
        </div>
      </div>
    );
  }

  const isRequester = conversation.requester_id === user?.id;
  const partnerRoleLabel = isRequester ? 'داوطلب کمک' : 'ثبت‌کننده درخواست';
  const canSendMessage =
    !blockStatus.any_block &&
    conversation.status === 'active' &&
    (conversation.request_status === 'open' || conversation.request_status === 'in_progress');
  const statusMeta = CONVERSATION_STATUS_META[conversation.status];

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col overflow-hidden bg-white md:h-[calc(100dvh-9.5rem)] md:flex-none md:rounded-2xl md:border md:border-brand-surface animate-fade-up">
      {/* Chat Header */}
      <header className="shrink-0 border-b border-brand-surface bg-white px-3 py-2.5 sm:px-5 sm:py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <Link
              to="/messages"
              aria-label="بازگشت به فهرست پیام‌ها"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-surface bg-brand-bg text-brand-primary hover:bg-brand-surface/60 sm:h-9 sm:w-9"
            >
              <ArrowRight className="h-4 w-4" />
            </Link>

            {conversation.other_user_avatar ? (
              <ProtectedImage
                src={conversation.other_user_avatar}
                alt={conversation.other_user_name}
                wrapperClassName="relative block h-10 w-10 shrink-0 overflow-hidden rounded-2xl border border-brand-surface"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-surface text-xs font-extrabold text-brand-primary">
                {getInitials(conversation.other_user_name)}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="truncate text-sm font-extrabold text-brand-text sm:text-base">
                  {conversation.other_user_name}
                </h1>
                <span className="shrink-0 rounded-lg bg-brand-surface/70 px-2 py-0.5 text-[10px] font-bold text-brand-primary">
                  {partnerRoleLabel}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-brand-text/70">
                <span
                  className={`inline-flex items-center gap-1 font-medium ${
                    realtimeState === 'connected'
                      ? 'text-brand-green'
                      : 'text-brand-text/75'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      realtimeState === 'connected'
                        ? 'bg-brand-green'
                        : realtimeState === 'offline'
                          ? 'bg-brand-text/60'
                          : 'bg-brand-gold animate-pulse'
                    }`}
                  />
                  {realtimeState === 'connected'
                    ? 'متصل (لحظه‌ای)'
                    : realtimeState === 'offline'
                      ? 'آفلاین'
                      : 'در حال اتصال...'}
                </span>
                {conversation.other_user_city && <span>· {conversation.other_user_city}</span>}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => setBlockDialogOpen(true)}
              title={blockStatus.blocked_by_me ? 'رفع مسدودیت کاربر' : 'مسدود کردن کاربر'}
              className={`inline-flex shrink-0 items-center gap-1 rounded-xl border px-2.5 py-2 text-[11px] font-bold transition ${
                blockStatus.blocked_by_me
                  ? 'border-brand-primary bg-brand-surface/70 text-brand-primary'
                  : 'border-brand-surface bg-brand-bg text-brand-text/75 hover:border-brand-text/30 hover:text-brand-text'
              }`}
            >
              <Ban className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {blockStatus.blocked_by_me ? 'رفع مسدودیت' : 'مسدودسازی'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setReportOpen(true)}
              title="گزارش گفت‌وگو یا رفتار نامناسب"
              className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-brand-surface bg-brand-bg px-2.5 py-2 text-[11px] font-bold text-brand-text/75 hover:border-brand-text/30 hover:text-brand-text"
            >
              <Flag className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">گزارش</span>
            </button>
          </div>
        </div>

        {/* Linked Request Bar */}
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-brand-bg px-3 py-2">
          <Link
            to={`/requests/${conversation.request_id}`}
            className="min-w-0 flex-1 truncate text-xs font-bold text-brand-primary hover:underline"
          >
            درخواست مرتبط: {conversation.request_title}
          </Link>
          <div className="flex shrink-0 items-center gap-1.5">
            <RequestStatusBadge status={conversation.request_status} />
            <ConversationStatusBadge status={conversation.status} />
          </div>
        </div>
      </header>

      {/* Disconnected / Reconnecting Bar */}
      {!isOnline && (
        <div className="flex shrink-0 items-center gap-2 border-b border-brand-surface bg-brand-bg px-4 py-2 text-xs font-medium text-brand-text">
          <WifiOff className="h-4 w-4 shrink-0 text-brand-green" />
          <span>ارتباط با اینترنت قطع است؛ پیام‌های جدید پس از اتصال مجدد همگام‌سازی می‌شوند.</span>
        </div>
      )}

      {/* Messages Feed */}
      <div
        ref={scrollBoxRef}
        onScroll={handleScrollBox}
        className="relative flex-1 space-y-3 overflow-y-auto bg-brand-bg/80 px-3 py-4 sm:px-5"
      >
        <div className="mx-auto flex max-w-md items-center justify-center gap-1.5 rounded-2xl border border-brand-surface bg-white/90 px-3 py-2 text-center text-[11px] text-brand-text/70">
          <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-brand-green" />
          <span>این گفت‌وگو خصوصی است. تا پیش از اطمینان از هماهنگی، نشانی دقیق یا اطلاعات حساس ارسال نکنید.</span>
        </div>

        {hasMoreOlder && (
          <div className="flex justify-center py-1">
            <button
              type="button"
              onClick={() => void handleLoadOlder()}
              disabled={loadingOlder}
              className="inline-flex items-center gap-1.5 rounded-full border border-brand-surface bg-white px-4 py-1.5 text-xs font-bold text-brand-primary shadow-2xs hover:bg-brand-surface/40 disabled:opacity-60"
            >
              {loadingOlder ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  در حال بارگذاری...
                </>
              ) : (
                'بارگذاری پیام‌های قدیمی‌تر'
              )}
            </button>
          </div>
        )}

        {messages.length === 0 && pendingOutbox.length === 0 ? (
          <div className="py-10 text-center">
            <div className="mx-auto max-w-xs rounded-2xl border border-dashed border-brand-soft/60 bg-white p-5 text-xs leading-6 text-brand-text/75">
              هنوز پیامی ردوبدل نشده است. برای هماهنگی زمان، نحوه کمک یا پرسش‌های مرتبط نخستین پیام را ارسال کنید.
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMine = msg.sender_id === user?.id;
            const prevMsg = idx > 0 ? messages[idx - 1] : null;
            const currentDay = formatChatDayLabelFa(msg.created_at);
            const prevDay = prevMsg ? formatChatDayLabelFa(prevMsg.created_at) : null;
            const showDayDivider = currentDay !== prevDay;
            const showUnreadDivider = firstUnreadMessageId === msg.id;

            return (
              <div key={msg.id} className="space-y-2.5">
                {showDayDivider && (
                  <div className="flex justify-center py-1">
                    <span className="rounded-full bg-brand-surface/75 px-3 py-0.5 text-[11px] font-semibold text-brand-primary">
                      {currentDay}
                    </span>
                  </div>
                )}

                {showUnreadDivider && (
                  <div className="flex items-center gap-2 py-1">
                    <div className="h-px flex-1 bg-brand-gold/70" />
                    <span className="rounded-full border border-brand-gold/60 bg-white px-3 py-0.5 text-[11px] font-bold text-brand-text">
                      پیام‌های خوانده‌نشده
                    </span>
                    <div className="h-px flex-1 bg-brand-gold/70" />
                  </div>
                )}

                {/* In RTL: justify-start aligns right (own messages), justify-end aligns left (partner messages) */}
                <div className={`flex w-full ${isMine ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 shadow-2xs sm:max-w-[74%] ${
                      isMine
                        ? 'rounded-br-sm bg-brand-primary text-white'
                        : 'rounded-bl-sm border border-brand-surface bg-white text-brand-text'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words text-sm leading-6">
                      {msg.content}
                    </p>
                    <div
                      className={`mt-1 flex items-center justify-end gap-1.5 text-[10px] ${
                        isMine ? 'text-brand-surface/90' : 'text-brand-text/70'
                      }`}
                    >
                      <span>{formatTimeFa(msg.created_at)}</span>
                      {isMine &&
                        (msg.read_at ? (
                          <span className="inline-flex items-center gap-0.5 text-brand-soft" title="خوانده شده">
                            <CheckCheck className="h-3.5 w-3.5" />
                            <span>خوانده شد</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5" title="ارسال شده">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Pending / Failed Local Outbox Items — explicitly separated from persisted DB messages */}
        {pendingOutbox.map((item) => (
          <div key={item.clientTempId} className="flex w-full justify-start">
            <div
              className={`max-w-[82%] rounded-2xl rounded-br-sm px-3.5 py-2.5 sm:max-w-[74%] ${
                item.status === 'failed'
                  ? 'border border-brand-text/35 bg-white text-brand-text'
                  : 'bg-brand-green/80 text-white'
              }`}
            >
              <p className="whitespace-pre-wrap break-words text-sm leading-6">{item.content}</p>
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[10px]">
                {item.status === 'sending' ? (
                  <span className="inline-flex items-center gap-1 text-brand-surface">
                    <Clock className="h-3 w-3 animate-pulse" />
                    در حال ارسال...
                  </span>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1 font-bold text-brand-text">
                      <AlertCircle className="h-3 w-3" />
                      ارسال نشد
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => void dispatchMessage(item.content, item.clientTempId)}
                        className="inline-flex items-center gap-1 rounded-lg bg-brand-primary px-2 py-0.5 font-bold text-white hover:bg-brand-green"
                      >
                        <RefreshCw className="h-3 w-3" />
                        تلاش مجدد
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPendingOutbox((prev) =>
                            prev.filter((m) => m.clientTempId !== item.clientTempId)
                          )
                        }
                        className="rounded-lg p-1 text-brand-text/70 hover:bg-brand-bg hover:text-brand-text"
                        title="حذف پیام ارسال‌نشده"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Jump to latest message button */}
      {(showJumpToBottom || hasUnseenBelow) && (
        <div className="pointer-events-none relative flex justify-center">
          <button
            type="button"
            onClick={() => scrollToBottom('smooth')}
            className="pointer-events-auto absolute bottom-2 inline-flex items-center gap-1 rounded-full border border-brand-soft bg-brand-primary px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-brand-green"
          >
            <ArrowDown className="h-3.5 w-3.5" />
            {hasUnseenBelow ? 'پیام جدید' : 'آخرین پیام‌ها'}
          </button>
        </div>
      )}

      {/* Composer or Lifecycle Status Lock */}
      <footer className="shrink-0 border-t border-brand-surface bg-white px-3 py-2.5 pb-[max(0.65rem,env(safe-area-inset-bottom))] sm:p-4">
        {!canSendMessage ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-surface bg-brand-bg px-3.5 py-2.5 text-xs text-brand-text/80 sm:px-4 sm:py-3">
            <div className="flex items-center gap-2">
              {blockStatus.any_block ? (
                <Ban className="h-4 w-4 shrink-0 text-brand-text" />
              ) : (
                <Lock className="h-4 w-4 shrink-0 text-brand-primary" />
              )}
              <span>
                {blockStatus.blocked_by_me
                  ? 'شما این کاربر را مسدود کرده‌اید؛ امکان ارسال پیام در این گفت‌وگو بسته است.'
                  : blockStatus.blocked_by_other
                    ? 'امکان ارسال پیام جدید به دلیل محدودیت ارتباطی از سوی کاربر مقابل وجود ندارد.'
                    : statusMeta.helperNote}
              </span>
            </div>
            {blockStatus.blocked_by_me ? (
              <button
                type="button"
                onClick={() => setBlockDialogOpen(true)}
                className="shrink-0 rounded-xl bg-brand-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-green"
              >
                رفع مسدودیت
              </button>
            ) : (
              <Link
                to={`/requests/${conversation.request_id}`}
                className="shrink-0 font-bold text-brand-primary hover:underline"
              >
                صفحه درخواست
              </Link>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-1.5 sm:space-y-2">
            {(privacyHint.hasPhoneNumber || privacyHint.hasExactAddressHint) && (
              <div className="rounded-xl border border-brand-gold/60 bg-brand-bg px-3 py-1.5 text-[11px] font-medium text-brand-text">
                توجه: متن شما شامل شماره تماس یا جزئیات دقیق نشانی است؛ تنها در صورت اطمینان برای هماهنگی ارسال کنید.
              </div>
            )}

            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                rows={1}
                value={draft}
                maxLength={MAX_CHAT_MESSAGE_LENGTH}
                onChange={(e) => handleDraftChange(e.target.value)}
                onKeyDown={handleTextareaKeyDown}
                placeholder={
                  isOnline
                    ? 'پیام خود را بنویسید...'
                    : 'اتصال اینترنت قطع است...'
                }
                className="max-h-36 min-h-[44px] flex-1 resize-none rounded-2xl border border-brand-surface bg-brand-bg/70 px-3.5 py-2.5 text-[15px] leading-6 outline-none focus:border-brand-green focus:bg-white sm:px-4 sm:text-sm"
              />

              <button
                type="submit"
                disabled={!draft.trim()}
                aria-label="ارسال پیام"
                className="inline-flex h-11 min-w-[44px] shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-brand-primary px-3.5 text-sm font-bold text-white shadow-xs transition hover:bg-brand-green disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
              >
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">ارسال</span>
              </button>
            </div>

            <div className="hidden items-center justify-between px-1 text-[10px] text-brand-text/70 sm:flex">
              <span>ارسال با Enter · خط جدید با Shift + Enter</span>
              {draft.length > 1400 && (
                <span>
                  {toPersianDigits(draft.length)} / {toPersianDigits(MAX_CHAT_MESSAGE_LENGTH)}
                </span>
              )}
            </div>
            {draft.length > 1400 && (
              <div className="px-1 text-left text-[10px] text-brand-text/70 sm:hidden">
                {toPersianDigits(draft.length)} / {toPersianDigits(MAX_CHAT_MESSAGE_LENGTH)}
              </div>
            )}
          </form>
        )}
      </footer>

      {/* Report Modal — Native bottom sheet on mobile */}
      {reportOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-brand-text/50 p-0 backdrop-blur-xs sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-t-2xl border border-brand-surface bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-sm animate-fade-up sm:rounded-2xl sm:p-6">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-brand-surface sm:hidden" />
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-extrabold text-brand-primary">
                گزارش گفت‌وگو یا رفتار نامناسب
              </h2>
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className="rounded-xl p-1 text-brand-text/70 hover:bg-brand-bg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReport} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-brand-text">
                  علت گزارش
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value as ConversationReportReason)}
                  className="min-h-[44px] w-full rounded-2xl border border-brand-surface bg-brand-bg/60 px-3.5 py-2.5 text-[15px] outline-none focus:border-brand-green sm:text-sm"
                >
                  {CONVERSATION_REPORT_REASONS.map((r) => (
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
                  placeholder="توضیح مختصری درباره مورد پیش‌آمده بنویسید..."
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

      <ConfirmDialog
        open={blockDialogOpen}
        busy={blockBusy}
        title={
          blockStatus.blocked_by_me
            ? `رفع مسدودیت ${conversation.other_user_name}`
            : `مسدود کردن ${conversation.other_user_name}`
        }
        description={
          blockStatus.blocked_by_me
            ? 'با رفع مسدودیت، امکان ارسال پیام یا همکاری مجدد با این کاربر دوباره برقرار می‌شود.'
            : 'با مسدود کردن این کاربر، هر دو طرف امکان ارسال پیام جدید یا ثبت اعلام آمادگی روی درخواست‌های یکدیگر را نخواهید داشت.'
        }
        confirmLabel={blockStatus.blocked_by_me ? 'بله، رفع مسدودیت' : 'بله، مسدود شود'}
        tone={blockStatus.blocked_by_me ? 'primary' : 'danger'}
        onConfirm={() => void handleToggleBlock()}
        onCancel={() => setBlockDialogOpen(false)}
      />
    </div>
  );
}
