import { cacheProfile, getCachedProfile } from '../lib/offlineDb';
import { mapSupabaseErrorToPersian, supabase } from '../lib/supabase';
import { MAX_AVATAR_BYTES, validateImageFile } from '../lib/validation';
import type { Profile } from '../types/database';

export async function getProfileById(userId: string): Promise<Profile | null> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return getCachedProfile(userId);
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    const cached = await getCachedProfile(userId);
    if (cached) return cached;
    throw new Error(mapSupabaseErrorToPersian(error, 'خطا در دریافت اطلاعات پروفایل.'));
  }

  if (data) {
    const profile = data as Profile;
    await cacheProfile(profile);
    return profile;
  }

  return null;
}

export async function updateOwnProfile(
  userId: string,
  updates: {
    display_name: string;
    bio: string | null;
    province: string;
    city: string | null;
    neighborhood: string | null;
    skills: string[];
    avatar_url?: string | null;
  }
): Promise<Profile> {
  const payload: Record<string, unknown> = {
    display_name: updates.display_name.trim(),
    bio: updates.bio?.trim() ? updates.bio.trim() : null,
    province: updates.province.trim() || 'خراسان جنوبی',
    city: updates.city?.trim() ? updates.city.trim() : null,
    neighborhood: updates.neighborhood?.trim() ? updates.neighborhood.trim() : null,
    skills: updates.skills.map((s) => s.trim()).filter(Boolean),
  };

  if (updates.avatar_url !== undefined) {
    payload.avatar_url = updates.avatar_url;
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select('*')
    .single();

  if (error) {
    throw new Error(mapSupabaseErrorToPersian(error, 'ذخیره اطلاعات پروفایل انجام نشد.'));
  }

  const profile = data as Profile;
  await cacheProfile(profile);
  return profile;
}

export async function uploadAvatarImage(userId: string, file: File): Promise<string> {
  const validationError = validateImageFile(file, MAX_AVATAR_BYTES);
  if (validationError) {
    throw new Error(validationError);
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const filePath = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(mapSupabaseErrorToPersian(uploadError, 'بارگذاری تصویر پروفایل ناموفق بود.'));
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
  return data.publicUrl;
}
