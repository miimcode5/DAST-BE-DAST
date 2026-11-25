import { useEffect, useMemo, useState } from 'react';
import {
  Award,
  CheckCircle2,
  ClipboardList,
  Edit3,
  HeartHandshake,
  Link2,
  LogOut,
  MapPin,
  MessageCircle,
  Settings,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LoadingState } from '../components/LoadingState';
import { ProtectedImage } from '../components/ProtectedImage';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { formatDateFa, getInitials, toPersianDigits } from '../lib/formatters';
import { listMyRequests } from '../services/requestsService';
import { getMyResponses } from '../services/responsesService';

interface NonCompetitiveBadge {
  id: string;
  title: string;
  description: string;
  earned: boolean;
}

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

  const completedHelps = profile?.completed_helps_count ?? 0;

  const badges = useMemo<NonCompetitiveBadge[]>(
    () => [
      {
        id: 'member',
        title: 'عضو جامعه دست‌به‌دست',
        description: 'حضور در جمع همیاری محلی و تکمیل معرفی خود',
        earned: Boolean(profile?.display_name),
      },
      {
        id: 'participant',
        title: 'نخستین حضور فعال',
        description: 'ثبت یک درخواست واقعی یا اعلام آمادگی برای کمک',
        earned: summaryLoaded && (myRequestsCount > 0 || myOffersCount > 0),
      },
      {
        id: 'first-help',
        title: 'نخستین گره‌گشایی',
        description: 'تأیید شدن یک کمک داوطلبانه واقعی در پلتفرم',
        earned: completedHelps >= 1,
      },
      {
        id: 'chain-builder',
        title: 'حلقه‌ساز مهربانی',
        description: 'ثبت ۳ همیاری تأییدشده در زنجیره مهربانی',
        earned: completedHelps >= 3,
      },
      {
        id: 'pillar',
        title: 'همیار ماندگار محله',
        description: 'مشارکت مستمر در ۵ همیاری تأییدشده یا بیشتر',
        earned: completedHelps >= 5,
      },
    ],
    [completedHelps, myOffersCount, myRequestsCount, profile?.display_name, summaryLoaded]
  );

  if (loading) {
    return <LoadingState label="در حال بارگذاری پروفایل..." />;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg py-6 animate-fade-up">
        <div className="rounded-3xl border border-[#DCEBDD] bg-white p-8 text-center shadow-[0_2px_10px_rgba(23,77,53,0.03)]">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#DCEBDD] text-[#174D35]">
            <HeartHandshake className="h-7 w-7" />
          </div>
          <h1 className="mb-2 text-xl font-bold text-[#174D35]">حساب کاربری دست‌به‌دست</h1>
          <p className="mb-6 text-sm font-normal leading-7 text-[#4D5B4D]">
            برای مشاهده پروفایل، ثبت درخواست کمک، اعلام آمادگی داوطلبانه و پیگیری فعالیت‌های خود وارد حساب کاربری شوید.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/auth/login"
              className="inline-flex min-h-[46px] items-center justify-center rounded-2xl bg-[#174D35] px-6 py-3 text-sm font-bold text-white hover:bg-[#26734B]"
            >
              ورود به حساب
            </Link>
            <Link
              to="/auth/register"
              className="inline-flex min-h-[46px] items-center justify-center rounded-2xl border border-[#174D35] px-6 py-3 text-sm font-bold text-[#174D35] hover:bg-[#DCEBDD]/40"
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
    <div className="space-y-5 animate-fade-up">
      {/* Main Profile Header Card — private credentials/email strictly omitted */}
      <section className="rounded-3xl border border-[#DCEBDD] bg-white p-4 shadow-[0_2px_10px_rgba(23,77,53,0.03)] sm:p-7">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start sm:gap-5">
          <div className="flex items-start gap-3.5 sm:gap-4">
            {profile?.avatar_url ? (
              <ProtectedImage
                src={profile.avatar_url}
                alt={profile.display_name}
                wrapperClassName="relative block h-16 w-16 shrink-0 overflow-hidden rounded-3xl border-2 border-[#DCEBDD] sm:h-20 sm:w-20"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-[#DCEBDD] text-xl font-bold text-[#174D35] sm:h-20 sm:w-20 sm:text-2xl">
                {getInitials(profile?.display_name ?? 'د')}
              </div>
            )}

            <div className="min-w-0 space-y-1.5">
              <h1 className="truncate text-lg font-bold text-[#202820] sm:text-xl">
                {profile?.display_name ?? 'کاربر دست‌به‌دست'}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#26734B]">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#DCEBDD]/65 px-3 py-1 text-[#174D35]">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {profile?.province || 'خراسان جنوبی'}
                  {profile?.city ? ` · ${profile.city}` : ''}
                </span>
                {profile?.created_at && (
                  <span className="font-light text-[#5E6C5E]">
                    عضویت از {formatDateFa(profile.created_at)}
                  </span>
                )}
              </div>
              <div className="inline-flex items-center gap-1 text-[11px] font-light text-[#556455]">
                <ShieldCheck className="h-3.5 w-3.5 text-[#26734B]" />
                <span>نشانی دقیق، ایمیل و اطلاعات حساس در پروفایل نمایش داده نمی‌شود.</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Link
              to="/profile/edit"
              className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl bg-[#174D35] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#26734B]"
            >
              <Edit3 className="h-3.5 w-3.5" />
              ویرایش پروفایل
            </Link>
            <Link
              to="/settings"
              className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-[#DCEBDD] bg-[#F6F7F2] px-4 py-2.5 text-xs font-semibold text-[#202820] hover:border-[#78B98A]"
            >
              <Settings className="h-3.5 w-3.5" />
              تنظیمات
            </Link>
          </div>
        </div>

        {profile?.bio && (
          <p className="mt-5 rounded-2xl bg-[#F6F7F2] p-4 text-sm font-normal leading-7 text-[#3A473A]">
            {profile.bio}
          </p>
        )}

        <div className="mt-5">
          <h2 className="mb-2.5 text-sm font-semibold text-[#202820]">مهارت‌ها و زمینه‌های همیاری</h2>
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
            <p className="text-xs font-normal text-[#667466]">
              هنوز مهارتی ثبت نکرده‌اید. با{' '}
              <Link to="/profile/edit" className="font-semibold text-[#26734B] hover:underline">
                ویرایش پروفایل
              </Link>{' '}
              توانایی‌هایتان را بنویسید تا درخواست‌های مناسب‌تر را ببینید.
            </p>
          )}
        </div>
      </section>

      {/* Real Computed Activity Stats */}
      <section className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
        <div className="rounded-2xl border border-[#DCEBDD] bg-white p-3.5 text-center sm:rounded-3xl sm:p-4">
          <CheckCircle2 className="mx-auto mb-1 h-5 w-5 text-[#26734B] sm:mb-1.5 sm:h-6 sm:w-6" />
          <div className="text-xl font-bold text-[#174D35] sm:text-2xl">
            {toPersianDigits(completedHelps)}
          </div>
          <div className="mt-0.5 text-[11px] font-medium text-[#556455] sm:text-xs">کمک تأییدشده</div>
        </div>

        <div className="rounded-2xl border border-[#DCEBDD] bg-white p-3.5 text-center sm:rounded-3xl sm:p-4">
          <ClipboardList className="mx-auto mb-1 h-5 w-5 text-[#26734B] sm:mb-1.5 sm:h-6 sm:w-6" />
          <div className="text-xl font-bold text-[#174D35] sm:text-2xl">
            {summaryLoaded ? toPersianDigits(myRequestsCount) : '—'}
          </div>
          <div className="mt-0.5 text-[11px] font-medium text-[#556455] sm:text-xs">درخواست‌های من</div>
        </div>

        <div className="rounded-2xl border border-[#DCEBDD] bg-white p-3.5 text-center sm:rounded-3xl sm:p-4">
          <Sparkles className="mx-auto mb-1 h-5 w-5 text-[#E9B949] sm:mb-1.5 sm:h-6 sm:w-6" />
          <div className="text-xl font-bold text-[#174D35] sm:text-2xl">
            {summaryLoaded ? toPersianDigits(myOffersCount) : '—'}
          </div>
          <div className="mt-0.5 text-[11px] font-medium text-[#556455] sm:text-xs">اعلام آمادگی</div>
        </div>
      </section>

      {/* Non-Competitive Community Recognition Badges (Computed from Real DB Metrics) */}
      <section className="rounded-3xl border border-[#DCEBDD] bg-white p-4 shadow-[0_2px_10px_rgba(23,77,53,0.03)] sm:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-[#E9B949]" />
            <h2 className="text-base font-bold text-[#174D35]">قدردانی‌های غیررقابتی مشارکت</h2>
          </div>
          <span className="rounded-full bg-[#DCEBDD] px-3 py-1 text-[11px] font-semibold text-[#174D35]">
            {toPersianDigits(badges.filter((b) => b.earned).length)} از {toPersianDigits(badges.length)} یادگار
          </span>
        </div>

        <p className="mb-4 text-xs font-normal leading-6 text-[#505E50]">
          این یادگارها صرفاً قدردانی صمیمی از مشارکت‌های واقعی شماست و هیچ رتبه‌بندی یا مسابقه عمومی وجود ندارد.
        </p>

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className={`flex items-start gap-3 rounded-2xl border p-3.5 transition ${
                badge.earned
                  ? 'border-[#78B98A] bg-[#DCEBDD]/35'
                  : 'border-dashed border-[#DCEBDD] bg-[#F6F7F2]/60 opacity-75'
              }`}
            >
              <span
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                  badge.earned
                    ? 'bg-[#174D35] text-[#E9B949]'
                    : 'bg-white text-[#78B98A]'
                }`}
              >
                <Award className="h-4 w-4" />
              </span>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-[#202820]">{badge.title}</span>
                  {badge.earned && (
                    <span className="rounded-full bg-[#E9B949]/25 px-2 py-0.5 text-[10px] font-semibold text-[#6F4E06]">
                      ثبت‌شده
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] font-normal leading-5 text-[#556455]">
                  {badge.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Links & Sign Out */}
      <section className="grid gap-3 sm:grid-cols-3">
        <Link
          to="/my-activities"
          className="flex items-center justify-between rounded-2xl border border-[#DCEBDD] bg-white px-4 py-3.5 text-sm font-semibold text-[#174D35] transition hover:border-[#78B98A]"
        >
          <span className="inline-flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-[#26734B]" />
            فعالیت‌های من
          </span>
          <span className="text-xs text-[#26734B]">←</span>
        </Link>

        <Link
          to="/messages"
          className="flex items-center justify-between rounded-2xl border border-[#DCEBDD] bg-white px-4 py-3.5 text-sm font-semibold text-[#174D35] transition hover:border-[#78B98A]"
        >
          <span className="inline-flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-[#26734B]" />
            گفت‌وگوها و پیام‌ها
          </span>
          <span className="text-xs text-[#26734B]">←</span>
        </Link>

        <Link
          to="/kindness-chain"
          className="flex items-center justify-between rounded-2xl border border-[#DCEBDD] bg-white px-4 py-3.5 text-sm font-semibold text-[#174D35] transition hover:border-[#78B98A]"
        >
          <span className="inline-flex items-center gap-2">
            <Link2 className="h-4 w-4 text-[#26734B]" />
            زنجیره مهربانی
          </span>
          <span className="text-xs text-[#26734B]">←</span>
        </Link>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowSignOutConfirm(true)}
          className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
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
