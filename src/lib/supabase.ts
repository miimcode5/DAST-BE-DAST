import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

export function mapSupabaseErrorToPersian(error: unknown, fallback = 'خطایی در ارتباط با سرور رخ داد.'): string {
  if (!error) return fallback;

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'اتصال اینترنت برقرار نیست. لطفاً اتصال خود را بررسی کنید.';
  }

  const errObj = error as { message?: string; code?: string; status?: number };
  const msg = (errObj.message ?? String(error)).trim();
  const lower = msg.toLowerCase();

  // If the database or RPC already returned a Persian message, preserve it!
  if (/[\u0600-\u06FF]/.test(msg)) {
    return msg;
  }

  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('network request failed')) {
    return 'امکان برقراری ارتباط با سرور وجود ندارد. لطفاً اینترنت خود را بررسی کنید.';
  }

  if (lower.includes('invalid login credentials')) {
    return 'ایمیل یا رمز عبور اشتباه است.';
  }

  if (lower.includes('email not confirmed')) {
    return 'لطفاً ابتدا ایمیل خود را تأیید کنید و سپس وارد شوید.';
  }

  if (lower.includes('user already registered') || lower.includes('already been registered')) {
    return 'این ایمیل قبلاً ثبت‌نام کرده است. می‌توانید وارد حساب خود شوید.';
  }

  if (lower.includes('password should be at least')) {
    return 'رمز عبور باید حداقل ۶ کاراکتر باشد.';
  }

  if (lower.includes('rate limit') || errObj.status === 429) {
    return 'تعداد درخواست‌ها زیاد بوده است. لطفاً چند لحظه صبر کنید و دوباره تلاش کنید.';
  }

  if (errObj.code === '23505' || lower.includes('duplicate key')) {
    return 'این مورد قبلاً ثبت شده است و امکان ثبت تکراری وجود ندارد.';
  }

  if (errObj.code === '42501' || lower.includes('row-level security') || lower.includes('permission denied')) {
    return 'شما مجوز انجام این عملیات را ندارید.';
  }

  if (errObj.code === '23514' || lower.includes('check constraint')) {
    return 'اطلاعات واردشده با شرایط معتبر فرم مطابقت ندارد.';
  }

  if (lower.includes('jwt expired') || lower.includes('refresh_token_not_found')) {
    return 'نشست کاربری شما منقضی شده است. لطفاً دوباره وارد شوید.';
  }

  if (lower.includes('payload too large') || lower.includes('exceeded the maximum allowed size')) {
    return 'حجم فایل انتخاب‌شده بیشتر از حد مجاز است.';
  }

  return fallback;
}
