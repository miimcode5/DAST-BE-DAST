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
    <article className="group relative flex flex-col justify-between rounded-3xl border border-[#DCEBDD] bg-white p-4 shadow-[0_1px_4px_rgba(23,77,53,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#78B98A] hover:shadow-[0_8px_24px_rgba(23,77,53,0.08)] sm:p-5">
      <div>
        {/* Top Meta Badges & Bookmark */}
        <div className="mb-3 flex items-start justify-between gap-2">
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
              className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                isSaved
                  ? 'bg-[#DCEBDD] text-[#174D35]'
                  : 'text-[#667466] hover:bg-[#F6F7F2] hover:text-[#174D35]'
              }`}
              aria-label={isSaved ? 'حذف از ذخیره‌شده‌ها' : 'ذخیره درخواست'}
              title={isSaved ? 'حذف از ذخیره‌شده‌ها' : 'ذخیره درخواست'}
            >
              <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
            </button>
          )}
        </div>

        {/* Personalized volunteer match highlight */}
        {matchReasons.length > 0 && (
          <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-xl border border-[#E9B949]/40 bg-[#E9B949]/15 px-2.5 py-1 text-[11px] font-medium text-[#6F4E06]">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#E9B949]" />
            <span>{matchReasons[0]}</span>
          </div>
        )}

        {/* Title & Short Description */}
        <Link to={`/requests/${request.id}`} className="block">
          <h3 className="mb-1.5 line-clamp-2 text-[15px] font-semibold leading-7 text-[#202820] transition-colors group-hover:text-[#174D35] sm:text-base">
            {request.title}
          </h3>
          <p className="mb-3 line-clamp-2 text-xs font-normal leading-6 text-[#4D5B4D] sm:text-[13px]">
            {request.description}
          </p>
        </Link>

        {request.image_url && (
          <Link
            to={`/requests/${request.id}`}
            className="mb-3.5 block overflow-hidden rounded-2xl border border-[#DCEBDD]/80 bg-[#F6F7F2]"
          >
            <ProtectedImage
              src={request.image_url}
              alt={request.title}
              loading="lazy"
              wrapperClassName="relative block h-32 w-full overflow-hidden sm:h-36"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          </Link>
        )}
      </div>

      {/* Location, Timing, Requester & Action */}
      <div className="space-y-3 border-t border-[#F6F7F2] pt-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-[#4D5B4D]">
          <span className="inline-flex items-center gap-1 font-medium text-[#174D35]">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-[#26734B]" />
            <span className="max-w-[190px] truncate sm:max-w-none">
              {request.city}، {request.area}
            </span>
          </span>
          <span className="inline-flex items-center gap-1 font-medium">
            <Clock className="h-3.5 w-3.5 shrink-0 text-[#26734B]" />
            <span>{request.needed_at}</span>
          </span>
          <span className="rounded-lg bg-[#F6F7F2] px-2 py-0.5 text-[11px] font-medium text-[#3A473A]">
            {helpTypeLabel}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex min-w-0 items-center gap-2">
            {request.requester_avatar ? (
              <ProtectedImage
                src={request.requester_avatar}
                alt={request.requester_name}
                wrapperClassName="relative block h-7 w-7 shrink-0 overflow-hidden rounded-full border border-[#DCEBDD]"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#DCEBDD] text-[11px] font-semibold text-[#174D35]">
                {getInitials(request.requester_name)}
              </div>
            )}
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-xs font-medium text-[#202820]">
                {isOwn ? 'ثبت‌شده توسط شما' : request.requester_name}
              </span>
              <span className="truncate text-[11px] font-light text-[#5E6C5E]">
                {formatRelativeTimeFa(request.created_at)}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {request.responses_count > 0 && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-[#F6F7F2] px-2.5 py-1 text-[11px] font-medium text-[#26734B]"
                title="تعداد داوطلبان اعلام آمادگی‌کرده"
              >
                <Users className="h-3.5 w-3.5" />
                {toPersianDigits(request.responses_count)}
              </span>
            )}
            <Link
              to={`/requests/${request.id}`}
              className="inline-flex min-h-[36px] items-center gap-1 rounded-xl bg-[#DCEBDD]/80 px-3 py-1.5 text-xs font-bold text-[#174D35] transition-colors hover:bg-[#174D35] hover:text-white"
            >
              <span>مشاهده جزئیات</span>
              <ArrowLeft className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
