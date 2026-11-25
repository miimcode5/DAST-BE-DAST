import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, LogIn, Mail, Lock } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { useToast } from '../contexts/ToastContext';
import { mapSupabaseErrorToPersian, supabase } from '../lib/supabase';
import { validateEmail, validatePassword } from '../lib/validation';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  const nextPath = searchParams.get('next') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

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

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMsg(mapSupabaseErrorToPersian(error, 'ورود به حساب کاربری ناموفق بود.'));
        return;
      }

      showToast('خوش آمدید! با موفقیت وارد شدید.', 'success');
      navigate(nextPath.startsWith('/') ? nextPath : '/', { replace: true });
    } catch (err) {
      setErrorMsg(mapSupabaseErrorToPersian(err, 'ورود با خطا مواجه شد.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-2 sm:py-4 animate-fade-up">
      <div className="rounded-2xl border border-brand-surface bg-white p-5 sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandLogo />
          <h1 className="mt-4 text-xl font-extrabold text-brand-primary">ورود به حساب کاربری</h1>
          <p className="mt-1.5 text-sm text-brand-text/70">
            توان ما، کنار هم معنا پیدا می‌کند.
          </p>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-brand-text/30 bg-brand-bg px-4 py-3 text-sm font-medium text-brand-text"
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="login-email" className="mb-1.5 block text-sm font-semibold text-brand-text">
              ایمیل
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute right-3.5 top-3.5 h-4 w-4 text-brand-text/70" />
              <input
                id="login-email"
                type="email"
                dir="ltr"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="min-h-[44px] w-full rounded-2xl border border-brand-surface bg-brand-bg/60 py-3 pr-10 pl-4 text-left text-[15px] text-brand-text outline-none transition focus:border-brand-green focus:bg-white sm:text-sm"
                required
              />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="login-password" className="text-sm font-semibold text-brand-text">
                رمز عبور
              </label>
              <Link
                to="/auth/forgot-password"
                className="text-xs font-semibold text-brand-green hover:text-brand-primary hover:underline"
              >
                رمز عبور را فراموش کرده‌ام
              </Link>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute right-3.5 top-3.5 h-4 w-4 text-brand-text/70" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                dir="ltr"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="min-h-[44px] w-full rounded-2xl border border-brand-surface bg-brand-bg/60 py-3 pr-10 pl-11 text-left text-[15px] text-brand-text outline-none transition focus:border-brand-green focus:bg-white sm:text-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute left-3 top-3 rounded-lg p-0.5 text-brand-text/70 hover:text-brand-primary"
                aria-label={showPassword ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-primary py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-green disabled:opacity-60"
          >
            <LogIn className="h-4 w-4" />
            {submitting ? 'در حال ورود...' : 'ورود به دست‌به‌دست'}
          </button>
        </form>

        <div className="mt-6 border-t border-brand-bg pt-5 text-center text-sm text-brand-text/70">
          هنوز حساب کاربری ندارید؟{' '}
          <Link
            to={`/auth/register${nextPath !== '/' ? `?next=${encodeURIComponent(nextPath)}` : ''}`}
            className="font-bold text-brand-primary hover:underline"
          >
            ثبت‌نام رایگان
          </Link>
        </div>
      </div>
    </div>
  );
}
