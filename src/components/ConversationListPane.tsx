import { MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ListRowSkeleton } from './LoadingState';
import { ProtectedImage } from './ProtectedImage';
import { CategoryBadge, ResponseStatusBadge } from './StatusBadge';
import { formatRelativeTimeFa, getInitials, toPersianDigits } from '../lib/formatters';
import type { ConversationItem } from '../types/database';

interface ConversationListPaneProps {
  items: ConversationItem[];
  loading: boolean;
  currentUserId?: string;
  activeId?: string;
  compact?: boolean;
}

export function ConversationListPane({
  items,
  loading,
  currentUserId,
  activeId,
  compact = false,
}: ConversationListPaneProps) {
  if (loading) {
    return (
      <div className="space-y-2.5">
        {Array.from({ length: compact ? 4 : 5 }).map((_, idx) => (
          <ListRowSkeleton key={idx} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#DCEBDD] bg-[#F6F7F2]/60 p-6 text-center text-xs leading-6 text-[#556455]">
        <MessageCircle className="mx-auto mb-2 h-7 w-7 text-[#78B98A]" />
        هنوز گفت‌وگویی آغاز نشده است.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((conv) => {
        const isUnread = conv.unread_count > 0;
        const isActive = activeId === conv.id;
        const isRequester = currentUserId ? conv.requester_id === currentUserId : false;

        return (
          <Link
            key={conv.id}
            to={`/messages/${conv.id}`}
            className={`group flex items-start gap-3 rounded-2xl border p-3 transition sm:p-3.5 ${
              isActive
                ? 'border-[#174D35] bg-[#DCEBDD]/55'
                : isUnread
                  ? 'border-[#78B98A] bg-white shadow-[0_1px_6px_rgba(23,77,53,0.05)] hover:border-[#26734B]'
                  : 'border-[#DCEBDD] bg-white hover:border-[#78B98A]'
            }`}
          >
            {conv.other_user_avatar ? (
              <ProtectedImage
                src={conv.other_user_avatar}
                alt={conv.other_user_name}
                wrapperClassName="relative block h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-[#DCEBDD]"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#DCEBDD] text-xs font-bold text-[#174D35]">
                {getInitials(conv.other_user_name)}
              </div>
            )}

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-sm font-semibold text-[#202820]">
                    {conv.other_user_name}
                  </span>
                  {!compact && currentUserId && (
                    <span className="shrink-0 rounded-full bg-[#F6F7F2] px-2 py-0.5 text-[10px] font-medium text-[#26734B]">
                      {isRequester ? 'داوطلب' : 'درخواست‌کننده'}
                    </span>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  {conv.last_message_at && (
                    <span className="text-[11px] font-light text-[#627062]">
                      {formatRelativeTimeFa(conv.last_message_at)}
                    </span>
                  )}
                  {isUnread && (
                    <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-[#E9B949] px-1.5 py-0.5 text-[10px] font-bold text-[#174D35]">
                      {toPersianDigits(conv.unread_count)}
                    </span>
                  )}
                </div>
              </div>

              <div className="truncate text-xs font-medium text-[#174D35]">
                {conv.request_title}
              </div>

              {!compact && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <CategoryBadge category={conv.request_category} />
                  {conv.response_status && <ResponseStatusBadge status={conv.response_status} />}
                </div>
              )}

              <p
                className={`truncate text-xs ${
                  isUnread ? 'font-semibold text-[#202820]' : 'font-normal text-[#5A685A]'
                }`}
              >
                {conv.last_message_preview ?? 'هنوز پیامی در این گفت‌وگو ارسال نشده است.'}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
