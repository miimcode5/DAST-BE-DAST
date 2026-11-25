import { mapSupabaseErrorToPersian, supabase } from '../lib/supabase';
import type {
  BlockedUserItem,
  BlockStatus,
  ContentReport,
  ContentReportReason,
  ContentReportTargetType,
  ModerationReportItem,
} from '../types/database';

export async function blockUser(blockedUserId: string, reason?: string): Promise<void> {
  const { error } = await supabase.rpc('block_user', {
    p_blocked_user_id: blockedUserId,
    p_reason: reason?.trim() ? reason.trim() : null,
  });

  if (error) {
    throw new Error(mapSupabaseErrorToPersian(error, 'مسدودسازی کاربر ناموفق بود.'));
  }
}

export async function unblockUser(blockedUserId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('unblock_user', {
    p_blocked_user_id: blockedUserId,
  });

  if (error) {
    throw new Error(mapSupabaseErrorToPersian(error, 'رفع مسدودیت کاربر ناموفق بود.'));
  }

  return Boolean(data);
}

export async function getBlockStatusWith(otherUserId: string): Promise<BlockStatus> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { blocked_by_me: false, blocked_by_other: false, any_block: false };
  }

  const { data, error } = await supabase.rpc('get_block_status_with', {
    p_other_user_id: otherUserId,
  });

  if (error || !data) {
    return { blocked_by_me: false, blocked_by_other: false, any_block: false };
  }

  return data as BlockStatus;
}

export async function getMyBlockedUsers(): Promise<BlockedUserItem[]> {
  const { data, error } = await supabase.rpc('get_my_blocked_users');

  if (error) {
    throw new Error(mapSupabaseErrorToPersian(error, 'دریافت فهرست کاربران مسدودشده ناموفق بود.'));
  }

  return (data ?? []) as BlockedUserItem[];
}

export async function submitContentReport(
  targetType: ContentReportTargetType,
  targetId: string,
  reason: ContentReportReason,
  details?: string
): Promise<ContentReport> {
  const { data, error } = await supabase.rpc('submit_content_report', {
    p_target_type: targetType,
    p_target_id: targetId,
    p_reason: reason,
    p_details: details?.trim() ? details.trim() : null,
  });

  if (error) {
    throw new Error(mapSupabaseErrorToPersian(error, 'ثبت گزارش تخلف انجام نشد.'));
  }

  return data as ContentReport;
}

export async function getModerationReports(): Promise<ModerationReportItem[]> {
  const { data, error } = await supabase.rpc('get_moderation_reports');

  if (error) {
    throw new Error(mapSupabaseErrorToPersian(error, 'شما مجوز دسترسی به گزارش‌های نظارتی را ندارید.'));
  }

  return (data ?? []) as ModerationReportItem[];
}

export async function updateModerationReportStatus(
  reportKind: 'conversation' | 'content',
  reportId: string,
  status: 'open' | 'reviewed' | 'resolved' | 'dismissed'
): Promise<boolean> {
  const { data, error } = await supabase.rpc('update_moderation_report_status', {
    p_report_kind: reportKind,
    p_report_id: reportId,
    p_status: status,
  });

  if (error) {
    throw new Error(mapSupabaseErrorToPersian(error, 'تغییر وضعیت گزارش ناموفق بود.'));
  }

  return Boolean(data);
}
