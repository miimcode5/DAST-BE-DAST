import { cacheUserConversations, getCachedUserConversations } from '../lib/offlineDb';
import { mapSupabaseErrorToPersian, supabase } from '../lib/supabase';
import { validateChatMessage } from '../lib/validation';
import type {
  ChatMessage,
  ConversationItem,
  ConversationReport,
  ConversationReportReason,
} from '../types/database';

/**
 * Deduplicates messages strictly by server `id`, keeps newest `read_at` metadata,
 * and sorts deterministically in chronological order (oldest -> newest).
 */
export function mergeSortedMessages(
  existing: ChatMessage[],
  incoming: ChatMessage[]
): ChatMessage[] {
  const map = new Map<string, ChatMessage>();

  for (const msg of existing) {
    map.set(msg.id, msg);
  }
  for (const msg of incoming) {
    const prev = map.get(msg.id);
    if (!prev) {
      map.set(msg.id, msg);
    } else {
      map.set(msg.id, {
        ...prev,
        ...msg,
        read_at: msg.read_at ?? prev.read_at,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const tA = new Date(a.created_at).getTime();
    const tB = new Date(b.created_at).getTime();
    if (tA !== tB) return tA - tB;
    return a.id.localeCompare(b.id);
  });
}

export function sortConversationsByRecent(items: ConversationItem[]): ConversationItem[] {
  return [...items].sort((a, b) => {
    const tA = new Date(a.last_message_at ?? a.created_at).getTime();
    const tB = new Date(b.last_message_at ?? b.created_at).getTime();
    return tB - tA;
  });
}

export async function getMyConversations(
  userId?: string
): Promise<{ items: ConversationItem[]; fromOfflineCache: boolean }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine && userId) {
    const cached = await getCachedUserConversations(userId);
    return { items: sortConversationsByRecent(cached), fromOfflineCache: true };
  }

  const { data, error } = await supabase.rpc('get_my_conversations');

  if (error) {
    if (userId && typeof navigator !== 'undefined' && !navigator.onLine) {
      const cached = await getCachedUserConversations(userId);
      return { items: sortConversationsByRecent(cached), fromOfflineCache: true };
    }
    throw new Error(mapSupabaseErrorToPersian(error, 'دریافت فهرست گفت‌وگوها ناموفق بود.'));
  }

  const items = sortConversationsByRecent((data ?? []) as ConversationItem[]);
  if (userId) {
    await cacheUserConversations(userId, items);
  }
  return { items, fromOfflineCache: false };
}

export async function getConversationDetails(
  conversationId: string
): Promise<ConversationItem | null> {
  const { data, error } = await supabase.rpc('get_conversation_details', {
    p_conversation_id: conversationId,
  });

  if (error) {
    throw new Error(mapSupabaseErrorToPersian(error, 'دریافت اطلاعات گفت‌وگو ناموفق بود.'));
  }

  return (data as ConversationItem | null) ?? null;
}

export async function ensureConversationForResponse(responseId: string): Promise<string> {
  const { data, error } = await supabase.rpc('ensure_conversation_for_response', {
    p_response_id: responseId,
  });

  if (error) {
    throw new Error(mapSupabaseErrorToPersian(error, 'ایجاد یا باز کردن گفت‌وگوی خصوصی ناموفق بود.'));
  }

  return (data as { id: string }).id;
}

export async function getMessagesPage(
  conversationId: string,
  options?: { limit?: number; beforeCreatedAt?: string; beforeId?: string }
): Promise<{ messages: ChatMessage[]; hasMore: boolean }> {
  const limit = options?.limit ?? 30;

  let query = supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1);

  if (options?.beforeCreatedAt && options?.beforeId) {
    query = query.or(
      `created_at.lt.${options.beforeCreatedAt},and(created_at.eq.${options.beforeCreatedAt},id.lt.${options.beforeId})`
    );
  } else if (options?.beforeCreatedAt) {
    query = query.lt('created_at', options.beforeCreatedAt);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(mapSupabaseErrorToPersian(error, 'بارگذاری پیام‌ها ناموفق بود.'));
  }

  const raw = (data ?? []) as ChatMessage[];
  const hasMore = raw.length > limit;
  const pageSlice = hasMore ? raw.slice(0, limit) : raw;

  return {
    messages: mergeSortedMessages([], pageSlice),
    hasMore,
  };
}

export async function getMessagesSince(
  conversationId: string,
  sinceIso: string
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });

  if (error) {
    throw new Error(mapSupabaseErrorToPersian(error, 'به‌روزرسانی پیام‌های جدید ناموفق بود.'));
  }

  return (data ?? []) as ChatMessage[];
}

export async function sendChatMessage(
  conversationId: string,
  content: string
): Promise<ChatMessage> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('اتصال اینترنت برقرار نیست؛ ارسال پیام در حالت آفلاین ممکن نیست.');
  }

  const validationError = validateChatMessage(content);
  if (validationError) {
    throw new Error(validationError);
  }

  const { data, error } = await supabase.rpc('send_chat_message', {
    p_conversation_id: conversationId,
    p_content: content.trim(),
  });

  if (error) {
    throw new Error(mapSupabaseErrorToPersian(error, 'ارسال پیام با خطا مواجه شد.'));
  }

  return data as ChatMessage;
}

export async function markConversationMessagesRead(conversationId: string): Promise<number> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 0;

  const { data, error } = await supabase.rpc('mark_conversation_messages_read', {
    p_conversation_id: conversationId,
  });

  if (error) {
    return 0;
  }

  return typeof data === 'number' ? data : 0;
}

export async function getTotalUnreadMessagesCount(): Promise<number> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 0;

  const { data, error } = await supabase.rpc('get_total_unread_messages_count');
  if (error) return 0;
  return typeof data === 'number' ? data : 0;
}

export async function submitConversationReport(
  conversationId: string,
  reason: ConversationReportReason,
  details?: string
): Promise<ConversationReport> {
  const { data, error } = await supabase.rpc('submit_conversation_report', {
    p_conversation_id: conversationId,
    p_reason: reason,
    p_details: details?.trim() ? details.trim() : null,
  });

  if (error) {
    throw new Error(mapSupabaseErrorToPersian(error, 'ثبت گزارش ناموفق بود.'));
  }

  return data as ConversationReport;
}
