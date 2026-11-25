import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { ArrowRight, Camera, Check, Plus, Save, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ProtectedImage } from '../components/ProtectedImage';
import { SUGGESTED_SKILLS } from '../constants/categories';
import { DEFAULT_PROVINCE, IRAN_PROVINCES_CITIES, PROVINCES_LIST } from '../constants/locations';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getInitials } from '../lib/formatters';
import { MAX_AVATAR_BYTES, validateDisplayName, validateImageFile } from '../lib/validation';
import { updateOwnProfile, uploadAvatarImage } from '../services/profileService';

export function ProfileEditor({ mode }: { mode: 'complete' | 'edit' }) {
  const { user, profile, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [province, setProvince] = useState(profile?.province || DEFAULT_PROVINCE);
  const [city, setCity] = useState(
    profile?.city || IRAN_PROVINCES_CITIES[profile?.province || DEFAULT_PROVINCE]?.[0] || 'بیرجند'
  );
  const [neighborhood, setNeighborhood] = useState(profile?.neighborhood ?? '');
  const [skills, setSkills] = useState<string[]>(profile?.skills ?? []);
  const [customSkill, setCustomSkill] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url ?? null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name);
      setBio(profile.bio ?? '');
      const prov = profile.province || DEFAULT_PROVINCE;
      setProvince(prov);
      setCity(profile.city || IRAN_PROVINCES_CITIES[prov]?.[0] || 'بیرجند');
      setNeighborhood(profile.neighborhood ?? '');
      setSkills(profile.skills ?? []);
      setAvatarUrl(profile.avatar_url ?? null);
    }
  }, [profile]);

  const citiesForProvince = IRAN_PROVINCES_CITIES[province] ?? ['سایر شهرها'];

  const toggleSkill = (skill: string) => {
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((item) => item !== skill) : [...prev, skill]
    );
  };

  const addCustomSkill = () => {
    const clean = customSkill.trim();
    if (!clean) return;
    if (!skills.includes(clean)) {
      setSkills((prev) => [...prev, clean]);
    }
    setCustomSkill('');
  };

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateImageFile(file, MAX_AVATAR_BYTES);
    if (err) {
      setErrorMsg(err);
      return;
    }
    setErrorMsg(null);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setErrorMsg(null);

    const nameErr = validateDisplayName(displayName);
    if (nameErr) {
      setErrorMsg(nameErr);
      return;
    }

    if (bio.trim().length > 500) {
      setErrorMsg('معرفی کوتاه نباید بیش از ۵۰۰ کاراکتر باشد.');
      return;
    }

    setSaving(true);
    try {
      let nextAvatarUrl = avatarUrl;
      if (avatarFile) {
        nextAvatarUrl = await uploadAvatarImage(user.id, avatarFile);
      }

      await updateOwnProfile(user.id, {
        display_name: displayName,
        bio: bio.trim() || null,
        province,
        city,
        neighborhood: neighborhood.trim() || null,
        skills,
        avatar_url: nextAvatarUrl,
      });

      await refreshProfile();
      showToast('اطلاعات پروفایل شما با موفقیت ذخیره شد.', 'success');
      navigate(mode === 'complete' ? '/' : '/profile', { replace: true });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'خطا در ذخیره پروفایل');
    } finally {
      setSaving(false);
    }
  };

  const previewSrc = avatarPreview || avatarUrl;

  return (
    <div className="mx-auto max-w-2xl space-y-5 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-[#174D35]">
            {mode === 'complete' ? 'تکمیل پروفایل کاربری' : 'ویرایش پروفایل'}
          </h1>
          <p className="mt-1 text-sm text-[#505E50]">
            تکمیل شهر، محدوده و مهارت‌ها به پیدا کردن همیاری‌های نزدیک‌تر کمک می‌کند.
          </p>
        </div>
        {mode === 'edit' ? (
          <Link
            to="/profile"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCEBDD] bg-white px-3.5 py-2 text-xs font-bold text-[#174D35] hover:bg-[#F6F7F2]"
          >
            <ArrowRight className="h-4 w-4" />
            بازگشت
          </Link>
        ) : (
          <Link
            to="/"
            className="rounded-xl px-3 py-2 text-xs font-semibold text-[#556455] hover:text-[#174D35]"
          >
            تکمیل در زمان دیگر
          </Link>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-3xl border border-[#DCEBDD] bg-white p-4 shadow-xs sm:space-y-6 sm:p-7"
      >
        {errorMsg && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
            {errorMsg}
          </div>
        )}

        {/* Avatar Picker */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            {previewSrc ? (
              <ProtectedImage
                src={previewSrc}
                alt="تصویر پروفایل"
                wrapperClassName="relative block h-20 w-20 overflow-hidden rounded-3xl border-2 border-[#DCEBDD]"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[#DCEBDD] text-xl font-extrabold text-[#174D35]">
                {getInitials(displayName)}
              </div>
            )}
            <label
              htmlFor="avatar-upload"
              className="absolute -bottom-1 -left-1 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl bg-[#174D35] text-white shadow hover:bg-[#26734B]"
              title="تغییر تصویر پروفایل"
            >
              <Camera className="h-4 w-4" />
              <input
                id="avatar-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </label>
          </div>

          <div className="text-xs leading-6 text-[#556455]">
            <p className="font-bold text-[#202820]">تصویر پروفایل (اختیاری)</p>
            <p>فرمت‌های مجاز: JPG، PNG یا WebP — حداکثر ۲ مگابایت</p>
            {previewSrc && (
              <button
                type="button"
                onClick={() => {
                  setAvatarFile(null);
                  setAvatarPreview(null);
                  setAvatarUrl(null);
                }}
                className="mt-1 inline-flex items-center gap-1 font-semibold text-rose-600 hover:underline"
              >
                <X className="h-3.5 w-3.5" />
                حذف تصویر
              </button>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="prof-name" className="mb-1.5 block text-sm font-semibold text-[#202820]">
            نام نمایشی *
          </label>
          <input
            id="prof-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-2xl border border-[#DCEBDD] bg-[#F6F7F2]/60 px-4 py-3 text-sm outline-none focus:border-[#26734B] focus:bg-white"
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="prof-province" className="mb-1.5 block text-sm font-semibold text-[#202820]">
              استان
            </label>
            <select
              id="prof-province"
              value={province}
              onChange={(e) => {
                const nextProv = e.target.value;
                setProvince(nextProv);
                setCity((IRAN_PROVINCES_CITIES[nextProv] ?? ['سایر شهرها'])[0]);
              }}
              className="w-full rounded-2xl border border-[#DCEBDD] bg-[#F6F7F2]/60 px-3.5 py-3 text-sm outline-none focus:border-[#26734B] focus:bg-white"
            >
              {PROVINCES_LIST.map((prov) => (
                <option key={prov} value={prov}>
                  {prov}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="prof-city" className="mb-1.5 block text-sm font-semibold text-[#202820]">
              شهر
            </label>
            <select
              id="prof-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-2xl border border-[#DCEBDD] bg-[#F6F7F2]/60 px-3.5 py-3 text-sm outline-none focus:border-[#26734B] focus:bg-white"
            >
              {citiesForProvince.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="prof-neighborhood" className="mb-1.5 block text-sm font-semibold text-[#202820]">
            محدوده فعالیت یا محله (تقریبی)
          </label>
          <input
            id="prof-neighborhood"
            type="text"
            value={neighborhood}
            onChange={(e) => setNeighborhood(e.target.value)}
            placeholder="مثلاً: محدوده بلوار معلم یا مهرشهر"
            className="min-h-[44px] w-full rounded-2xl border border-[#DCEBDD] bg-[#F6F7F2]/60 px-4 py-3 text-[15px] outline-none focus:border-[#26734B] focus:bg-white sm:text-sm"
          />
          <p className="mt-1 text-[11px] text-[#667466]">
            برای حفظ حریم خصوصی از نوشتن آدرس دقیق یا پلاک خودداری کنید.
          </p>
        </div>

        <div>
          <label htmlFor="prof-bio" className="mb-1.5 block text-sm font-semibold text-[#202820]">
            معرفی کوتاه
          </label>
          <textarea
            id="prof-bio"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="کوتاه درباره خودتان و زمینه‌هایی که می‌توانید کمک کنید بنویسید..."
            className="w-full rounded-2xl border border-[#DCEBDD] bg-[#F6F7F2]/60 px-4 py-3 text-[15px] leading-6 outline-none focus:border-[#26734B] focus:bg-white sm:text-sm"
          />
        </div>

        <div className="space-y-3">
          <span className="block text-sm font-semibold text-[#202820]">
            مهارت‌ها و زمینه‌های مشارکت
          </span>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_SKILLS.map((skill) => {
              const active = skills.includes(skill);
              return (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? 'border-[#174D35] bg-[#174D35] text-white'
                      : 'border-[#DCEBDD] bg-[#F6F7F2] text-[#202820] hover:border-[#78B98A]'
                  }`}
                >
                  {active && <Check className="h-3.5 w-3.5" />}
                  {skill}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={customSkill}
              onChange={(e) => setCustomSkill(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustomSkill();
                }
              }}
              placeholder="افزودن مهارت دلخواه..."
              className="flex-1 rounded-xl border border-[#DCEBDD] bg-[#F6F7F2]/60 px-3.5 py-2 text-xs outline-none focus:border-[#26734B] focus:bg-white"
            />
            <button
              type="button"
              onClick={addCustomSkill}
              className="inline-flex items-center gap-1 rounded-xl border border-[#DCEBDD] bg-[#DCEBDD]/60 px-3.5 py-2 text-xs font-bold text-[#174D35] hover:bg-[#DCEBDD]"
            >
              <Plus className="h-3.5 w-3.5" />
              افزودن
            </button>
          </div>

          {skills.filter((s) => !SUGGESTED_SKILLS.includes(s)).length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {skills
                .filter((s) => !SUGGESTED_SKILLS.includes(s))
                .map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 rounded-xl bg-[#DCEBDD] px-3 py-1 text-xs font-semibold text-[#174D35]"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      aria-label={`حذف ${skill}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#174D35] py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#26734B] disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saving ? 'در حال ذخیره...' : 'ذخیره اطلاعات پروفایل'}
        </button>
      </form>
    </div>
  );
}

export function CompleteProfilePage() {
  return <ProfileEditor mode="complete" />;
}

export function EditProfilePage() {
  return <ProfileEditor mode="edit" />;
}
