import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidthClass?: string;
}

export function BottomSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidthClass = 'max-w-lg',
}: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#202820]/45 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className={`flex max-h-[88dvh] w-full ${maxWidthClass} flex-col overflow-hidden rounded-t-3xl border border-[#DCEBDD] bg-white shadow-xl animate-sheet-up sm:rounded-3xl sm:animate-pop-in`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-[#DCEBDD]/70 px-4 pb-3 pt-2.5 sm:px-6 sm:pt-4">
          <div className="mx-auto mb-2.5 h-1 w-10 rounded-full bg-[#DCEBDD] sm:hidden" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#174D35]">{title}</h2>
              {subtitle && (
                <p className="mt-0.5 text-xs font-normal text-[#556455]">{subtitle}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="بستن"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F6F7F2] text-[#465346] transition hover:bg-[#DCEBDD]/70 hover:text-[#174D35]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">{children}</div>

        {footer && (
          <div className="shrink-0 border-t border-[#DCEBDD]/70 bg-[#F6F7F2]/60 px-4 py-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
