import {
  AlertTriangle,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Clock,
  Gift,
  HeartHandshake,
  ShoppingBag,
  Sparkles,
  Users,
  Wrench,
  XCircle,
} from 'lucide-react';
import {
  CATEGORY_MAP,
  CONVERSATION_STATUS_META,
  REQUEST_STATUS_META,
  RESPONSE_STATUS_META,
} from '../constants/categories';
import type {
  ConversationStatus,
  HelpCategory,
  RequestStatus,
  ResponseStatus,
} from '../types/database';

export function CategoryIcon({
  category,
  className = 'h-4 w-4',
}: {
  category: HelpCategory;
  className?: string;
}) {
  switch (category) {
    case 'daily':
      return <ShoppingBag className={className} />;
    case 'education':
      return <BookOpen className={className} />;
    case 'repair':
      return <Wrench className={className} />;
    case 'donation':
      return <Gift className={className} />;
    case 'elderly':
      return <HeartHandshake className={className} />;
    case 'voluntary':
      return <Users className={className} />;
    case 'urgent':
      return <AlertTriangle className={className} />;
    case 'specialized':
      return <Briefcase className={className} />;
  }
}

export function CategoryBadge({ category }: { category: HelpCategory }) {
  const meta = CATEGORY_MAP[category] ?? CATEGORY_MAP.daily;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${meta.accentBg} ${meta.accentText} ${meta.accentBorder}`}
    >
      <CategoryIcon category={category} className="h-3.5 w-3.5 shrink-0" />
      <span>{meta.shortLabel}</span>
    </span>
  );
}

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  const meta = REQUEST_STATUS_META[status];
  const Icon =
    status === 'open'
      ? Sparkles
      : status === 'in_progress'
        ? Clock
        : status === 'completed'
          ? CheckCircle2
          : XCircle;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${meta.badgeClass}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{meta.label}</span>
    </span>
  );
}

export function ResponseStatusBadge({ status }: { status: ResponseStatus }) {
  const meta = RESPONSE_STATUS_META[status];
  const Icon =
    status === 'completed' || status === 'accepted'
      ? CheckCircle2
      : status === 'pending' || status === 'in_progress'
        ? Clock
        : XCircle;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${meta.badgeClass}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{meta.label}</span>
    </span>
  );
}

export function ConversationStatusBadge({ status }: { status: ConversationStatus }) {
  const meta = CONVERSATION_STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${meta.badgeClass}`}
    >
      {meta.label}
    </span>
  );
}
