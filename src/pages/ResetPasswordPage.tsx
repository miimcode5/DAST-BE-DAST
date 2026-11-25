import { useState, type FormEvent } from 'react';
import { KeyRound, Lock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { mapSupabaseErrorToPersian, supabase } from '../lib/supabase';
import { validatePassword } from '../lib/validation';

export function ResetPasswordPage() {
  const { user, clearPasswordRecovery } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const err = validatePassword(password);
    if (err) {
      setErrorMsg(err);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('رمز عبور جدید و تکرار آن یکسان نیستند.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setErrorMsg(mapSupabaseErrorToPersian(error, 'تغییر رمز عبور انجام نشد.'));
        return;
      }

      clearPasswordRecovery();
      showToast('رمز عبور شما با موفقیت تغییر یافت.', 'success');
      navigate('/profile', { replace: true });
    } catch (ex) {
      setErrorMsg(mapSupabaseErrorToPersian(ex, 'خطا در ثبت رمز جدید.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-6 animate-fade-up">
      <div className="rounded-3xl border border-[#DCEBDD] bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#DCEBDD] text-[#174D35]">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-[#174D35]">تنظیم رمز عبور جدید</h1>
            <p className="text-xs text-[#556455]">رمز عبور جدید حساب خود را وارد کنید.</p>
          </div>
        </div>

        {!user ? (
          <div className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-950">
            <p>
              لینک بازیابی معتبر نیست یا منقضی شده است. می‌توانید دوباره درخواست بازیابی رمز عبور ارسال کنید.
            </p>
            <Link
              to="/auth/forgot-password"
              className="inline-flex w-full items-center justify-center rounded-xl bg-[#174D35] py-2.5 text-sm font-bold text-white"
            >
              درخواست لینک جدید
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                {errorMsg}
              </div>
            )}

            <div>
              <label htmlFor="new-pass" className="mb-1.5 block text-sm font-semibold">
                رمز عبور جدید
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute right-3.5 top-3.5 h-4 w-4 text-[#5A695A]" />
                <input
                  id="new-pass"
                  type="password"
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="حداقل ۶ کاراکتر"
                  className="w-full rounded-2xl border border-[#DCEBDD] bg-[#F6F7F2]/60 py-3 pr-10 pl-4 text-left text-sm outline-none focus:border-[#26734B] focus:bg-white"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirm-new-pass" className="mb-1.5 block text-sm font-semibold">
                تکرار رمز عبور جدید
              </label>
              <input
                id="confirm-new-pass"
                type="password"
                dir="ltr"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="تکرار رمز جدید"
                className="w-full rounded-2xl border border-[#DCEBDD] bg-[#F6F7F2]/60 px-4 py-3 text-left text-sm outline-none focus:border-[#26734B] focus:bg-white"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-[#174D35] py-3 text-sm font-bold text-white hover:bg-[#26734B] disabled:opacity-60"
            >
              {submitting ? 'در حال ذخیره...' : 'ذخیره رمز عبور جدید'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
