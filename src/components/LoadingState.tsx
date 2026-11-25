import { Loader2 } from 'lucide-react';

export function LoadingState({ label = 'در حال بارگذاری...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-[#26734B]" />
      <p className="text-sm font-medium text-[#465346]">{label}</p>
    </div>
  );
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="animate-pulse rounded-3xl border border-[#DCEBDD] bg-white p-5"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="h-6 w-20 rounded-full bg-[#DCEBDD]/70" />
            <div className="h-6 w-24 rounded-full bg-[#F6F7F2]" />
          </div>
          <div className="mb-2 h-5 w-3/4 rounded-lg bg-stone-200" />
          <div className="mb-1.5 h-4 w-full rounded-lg bg-stone-100" />
          <div className="mb-4 h-4 w-2/3 rounded-lg bg-stone-100" />
          <div className="flex items-center justify-between border-t border-[#F6F7F2] pt-3">
            <div className="h-4 w-28 rounded bg-stone-100" />
            <div className="h-4 w-16 rounded bg-stone-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
