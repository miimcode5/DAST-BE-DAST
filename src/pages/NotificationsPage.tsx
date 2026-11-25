import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  HandHelping,
  KeyRound,
  MessageCircle,
  Sparkles,
  Trash2,
  WifiOff,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { NOTIFICATION_TYPE_META } from '../constants/categories';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationsContext';
import { usePwa } from '../contexts/PwaContext';
import { useToast } from '../contexts/ToastContext';
import { formatRelativeTimeFa, toPersianDigits } from '../lib/formatters';
import {
  deleteNotification,
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notificationsService';
import type { AppNotification, NotificationType } from '../types/database';

type FilterTab = 'all' | 'unread';

function renderNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'new_message':
      return <MessageCircle className="h-5 w-5 text-brand-primary" />;
    case 'new_offer':
    case 'offer_accepted':
    case 'help_started':
    case 'volunteer_done':
      return <HandHelping className="h-5 w-5 text-brand-green" />;
    case 'help_completed':
      return <Sparkles className="h-5 w-5 text-brand-gold" />;
    case 'account_security':
      return <KeyRound className="h-5 w-5 text-brand-primary" />;
    default:
      return <Bell className="h-5 w-5 text-brand-green" />;
  }
}

export function NotificationsPage() {
  const { user } = useAuth();
  const { notificationsRevision, refreshNotifications } = useNotifications();
  const { isOnline } = usePwa();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [items, setItems] = useState<AppNotification[]>([]);
  const [fromOfflineCache, setFromOfflineCache] = useState(false);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadItems = useCallback(
    async (silent = false) => {
      if (!user) return;
      if (!silent) setLoading(true);
      setErrorMsg(null);
      try {
        const res = await getMyNotifications(user.id);
        setItems(res.items);
        setFromOfflineCache(res.fromOfflineCache);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'دریافت اعلان‌ها ناموفق بود.');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [user]
  );

  useEffect(() => {
    void loadItems(false);
  }, [loadItems]);

  useEffect(() => {
    if (notificationsRevision > 0) {
      void loadItems(true);
    }
  }, [notificationsRevision, loadItems]);

  const unreadItems = useMemo(() => items.filter((n) => !n.read_at), [items]);
  const visibleItems = useMemo(
    () => (filterTab === 'unread' ? unreadItems : items),
    [filterTab, items, unreadItems]
  );

  const handleOpenNotification = async (item: AppNotification) => {
    if (!item.read_at && navigator.onLine) {
      try {
        const updated = await markNotificationRead(item.id);
        setItems((prev) => prev.map((n) => (n.id === item.id ? updated : n)));
        await refreshNotifications();
      } catch {
        // Navigate cleanly even if optimistic read mark fails
      }
    }
    if (item.link_path) {
      navigate(item.link_path);
    }
  };

  const handleMarkSingleRead = async (notificationId: string) => {
    if (!navigator.onLine) {
      showToast('برای ثبت تغییر وضعیت به اینترنت متصل شوید.', 'warning');
      return;
    }
    try {
      const updated = await markNotificationRead(notificationId);
      setItems((prev) => prev.map((n) => (n.id === notificationId ? updated : n)));
      await refreshNotifications();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'خطا در به‌روزرسانی اعلان', 'error');
    }
  };

  const handleMarkAllRead = async () => {
    if (!navigator.onLine) {
      showToast('در حالت آفلاین امکان به‌روزرسانی نیست.', 'warning');
      return;
    }
    setBusy(true);
    try {
      const count = await markAllNotificationsRead();
      const nowIso = new Date().toISOString();
      setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? nowIso })));
      await refreshNotifications();
      showToast(
        count > 0
          ? `${toPersianDigits(count)} اعلان به عنوان خوانده‌شده علامت خورد.`
          : 'همه اعلان‌ها قبلاً خوانده شده‌اند.',
        'success'
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'خطا در علامت‌گذاری اعلان‌ها', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (notificationId: string) => {
    if (!navigator.onLine) {
      showToast('در حالت آفلاین امکان حذف اعلان وجود ندارد.', 'warning');
      return;
    }
    try {
      await deleteNotification(notificationId);
      setItems((prev) => prev.filter((n) => n.id !== notificationId));
      await refreshNotifications();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'حذف اعلان انجام نشد.', 'error');
    }
  };

  if (loading) {
    return <LoadingState label="در حال بارگذاری اعلان‌ها..." />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-brand-primary">اعلان‌ها</h1>
            {unreadItems.length > 0 && (
              <span className="rounded-full bg-brand-primary px-2.5 py-0.5 text-xs font-bold text-white">
                {toPersianDigits(unreadItems.length)} خوانده‌نشده
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-brand-text/70">
            پیام‌های جدید، پیشنهادهای کمک، تغییر وضعیت درخواست‌ها و رویدادهای حساب کاربری
          </p>
        </div>

        {unreadItems.length > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleMarkAllRead()}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-white hover:bg-brand-green disabled:opacity-60"
          >
            <CheckCheck className="h-4 w-4" />
            علامت‌گذاری همه به‌عنوان خوانده‌شده
          </button>
        )}
      </div>

      {(!isOnline || fromOfflineCache) && (
        <div className="flex items-center gap-2 rounded-xl border border-brand-soft/60 bg-brand-surface/50 px-4 py-3 text-xs font-medium text-brand-primary">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>نسخه ذخیره‌شده اعلان‌ها در حالت آفلاین نمایش داده می‌شود.</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-text/30 bg-white px-4 py-3 text-sm text-brand-text">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => void loadItems(false)}
            className="rounded-xl bg-brand-primary px-3.5 py-1.5 text-xs font-bold text-white hover:bg-brand-green"
          >
            تلاش مجدد
          </button>
        </div>
      )}

      {items.length > 0 && (
        <div className="flex flex-wrap gap-2 rounded-2xl border border-brand-surface bg-white p-3">
          {(
            [
              { id: 'all', label: 'همه اعلان‌ها', count: items.length },
              { id: 'unread', label: 'خوانده‌نشده', count: unreadItems.length },
            ] as { id: FilterTab; label: string; count: number }[]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFilterTab(t.id)}
              className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-bold transition ${
                filterTab === t.id
                  ? 'border-brand-primary bg-brand-primary text-white'
                  : 'border-brand-surface bg-brand-bg text-brand-text hover:border-brand-soft'
              }`}
            >
              <span>{t.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                  filterTab === t.id
                    ? 'bg-white/20 text-white'
                    : 'bg-brand-surface text-brand-primary'
                }`}
              >
                {toPersianDigits(t.count)}
              </span>
            </button>
          ))}
        </div>
      )}

      {visibleItems.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-7 w-7" />}
          title={
            filterTab === 'unread'
              ? 'اعلان خوانده‌نشده‌ای ندارید'
              : 'هنوز اعلانی برای شما ثبت نشده است'
          }
          description={
            filterTab === 'unread'
              ? 'همه اعلان‌های قبلی را مرور کرده‌اید.'
              : 'وقتی پیام جدید، پیشنهاد کمک یا تغییری در درخواست‌های شما ایجاد شود، اینجا اطلاع‌رسانی می‌شود.'
          }
          action={
            <Link
              to="/requests"
              className="inline-flex rounded-xl bg-brand-primary px-5 py-2.5 text-xs font-bold text-white hover:bg-brand-green"
            >
              مشاهده درخواست‌های همیاری
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {visibleItems.map((item) => {
            const isUnread = !item.read_at;
            const meta = NOTIFICATION_TYPE_META[item.type] ?? {
              badgeLabel: 'اعلان',
              badgeClass: 'bg-brand-surface text-brand-primary border-brand-soft/60',
            };

            return (
              <article
                key={item.id}
                className={`rounded-2xl border p-4 transition sm:p-5 ${
                  isUnread
                    ? 'border-brand-green bg-brand-surface/25'
                    : 'border-brand-surface bg-white'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
                      isUnread
                        ? 'border-brand-soft bg-white'
                        : 'border-brand-surface bg-brand-bg'
                    }`}
                  >
                    {renderNotificationIcon(item.type)}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${meta.badgeClass}`}
                        >
                          {meta.badgeLabel}
                        </span>
                        <span
                          className={`text-[11px] font-semibold ${
                            isUnread ? 'text-brand-primary' : 'text-brand-text/60'
                          }`}
                        >
                          {isUnread ? 'خوانده‌نشده' : 'خوانده‌شده'}
                        </span>
                      </div>

                      <span className="text-[11px] text-brand-text/65">
                        {formatRelativeTimeFa(item.created_at)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleOpenNotification(item)}
                      className="block w-full text-right"
                    >
                      <h2
                        className={`text-sm leading-6 ${
                          isUnread
                            ? 'font-extrabold text-brand-primary'
                            : 'font-bold text-brand-text'
                        }`}
                      >
                        {item.title}
                      </h2>
                      <p className="mt-1 text-xs leading-6 text-brand-text/80">{item.body}</p>
                    </button>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {item.link_path && (
                          <button
                            type="button"
                            onClick={() => void handleOpenNotification(item)}
                            className="rounded-xl bg-brand-primary px-3 py-1.5 text-[11px] font-bold text-white hover:bg-brand-green"
                          >
                            مشاهده جزئیات
                          </button>
                        )}
                        {isUnread && (
                          <button
                            type="button"
                            onClick={() => void handleMarkSingleRead(item.id)}
                            className="inline-flex items-center gap-1 rounded-xl border border-brand-surface bg-white px-3 py-1.5 text-[11px] font-bold text-brand-primary hover:border-brand-soft"
                          >
                            <Check className="h-3.5 w-3.5" />
                            خوانده شد
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleDelete(item.id)}
                        aria-label="حذف اعلان"
                        className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold text-brand-text/65 hover:bg-brand-bg hover:text-brand-text"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        حذف
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
