import { isValidElement, type ComponentType, type ReactNode } from 'react';
import { Inbox } from 'lucide-react';

type IconProp = ReactNode | ComponentType<{ className?: string }>;

function renderEmptyIcon(icon?: IconProp): ReactNode {
  if (!icon) {
    return <Inbox className="h-7 w-7" />;
  }
  if (isValidElement(icon)) {
    return icon;
  }
  if (typeof icon === 'function' || (typeof icon === 'object' && 'render' in icon)) {
    const IconComp = icon as ComponentType<{ className?: string }>;
    return <IconComp className="h-7 w-7" />;
  }
  return icon as ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: IconProp;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[#78B98A]/65 bg-white/90 px-5 py-10 text-center sm:px-8 sm:py-12">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#DCEBDD]/80 text-[#174D35]">
        {renderEmptyIcon(icon)}
      </div>
      <h3 className="mb-2 text-base font-semibold text-[#202820]">{title}</h3>
      <p className="mb-5 max-w-md text-sm font-normal leading-7 text-[#505E50]">{description}</p>
      {action}
    </div>
  );
}
