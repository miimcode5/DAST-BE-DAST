import { ArrowLeft, Bookmark, Clock, MapPin, Sparkles, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { HELP_TYPE_MAP } from '../constants/categories';
import { formatRelativeTimeFa, getInitials, toPersianDigits } from '../lib/formatters';
import type { HelpRequestFeedItem } from '../types/database';
import { ProtectedImage } from './ProtectedImage';
import { CategoryBadge, RequestStatusBadge } from './StatusBadge';

interface RequestCardProps {
  request: HelpRequestFeedItem;
  isSaved?: boolean;
  onToggleSave?: (requestId: string) => void;
  matchReasons?: string[];
  isOwn?: boolean;
}

export function RequestCard({
  request,
  isSaved = false,
  onToggleSave,
  matchReasons = [],
  isOwn = false,
}: RequestCardProps) {
  const helpTypeLabel = HELP_TYPE_MAP[request.help_type]?.label ?? request.help_type;

  return (
    <article className="group relative flex flex-col justify-between rounded-2xl border border-brand-surface bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-soft hover:shadow-xs focus-within:ring-2 focus-within:ring-brand-soft/60 sm:p-5">
      <div>
        <div className="mb-2.5 flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <CategoryBadge category={request.category} />
            <RequestStatusBadge status={request.status} />
          </div>

          {onToggleSave && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleSave(request.id);
              }}
              className={`relative z-10 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                isSaved
                  ? 'bg-brand-surface text-brand-primary'
                  : 'text-brand-text/45 hover:bg-brand-bg hover:text-brand-primary'
              }`}
              aria-label={isSaved ? 'حذف از ذخیره‌شده‌ها' : 'ذخیره درخواست'}
              title={isSaved ? 'حذف از ذخیره‌شده‌ها' : 'ذخیره درخواست'}
            >
              <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
            </button>
          )}
        </div>

        {matchReasons.length > 0 && (
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-xl border border-brand-surface bg-brand-bg px-2.5 py-1 text-[11px] font-semibold text-brand-primary">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-brand-gold" />
            <span>{matchReasons[0]}</span>
          </div>
        )}

        <Link
          to={`/requests/${request.id}`}
          className="block rounded-lg outline-none after:absolute after:inset-0"
        >
          <h3 className="mb-1.5 line-clamp-2 text-[15px] font-bold leading-7 text-brand-text transition-colors group-hover:text-brand-primary sm:text-base">
            {request.title}
          </h3>
        </Link>

        <p className="mb-3.5 line-clamp-2 text-xs leading-6 text-brand-text/75 sm:line-clamp-3 sm:text-sm">
          {request.description}
        </p>

        {request.image_url && (
          <div className="mb-3.5 overflow-hidden rounded-xl border border-brand-surface">
            <ProtectedImage
              src={request.image_url}
              alt={request.title}
              loading="lazy"
              wrapperClassName="relative block h-36 w-full overflow-hidden"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          </div>
        )}
      </div>

      <div className="space-y-2.5 border-t border-brand-bg pt-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-brand-text/75">
          <span className="inline-flex items-center gap-1 font-medium text-brand-primary">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-soft" />
            <span className="max-w-[180px] truncate sm:max-w-none">
              {request.city}، {request.area}
            </span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 shrink-0 text-brand-soft" />
            {request.needed_at}
          </span>
          <span className="rounded-lg bg-brand-bg px-2 py-0.5 text-[11px] font-medium text-brand-text">
            {helpTypeLabel}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex min-w-0 items-center gap-2">
            {request.requester_avatar ? (
              <ProtectedImage
                src={request.requester_avatar}
                alt={request.requester_name}
                wrapperClassName="relative block h-7 w-7 shrink-0 overflow-hidden rounded-full border border-brand-surface"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-surface text-[11px] font-bold text-brand-primary">
                {getInitials(request.requester_name)}
              </div>
            )}
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-xs font-semibold text-brand-text">
                {isOwn ? 'شما' : request.requester_name}
              </span>
              <span className="truncate text-[11px] text-brand-text/60">
                {formatRelativeTimeFa(request.created_at)}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <span
              className="inline-flex items-center gap-1 rounded-full bg-brand-bg px-2.5 py-1 text-[11px] font-semibold text-brand-green"
              title="تعداد داوطلبان اعلام آمادگی‌کرده"
            >
              <Users className="h-3.5 w-3.5 text-brand-soft" />
              {toPersianDigits(request.responses_count)} داوطلب
            </span>
            <span className="inline-flex min-h-[34px] items-center gap-1 rounded-xl bg-brand-surface/80 px-3 py-1.5 text-xs font-bold text-brand-primary transition-colors group-hover:bg-brand-primary group-hover:text-white">
              <span>جزئیات</span>
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
