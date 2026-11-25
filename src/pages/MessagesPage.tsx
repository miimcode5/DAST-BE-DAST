import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCheck,
  MessageCircle,
  Search,
  Sparkles,
  WifiOff,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { LoadingState } from '../components/LoadingState';
import { ProtectedImage } from '../components/ProtectedImage';
import { CategoryBadge, ConversationStatusBadge } from '../components/StatusBadge';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { usePwa } from '../contexts/PwaContext';
import { formatRelativeTimeFa, getInitials, toPersianDigits } from '../lib/formatters';
import { getMyConversations } from '../services/chatService';
import type { ConversationItem } from '../types/database';

type FilterTab = 'all' | 'unread' | 'active';

function ChatEmptyIllustration() {
  return (
    <div className="mx-auto mb-5 flex h-28 w-28 items-center justify-center rounded-full bg-brand-surface/70 p-4">
      <svg viewBox="0 0 120 120" className="h-24 w-24" aria-hidden="true">
        <rect x="14" y="20" width="64" height="44" rx="14" fill="var(--color-primary)" />
        <path d="M28 64 L22 76 L40 64 Z" fill="var(--color-primary)" />
        <circle cx="34" cy="42" r="4" fill="var(--color-surface-green)" />
        <circle cx="46" cy="42" r="4" fill="var(--color-surface-green)" />
        <circle cx="58" cy="42" r="4" fill="var(--color-surface-green)" />

        <rect x="42" y="54" width="64" height="42" rx="14" fill="var(--color-white)" stroke="var(--color-soft-green)" strokeWidth="3" />
        <path d="M92 96 L98 106 L80 96 Z" fill="var(--color-white)" stroke="var(--color-soft-green)" strokeWidth="3" strokeLinejoin="round" />
        <rect x="54" y="68" width="40" height="5" rx="2.5" fill="var(--color-green)" opacity="0.85" />
        <rect x="64" y="79" width="30" height="5" rx="2.5" fill="var(--color-soft-green)" />
        <circle cx="98" cy="24" r="6" fill="var(--color-gold)" />
      </svg>
    </div>
  );
}

