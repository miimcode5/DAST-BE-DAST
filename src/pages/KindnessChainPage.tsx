import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, HeartHandshake, Link2, MapPin, Plus, Sparkles, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { CategoryBadge } from '../components/StatusBadge';
import { formatDateFa, getInitials, toPersianDigits } from '../lib/formatters';
import { getKindnessChain } from '../services/statsService';
import type { KindnessChainData } from '../types/database';

export function KindnessChainPage() {
  const [data, setData] = useState<KindnessChainData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getKindnessChain()
      .then((res) => {
        if (active) setData(res);
      })
      .catch((err) => {
        if (active) setErrorMsg(err instanceof Error ? err.message : 'خطا در بارگذاری زنجیره مهربانی');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <LoadingState label="در حال دریافت حلقه‌های واقعی زنجیره مهربانی..." />;
  }

  return (
    <div className="space-y-7 animate-fade-up">
      {/* Header Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-bl from-[#174D35] via-[#206244] to-[#26734B] p-6 text-white shadow-lg sm:p-9">
        <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#78B98A]/20 blur-2xl" />
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1 text-xs font-bold text-[#DCEBDD]">
            <Sparkles className="h-4 w-4 text-[#E9B949]" />
            اثر گسترش کمک‌های مردمی
          </div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">زنجیره مهربانی دست‌به‌دست</h1>
          <p className="text-sm leading-7 text-[#DCEBDD]">
            این بخش فقط کمک‌های واقعی و تأییدشده توسط دریافت‌کنندگان را نمایش می‌دهد؛ وقتی فردی کمکی دریافت می‌کند و سپس خود به دیگری یاری می‌رساند، حلقه‌های زنجیره به هم متصل می‌شوند.
          </p>
        </div>
      </section>

      {errorMsg && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {errorMsg}
        </div>
      )}

      {/* Real Verified Metrics */}
      {data && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-3xl border border-[#DCEBDD] bg-white p-4 text-center">
            <CheckCircle2 className="mx-auto mb-1.5 h-6 w-6 text-[#26734B]" />
            <div className="text-2xl font-extrabold text-[#174D35]">
              {toPersianDigits(data.summary.verified_helps)}
            </div>
            <div className="mt-0.5 text-xs font-medium text-[#556455]">کمک معتبر تأییدشده</div>
          </div>

          <div className="rounded-3xl border border-[#DCEBDD] bg-white p-4 text-center">
            <Users className="mx-auto mb-1.5 h-6 w-6 text-[#26734B]" />
            <div className="text-2xl font-extrabold text-[#174D35]">
              {toPersianDigits(data.summary.unique_helpers)}
            </div>
            <div className="mt-0.5 text-xs font-medium text-[#556455]">داوطلب یاری‌گر</div>
          </div>

          <div className="rounded-3xl border border-[#DCEBDD] bg-white p-4 text-center">
            <Link2 className="mx-auto mb-1.5 h-6 w-6 text-[#E9B949]" />
            <div className="text-2xl font-extrabold text-[#174D35]">
              {toPersianDigits(data.summary.connected_chains)}
            </div>
            <div className="mt-0.5 text-xs font-medium text-[#556455]">پیوندهای زنجیره‌ساز</div>
          </div>

          <div className="rounded-3xl border border-[#DCEBDD] bg-white p-4 text-center">
            <MapPin className="mx-auto mb-1.5 h-6 w-6 text-[#26734B]" />
            <div className="text-2xl font-extrabold text-[#174D35]">
              {toPersianDigits(data.summary.cities_count)}
            </div>
            <div className="mt-0.5 text-xs font-medium text-[#556455]">شهر فعال در زنجیره</div>
          </div>
        </section>
      )}

      {/* Real Kindness Links Visualization OR Empty State */}
      {!data || data.links.length === 0 ? (
        <EmptyState
          icon={<HeartHandshake className="h-8 w-8 animate-soft-float" />}
          title="زنجیره مهربانی منتظر اولین حلقه واقعی شماست"
          description="هنوز هیچ همیاری تکمیل‌شده و تأییدشده‌ای ثبت نشده است. هیچ داده ساختگی اینجا نمایش داده نمی‌شود؛ با مشارکت در یک درخواست و تأیید تکمیل آن، اولین حلقه زنجیره را بسازید."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                to="/requests"
                className="inline-flex items-center gap-1.5 rounded-2xl bg-[#174D35] px-5 py-3 text-sm font-bold text-white hover:bg-[#26734B]"
              >
                کمک به دیگران
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <Link
                to="/requests/new"
                className="inline-flex items-center gap-1.5 rounded-2xl border border-[#174D35] bg-white px-5 py-3 text-sm font-bold text-[#174D35] hover:bg-[#DCEBDD]/40"
              >
                <Plus className="h-4 w-4" />
                ثبت درخواست کمک
              </Link>
            </div>
          }
        />
      ) : (
        <section className="space-y-4">
          <h2 className="text-base font-extrabold text-[#174D35]">
            حلقه‌های واقعی و تأییدشده مهربانی
          </h2>
          <div className="space-y-3.5">
            {data.links.map((link) => (
              <div
                key={link.response_id}
                className="relative overflow-hidden rounded-3xl border border-[#DCEBDD] bg-gradient-to-l from-white via-white to-[#DCEBDD]/35 p-5 shadow-xs transition hover:border-[#78B98A]"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  {/* Helper -> Recipient visual link */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 rounded-2xl bg-[#DCEBDD]/70 px-3 py-2">
                      {link.helper_avatar ? (
                        <img
                          src={link.helper_avatar}
                          alt={link.helper_name}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#174D35] text-xs font-bold text-white">
                          {getInitials(link.helper_name)}
                        </div>
                      )}
                      <div>
                        <div className="text-[10px] font-semibold text-[#26734B]">داوطلب یاری‌گر</div>
                        <div className="text-xs font-bold text-[#174D35]">{link.helper_name}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-[#26734B]">
                      <span className="h-2 w-2 rounded-full bg-[#78B98A] animate-pulse-ring" />
                      <span className="h-0.5 w-8 bg-gradient-to-l from-[#174D35] to-[#78B98A]" />
                      <ArrowLeft className="h-4 w-4 text-[#174D35]" />
                    </div>

                    <div className="flex items-center gap-2 rounded-2xl border border-[#DCEBDD] bg-white px-3 py-2">
                      {link.recipient_avatar ? (
                        <img
                          src={link.recipient_avatar}
                          alt={link.recipient_name}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#DCEBDD] text-xs font-bold text-[#174D35]">
                          {getInitials(link.recipient_name)}
                        </div>
                      )}
                      <div>
                        <div className="text-[10px] font-semibold text-[#556455]">دریافت‌کننده کمک</div>
                        <div className="text-xs font-bold text-[#202820]">{link.recipient_name}</div>
                      </div>
                    </div>

                    {link.chain_continued && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#E9B949]/25 px-2.5 py-1 text-[11px] font-extrabold text-[#7A5807]">
                        <Sparkles className="h-3.5 w-3.5 text-[#E9B949]" />
                        ادامه‌دهنده زنجیره
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <CategoryBadge category={link.category} />
                    <span className="rounded-full bg-[#F6F7F2] px-2.5 py-1 text-[11px] font-medium text-[#465346]">
                      {link.city} · {formatDateFa(link.completed_at)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 border-t border-[#DCEBDD]/50 pt-2.5 text-xs text-[#465346]">
                  موضوع همیاری:{' '}
                  <Link
                    to={`/requests/${link.request_id}`}
                    className="font-bold text-[#174D35] hover:underline"
                  >
                    {link.request_title}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
