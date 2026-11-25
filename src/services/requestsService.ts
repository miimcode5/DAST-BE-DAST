import {
  cachePublicRequests,
  enqueueOfflineRequest,
  getCachedPublicRequests,
  getPendingOfflineRequests,
  markPendingOfflineRequestFailed,
  removePendingOfflineRequest,
  type PendingCreateRequest,
} from '../lib/offlineDb';
import { mapSupabaseErrorToPersian, supabase } from '../lib/supabase';
import { MAX_REQUEST_IMAGE_BYTES, validateImageFile } from '../lib/validation';
import type { HelpCategory, HelpRequest, HelpRequestFeedItem, HelpType, RequestStatus } from '../types/database';

export interface RequestListFilters {
  search?: string;
  category?: HelpCategory | 'all';
  helpType?: HelpType | 'all';
  city?: string;
  status?: RequestStatus | 'active' | 'all';
  sort?: 'newest' | 'oldest' | 'in_progress_first';
  limit?: number;
}

export interface RequestListResult {
  items: HelpRequestFeedItem[];
  fromOfflineCache: boolean;
  cachedAt: string | null;
}

function applyLocalFilters(items: HelpRequestFeedItem[], filters: RequestListFilters): HelpRequestFeedItem[] {
  let result = [...items];

  if (filters.category && filters.category !== 'all') {
    result = result.filter((item) => item.category === filters.category);
  }

  if (filters.helpType && filters.helpType !== 'all') {
    result = result.filter((item) => item.help_type === filters.helpType);
  }

  if (filters.city && filters.city !== 'all') {
    result = result.filter((item) => item.city === filters.city);
  }

  if (filters.status === 'active') {
    result = result.filter((item) => item.status === 'open' || item.status === 'in_progress');
  } else if (filters.status && filters.status !== 'all') {
    result = result.filter((item) => item.status === filters.status);
  }

  if (filters.search?.trim()) {
    const q = filters.search.trim().toLowerCase();
    result = result.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.area.toLowerCase().includes(q) ||
        item.city.toLowerCase().includes(q)
    );
  }

  if (filters.sort === 'oldest') {
    result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  } else if (filters.sort === 'in_progress_first') {
    const order: Record<RequestStatus, number> = { in_progress: 0, open: 1, completed: 2, cancelled: 3 };
    result.sort(
      (a, b) =>
        order[a.status] - order[b.status] ||
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  } else {
    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  if (filters.limit && filters.limit > 0) {
    result = result.slice(0, filters.limit);
  }

  return result;
}

export async function listPublicRequests(filters: RequestListFilters = {}): Promise<RequestListResult> {
  const isDefaultFeed =
    !filters.search?.trim() &&
    (!filters.category || filters.category === 'all') &&
    (!filters.helpType || filters.helpType === 'all') &&
    (!filters.city || filters.city === 'all') &&
    (!filters.status || filters.status === 'all' || filters.status === 'active') &&
    (!filters.sort || filters.sort === 'newest');

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const cached = await getCachedPublicRequests('latest');
    return {
      items: applyLocalFilters(cached.items, filters),
      fromOfflineCache: true,
      cachedAt: cached.updatedAt,
    };
  }

  try {
    let query = supabase.from('public_help_requests_feed').select('*');

    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }

    if (filters.helpType && filters.helpType !== 'all') {
      query = query.eq('help_type', filters.helpType);
    }

    if (filters.city && filters.city !== 'all') {
      query = query.eq('city', filters.city);
    }

    if (filters.status === 'active') {
      query = query.in('status', ['open', 'in_progress']);
    } else if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    } else {
      // By default exclude cancelled from public listing unless specifically filtered
      query = query.neq('status', 'cancelled');
    }

    if (filters.search?.trim()) {
      const safe = filters.search.trim().replace(/[%_,()]/g, ' ');
      query = query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%,area.ilike.%${safe}%`);
    }

    if (filters.sort === 'oldest') {
      query = query.order('created_at', { ascending: true });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    query = query.limit(filters.limit ?? 60);

    const { data, error } = await query;
    if (error) throw error;

    let items = (data ?? []) as HelpRequestFeedItem[];
    if (filters.sort === 'in_progress_first') {
      items = applyLocalFilters(items, { sort: 'in_progress_first' });
    }

    if (isDefaultFeed && !filters.limit) {
      await cachePublicRequests(items, 'latest');
    } else if (isDefaultFeed && items.length > 0) {
      const existing = await getCachedPublicRequests('latest');
      if (existing.items.length === 0) {
        await cachePublicRequests(items, 'latest');
      }
    }

    return {
      items,
      fromOfflineCache: false,
      cachedAt: null,
    };
  } catch (err) {
    const cached = await getCachedPublicRequests('latest');
    if (cached.items.length > 0) {
      return {
        items: applyLocalFilters(cached.items, filters),
        fromOfflineCache: true,
        cachedAt: cached.updatedAt,
      };
    }
    throw new Error(mapSupabaseErrorToPersian(err, 'بارگذاری فهرست درخواست‌ها با خطا مواجه شد.'));
  }
}

export async function getRequestById(requestId: string): Promise<{
  item: HelpRequestFeedItem | null;
  fromOfflineCache: boolean;
}> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const cached = await getCachedPublicRequests('latest');
    const found = cached.items.find((r) => r.id === requestId) ?? null;
    return { item: found, fromOfflineCache: true };
  }

  const { data, error } = await supabase
    .from('public_help_requests_feed')
    .select('*')
    .eq('id', requestId)
    .maybeSingle();

  if (error) {
    const cached = await getCachedPublicRequests('latest');
    const found = cached.items.find((r) => r.id === requestId) ?? null;
    if (found) return { item: found, fromOfflineCache: true };
    throw new Error(mapSupabaseErrorToPersian(error, 'بارگذاری جزئیات درخواست ناموفق بود.'));
  }

  return { item: (data as HelpRequestFeedItem | null) ?? null, fromOfflineCache: false };
}

export async function listMyRequests(userId: string): Promise<HelpRequestFeedItem[]> {
  const { data, error } = await supabase
    .from('public_help_requests_feed')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(mapSupabaseErrorToPersian(error, 'دریافت درخواست‌های شما با خطا مواجه شد.'));
  }

  return (data ?? []) as HelpRequestFeedItem[];
}

export async function uploadRequestImage(userId: string, file: File): Promise<string> {
  const validationError = validateImageFile(file, MAX_REQUEST_IMAGE_BYTES);
  if (validationError) {
    throw new Error(validationError);
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const filePath = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('request-images')
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(mapSupabaseErrorToPersian(uploadError, 'بارگذاری تصویر درخواست ناموفق بود.'));
  }

  const { data } = supabase.storage.from('request-images').getPublicUrl(filePath);
  return data.publicUrl;
}

export async function createHelpRequest(
  userId: string,
  payload: {
    title: string;
    description: string;
    category: HelpCategory;
    help_type: HelpType;
    province: string;
    city: string;
    area: string;
    needed_at: string;
  },
  imageFile?: File | null
): Promise<
  | { queuedOffline: true; pending: PendingCreateRequest }
  | { queuedOffline: false; request: HelpRequest }
> {
  const normalizedPayload = {
    title: payload.title.trim(),
    description: payload.description.trim(),
    category: payload.category,
    help_type: payload.help_type,
    province: payload.province.trim() || 'خراسان جنوبی',
    city: payload.city.trim(),
    area: payload.area.trim(),
    needed_at: payload.needed_at.trim(),
  };

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    if (imageFile) {
      throw new Error('ارسال تصویر در حالت آفلاین ممکن نیست. لطفاً تصویر را حذف کنید یا پس از اتصال اینترنت ثبت نمایید.');
    }
    const pending = await enqueueOfflineRequest(userId, normalizedPayload);
    return { queuedOffline: true, pending };
  }

  let imageUrl: string | null = null;
  if (imageFile) {
    imageUrl = await uploadRequestImage(userId, imageFile);
  }

  const { data, error } = await supabase
    .from('help_requests')
    .insert({
      user_id: userId,
      ...normalizedPayload,
      image_url: imageUrl,
      status: 'open',
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(mapSupabaseErrorToPersian(error, 'ثبت درخواست کمک انجام نشد.'));
  }

  return { queuedOffline: false, request: data as HelpRequest };
}

export async function updateHelpRequest(
  requestId: string,
  userId: string,
  payload: {
    title: string;
    description: string;
    category: HelpCategory;
    help_type: HelpType;
    province: string;
    city: string;
    area: string;
    needed_at: string;
    existingImageUrl?: string | null;
  },
  newImageFile?: File | null,
  removeImage?: boolean
): Promise<HelpRequest> {
  let imageUrl = removeImage ? null : payload.existingImageUrl ?? null;
  if (newImageFile) {
    imageUrl = await uploadRequestImage(userId, newImageFile);
  }

  const { data, error } = await supabase
    .from('help_requests')
    .update({
      title: payload.title.trim(),
      description: payload.description.trim(),
      category: payload.category,
      help_type: payload.help_type,
      province: payload.province.trim() || 'خراسان جنوبی',
      city: payload.city.trim(),
      area: payload.area.trim(),
      needed_at: payload.needed_at.trim(),
      image_url: imageUrl,
    })
    .eq('id', requestId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    throw new Error(mapSupabaseErrorToPersian(error, 'ویرایش درخواست انجام نشد.'));
  }

  return data as HelpRequest;
}

export async function cancelHelpRequest(requestId: string): Promise<HelpRequest> {
  const { data, error } = await supabase.rpc('cancel_help_request', {
    p_request_id: requestId,
  });

  if (error) {
    throw new Error(mapSupabaseErrorToPersian(error, 'لغو درخواست ناموفق بود.'));
  }

  return data as HelpRequest;
}

export async function reopenHelpRequest(requestId: string): Promise<HelpRequest> {
  const { data, error } = await supabase.rpc('reopen_help_request', {
    p_request_id: requestId,
  });

  if (error) {
    throw new Error(mapSupabaseErrorToPersian(error, 'بازگشایی درخواست ناموفق بود.'));
  }

  return data as HelpRequest;
}

let syncInFlight = false;

export async function syncPendingOfflineRequests(userId: string): Promise<{
  syncedCount: number;
  failedCount: number;
}> {
  if (syncInFlight || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return { syncedCount: 0, failedCount: 0 };
  }

  syncInFlight = true;
  let syncedCount = 0;
  let failedCount = 0;

  try {
    const pending = await getPendingOfflineRequests(userId);
    for (const item of pending) {
      try {
        const { error } = await supabase
          .from('help_requests')
          .insert({
            user_id: userId,
            ...item.payload,
            status: 'open',
          });

        if (error) throw error;
        await removePendingOfflineRequest(item.clientMutationId);
        syncedCount += 1;
      } catch (err) {
        failedCount += 1;
        await markPendingOfflineRequestFailed(
          item.clientMutationId,
          mapSupabaseErrorToPersian(err, 'خطا در همگام‌سازی درخواست')
        );
      }
    }
  } finally {
    syncInFlight = false;
  }

  return { syncedCount, failedCount };
}
