import { useCallback, useEffect, useState } from 'react';
import {
  Award,
  Bell,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Edit3,
  Gift,
  HandHelping,
  HeartHandshake,
  Link2,
  Lock,
  LogOut,
  MapPin,
  Medal,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Wrench,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LoadingState } from '../components/LoadingState';
import { ProtectedImage } from '../components/ProtectedImage';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationsContext';
import { useToast } from '../contexts/ToastContext';
import { formatDateFa, getInitials, toPersianDigits } from '../lib/formatters';
import { getMyAchievementsSummary } from '../services/achievementsService';
import { listMyRequests } from '../services/requestsService';
import { getMyResponses } from '../services/responsesService';
import type { AchievementsSummary } from '../types/database';

function renderBadgeIcon(code: string, earned: boolean) {
  const cls = `h-5 w-5 ${earned ? 'text-brand-primary' : 'text-brand-text/55'}`;
  switch (code) {
    case 'first_helping_hand':
      return <HandHelping className={cls} />;
    case 'neighborhood_heart':
      return <Users className={cls} />;
    case 'skill_mentor':
      return <BookOpen className={cls} />;
    case 'kind_giver':
      return <Gift className={cls} />;
    case 'elderly_friend':
      return <HeartHandshake className={cls} />;
    case 'technical_helper':
      return <Wrench className={cls} />;
    case 'chain_builder':
      return <Link2 className={cls} />;
    case 'steady_supporter':
      return <Medal className={cls} />;
    default:
      return <Award className={cls} />;
  }
}

