import { cacheUserAchievements, getCachedUserAchievements } from '../lib/offlineDb';
import { mapSupabaseErrorToPersian, supabase } from '../lib/supabase';
import type { AchievementsSummary } from '../types/database';

export async function getMyAchievementsSummary(
  userId: string
): Promise<{ summary: AchievementsSummary; fromOfflineCache: boolean }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const cached = await getCachedUserAchievements(userId);
    if (cached) {
      return { summary: cached, fromOfflineCache: true };
    }
  }

  try {
    const { data, error } = await supabase.rpc('get_my_achievements_summary');
    if (error) throw error;

    const summary = data as AchievementsSummary;
    await cacheUserAchievements(userId, summary);
    return { summary, fromOfflineCache: false };
  } catch (err) {
    const cached = await getCachedUserAchievements(userId);
    if (cached) {
      return { summary: cached, fromOfflineCache: true };
    }
    throw new Error(mapSupabaseErrorToPersian(err, 'دریافت نشان‌ها و امتیازات مشارکت ناموفق بود.'));
  }
}
