import { cachePlatformStats, getCachedPlatformStats } from '../lib/offlineDb';
import { mapSupabaseErrorToPersian, supabase } from '../lib/supabase';
import type { KindnessChainData, PlatformStats } from '../types/database';

const EMPTY_STATS: PlatformStats = {
  total_requests: 0,
  active_requests: 0,
  completed_helps: 0,
  active_volunteers: 0,
  verified_participations: 0,
  active_cities: 0,
};

export async function getPlatformStats(): Promise<{
  stats: PlatformStats;
  fromCache: boolean;
}> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const cached = await getCachedPlatformStats();
    return { stats: cached ?? EMPTY_STATS, fromCache: true };
  }

  try {
    const { data, error } = await supabase.rpc('get_platform_stats');
    if (error) throw error;

    const stats = (data as PlatformStats | null) ?? EMPTY_STATS;
    await cachePlatformStats(stats);
    return { stats, fromCache: false };
  } catch (err) {
    const cached = await getCachedPlatformStats();
    if (cached) {
      return { stats: cached, fromCache: true };
    }
    throw new Error(mapSupabaseErrorToPersian(err, 'دریافت آمار مشارکت ناموفق بود.'));
  }
}

export async function getKindnessChain(): Promise<KindnessChainData> {
  const { data, error } = await supabase.rpc('get_kindness_chain');
  if (error) {
    throw new Error(mapSupabaseErrorToPersian(error, 'دریافت اطلاعات زنجیره مهربانی ناموفق بود.'));
  }

  return (
    (data as KindnessChainData | null) ?? {
      summary: {
        verified_helps: 0,
        unique_helpers: 0,
        unique_recipients: 0,
        connected_chains: 0,
        cities_count: 0,
      },
      links: [],
    }
  );
}
