import { Loader2 } from 'lucide-react';

export function LoadingState({ label = 'در حال بارگذاری...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-brand-green" />
      <p className="text-sm font-medium text-brand-text/80">{label}</p>
    </div>
  );
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="animate-pulse rounded-2xl border border-brand-surface bg-white p-5"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="h-6 w-20 rounded-full bg-brand-surface/70" />
            <div className="h-6 w-24 rounded-full bg-brand-bg" />
          </div>
          <div className="mb-2 h-5 w-3/4 rounded-lg bg-brand-surface/50" />
          <div className="mb-1.5 h-4 w-full rounded-lg bg-brand-bg" />
          <div className="mb-4 h-4 w-2/3 rounded-lg bg-brand-bg" />
          <div className="flex items-center justify-between border-t border-brand-bg pt-3">
            <div className="h-4 w-28 rounded bg-brand-bg" />
            <div className="h-4 w-16 rounded bg-brand-bg" />
          </div>
        </div>
      ))}
    </div>
  );
}