export function ProfilePage() {
  const { user, profile, loading, signOut } = useAuth();
  const { notificationsRevision } = useNotifications();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [myRequestsCount, setMyRequestsCount] = useState(0);
  const [myOffersCount, setMyOffersCount] = useState(0);
  const [summaryLoaded, setSummaryLoaded] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [achievements, setAchievements] = useState<AchievementsSummary | null>(null);
  const [achievementsLoading, setAchievementsLoading] = useState(true);
  const [achievementsError, setAchievementsError] = useState<string | null>(null);
  const [achievementsOffline, setAchievementsOffline] = useState(false);

  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const loadSummary = useCallback(() => {
    if (!user) return;
    setSummaryError(null);
    Promise.all([listMyRequests(user.id), getMyResponses(user.id)])
      .then(([reqs, resps]) => {
        setMyRequestsCount(reqs.length);
        setMyOffersCount(resps.filter((r) => r.status !== 'cancelled').length);
        setSummaryLoaded(true);
      })
      .catch((err) => {
        setSummaryError(err instanceof Error ? err.message : 'دریافت خلاصه فعالیت‌ها ناموفق بود.');
        setSummaryLoaded(true);
      });
  }, [user]);

  const loadAchievements = useCallback(
    async (silent = false) => {
      if (!user) return;
      if (!silent) setAchievementsLoading(true);
      setAchievementsError(null);
      try {
        const res = await getMyAchievementsSummary(user.id);
        setAchievements(res.summary);
        setAchievementsOffline(res.fromOfflineCache);
      } catch (err) {
        setAchievementsError(
          err instanceof Error ? err.message : 'دریافت نشان‌ها و امتیازات ناموفق بود.'
        );
      } finally {
        if (!silent) setAchievementsLoading(false);
      }
    },
    [user]
  );

  useEffect(() => {
    loadSummary();
    void loadAchievements(false);
  }, [loadSummary, loadAchievements]);

  useEffect(() => {
    if (notificationsRevision > 0 && user) {
      void loadAchievements(true);
    }
  }, [notificationsRevision, user, loadAchievements]);

  if (loading) {
    return <LoadingState label="در حال بارگذاری پروفایل..." />;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg py-6 animate-fade-up">
        <div className="rounded-2xl border border-brand-surface bg-white p-8 text-center">
          <h1 className="mb-2 text-xl font-extrabold text-brand-primary">حساب کاربری دست‌به‌دست</h1>
          <p className="mb-6 text-sm leading-7 text-brand-text/75">
            برای مشاهده پروفایل، ثبت درخواست کمک، اعلام آمادگی داوطلبانه و پیگیری نشان‌ها و امتیازات مشارکت وارد حساب کاربری شوید.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/auth/login"
              className="rounded-xl bg-brand-primary px-6 py-3 text-sm font-bold text-white hover:bg-brand-green"
            >
              ورود به حساب
            </Link>
            <Link
              to="/auth/register"
              className="rounded-xl border border-brand-primary px-6 py-3 text-sm font-bold text-brand-primary hover:bg-brand-surface/40"
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

  const currentPoints =
    achievements?.participation_points ?? profile?.participation_points ?? 0;
  const levelPercent = achievements?.next_level_points
    ? Math.min(100, Math.max(4, Math.round((currentPoints / achievements.next_level_points) * 100)))
    : 100;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Main Profile Card */}
      <section className="rounded-2xl border border-brand-surface bg-white p-4 sm:p-7">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start sm:gap-5">
          <div className="flex items-start gap-3.5 sm:gap-4">
            {profile?.avatar_url ? (
              <ProtectedImage
                src={profile.avatar_url}
                alt={profile.display_name}
                wrapperClassName="relative block h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 border-brand-surface sm:h-20 sm:w-20"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-surface text-xl font-extrabold text-brand-primary sm:h-20 sm:w-20 sm:text-2xl">
                {getInitials(profile?.display_name ?? user.email)}
              </div>
            )}

            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-extrabold text-brand-text sm:text-xl">
                  {profile?.display_name ?? 'کاربر دست‌به‌دست'}
                </h1>
                {achievements && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-brand-gold/60 bg-brand-gold/15 px-2.5 py-0.5 text-[11px] font-bold text-brand-primary">
                    <Trophy className="h-3 w-3 text-brand-gold" />
                    {achievements.level_title}
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-brand-text/70" dir="ltr">
                {user.email}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-medium text-brand-green">
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-surface/65 px-3 py-1 text-brand-primary">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {profile?.province || 'خراسان جنوبی'}
                  {profile?.city ? ` · ${profile.city}` : ''}
                  {profile?.neighborhood ? ` (${profile.neighborhood})` : ''}
                </span>
                {profile?.created_at && (
                  <span className="text-brand-text/70">
                    عضویت از {formatDateFa(profile.created_at)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Link
              to="/profile/edit"
              className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-green"
            >
              <Edit3 className="h-3.5 w-3.5" />
              ویرایش پروفایل
            </Link>
            <Link
              to="/notifications"
              className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-brand-surface bg-brand-bg px-4 py-2.5 text-xs font-bold text-brand-primary hover:border-brand-soft"
            >
              <Bell className="h-3.5 w-3.5" />
              اعلان‌ها
            </Link>
            <Link
              to="/settings"
              className="col-span-2 inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-brand-surface bg-brand-bg px-4 py-2.5 text-xs font-bold text-brand-text hover:border-brand-soft sm:col-span-1"
            >
              <Settings className="h-3.5 w-3.5" />
              تنظیمات
            </Link>
          </div>
        </div>

        {profile?.bio && (
          <p className="mt-5 rounded-2xl bg-brand-bg p-4 text-sm leading-7 text-brand-text/80">
            {profile.bio}
          </p>
        )}

        <div className="mt-5">
          <h2 className="mb-2.5 text-sm font-bold text-brand-text">مهارت‌ها و توانایی‌ها</h2>
          {profile?.skills && profile.skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-xl border border-brand-surface bg-brand-surface/45 px-3 py-1.5 text-xs font-semibold text-brand-primary"
                >
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-brand-text/70">
              هنوز مهارتی ثبت نکرده‌اید. با{' '}
              <Link to="/profile/edit" className="font-bold text-brand-green hover:underline">
                ویرایش پروفایل
              </Link>{' '}
              مهارت‌هایتان را اضافه کنید.
            </p>
          )}
        </div>
      </section>

      {summaryError && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-brand-text/25 bg-white px-4 py-3 text-xs text-brand-text">
          <span>{summaryError}</span>
          <button
            type="button"
            onClick={loadSummary}
            className="inline-flex items-center gap-1 rounded-xl bg-brand-primary px-3 py-1.5 font-bold text-white hover:bg-brand-green"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            تلاش مجدد
          </button>
        </div>
      )}

      {/* Real Activity Stats */}
      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
        <div className="rounded-2xl border border-brand-surface bg-white p-3.5 text-center sm:p-4">
          <CheckCircle2 className="mx-auto mb-1 h-5 w-5 text-brand-green sm:mb-1.5 sm:h-6 sm:w-6" />
          <div className="text-xl font-extrabold text-brand-primary sm:text-2xl">
            {toPersianDigits(
              achievements?.completed_helps_count ?? profile?.completed_helps_count ?? 0
            )}
          </div>
          <div className="mt-0.5 text-[11px] font-medium text-brand-text/70 sm:text-xs">کمک تأییدشده</div>
        </div>

        <div className="rounded-2xl border border-brand-surface bg-white p-3.5 text-center sm:p-4">
          <Trophy className="mx-auto mb-1 h-5 w-5 text-brand-gold sm:mb-1.5 sm:h-6 sm:w-6" />
          <div className="text-xl font-extrabold text-brand-primary sm:text-2xl">
            {toPersianDigits(currentPoints)}
          </div>
          <div className="mt-0.5 text-[11px] font-medium text-brand-text/70 sm:text-xs">امتیاز مشارکت</div>
        </div>

        <div className="rounded-2xl border border-brand-surface bg-white p-3.5 text-center sm:p-4">
          <ClipboardList className="mx-auto mb-1 h-5 w-5 text-brand-green sm:mb-1.5 sm:h-6 sm:w-6" />
          <div className="text-xl font-extrabold text-brand-primary sm:text-2xl">
            {summaryLoaded ? toPersianDigits(myRequestsCount) : '—'}
          </div>
          <div className="mt-0.5 text-[11px] font-medium text-brand-text/70 sm:text-xs">درخواست‌ها</div>
        </div>

        <div className="rounded-2xl border border-brand-surface bg-white p-3.5 text-center sm:p-4">
          <Sparkles className="mx-auto mb-1 h-5 w-5 text-brand-gold sm:mb-1.5 sm:h-6 sm:w-6" />
          <div className="text-xl font-extrabold text-brand-primary sm:text-2xl">
            {summaryLoaded ? toPersianDigits(myOffersCount) : '—'}
          </div>
          <div className="mt-0.5 text-[11px] font-medium text-brand-text/70 sm:text-xs">اعلام آمادگی</div>
        </div>
      </section>

      {/* Live Badges & Participation Points Section */}
      <section className="space-y-4 rounded-2xl border border-brand-surface bg-white p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-brand-gold" />
            <h2 className="text-base font-extrabold text-brand-primary sm:text-lg">
              نشان‌های افتخار و امتیازات مشارکت
            </h2>
          </div>

          {achievements && (
            <span className="rounded-full bg-brand-surface px-3 py-1 text-xs font-bold text-brand-primary">
              {toPersianDigits(achievements.earned_count)} از {toPersianDigits(achievements.total_badges)} نشان کسب‌شده
            </span>
          )}
        </div>

        <p className="text-xs leading-6 text-brand-text/75">
          تمامی امتیازات و نشان‌ها بدون ارزش مالی هستند و به‌صورت خودکار در پایگاه‌داده بر اساس همیاری‌های واقعی و تأییدشده توسط دریافت‌کنندگان (+۲۰ امتیاز پایه برای هر کمک تأییدشده + امتیاز نشان‌های تخصصی) اعطا می‌شوند.
        </p>

        {achievementsOffline && (
          <div className="rounded-xl border border-brand-soft/60 bg-brand-surface/40 px-3.5 py-2 text-xs font-medium text-brand-primary">
            آخرین وضعیت ذخیره‌شده نشان‌ها و امتیازات در حالت آفلاین نمایش داده می‌شود.
          </div>
        )}

        {achievementsLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[1, 2, 3, 4].map((idx) => (
              <div
                key={idx}
                className="h-24 animate-pulse rounded-2xl border border-brand-surface bg-brand-bg/70"
              />
            ))}
          </div>
        ) : achievementsError ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-text/25 bg-brand-bg p-4 text-xs text-brand-text">
            <span>{achievementsError}</span>
            <button
              type="button"
              onClick={() => void loadAchievements(false)}
              className="inline-flex items-center gap-1 rounded-xl bg-brand-primary px-3.5 py-2 font-bold text-white hover:bg-brand-green"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              تلاش مجدد
            </button>
          </div>
        ) : achievements ? (
          <>
            {/* Level Progress Card */}
            <div className="rounded-2xl border border-brand-surface bg-brand-bg/75 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-brand-primary text-xs font-extrabold text-white">
                    {toPersianDigits(achievements.level_number)}
                  </span>
                  <div>
                    <div className="font-extrabold text-brand-primary">
                      سطح فعلی: {achievements.level_title}
                    </div>
                    <div className="text-[11px] text-brand-text/70">
                      مجموع امتیاز ثبت‌شده: {toPersianDigits(achievements.participation_points)} امتیاز
                    </div>
                  </div>
                </div>

                {achievements.next_level_points && achievements.next_level_title ? (
                  <div className="text-[11px] font-semibold text-brand-green">
                    {toPersianDigits(
                      Math.max(0, achievements.next_level_points - achievements.participation_points)
                    )}{' '}
                    امتیاز تا سطح «{achievements.next_level_title}»
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-gold/25 px-3 py-1 text-[11px] font-bold text-brand-primary">
                    <Sparkles className="h-3.5 w-3.5 text-brand-gold" />
                    بالاترین سطح همیاری
                  </span>
                )}
              </div>

              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-brand-surface">
                <div
                  className="h-full rounded-full bg-brand-primary transition-all duration-500"
                  style={{ width: `${levelPercent}%` }}
                />
              </div>
            </div>

            {/* Badges Grid */}
            <div className="grid gap-3 sm:grid-cols-2">
              {achievements.badges.map((badge) => (
                <article
                  key={badge.code}
                  className={`flex flex-col justify-between gap-3 rounded-2xl border p-4 transition ${
                    badge.earned
                      ? 'border-brand-gold/70 bg-brand-surface/30'
                      : 'border-dashed border-brand-surface bg-brand-bg/60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
                        badge.earned
                          ? 'border-brand-gold/60 bg-white'
                          : 'border-brand-surface bg-white/80'
                      }`}
                    >
                      {renderBadgeIcon(badge.code, badge.earned)}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <h3
                          className={`text-sm font-extrabold ${
                            badge.earned ? 'text-brand-primary' : 'text-brand-text'
                          }`}
                        >
                          {badge.title_fa}
                        </h3>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            badge.earned
                              ? 'bg-brand-primary text-white'
                              : 'border border-brand-surface bg-white text-brand-text/75'
                          }`}
                        >
                          +{toPersianDigits(badge.points)} امتیاز
                        </span>
                      </div>

                      <p className="text-xs leading-6 text-brand-text/80">
                        {badge.description_fa}
                      </p>
                      <p className="text-[11px] leading-5 text-brand-text/65">
                        معیار: {badge.criteria_fa}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-brand-surface/60 pt-2.5 text-[11px]">
                    {badge.earned ? (
                      <>
                        <span className="inline-flex items-center gap-1 font-bold text-brand-green">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          کسب‌شده
                        </span>
                        {badge.awarded_at && (
                          <span className="text-brand-text/65">
                            در تاریخ {formatDateFa(badge.awarded_at)}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="inline-flex items-center gap-1 font-medium text-brand-text/65">
                          <Lock className="h-3.5 w-3.5" />
                          در انتظار تحقق معیار
                        </span>
                        <Link
                          to={
                            badge.category_filter
                              ? `/requests?category=${badge.category_filter}`
                              : '/requests'
                          }
                          className="font-bold text-brand-primary hover:underline"
                        >
                          مشاهده درخواست‌ها ←
                        </Link>
                      </>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : null}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-surface bg-white p-5">
        <Link
          to="/my-activities"
          className="text-sm font-bold text-brand-primary hover:underline"
        >
          مشاهده کامل فعالیت‌های من ←
        </Link>

        <button
          type="button"
          onClick={() => setShowSignOutConfirm(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-brand-text/25 bg-white px-4 py-2 text-xs font-bold text-brand-text hover:bg-brand-bg"
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
