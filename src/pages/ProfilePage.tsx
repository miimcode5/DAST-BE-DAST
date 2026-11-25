import { useEffect, useState } from 'react';
import {
  Award,
  CheckCircle2,
  ClipboardList,
  Edit3,
  LogOut,
  MapPin,
  Settings,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LoadingState } from '../components/LoadingState';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { formatDateFa, getInitials, toPersianDigits } from '../lib/formatters';
import { listMyRequests } from '../services/requestsService';
import { getMyResponses } from '../services/responsesService';
import { PLANNED_BADGES_ROADMAP } from '../types/future';

export function ProfilePage() {
  const { user, profile, loading, signOut } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [myRequestsCount, setMyRequestsCount] = useState(0);
  const [myOffersCount, setMyOffersCount] = useState(0);
  const [summaryLoaded, setSummaryLoaded] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;

    Promise.all([listMyRequests(user.id), getMyResponses(user.id)])
      .then(([reqs, resps]) => {
        if (!active) return;
        setMyRequestsCount(reqs.length);
        setMyOffersCount(resps.filter((r) => r.status !== 'cancelled').length);
        setSummaryLoaded(true);
      })
      .catch(() => {
        if (active) setSummaryLoaded(true);
      });

    return () => {
      active = false;
    };
  }, [user]);

  if (loading) {
    return <LoadingState label="در حال بارگذاری پروفایل..." />;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg py-6 animate-fade-up">
        <div className="rounded-3xl border border-[#DCEBDD] bg-white p-8 text-center shadow-xs">
          <h1 className="mb-2 text-xl font-extrabold text-[#174D35]">حساب کاربری دست‌به‌دست</h1>
          <p className="mb-6 text-sm leading-7 text-[#4D5B4D]">
            برای مشاهده پروفایل، ثبت درخواست کمک، اعلام آمادگی داوطلبانه و پیگیری فعالیت‌های خود وارد حساب کاربری شوید.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/auth/login"
              className="rounded-2xl bg-[#174D35] px-6 py-3 text-sm font-bold text-white hover:bg-[#26734B]"
            >
              ورود به حساب
            </Link>
            <Link
              to="/auth/register"
              className="rounded-2xl border border-[#174D35] px-6 py-3 text-sm font-bold text-[#174D35] hover:bg-[#DCEBDD]/40"
            >
              ایجاد حساب جدید
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    setShowSignOutConfirm(false);
    showToast('با موفقیت از حساب کاربری خارج شدید.', 'info');
    navigate('/', { replace: true });
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Main Profile Card */}
      <section className="rounded-3xl border border-[#DCEBDD] bg-white p-6 shadow-xs sm:p-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div className="flex items-start gap-4">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className="h-20 w-20 rounded-3xl border-2 border-[#DCEBDD] object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-[#DCEBDD] text-2xl font-extrabold text-[#174D35]">
                {getInitials(profile?.display_name ?? user.email)}
              </div>
            )}

            <div className="space-y-1.5">
              <h1 className="text-xl font-extrabold text-[#202820]">
                {profile?.display_name ?? 'کاربر دست‌به‌دست'}
              </h1>
              <p className="text-xs text-[#667466]" dir="ltr">
                {user.email}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-medium text-[#26734B]">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#DCEBDD]/65 px-3 py-1 text-[#174D35]">
                  <MapPin className="h-3.5 w-3.5" />
                  {profile?.province || 'خراسان جنوبی'}
                  {profile?.city ? ` · ${profile.city}` : ''}
                  {profile?.neighborhood ? ` (${profile.neighborhood})` : ''}
                </span>
                {profile?.created_at && (
                  <span className="text-[#5E6C5E]">
                    عضویت از {formatDateFa(profile.created_at)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to="/profile/edit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#174D35] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#26734B]"
            >
              <Edit3 className="h-3.5 w-3.5" />
              ویرایش پروفایل
            </Link>
            <Link
              to="/settings"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCEBDD] bg-[#F6F7F2] px-4 py-2.5 text-xs font-bold text-[#202820] hover:border-[#78B98A]"
            >
              <Settings className="h-3.5 w-3.5" />
              تنظیمات
            </Link>
          </div>
        </div>

        {profile?.bio && (
          <p className="mt-5 rounded-2xl bg-[#F6F7F2] p-4 text-sm leading-7 text-[#3A473A]">
            {profile.bio}
          </p>
        )}

        <div className="mt-5">
          <h2 className="mb-2.5 text-sm font-bold text-[#202820]">مهارت‌ها و توانایی‌ها</h2>
          {profile?.skills && profile.skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-xl border border-[#DCEBDD] bg-[#DCEBDD]/45 px-3 py-1.5 text-xs font-semibold text-[#174D35]"
                >
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#667466]">
              هنوز مهارتی ثبت نکرده‌اید. با{' '}
              <Link to="/profile/edit" className="font-bold text-[#26734B] hover:underline">
                ویرایش پروفایل
              </Link>{' '}
              مهارت‌هایتان را اضافه کنید.
            </p>
          )}
        </div>
      </section>

      {/* Real Activity Stats */}
      <section className="grid grid-cols-3 gap-3">
        <div className="rounded-3xl border border-[#DCEBDD] bg-white p-4 text-center">
          <CheckCircle2 className="mx-auto mb-1.5 h-6 w-6 text-[#26734B]" />
          <div className="text-2xl font-extrabold text-[#174D35]">
            {toPersianDigits(profile?.completed_helps_count ?? 0)}
          </div>
          <div className="mt-0.5 text-xs font-medium text-[#556455]">کمک‌های تأییدشده</div>
        </div>

        <div className="rounded-3xl border border-[#DCEBDD] bg-white p-4 text-center">
          <ClipboardList className="mx-auto mb-1.5 h-6 w-6 text-[#26734B]" />
          <div className="text-2xl font-extrabold text-[#174D35]">
            {summaryLoaded ? toPersianDigits(myRequestsCount) : '—'}
          </div>
          <div className="mt-0.5 text-xs font-medium text-[#556455]">درخواست‌های من</div>
        </div>

        <div className="rounded-3xl border border-[#DCEBDD] bg-white p-4 text-center">
          <Sparkles className="mx-auto mb-1.5 h-6 w-6 text-[#E9B949]" />
          <div className="text-2xl font-extrabold text-[#174D35]">
            {summaryLoaded ? toPersianDigits(myOffersCount) : '—'}
          </div>
          <div className="mt-0.5 text-xs font-medium text-[#556455]">اعلام آمادگی‌ها</div>
        </div>
      </section>

      {/* Future Badges / Recognition Roadmap (explicitly marked as upcoming v2, never fake!) */}
      <section className="rounded-3xl border border-[#DCEBDD] bg-white p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-[#E9B949]" />
            <h2 className="text-base font-bold text-[#202820]">نشان‌های افتخار و امتیازات مشارکت</h2>
          </div>
          <span className="rounded-full bg-[#E9B949]/20 px-3 py-1 text-[11px] font-bold text-[#7A5807]">
            فعال‌سازی در نسخه تکمیلی
          </span>
        </div>
        <p className="mb-4 text-xs leading-6 text-[#505E50]">
          در نسخه بعدی، نشان‌های افتخار بدون ارزش مالی و صرفاً بر اساس فعالیت‌های واقعی و تأییدشده اعطا می‌شوند:
        </p>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {PLANNED_BADGES_ROADMAP.map((badge) => (
            <div
              key={badge.code}
              className="flex items-start gap-2.5 rounded-2xl border border-dashed border-[#DCEBDD] bg-[#F6F7F2]/60 p-3 opacity-85"
            >
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#26734B]" />
              <div>
                <div className="text-xs font-bold text-[#202820]">{badge.titleFa}</div>
                <div className="text-[11px] leading-5 text-[#5E6C5E]">{badge.descriptionFa}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-[#DCEBDD] bg-white p-5">
        <Link
          to="/my-activities"
          className="text-sm font-bold text-[#174D35] hover:underline"
        >
          مشاهده کامل فعالیت‌های من ←
        </Link>

        <button
          type="button"
          onClick={() => setShowSignOutConfirm(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
        >
          <LogOut className="h-4 w-4" />
          خروج از حساب کاربری
        </button>
      </div>

      <ConfirmDialog
        open={showSignOutConfirm}
        title="خروج از حساب کاربری"
        description="آیا مطمئن هستید که می‌خواهید از حساب کاربری خود خارج شوید؟"
        confirmLabel="خروج"
        tone="danger"
        onConfirm={handleSignOut}
        onCancel={() => setShowSignOutConfirm(false)}
      />
    </div>
  );
}
