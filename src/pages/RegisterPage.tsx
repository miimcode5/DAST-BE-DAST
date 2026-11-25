import { useState, type FormEvent } from 'react';
import { CheckCircle2, Eye, EyeOff, Lock, Mail, MapPin, UserPlus } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { DEFAULT_PROVINCE, IRAN_PROVINCES_CITIES, PROVINCES_LIST } from '../constants/locations';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { mapSupabaseErrorToPersian, supabase } from '../lib/supabase';
import { validateDisplayName, validateEmail, validatePassword } from '../lib/validation';

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshProfile } = useAuth();
  const { showToast } = useToast();

  const nextPath = searchParams.get('next') || '/profile/complete';

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [province, setProvince] = useState(DEFAULT_PROVINCE);
  const [city, setCity] = useState(IRAN_PROVINCES_CITIES[DEFAULT_PROVINCE][0]);
  const [neighborhood, setNeighborhood] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const cityOptions = IRAN_PROVINCES_CITIES[province] ?? ['سایر شهرها'];

  const handleProvinceChange = (nextProvince: string) => {
    setProvince(nextProvince);
    const cities = IRAN_PROVINCES_CITIES[nextProvince] ?? ['سایر شهرها'];
    setCity(cities[0]);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const nameErr = validateDisplayName(displayName);
    if (nameErr) {
      setErrorMsg(nameErr);
      return;
    }

    const emailErr = validateEmail(email);
    if (emailErr) {
      setErrorMsg(emailErr);
      return;
    }

    const passErr = validatePassword(password);
    if (passErr) {
      setErrorMsg(passErr);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('رمز عبور و تکرار آن یکسان نیستند.');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: displayName.trim(),
            province,
            city,
            neighborhood: neighborhood.trim() || null,
          },
          emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}auth/login`,
        },
      });

      if (error) {
        setErrorMsg(mapSupabaseErrorToPersian(error, 'ثبت‌نام ناموفق بود.'));
        return;
      }

      if (data.session) {
        await refreshProfile();
        showToast('ثبت‌نام با موفقیت انجام شد! پروفایل خود را تکمیل کنید.', 'success');
        navigate(nextPath.startsWith('/') ? nextPath : '/profile/complete', { replace: true });
      } else {
        setNeedsEmailConfirm(true);
        showToast('لینک تأیید به ایمیل شما ارسال شد.', 'info');
      }
    } catch (err) {
      setErrorMsg(mapSupabaseErrorToPersian(err, 'خطایی هنگام ثبت‌نام رخ داد.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (needsEmailConfirm) {
    return (
      <div className="mx-auto max-w-md py-6 animate-fade-up">
        <div className="rounded-3xl border border-[#78B98A] bg-white p-7 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#DCEBDD] text-[#174D35]">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="mb-2 text-lg font-extrabold text-[#174D35]">ثبت‌نام اولیه انجام شد</h1>
          <p className="mb-5 text-sm leading-7 text-[#4D5B4D]">
            پیام تأیید به ایمیل <span className="font-bold" dir="ltr">{email}</span> ارسال شد. لطفاً پس از تأیید ایمیل وارد حساب خود شوید.
          </p>
          <Link
            to="/auth/login"
            className="inline-flex w-full items-center justify-center rounded-2xl bg-[#174D35] py-3 text-sm font-bold text-white hover:bg-[#26734B]"
          >
            رفتن به صفحه ورود
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg py-4 animate-fade-up">
      <div className="rounded-3xl border border-[#DCEBDD] bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandLogo />
          <h1 className="mt-4 text-xl font-extrabold text-[#174D35]">عضویت در دست‌به‌دست</h1>
          <p className="mt-1.5 text-sm text-[#505E50]">
            هرکس می‌تواند گرهی باز کند.
          </p>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800"
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="reg-name" className="mb-1.5 block text-sm font-semibold text-[#202820]">
              نام نمایشی (نام و نام خانوادگی یا نام مستعار محترمانه)
            </label>
            <input
              id="reg-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="مثلاً: علی محمدی"
              className="w-full rounded-2xl border border-[#DCEBDD] bg-[#F6F7F2]/60 px-4 py-3 text-sm text-[#202820] outline-none transition focus:border-[#26734B] focus:bg-white"
              required
            />
          </div>

          <div>
            <label htmlFor="reg-email" className="mb-1.5 block text-sm font-semibold text-[#202820]">
              ایمیل
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute right-3.5 top-3.5 h-4 w-4 text-[#5A695A]" />
              <input
                id="reg-email"
                type="email"
                dir="ltr"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-2xl border border-[#DCEBDD] bg-[#F6F7F2]/60 py-3 pr-10 pl-4 text-left text-sm text-[#202820] outline-none transition focus:border-[#26734B] focus:bg-white"
                required
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="reg-province" className="mb-1.5 block text-sm font-semibold text-[#202820]">
                استان
              </label>
              <select
                id="reg-province"
                value={province}
                onChange={(e) => handleProvinceChange(e.target.value)}
                className="w-full rounded-2xl border border-[#DCEBDD] bg-[#F6F7F2]/60 px-3.5 py-3 text-sm text-[#202820] outline-none transition focus:border-[#26734B] focus:bg-white"
              >
                {PROVINCES_LIST.map((prov) => (
                  <option key={prov} value={prov}>
                    {prov}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="reg-city" className="mb-1.5 block text-sm font-semibold text-[#202820]">
                شهر
              </label>
              <select
                id="reg-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-2xl border border-[#DCEBDD] bg-[#F6F7F2]/60 px-3.5 py-3 text-sm text-[#202820] outline-none transition focus:border-[#26734B] focus:bg-white"
              >
                {cityOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="reg-neighborhood" className="mb-1.5 block text-sm font-semibold text-[#202820]">
              محله یا محدوده تقریبی (اختیاری)
            </label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute right-3.5 top-3.5 h-4 w-4 text-[#5A695A]" />
              <input
                id="reg-neighborhood"
                type="text"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="مثلاً: محدوده خیابان مدرس یا شهرک بعثت"
                className="w-full rounded-2xl border border-[#DCEBDD] bg-[#F6F7F2]/60 py-3 pr-10 pl-4 text-sm text-[#202820] outline-none transition focus:border-[#26734B] focus:bg-white"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="reg-pass" className="mb-1.5 block text-sm font-semibold text-[#202820]">
                رمز عبور
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute right-3.5 top-3.5 h-4 w-4 text-[#5A695A]" />
                <input
                  id="reg-pass"
                  type={showPassword ? 'text' : 'password'}
                  dir="ltr"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="حداقل ۶ کاراکتر"
                  className="w-full rounded-2xl border border-[#DCEBDD] bg-[#F6F7F2]/60 py-3 pr-10 pl-10 text-left text-sm text-[#202820] outline-none transition focus:border-[#26734B] focus:bg-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute left-3 top-3 text-[#5A695A]"
                  aria-label="تغییر نمایش رمز"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="reg-pass-confirm" className="mb-1.5 block text-sm font-semibold text-[#202820]">
                تکرار رمز عبور
              </label>
              <input
                id="reg-pass-confirm"
                type={showPassword ? 'text' : 'password'}
                dir="ltr"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="تکرار رمز"
                className="w-full rounded-2xl border border-[#DCEBDD] bg-[#F6F7F2]/60 px-4 py-3 text-left text-sm text-[#202820] outline-none transition focus:border-[#26734B] focus:bg-white"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#174D35] py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#26734B] disabled:opacity-60"
          >
            <UserPlus className="h-4 w-4" />
            {submitting ? 'در حال ایجاد حساب...' : 'ثبت‌نام و ادامه'}
          </button>
        </form>

        <div className="mt-6 border-t border-[#F6F7F2] pt-5 text-center text-sm text-[#505E50]">
          قبلاً ثبت‌نام کرده‌اید؟{' '}
          <Link to="/auth/login" className="font-bold text-[#174D35] hover:underline">
            وارد شوید
          </Link>
        </div>
      </div>
    </div>
  );
}
