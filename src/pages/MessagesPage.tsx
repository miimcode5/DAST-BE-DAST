import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  HandHelping,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ConversationListPane } from '../components/ConversationListPane';
import { EmptyState } from '../components/EmptyState';
import { ListRowSkeleton } from '../components/LoadingState';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { toPersianDigits } from '../lib/formatters';
import { supabase } from '../lib/supabase';
import { getMyConversations } from '../services/chatService';
import type { ConversationItem } from '../types/database';

export function MessagesPage() {
  const { user } = useAuth();
  const { refreshUnreadCount } = useChat();

  const [items, setItems] = useState<ConversationItem[]>([]);
  const [fromOfflineCache, setFromOfflineCache] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    setErrorMsg(null);
    try {
      const res = await getMyConversations(user.id);
      setItems(res.items);
      setFromOfflineCache(res.fromOfflineCache);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'خطا در بارگذاری گفت‌وگوها');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadConversations();
    void refreshUnreadCount();
  }, [loadConversations, refreshUnreadCount]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`messages-list-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        void loadConversations();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations' }, () => {
        void loadConversations();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, loadConversations]);

  const filteredItems = useMemo(() => {
    const q = search.trim();
    return items.filter((item) => {
      if (unreadOnly && item.unread_count === 0) return false;
      if (!q) return true;
      return (
        item.other_user_name.includes(q) ||
        item.request_title.includes(q) ||
        (item.last_message_preview?.includes(q) ?? false)
      );
    });
  }, [items, search, unreadOnly]);

  const totalUnread = useMemo(
    () => items.reduce((sum, item) => sum + item.unread_count, 0),
    [items]
  );

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-[#DCEBDD] bg-white p-4 shadow-[0_2px_10px_rgba(23,77,53,0.03)] sm:p-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#26734B]">
            <MessageCircle className="h-4 w-4 text-[#E9B949]" />
            <span>گفت‌وگوهای خصوصی</span>
          </div>
          <h1 className="text-lg font-bold text-[#174D35] sm:text-2xl">پیام‌ها و هماهنگی</h1>
          <p className="text-xs font-normal text-[#505E50] sm:text-sm">
            گفت‌وگوها مستقیماً برای هر اعلام آمادگی ساخته می‌شوند تا با آرامش هماهنگ شوید.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {totalUnread > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E9B949]/25 px-3 py-1.5 text-xs font-bold text-[#6F4E06]">
              <span>{toPersianDigits(totalUnread)} پیام خوانده‌نشده</span>
            </span>
          )}
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#F6F7F2] px-3 py-1.5 text-xs font-medium text-[#174D35]">
            <ShieldCheck className="h-3.5 w-3.5 text-[#26734B]" />
            <span>گفت‌وگوی امن و خصوصی</span>
          </div>
        </div>
      </header>

      {fromOfflineCache && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900">
          در حال نمایش فهرست ذخیره‌شده گفت‌وگوها در حالت آفلاین هستید. برای مشاهده پیام‌های جدید به اینترنت متصل شوید.
        </div>
      )}

      {errorMsg && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800 sm:text-sm">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, idx) => (
            <ListRowSkeleton key={idx} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title="هنوز گفت‌وگویی آغاز نشده است"
          description="وقتی برای درخواستی اعلام آمادگی کنید یا داوطلبی برای درخواست شما پیام بگذارد، گفت‌وگوی خصوصی آن اینجا نمایش داده می‌شود."
          action={
            <Link
              to="/requests"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-[#174D35] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#26734B]"
            >
              <HandHelping className="h-4 w-4 text-[#E9B949]" />
              مشاهده درخواست‌های نیازمند کمک
            </Link>
          }
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[390px_1fr] lg:items-start">
          {/* Conversation list */}
          <div className="space-y-3">
            {/* Search & unread filter */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#627062]" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="جست‌وجو در نام یا عنوان..."
                  className="min-h-[42px] w-full rounded-2xl border border-[#DCEBDD] bg-white pr-10 pl-3 text-xs font-normal outline-none focus:border-[#26734B] sm:text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => setUnreadOnly((v) => !v)}
                className={`min-h-[42px] shrink-0 rounded-2xl border px-3.5 text-xs font-semibold transition ${
                  unreadOnly
                    ? 'border-[#174D35] bg-[#174D35] text-white'
                    : 'border-[#DCEBDD] bg-white text-[#202820] hover:border-[#78B98A]'
                }`}
              >
                خوانده‌نشده
              </button>
            </div>

            {filteredItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#DCEBDD] bg-white p-6 text-center text-xs text-[#556455]">
                گفت‌وگویی با این فیلتر پیدا نشد.
              </div>
            ) : (
              <ConversationListPane
                items={filteredItems}
                loading={false}
                currentUserId={user?.id}
              />
            )}
          </div>

          {/* Desktop split welcome pane */}
          <aside className="hidden rounded-3xl border border-[#DCEBDD] bg-white p-8 text-center lg:block">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#DCEBDD]/70 text-[#174D35]">
              <Sparkles className="h-7 w-7 text-[#26734B]" />
            </div>
            <h2 className="text-base font-bold text-[#174D35]">یک گفت‌وگو را انتخاب کنید</h2>
            <p className="mx-auto mt-2 max-w-md text-sm font-normal leading-7 text-[#505E50]">
              با انتخاب هر مورد از فهرست سمت راست، گفت‌وگوی خصوصی باز می‌شود و می‌توانید زمان، مکان و جزئیات همیاری را با آرامش هماهنگ کنید.
            </p>
            <div className="mx-auto mt-6 max-w-sm rounded-2xl bg-[#F6F7F2] px-4 py-3 text-xs leading-6 text-[#344634]">
              شماره تماس و اطلاعات شخصی خود را فقط در صورت اطمینان کامل و نیاز واقعی در گفت‌وگو به اشتراک بگذارید.
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
