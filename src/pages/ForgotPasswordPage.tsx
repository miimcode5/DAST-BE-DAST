import { useState, type FormEvent } from 'react';
import { ArrowRight, CheckCircle2, KeyRound, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { mapSupabaseErrorToPersian, supabase } from '../lib/supabase';
import { validateEmail } from '../lib/validation';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const err = validateEmail(email);
    if (err) {
      setErrorMsg(err);
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}auth/reset-password`,
      });
      if (error) {
        setErrorMsg(mapSupabaseErrorToPersian(error, 'ارسال لینک بازیابی ناموفق بود.'));
        return;
      }
      setSent(true);
    } catch (ex) {
      setErrorMsg(mapSupabaseErrorToPersian(ex, 'ارسال لینک بازیابی با خطا مواجه شد.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-6 animate-fade-up">
      <div className="rounded-2xl border border-brand-surface bg-white p-6 sm:p-8">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-surface text-brand-primary">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-brand-primary">بازیابی رمز عبور</h1>
            <p className="text-xs text-brand-text/70">لینک تنظیم رمز جدید به ایمیل شما ارسال می‌شود.</p>
          </div>
        </div>

        {sent ? (
          <div className="space-y-4 rounded-xl border border-brand-soft/60 bg-brand-surface/35 p-5 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-brand-primary" />
            <p className="text-sm leading-7 text-brand-text">
              در صورتی که ایمیل <span className="font-bold" dir="ltr">{email}</span> در دست‌به‌دست ثبت شده باشد، لینک بازیابی رمز عبور برایتان ارسال شده است.
            </p>
            <Link
              to="/auth/login"
              className="inline-flex w-full items-center justify-center rounded-xl bg-brand-primary py-2.5 text-sm font-bold text-white hover:bg-brand-green"
            >
              بازگشت به صفحه ورود
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {errorMsg && (
              <div className="rounded-xl border border-brand-text/30 bg-brand-bg px-4 py-3 text-sm text-brand-text">
                {errorMsg}
              </div>
            )}

            <div>
              <label htmlFor="recover-email" className="mb-1.5 block text-sm font-semibold text-brand-text">
                ایمیل ثبت‌شده
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute right-3.5 top-3.5 h-4 w-4 text-brand-text/70" />
                <input
                  id="recover-email"
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-2xl border border-brand-surface bg-brand-bg/60 py-3 pr-10 pl-4 text-left text-sm outline-none focus:border-brand-green focus:bg-white"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-brand-primary py-3 text-sm font-bold text-white hover:bg-brand-green disabled:opacity-60"
            >
              {submitting ? 'در حال ارسال...' : 'ارسال لینک بازیابی رمز'}
            </button>

            <div className="pt-2 text-center">
              <Link
                to="/auth/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-green hover:underline"
              >
                <ArrowRight className="h-3.5 w-3.5" />
                بازگشت به ورود
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
