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
    <div className="mx-auto mb-5 flex h-28 w-28 items-center justify-center rounded-full bg-[#DCEBDD]/70 p-4">
      <svg viewBox="0 0 120 120" className="h-24 w-24" aria-hidden="true">
        <rect x="14" y="20" width="64" height="44" rx="14" fill="#174D35" />
        <path d="M28 64 L22 76 L40 64 Z" fill="#174D35" />
        <circle cx="34" cy="42" r="4" fill="#DCEBDD" />
        <circle cx="46" cy="42" r="4" fill="#DCEBDD" />
        <circle cx="58" cy="42" r="4" fill="#DCEBDD" />

        <rect x="42" y="54" width="64" height="42" rx="14" fill="#FFFFFF" stroke="#78B98A" strokeWidth="3" />
        <path d="M92 96 L98 106 L80 96 Z" fill="#FFFFFF" stroke="#78B98A" strokeWidth="3" strokeLinejoin="round" />
        <rect x="54" y="68" width="40" height="5" rx="2.5" fill="#26734B" opacity="0.85" />
        <rect x="64" y="79" width="30" height="5" rx="2.5" fill="#78B98A" />
        <circle cx="98" cy="24" r="6" fill="#E9B949" />
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
            <h1 className="text-xl font-extrabold text-[#174D35]">پیام‌ها</h1>
            {unreadCount > 0 && (
              <span className="rounded-full bg-[#174D35] px-2.5 py-0.5 text-xs font-bold text-white">
                {toPersianDigits(unreadCount)} خوانده‌نشده
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[#505E50]">
            گفت‌وگوهای خصوصی و مجزا برای هر درخواست کمک و هر داوطلب
          </p>
        </div>

        <Link
          to="/requests"
          className="inline-flex items-center gap-1.5 rounded-2xl border border-[#DCEBDD] bg-white px-4 py-2 text-xs font-bold text-[#174D35] hover:border-[#78B98A]"
        >
          <Sparkles className="h-4 w-4 text-[#E9B949]" />
          مرور درخواست‌ها
        </Link>
      </div>

      {(!isOnline || fromOfflineCache) && (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>
            نسخه ذخیره‌شده گفت‌وگوها نمایش داده می‌شود. برای دریافت پیام‌های لحظه‌ای و ارسال پیام، اینترنت را متصل کنید.
          </span>
        </div>
      )}

      {errorMsg && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => void loadConversations(false)}
            className="rounded-xl bg-rose-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-rose-800"
          >
            تلاش مجدد
          </button>
        </div>
      )}

      {conversations.length > 0 && (
        <div className="space-y-3 rounded-3xl border border-[#DCEBDD] bg-white p-4 shadow-xs">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#667466]" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جست‌وجو بر اساس نام کاربر، عنوان درخواست یا متن پیام..."
              className="w-full rounded-2xl border border-[#DCEBDD] bg-[#F6F7F2]/70 py-2.5 pr-10 pl-4 text-sm outline-none focus:border-[#26734B] focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap gap-2">
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
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                  filterTab === t.id
                    ? 'border-[#174D35] bg-[#174D35] text-white'
                    : 'border-[#DCEBDD] bg-[#F6F7F2] text-[#202820] hover:border-[#78B98A]'
                }`}
              >
                <span>{t.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    filterTab === t.id ? 'bg-white/20 text-white' : 'bg-[#DCEBDD] text-[#174D35]'
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
        <div className="rounded-3xl border border-dashed border-[#78B98A]/70 bg-white px-6 py-12 text-center shadow-xs">
          <ChatEmptyIllustration />
          <h2 className="text-lg font-extrabold text-[#174D35]">هنوز گفت‌وگویی آغاز نشده است</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-[#505E50]">
            وقتی برای یک درخواست کمک گزینه «من می‌توانم کمک کنم» را ثبت کنید یا داوطلبی برای درخواست شما اعلام آمادگی کند، گفت‌وگوی خصوصی و لحظه‌ای شما اینجا ساخته می‌شود.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/requests"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#174D35] px-5 py-3 text-sm font-bold text-white hover:bg-[#26734B]"
            >
              <MessageCircle className="h-4 w-4" />
              مشاهده درخواست‌های کمک
            </Link>
            <Link
              to="/requests/new"
              className="inline-flex items-center gap-2 rounded-2xl border border-[#174D35] px-5 py-3 text-sm font-bold text-[#174D35] hover:bg-[#DCEBDD]/40"
            >
              ثبت درخواست جدید
            </Link>
          </div>
        </div>
      ) : filteredConversations.length === 0 ? (
        <div className="rounded-3xl border border-[#DCEBDD] bg-white p-8 text-center">
          <p className="text-sm font-semibold text-[#505E50]">
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
                className={`block rounded-3xl border bg-white p-4 transition hover:border-[#78B98A] hover:shadow-sm sm:p-5 ${
                  conv.unread_count > 0
                    ? 'border-[#26734B] ring-1 ring-[#78B98A]/40'
                    : 'border-[#DCEBDD]'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {conv.other_user_avatar ? (
                      <img
                        src={conv.other_user_avatar}
                        alt={conv.other_user_name}
                        className="h-12 w-12 rounded-2xl border border-[#DCEBDD] object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#DCEBDD] text-sm font-extrabold text-[#174D35]">
                        {getInitials(conv.other_user_name)}
                      </div>
                    )}
                    {conv.unread_count > 0 && (
                      <span className="absolute -left-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#174D35] px-1.5 text-[11px] font-extrabold text-white ring-2 ring-white">
                        {toPersianDigits(conv.unread_count)}
                      </span>
                    )}
                  </div>

                  {/* Body */}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm font-extrabold text-[#202820]">
                          {conv.other_user_name}
                        </span>
                        <span className="rounded-lg bg-[#F6F7F2] px-2 py-0.5 text-[10px] font-semibold text-[#26734B]">
                          {roleLabel}
                        </span>
                      </div>
                      <span className="shrink-0 text-[11px] font-medium text-[#667466]">
                        {formatRelativeTimeFa(lastTime)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-xs font-bold text-[#174D35]">
                        {conv.request_title}
                      </span>
                      <CategoryBadge category={conv.request_category} />
                      <ConversationStatusBadge status={conv.status} />
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <p
                        className={`truncate text-xs leading-6 ${
                          conv.unread_count > 0
                            ? 'font-bold text-[#202820]'
                            : 'text-[#556455]'
                        }`}
                      >
                        {conv.last_message_preview ? (
                          <>
                            {sentByMe && (
                              <span className="ml-1 inline-flex items-center gap-0.5 text-[#26734B]">
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
                        <span className="shrink-0 rounded-full bg-[#E9B949]/25 px-2 py-0.5 text-[10px] font-extrabold text-[#7A5807]">
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
