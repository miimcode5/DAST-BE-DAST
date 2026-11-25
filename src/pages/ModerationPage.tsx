import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { formatDateFa, toPersianDigits } from '../lib/formatters';
import { getModerationReports, updateModerationReportStatus } from '../services/safetyService';
import type { ModerationReportItem } from '../types/database';

const STATUS_LABELS: Record<ModerationReportItem['status'], string> = {
  open: 'باز (نیازمند بررسی)',
  reviewed: 'در حال بررسی',
  resolved: 'رسیدگی‌شده',
  dismissed: 'رد شده / بدون تخلف',
};

export function ModerationPage() {
  const { profile } = useAuth();
  const { showToast } = useToast();

  const [reports, setReports] = useState<ModerationReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    setAccessDenied(false);
    try {
      const data = await getModerationReports();
      setReports(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در دریافت گزارش‌ها';
      if (msg.includes('مجوز')) {
        setAccessDenied(true);
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const handleStatusChange = async (
    item: ModerationReportItem,
    nextStatus: ModerationReportItem['status']
  ) => {
    setBusyId(item.report_id);
    try {
      await updateModerationReportStatus(item.report_kind, item.report_id, nextStatus);
      setReports((prev) =>
        prev.map((r) => (r.report_id === item.report_id ? { ...r, status: nextStatus } : r))
      );
      showToast('وضعیت گزارش به‌روزرسانی شد.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'تغییر وضعیت ناموفق بود.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <LoadingState label="در حال بررسی سطح دسترسی سمت سرور..." />;
  }

  if (accessDenied || (profile && profile.role === 'member')) {
    return (
      <div className="mx-auto max-w-lg py-8 animate-fade-up">
        <div className="rounded-2xl border border-brand-surface bg-white p-7 text-center">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-brand-gold" />
          <h1 className="mb-2 text-lg font-extrabold text-brand-primary">
            دسترسی غیرمجاز به بخش نظارت
          </h1>
          <p className="mb-5 text-sm leading-7 text-brand-text/75">
            این بخش با سیاست‌های امنیتی و نقش‌های پایگاه‌داده محافظت می‌شود و فقط برای مدیران و ناظران تأییدشده در سرور قابل دسترس است.
          </p>
          <Link
            to="/"
            className="inline-flex rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-green"
          >
            بازگشت به خانه
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-surface text-brand-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-brand-primary">پنل نظارت و رسیدگی به گزارش‌ها</h1>
            <p className="text-xs text-brand-text/70">
              محافظت‌شده با احراز هویت نقش ناظر/مدیر سمت سرور ({toPersianDigits(reports.length)} گزارش)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadReports()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-brand-surface bg-white px-4 py-2 text-xs font-bold text-brand-primary hover:border-brand-soft"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          به‌روزرسانی
        </button>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-brand-text/30 bg-white p-4 text-sm text-brand-text">
          {errorMsg}
        </div>
      )}

      {reports.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="h-8 w-8" />}
          title="گزارش تخلفی ثبت نشده است"
          description="در حال حاضر هیچ گزارش باز یا بررسی‌شده‌ای برای نمایش وجود ندارد."
        />
      ) : (
        <div className="space-y-3">
          {reports.map((rep) => (
            <article
              key={`${rep.report_kind}-${rep.report_id}`}
              className="space-y-3 rounded-2xl border border-brand-surface bg-white p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-brand-surface px-3 py-1 text-[11px] font-bold text-brand-primary">
                    {rep.report_kind === 'conversation' ? 'گزارش گفت‌وگو' : `گزارش ${rep.target_type}`}
                  </span>
                  <span className="rounded-full border border-brand-gold/60 bg-brand-gold/15 px-3 py-1 text-[11px] font-bold text-brand-text">
                    {STATUS_LABELS[rep.status] ?? rep.status}
                  </span>
                </div>
                <span className="text-[11px] text-brand-text/65">
                  {formatDateFa(rep.created_at)}
                </span>
              </div>

              <div className="grid gap-2 text-xs text-brand-text/85 sm:grid-cols-2">
                <div>
                  <strong className="text-brand-primary">گزارش‌دهنده:</strong> {rep.reporter_name}
                </div>
                <div>
                  <strong className="text-brand-primary">کاربر گزارش‌شده:</strong>{' '}
                  {rep.reported_user_name}
                </div>
                <div className="sm:col-span-2">
                  <strong className="text-brand-primary">علت:</strong> {rep.reason}
                </div>
                {rep.details && (
                  <div className="rounded-xl bg-brand-bg p-3 sm:col-span-2">{rep.details}</div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 border-t border-brand-surface/50 pt-3">
                {(['open', 'reviewed', 'resolved'] as const).map((statusOption) => (
                  <button
                    key={statusOption}
                    type="button"
                    disabled={busyId === rep.report_id || rep.status === statusOption}
                    onClick={() => void handleStatusChange(rep, statusOption)}
                    className={`rounded-xl px-3 py-1.5 text-[11px] font-bold transition ${
                      rep.status === statusOption
                        ? 'bg-brand-primary text-white'
                        : 'border border-brand-surface bg-brand-bg text-brand-text hover:border-brand-soft'
                    }`}
                  >
                    {STATUS_LABELS[statusOption]}
                  </button>
                ))}
                {rep.report_kind === 'content' && (
                  <button
                    type="button"
                    disabled={busyId === rep.report_id || rep.status === 'dismissed'}
                    onClick={() => void handleStatusChange(rep, 'dismissed')}
                    className={`rounded-xl px-3 py-1.5 text-[11px] font-bold transition ${
                      rep.status === 'dismissed'
                        ? 'bg-brand-primary text-white'
                        : 'border border-brand-surface bg-brand-bg text-brand-text hover:border-brand-soft'
                    }`}
                  >
                    {STATUS_LABELS.dismissed}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
