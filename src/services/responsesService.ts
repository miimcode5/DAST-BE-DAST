import { mapSupabaseErrorToPersian, supabase } from '../lib/supabase';
import type {
  HelpRequestFeedItem,
  VolunteerResponse,
  VolunteerResponseWithProfile,
  VolunteerResponseWithRequest,
} from '../types/database';

export async function getResponsesForRequest(requestId: string): Promise<VolunteerResponseWithProfile[]> {
  const { data, error } = await supabase
    .from('volunteer_responses')
    .select(
      `
      *,
      volunteer:profiles (
        id,
        display_name,
        avatar_url,
        city,
        neighborhood,
        skills,
        completed_helps_count,
        bio
      )
    `
    )
    .eq('request_id', requestId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(mapSupabaseErrorToPersian(error, 'خطا در دریافت اعلام آمادگی‌ها.'));
  }

  return (data ?? []) as VolunteerResponseWithProfile[];
}

export async function getMyResponseForRequest(
  requestId: string,
  volunteerId: string
): Promise<VolunteerResponse | null> {
  const { data, error } = await supabase
    .from('volunteer_responses')
    .select('*')
    .eq('request_id', requestId)
    .eq('volunteer_id', volunteerId)
    .maybeSingle();

  if (error) {
    throw new Error(mapSupabaseErrorToPersian(error, 'بررسی وضعیت اعلام آمادگی با خطا مواجه شد.'));
  }

  return (data as VolunteerResponse | null) ?? null;
}

export async function getMyResponses(volunteerId: string): Promise<VolunteerResponseWithRequest[]> {
  const { data, error } = await supabase
    .from('volunteer_responses')
    .select('*')
    .eq('volunteer_id', volunteerId)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(mapSupabaseErrorToPersian(error, 'دریافت فهرست اعلام آمادگی‌های شما ناموفق بود.'));
  }

  const responses = (data ?? []) as VolunteerResponse[];
  if (responses.length === 0) return [];

  const requestIds = Array.from(new Set(responses.map((r) => r.request_id)));
  const { data: requestsData, error: reqError } = await supabase
    .from('public_help_requests_feed')
    .select('*')
    .in('id', requestIds);

  if (reqError) {
    throw new Error(mapSupabaseErrorToPersian(reqError, 'دریافت جزئیات درخواست‌های مرتبط ناموفق بود.'));
  }

  const reqMap = new Map<string, HelpRequestFeedItem>(
    ((requestsData ?? []) as HelpRequestFeedItem[]).map((item) => [item.id, item])
  );

  return responses.map((resp) => ({
    ...resp,
    request: reqMap.get(resp.request_id) ?? null,
  }));
}

export async function submitVolunteerResponse(
  requestId: string,
  message?: string
): Promise<VolunteerResponse> {
  const { data, error } = await supabase.rpc('submit_volunteer_response', {
    p_request_id: requestId,
    p_message: message?.trim() ? message.trim() : null,
  });

  if (error) {
    throw new Error(mapSupabaseErrorToPersian(error, 'ثبت اعلام آمادگی با خطا مواجه شد.'));
  }

  return data as VolunteerResponse;
}

export async function withdrawVolunteerResponse(responseId: string): Promise<VolunteerResponse> {
  const { data, error } = await supabase.rpc('withdraw_volunteer_response', {
    p_response_id: responseId,
  });

  if (error) {
    throw new Error(mapSupabaseErrorToPersian(error, 'لغو اعلام آمادگی با خطا مواجه شد.'));
  }

  return data as VolunteerResponse;
}

export async function acceptVolunteerResponse(responseId: string): Promise<VolunteerResponse> {
  const { data, error } = await supabase.rpc('accept_volunteer_response', {
    p_response_id: responseId,
  });

  if (error) {
    throw new Error(mapSupabaseErrorToPersian(error, 'پذیرش داوطلب با خطا مواجه شد.'));
  }

  return data as VolunteerResponse;
}

export async function rejectVolunteerResponse(responseId: string): Promise<VolunteerResponse> {
  const { data, error } = await supabase.rpc('reject_volunteer_response', {
    p_response_id: responseId,
  });

  if (error) {
    throw new Error(mapSupabaseErrorToPersian(error, 'رد اعلام آمادگی با خطا مواجه شد.'));
  }

  return data as VolunteerResponse;
}

export async function startVolunteerResponse(responseId: string): Promise<VolunteerResponse> {
  const { data, error } = await supabase.rpc('start_volunteer_response', {
    p_response_id: responseId,
  });

  if (error) {
    throw new Error(mapSupabaseErrorToPersian(error, 'به‌روزرسانی وضعیت به در حال انجام ناموفق بود.'));
  }

  return data as VolunteerResponse;
}

export async function markVolunteerDone(responseId: string): Promise<VolunteerResponse> {
  const { data, error } = await supabase.rpc('mark_volunteer_done', {
    p_response_id: responseId,
  });

  if (error) {
    throw new Error(mapSupabaseErrorToPersian(error, 'ثبت اتمام همکاری با خطا مواجه شد.'));
  }

  return data as VolunteerResponse;
}

export async function confirmHelpCompletion(responseId: string): Promise<VolunteerResponse> {
  const { data, error } = await supabase.rpc('confirm_help_completion', {
    p_response_id: responseId,
  });

  if (error) {
    throw new Error(mapSupabaseErrorToPersian(error, 'تأیید تکمیل کمک ناموفق بود.'));
  }

  return data as VolunteerResponse;
}
