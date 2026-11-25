import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  HandHeart,
  Link2,
  MapPin,
  Sparkles,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { KindnessIllustration } from '../components/KindnessIllustration';
import { LoadingState } from '../components/LoadingState';
import { ProtectedImage } from '../components/ProtectedImage';
import { CategoryBadge } from '../components/StatusBadge';
import { useAuth } from '../contexts/AuthContext';
import { formatDateFa, getInitials, toPersianDigits } from '../lib/formatters';
import { getKindnessChain } from '../services/statsService';
import type { KindnessChainData } from '../types/database';

export function KindnessChainPage() {
  const { user } = useAuth();
  const [data, setData] = useState<KindnessChainData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await getKindnessChain();
        if (active) setData(res);
      } catch (err) {
        if (active) setErrorMsg(err instanceof Error ? err.message : 'خطا در بارگذاری زنجیره مهربانی');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <LoadingState label="در حال بارگذاری پیوندهای زنجیره مهربانی..." />;
  }

  if (errorMsg || !data) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-800">
        {errorMsg ?? 'دریافت اطلاعات زنجیره مهربانی ناموفق بود.'}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Visual Spotlight Hero */}
      <section className="overflow-hidden rounded-3xl border border-[#DCEBDD] bg-white p-5 shadow-[0_2px_12px_rgba(23,77,53,0.04)] sm:p-7">
        <div className="grid items-center gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#DCEBDD] px-3 py-1 text-xs font-semibold text-[#174D35]">
              <Link2 className="h-3.5 w-3.5" />
              <span>زنجیره زنده مهربانی دست‌به‌دست</span>
            </div>

            <h1 className="text-xl font-bold leading-9 text-[#174D35] sm:text-2xl sm:leading-10">
              کمکی که می‌گیرید، آغازگر کمکی تازه است
            </h1>

            <p className="max-w-xl text-sm font-normal leading-7 text-[#465346]">
              در دست‌به‌دست هر کمک تأییدشده یک حلقه واقعی می‌سازد؛ نه امتیاز و رتبه‌بندی رقابتی. وقتی کسی امروز دست دیگری را می‌گیرد، فردا همان هم‌شهری می‌تواند گره‌ای از کار دیگری باز کند.
            </p>

            <div className="flex flex-wrap gap-2.5 pt-1">
              <Link
                to="/requests"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-[#174D35] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#26734B]"
              >
                <HandHeart className="h-4 w-4 text-[#E9B949]" />
                <span>ساخت حلقه جدید</span>
              </Link>
              <Link
                to={user ? '/requests/new' : '/auth/register'}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl border border-[#DCEBDD] bg-[#F6F7F2] px-4 py-2.5 text-sm font-semibold text-[#174D35] hover:border-[#78B98A]"
              >
                <span>{user ? 'ثبت درخواست کمک' : 'پیوستن به زنجیره'}</span>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <KindnessIllustration
            verifiedCount={data.summary.verified_helps}
            connectedChains={data.summary.connected_chains}
          />
        </div>
      </section>

      {/* Real Computed Stats Summary */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-3xl border border-[#DCEBDD] bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#556455]">همیاری تأییدشده</span>
            <CheckCircle2 className="h-4 w-4 text-[#26734B]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#174D35]">
            {toPersianDigits(data.summary.verified_helps)}
          </div>
        </div>

        <div className="rounded-3xl border border-[#DCEBDD] bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#556455]">حلقه‌های پیوسته</span>
            <Sparkles className="h-4 w-4 text-[#E9B949]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#174D35]">
            {toPersianDigits(data.summary.connected_chains)}
          </div>
        </div>

        <div className="rounded-3xl border border-[#DCEBDD] bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#556455]">داوطلبان فعال</span>
            <Users className="h-4 w-4 text-[#26734B]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#174D35]">
            {toPersianDigits(data.summary.unique_helpers)}
          </div>
        </div>

        <div className="rounded-3xl border border-[#DCEBDD] bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#556455]">شهرهای مشارکت‌کننده</span>
            <MapPin className="h-4 w-4 text-[#26734B]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#174D35]">
            {toPersianDigits(data.summary.cities_count)}
          </div>
        </div>
      </section>

      {/* Chain Links Timeline */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-[#174D35] sm:text-lg">
              مسیر واقعی حلقه‌های ثبت‌شده
            </h2>
            <p className="text-xs font-normal text-[#556455]">
              آخرین همیاری‌های تأییدشده توسط دریافت‌کننده و داوطلب
            </p>
          </div>
          <span className="rounded-full bg-[#DCEBDD] px-3 py-1 text-xs font-semibold text-[#174D35]">
            {toPersianDigits(data.links.length)} حلقه نمایش‌داده‌شده
          </span>
        </div>

        {data.links.length === 0 ? (
          <EmptyState
            icon={Link2}
            title="هنوز همیاری تکمیل‌شده‌ای ثبت نشده است"
            description="اولین درخواست کمک تکمیل‌شده و تأییدشده، نخستین حلقه واقعی زنجیره مهربانی را اینجا روشن می‌کند."
            action={
              <Link
                to="/requests"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-[#174D35] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#26734B]"
              >
                مشاهده درخواست‌های باز
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3.5 sm:grid-cols-2">
            {data.links.map((link) => (
              <article
                key={link.response_id}
                className="flex flex-col justify-between gap-3.5 rounded-3xl border border-[#DCEBDD] bg-white p-4 shadow-[0_2px_10px_rgba(23,77,53,0.03)] transition hover:border-[#78B98A] sm:p-5"
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CategoryBadge category={link.category} />
                    {link.chain_continued && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#E9B949]/25 px-2.5 py-1 text-[11px] font-bold text-[#6F4E06]">
                        <Sparkles className="h-3 w-3 text-[#E9B949]" />
                        ادامه زنجیره مهربانی
                      </span>
                    )}
                  </div>

                  {/* Helper -> Recipient visual node */}
                  <div className="flex items-center justify-between gap-2 rounded-2xl bg-[#F6F7F2] p-3">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      {link.helper_avatar ? (
                        <ProtectedImage
                          src={link.helper_avatar}
                          alt={link.helper_name}
                          wrapperClassName="relative block h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-[#DCEBDD]"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#174D35] text-xs font-bold text-white">
                          {getInitials(link.helper_name)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold text-[#202820]">
                          {link.helper_name}
                        </div>
                        <div className="text-[10px] font-normal text-[#556455]">یاری‌رسان</div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1 text-[#26734B]">
                      <span className="h-px w-4 bg-[#78B98A]" />
                      <ArrowLeft className="h-4 w-4" />
                    </div>

                    <div className="flex min-w-0 flex-1 items-center justify-end gap-2 text-left">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold text-[#202820]">
                          {link.recipient_name}
                        </div>
                        <div className="text-[10px] font-normal text-[#556455]">هم‌شهری</div>
                      </div>
                      {link.recipient_avatar ? (
                        <ProtectedImage
                          src={link.recipient_avatar}
                          alt={link.recipient_name}
                          wrapperClassName="relative block h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-[#DCEBDD]"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#DCEBDD] text-xs font-bold text-[#174D35]">
                          {getInitials(link.recipient_name)}
                        </div>
                      )}
                    </div>
                  </div>

                  <Link
                    to={`/requests/${link.request_id}`}
                    className="block text-sm font-semibold leading-6 text-[#174D35] hover:text-[#26734B] hover:underline"
                  >
                    {link.request_title}
                  </Link>
                </div>

                <div className="flex items-center justify-between border-t border-[#F6F7F2] pt-2.5 text-[11px] font-light text-[#556455]">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-[#26734B]" />
                    {link.city}
                  </span>
                  <span>{formatDateFa(link.completed_at)}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
