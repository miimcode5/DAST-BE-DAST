import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[#78B98A]/60 bg-white/80 px-6 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#DCEBDD] text-[#174D35]">
        {icon ?? <Inbox className="h-7 w-7" />}
      </div>
      <h3 className="mb-2 text-base font-bold text-[#202820]">{title}</h3>
      <p className="mb-5 max-w-md text-sm leading-7 text-[#505E50]">{description}</p>
      {action}
    </div>
  );
}
