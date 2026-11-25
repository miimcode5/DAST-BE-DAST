import { mapSupabaseErrorToPersian, supabase } from '../lib/supabase';
import type { HelpRequestFeedItem } from '../types/database';

export async function getSavedRequestIds(userId: string): Promise<string[]> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return [];
  }

  const { data, error } = await supabase
    .from('saved_requests')
    .select('request_id')
    .eq('user_id', userId);

  if (error) {
    throw new Error(mapSupabaseErrorToPersian(error, 'دریافت درخواست‌های ذخیره‌شده با خطا مواجه شد.'));
  }

  return (data ?? []).map((row: { request_id: string }) => row.request_id);
}

export async function getSavedRequestsFeed(userId: string): Promise<HelpRequestFeedItem[]> {
  const { data: savedRows, error: savedError } = await supabase
    .from('saved_requests')
    .select('request_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (savedError) {
    throw new Error(mapSupabaseErrorToPersian(savedError, 'دریافت فهرست ذخیره‌شده‌ها ناموفق بود.'));
  }

  const ids = (savedRows ?? []).map((r: { request_id: string }) => r.request_id);
  if (ids.length === 0) return [];

  const { data: feedRows, error: feedError } = await supabase
    .from('public_help_requests_feed')
    .select('*')
    .in('id', ids);

  if (feedError) {
    throw new Error(mapSupabaseErrorToPersian(feedError, 'بارگذاری جزئیات درخواست‌های ذخیره‌شده ناموفق بود.'));
  }

  const map = new Map<string, HelpRequestFeedItem>(
    ((feedRows ?? []) as HelpRequestFeedItem[]).map((item) => [item.id, item])
  );
  return ids.map((id) => map.get(id)).filter((item): item is HelpRequestFeedItem => Boolean(item));
}

export async function toggleSavedRequest(
  userId: string,
  requestId: string,
  currentlySaved: boolean
): Promise<boolean> {
  if (currentlySaved) {
    const { error } = await supabase
      .from('saved_requests')
      .delete()
      .eq('user_id', userId)
      .eq('request_id', requestId);

    if (error) {
      throw new Error(mapSupabaseErrorToPersian(error, 'حذف از فهرست ذخیره‌شده‌ها ناموفق بود.'));
    }
    return false;
  }

  const { error } = await supabase.from('saved_requests').insert({
    user_id: userId,
    request_id: requestId,
  });

  if (error) {
    throw new Error(mapSupabaseErrorToPersian(error, 'ذخیره درخواست با خطا مواجه شد.'));
  }
  return true;
}
