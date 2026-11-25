import { cacheUserNotifications, getCachedUserNotifications } from '../lib/offlineDb';
import { mapSupabaseErrorToPersian, supabase } from '../lib/supabase';
import type { AppNotification } from '../types/database';

export async function getMyNotifications(
  userId: string
): Promise<{ items: AppNotification[]; fromOfflineCache: boolean }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const cached = await getCachedUserNotifications(userId);
    return { items: cached, fromOfflineCache: true };
  }

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(80);

  if (error) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const cached = await getCachedUserNotifications(userId);
      return { items: cached, fromOfflineCache: true };
    }
    throw new Error(mapSupabaseErrorToPersian(error, 'دریافت اعلان‌ها با خطا مواجه شد.'));
  }

  const items = (data ?? []) as AppNotification[];
  await cacheUserNotifications(userId, items);
  return { items, fromOfflineCache: false };
}

export async function getUnreadNotificationsCount(): Promise<number> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 0;

  const { data, error } = await supabase.rpc('get_unread_notifications_count');
  if (error) return 0;
  return typeof data === 'number' ? data : 0;
}

export async function markNotificationRead(notificationId: string): Promise<AppNotification> {
  const { data, error } = await supabase.rpc('mark_notification_read', {
    p_notification_id: notificationId,
  });

  if (error) {
    throw new Error(mapSupabaseErrorToPersian(error, 'علامت‌گذاری اعلان ناموفق بود.'));
  }

  return data as AppNotification;
}

export async function markAllNotificationsRead(): Promise<number> {
  const { data, error } = await supabase.rpc('mark_all_notifications_read');

  if (error) {
    throw new Error(mapSupabaseErrorToPersian(error, 'علامت‌گذاری همه اعلان‌ها ناموفق بود.'));
  }

  return typeof data === 'number' ? data : 0;
}

export async function deleteNotification(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  if (error) {
    throw new Error(mapSupabaseErrorToPersian(error, 'حذف اعلان انجام نشد.'));
  }
}

export async function recordPasswordChangedNotification(): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  try {
    await supabase.rpc('record_password_changed_notification');
  } catch {
    // Non-critical audit notification
  }
}
