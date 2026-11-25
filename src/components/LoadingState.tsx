import { Loader2 } from 'lucide-react';

export function LoadingState({ label = 'در حال بارگذاری...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#DCEBDD]/70 text-[#174D35]">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
      <p className="text-sm font-medium text-[#465346]">{label}</p>
    </div>
  );
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-3.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="animate-pulse rounded-3xl border border-[#DCEBDD] bg-white p-4 sm:p-5"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="h-6 w-20 rounded-full bg-[#DCEBDD]/70" />
            <div className="h-6 w-24 rounded-full bg-[#F6F7F2]" />
          </div>
          <div className="mb-2 h-5 w-4/5 rounded-lg bg-[#E9ECE6]" />
          <div className="mb-1.5 h-3.5 w-full rounded-lg bg-[#F1F3EE]" />
          <div className="mb-4 h-3.5 w-2/3 rounded-lg bg-[#F1F3EE]" />
          <div className="flex items-center justify-between border-t border-[#F6F7F2] pt-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-[#DCEBDD]/60" />
              <div className="h-3.5 w-20 rounded bg-[#F1F3EE]" />
            </div>
            <div className="h-7 w-16 rounded-xl bg-[#DCEBDD]/50" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ListRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="flex animate-pulse items-start gap-3.5 rounded-3xl border border-[#DCEBDD] bg-white p-4"
        >
          <div className="h-12 w-12 shrink-0 rounded-2xl bg-[#DCEBDD]/70" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="h-4 w-32 rounded bg-[#E9ECE6]" />
              <div className="h-3 w-16 rounded bg-[#F1F3EE]" />
            </div>
            <div className="h-3.5 w-2/3 rounded bg-[#F1F3EE]" />
            <div className="h-3 w-4/5 rounded bg-[#F6F7F2]" />
          </div>
        </div>
      ))}
    </div>
  );
}
