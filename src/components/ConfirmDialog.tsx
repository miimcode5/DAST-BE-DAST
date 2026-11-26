import { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'تأیید',
  cancelLabel = 'انصراف',
  tone = 'primary',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const handleNativeBack = () => {
      if (!busy) onCancel();
    };
    window.addEventListener('dast:native-back', handleNativeBack);
    return () => window.removeEventListener('dast:native-back', handleNativeBack);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="w-full max-w-md rounded-t-2xl border border-brand-surface bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-sm animate-fade-up sm:rounded-2xl sm:p-6">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-brand-surface sm:hidden" />

        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                tone === 'danger'
                  ? 'bg-brand-bg text-brand-text border border-brand-surface'
                  : 'bg-brand-surface text-brand-primary'
              }`}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h3 id="confirm-dialog-title" className="text-base font-bold text-brand-text">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-xl p-1.5 text-brand-text/60 hover:bg-brand-bg hover:text-brand-text"
            aria-label="بستن"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-6 text-sm leading-7 text-brand-text/80">{description}</p>

        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="min-h-[44px] rounded-xl border border-brand-surface bg-white px-4 py-2.5 text-sm font-semibold text-brand-text hover:bg-brand-bg disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`min-h-[44px] rounded-xl px-5 py-2.5 text-sm font-bold text-white transition disabled:opacity-60 ${
              tone === 'danger'
                ? 'bg-brand-text hover:bg-brand-text/90'
                : 'bg-brand-primary hover:bg-brand-green'
            }`}
          >
            {busy ? 'در حال انجام...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
