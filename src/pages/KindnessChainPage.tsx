import { useCallback, useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  CheckCircle2,
  HeartHandshake,
  Link2,
  MapPin,
  Plus,
  RefreshCw,
  Sparkles,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { ProtectedImage } from '../components/ProtectedImage';
import { CategoryBadge } from '../components/StatusBadge';
import { formatDateFa, getInitials, toPersianDigits } from '../lib/formatters';
import { getKindnessChain } from '../services/statsService';
import type { KindnessChainData } from '../types/database';

export function KindnessChainPage() {
  const [data, setData] = useState<KindnessChainData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadChain = useCallback(() => {
    setLoading(true);
    setErrorMsg(null);
    getKindnessChain()
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        setErrorMsg(err instanceof Error ? err.message : 'خطا در بارگذاری زنجیره مهربانی');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadChain();
  }, [loadChain]);

  if (loading) {
    return <LoadingState label="در حال دریافت حلقه‌های واقعی زنجیره مهربانی..." />;
  }

  return (
    <div className="space-y-7 animate-fade-up">
      {/* Header Banner — Clean white card with official brand greens */}
      <section className="rounded-2xl border border-brand-surface bg-white p-6 sm:p-9">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-surface px-3.5 py-1 text-xs font-bold text-brand-primary">
            <Sparkles className="h-4 w-4 text-brand-gold" />
            اثر گسترش کمک‌های مردمی
          </div>
          <h1 className="text-2xl font-extrabold text-brand-primary sm:text-3xl">زنجیره مهربانی دست‌به‌دست</h1>
          <p className="text-sm leading-7 text-brand-text/80">
            این بخش فقط کمک‌های واقعی و تأییدشده توسط دریافت‌کنندگان را نمایش می‌دهد؛ وقتی فردی کمکی دریافت می‌کند و سپس خود به دیگری یاری می‌رساند، حلقه‌های زنجیره به هم متصل می‌شوند.
          </p>
        </div>
      </section>

      {errorMsg && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-text/25 bg-white px-4 py-3 text-sm text-brand-text">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={loadChain}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-white hover:bg-brand-green"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            تلاش مجدد
          </button>
        </div>
      )}

      {/* Real Verified Metrics */}
      {data && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-brand-surface bg-white p-4 text-center">
            <CheckCircle2 className="mx-auto mb-1.5 h-6 w-6 text-brand-green" />
            <div className="text-2xl font-extrabold text-brand-primary">
              {toPersianDigits(data.summary.verified_helps)}
            </div>
            <div className="mt-0.5 text-xs font-medium text-brand-text/70">کمک معتبر تأییدشده</div>
          </div>

          <div className="rounded-2xl border border-brand-surface bg-white p-4 text-center">
            <Users className="mx-auto mb-1.5 h-6 w-6 text-brand-green" />
            <div className="text-2xl font-extrabold text-brand-primary">
              {toPersianDigits(data.summary.unique_helpers)}
            </div>
            <div className="mt-0.5 text-xs font-medium text-brand-text/70">داوطلب یاری‌گر</div>
          </div>

          <div className="rounded-2xl border border-brand-surface bg-white p-4 text-center">
            <Link2 className="mx-auto mb-1.5 h-6 w-6 text-brand-gold" />
            <div className="text-2xl font-extrabold text-brand-primary">
              {toPersianDigits(data.summary.connected_chains)}
            </div>
            <div className="mt-0.5 text-xs font-medium text-brand-text/70">پیوندهای زنجیره‌ساز</div>
          </div>

          <div className="rounded-2xl border border-brand-surface bg-white p-4 text-center">
            <MapPin className="mx-auto mb-1.5 h-6 w-6 text-brand-green" />
            <div className="text-2xl font-extrabold text-brand-primary">
              {toPersianDigits(data.summary.cities_count)}
            </div>
            <div className="mt-0.5 text-xs font-medium text-brand-text/70">شهر فعال در زنجیره</div>
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
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-primary px-5 py-3 text-sm font-bold text-white hover:bg-brand-green"
              >
                کمک به دیگران
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <Link
                to="/requests/new"
                className="inline-flex items-center gap-1.5 rounded-xl border border-brand-primary bg-white px-5 py-3 text-sm font-bold text-brand-primary hover:bg-brand-surface/40"
              >
                <Plus className="h-4 w-4" />
                ثبت درخواست کمک
              </Link>
            </div>
          }
        />
      ) : (
        <section className="space-y-4">
          <h2 className="text-base font-extrabold text-brand-primary">
            حلقه‌های واقعی و تأییدشده مهربانی
          </h2>
          <div className="space-y-3.5">
            {data.links.map((link) => (
              <div
                key={link.response_id}
                className="relative overflow-hidden rounded-2xl border border-brand-surface bg-white p-5 transition hover:border-brand-soft"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  {/* Helper -> Recipient visual link */}
                  <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                    <div className="flex items-center gap-2 rounded-xl bg-brand-surface/70 px-3 py-2">
                      {link.helper_avatar ? (
                        <ProtectedImage
                          src={link.helper_avatar}
                          alt={link.helper_name}
                          wrapperClassName="relative block h-8 w-8 shrink-0 overflow-hidden rounded-full"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary text-xs font-bold text-white">
                          {getInitials(link.helper_name)}
                        </div>
                      )}
                      <div>
                        <div className="text-[10px] font-semibold text-brand-green">داوطلب یاری‌گر</div>
                        <div className="text-xs font-bold text-brand-primary">{link.helper_name}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-1.5 py-0.5 text-brand-green sm:py-0">
                      <ArrowDown className="h-4 w-4 text-brand-primary sm:hidden" />
                      <span className="hidden h-2 w-2 rounded-full bg-brand-soft animate-pulse-ring sm:block" />
                      <span className="hidden h-0.5 w-8 bg-brand-soft sm:block" />
                      <ArrowLeft className="hidden h-4 w-4 text-brand-primary sm:block" />
                    </div>

                    <div className="flex items-center gap-2 rounded-xl border border-brand-surface bg-brand-bg px-3 py-2">
                      {link.recipient_avatar ? (
                        <ProtectedImage
                          src={link.recipient_avatar}
                          alt={link.recipient_name}
                          wrapperClassName="relative block h-8 w-8 shrink-0 overflow-hidden rounded-full"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-surface text-xs font-bold text-brand-primary">
                          {getInitials(link.recipient_name)}
                        </div>
                      )}
                      <div>
                        <div className="text-[10px] font-semibold text-brand-text/70">دریافت‌کننده کمک</div>
                        <div className="text-xs font-bold text-brand-text">{link.recipient_name}</div>
                      </div>
                    </div>

                    {link.chain_continued && (
                      <span className="inline-flex items-center justify-center gap-1 rounded-full border border-brand-gold/60 bg-brand-gold/15 px-2.5 py-1 text-[11px] font-bold text-brand-text">
                        <Sparkles className="h-3.5 w-3.5 text-brand-gold" />
                        ادامه‌دهنده زنجیره
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <CategoryBadge category={link.category} />
                    <span className="rounded-full bg-brand-bg px-2.5 py-1 text-[11px] font-medium text-brand-text/80">
                      {link.city} · {formatDateFa(link.completed_at)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 border-t border-brand-surface/50 pt-2.5 text-xs text-brand-text/80">
                  موضوع همیاری:{' '}
                  <Link
                    to={`/requests/${link.request_id}`}
                    className="font-bold text-brand-primary hover:underline"
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