export function MessagesPage() {
  const { user } = useAuth();
  const { chatRevision, unreadCount } = useChat();
  const { isOnline } = usePwa();

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [fromOfflineCache, setFromOfflineCache] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadConversations = useCallback(
    async (silent = false) => {
      if (!user) return;
      if (!silent) setLoading(true);
      setErrorMsg(null);
      try {
        const { items, fromOfflineCache: cached } = await getMyConversations(user.id);
        setConversations(items);
        setFromOfflineCache(cached);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'خطا در دریافت فهرست گفت‌وگوها');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [user]
  );

  useEffect(() => {
    void loadConversations(false);
  }, [loadConversations]);

  // Real-time refresh without page reload when messages or conversations update
  useEffect(() => {
    if (chatRevision > 0) {
      void loadConversations(true);
    }
  }, [chatRevision, loadConversations]);

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return conversations.filter((conv) => {
      if (filterTab === 'unread' && conv.unread_count === 0) return false;
      if (filterTab === 'active' && conv.status !== 'active') return false;
      if (!q) return true;
      return (
        conv.other_user_name.toLowerCase().includes(q) ||
        conv.request_title.toLowerCase().includes(q) ||
        (conv.last_message_preview ?? '').toLowerCase().includes(q)
      );
    });
  }, [conversations, filterTab, searchQuery]);

  if (loading) {
    return <LoadingState label="در حال بارگذاری گفت‌وگوهای خصوصی..." />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-brand-primary">پیام‌ها</h1>
            {unreadCount > 0 && (
              <span className="rounded-full bg-brand-primary px-2.5 py-0.5 text-xs font-bold text-white">
                {toPersianDigits(unreadCount)} خوانده‌نشده
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-brand-text/70">
            گفت‌وگوهای خصوصی و مجزا برای هر درخواست کمک و هر داوطلب
          </p>
        </div>

        <Link
          to="/requests"
          className="inline-flex items-center gap-1.5 rounded-2xl border border-brand-surface bg-white px-4 py-2 text-xs font-bold text-brand-primary hover:border-brand-soft"
        >
          <Sparkles className="h-4 w-4 text-brand-gold" />
          مرور درخواست‌ها
        </Link>
      </div>

      {(!isOnline || fromOfflineCache) && (
        <div className="flex items-center gap-2 rounded-xl border border-brand-soft/60 bg-brand-surface/50 px-4 py-3 text-xs font-medium text-brand-primary">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>
            نسخه ذخیره‌شده گفت‌وگوها نمایش داده می‌شود. برای دریافت پیام‌های لحظه‌ای و ارسال پیام، اینترنت را متصل کنید.
          </span>
        </div>
      )}

      {errorMsg && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-text/30 bg-white px-4 py-3 text-sm text-brand-text">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => void loadConversations(false)}
            className="rounded-xl bg-brand-primary px-3.5 py-1.5 text-xs font-bold text-white hover:bg-brand-green"
          >
            تلاش مجدد
          </button>
        </div>
      )}

      {conversations.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-brand-surface bg-white p-3.5 sm:p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-text/70" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جست‌وجو بر اساس نام، درخواست یا متن پیام..."
              className="min-h-[44px] w-full rounded-2xl border border-brand-surface bg-brand-bg/70 py-2.5 pr-10 pl-4 text-[15px] outline-none focus:border-brand-green focus:bg-white sm:text-sm"
            />
          </div>

          <div className="no-scrollbar flex flex-nowrap gap-2 overflow-x-auto pb-0.5 sm:flex-wrap">
            {(
              [
                { id: 'all', label: 'همه گفت‌وگوها', count: conversations.length },
                {
                  id: 'unread',
                  label: 'خوانده‌نشده',
                  count: conversations.filter((c) => c.unread_count > 0).length,
                },
                {
                  id: 'active',
                  label: 'فعال',
                  count: conversations.filter((c) => c.status === 'active').length,
                },
              ] as { id: FilterTab; label: string; count: number }[]
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setFilterTab(t.id)}
                className={`inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                  filterTab === t.id
                    ? 'border-brand-primary bg-brand-primary text-white'
                    : 'border-brand-surface bg-brand-bg text-brand-text hover:border-brand-soft'
                }`}
              >
                <span>{t.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    filterTab === t.id ? 'bg-white/20 text-white' : 'bg-brand-surface text-brand-primary'
                  }`}
                >
                  {toPersianDigits(t.count)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {conversations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-soft/70 bg-white px-6 py-12 text-center">
          <ChatEmptyIllustration />
          <h2 className="text-lg font-extrabold text-brand-primary">هنوز گفت‌وگویی آغاز نشده است</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-brand-text/75">
            وقتی برای یک درخواست کمک گزینه «من می‌توانم کمک کنم» را ثبت کنید یا داوطلبی برای درخواست شما اعلام آمادگی کند، گفت‌وگوی خصوصی و لحظه‌ای شما اینجا ساخته می‌شود.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/requests"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-3 text-sm font-bold text-white hover:bg-brand-green"
            >
              <MessageCircle className="h-4 w-4" />
              مشاهده درخواست‌های کمک
            </Link>
            <Link
              to="/requests/new"
              className="inline-flex items-center gap-2 rounded-xl border border-brand-primary px-5 py-3 text-sm font-bold text-brand-primary hover:bg-brand-surface/40"
            >
              ثبت درخواست جدید
            </Link>
          </div>
        </div>
      ) : filteredConversations.length === 0 ? (
        <div className="rounded-2xl border border-brand-surface bg-white p-8 text-center">
          <p className="text-sm font-semibold text-brand-text/75">
            گفت‌وگویی با این فیلتر یا عبارت جست‌وجو پیدا نشد.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredConversations.map((conv) => {
            const isRequester = conv.requester_id === user?.id;
            const roleLabel = isRequester ? 'داوطلب' : 'درخواست‌کننده';
            const lastTime = conv.last_message_at ?? conv.created_at;
            const sentByMe = conv.last_message_sender_id === user?.id;

            return (
              <Link
                key={conv.id}
                to={`/messages/${conv.id}`}
                className={`block rounded-2xl border bg-white p-4 transition hover:border-brand-soft hover:shadow-xs sm:p-5 ${
                  conv.unread_count > 0
                    ? 'border-brand-green ring-1 ring-brand-soft/40'
                    : 'border-brand-surface'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {conv.other_user_avatar ? (
                      <ProtectedImage
                        src={conv.other_user_avatar}
                        alt={conv.other_user_name}
                        wrapperClassName="relative block h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-brand-surface"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-surface text-sm font-extrabold text-brand-primary">
                        {getInitials(conv.other_user_name)}
                      </div>
                    )}
                    {conv.unread_count > 0 && (
                      <span className="absolute -left-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-primary px-1.5 text-[11px] font-extrabold text-white ring-2 ring-white">
                        {toPersianDigits(conv.unread_count)}
                      </span>
                    )}
                  </div>

                  {/* Body */}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                        <span className="truncate text-sm font-extrabold text-brand-text">
                          {conv.other_user_name}
                        </span>
                        <span className="shrink-0 rounded-lg bg-brand-bg px-2 py-0.5 text-[10px] font-semibold text-brand-green">
                          {roleLabel}
                        </span>
                      </div>
                      <span className="shrink-0 text-[11px] font-medium text-brand-text/70">
                        {formatRelativeTimeFa(lastTime)}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="truncate text-xs font-bold text-brand-primary">
                        {conv.request_title}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <CategoryBadge category={conv.request_category} />
                        <ConversationStatusBadge status={conv.status} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <p
                        className={`truncate text-xs leading-6 ${
                          conv.unread_count > 0
                            ? 'font-bold text-brand-text'
                            : 'text-brand-text/70'
                        }`}
                      >
                        {conv.last_message_preview ? (
                          <>
                            {sentByMe && (
                              <span className="ml-1 inline-flex items-center gap-0.5 text-brand-green">
                                <CheckCheck className="inline h-3.5 w-3.5" />
                                شما:
                              </span>
                            )}
                            {conv.last_message_preview}
                          </>
                        ) : (
                          'گفت‌وگو ایجاد شد — برای هماهنگی پیام بنویسید'
                        )}
                      </p>

                      {conv.unread_count > 0 && (
                        <span className="shrink-0 rounded-full border border-brand-gold/60 bg-brand-gold/15 px-2 py-0.5 text-[10px] font-extrabold text-brand-text">
                          پیام جدید
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
