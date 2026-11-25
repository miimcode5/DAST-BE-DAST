export type HelpCategory =
  | 'daily'
  | 'education'
  | 'repair'
  | 'donation'
  | 'elderly'
  | 'voluntary'
  | 'urgent'
  | 'specialized';

export type HelpType =
  | 'service'
  | 'education'
  | 'donation'
  | 'companionship'
  | 'group_activity';

export type RequestStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';

export type ResponseStatus =
  | 'pending'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export type UserRole = 'member' | 'moderator' | 'admin';

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  province: string;
  city: string | null;
  neighborhood: string | null;
  skills: string[];
  role: UserRole;
  completed_helps_count: number;
  created_at: string;
  updated_at: string;
}

export interface HelpRequest {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: HelpCategory;
  help_type: HelpType;
  province: string;
  city: string;
  area: string;
  needed_at: string;
  image_url: string | null;
  status: RequestStatus;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface HelpRequestFeedItem extends HelpRequest {
  requester_name: string;
  requester_avatar: string | null;
  requester_completed_helps: number;
  responses_count: number;
}

export interface VolunteerResponse {
  id: string;
  request_id: string;
  volunteer_id: string;
  message: string | null;
  status: ResponseStatus;
  volunteer_confirmed: boolean;
  requester_confirmed: boolean;
  created_at: string;
  updated_at: string;
}

export interface VolunteerResponseWithProfile extends VolunteerResponse {
  volunteer: Pick<
    Profile,
    'id' | 'display_name' | 'avatar_url' | 'city' | 'neighborhood' | 'skills' | 'completed_helps_count' | 'bio'
  > | null;
}

export interface VolunteerResponseWithRequest extends VolunteerResponse {
  request: HelpRequestFeedItem | null;
}

export interface SavedRequestRow {
  id: string;
  user_id: string;
  request_id: string;
  created_at: string;
}

export interface PlatformStats {
  total_requests: number;
  active_requests: number;
  completed_helps: number;
  active_volunteers: number;
  verified_participations: number;
  active_cities: number;
}

export interface KindnessChainLink {
  response_id: string;
  request_id: string;
  request_title: string;
  category: HelpCategory;
  help_type: HelpType;
  city: string;
  completed_at: string;
  helper_id: string;
  helper_name: string;
  helper_avatar: string | null;
  recipient_id: string;
  recipient_name: string;
  recipient_avatar: string | null;
  chain_continued: boolean;
}

export interface KindnessChainData {
  summary: {
    verified_helps: number;
    unique_helpers: number;
    unique_recipients: number;
    connected_chains: number;
    cities_count: number;
  };
  links: KindnessChainLink[];
}

export type ConversationStatus = 'active' | 'completed' | 'cancelled' | 'closed';

export type ConversationReportReason =
  | 'harassment'
  | 'privacy_violation'
  | 'spam'
  | 'fraud'
  | 'other';

export interface ConversationItem {
  id: string;
  request_id: string;
  response_id: string | null;
  requester_id: string;
  volunteer_id: string;
  status: ConversationStatus;
  last_message_preview: string | null;
  last_message_at: string | null;
  last_message_sender_id: string | null;
  created_at: string;
  updated_at: string;
  request_title: string;
  request_status: RequestStatus;
  request_category: HelpCategory;
  request_city: string;
  response_status: ResponseStatus | null;
  other_user_id: string;
  other_user_name: string;
  other_user_avatar: string | null;
  other_user_city: string | null;
  other_user_completed_helps: number;
  unread_count: number;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

export interface PendingOutgoingMessage {
  clientTempId: string;
  content: string;
  createdAt: string;
  status: 'sending' | 'failed';
  errorMessage?: string;
}

export interface ConversationReport {
  id: string;
  conversation_id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: ConversationReportReason;
  details: string | null;
  status: 'open' | 'reviewed' | 'resolved';
  created_at: string;
}
