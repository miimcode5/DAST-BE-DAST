/**
 * Architecture extension types reserved for future versions (v2+):
 * - General Request / Profile Violation Reporting (Section 6.8 & 23.9)
 * - Achievements & Non-monetary Points (Section 8 & 21)
 * - Web Push Notifications & Group Activities (Section 21 & 32)
 *
 * Note: Real-time Private Chat & Conversation Reporting (`conversations`, `messages`,
 * `conversation_reports`) have been promoted and implemented as core MVP features.
 */

export type ReportTargetType = 'request' | 'profile' | 'response';

export type ReportReason =
  | 'privacy_violation'
  | 'spam_or_commercial'
  | 'inappropriate_content'
  | 'suspicious_or_fraud'
  | 'wrong_category'
  | 'other';

export interface PlannedReportPayload {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details: string;
}

export interface PlannedBadgeDefinition {
  code: string;
  titleFa: string;
  descriptionFa: string;
  suggestedPoints: number;
}

export const PLANNED_BADGES_ROADMAP: PlannedBadgeDefinition[] = [
  {
    code: 'first_helping_hand',
    titleFa: 'اولین دست یاری',
    descriptionFa: 'تکمیل اولین کمک تأییدشده در دست‌به‌دست',
    suggestedPoints: 30,
  },
  {
    code: 'skill_mentor',
    titleFa: 'همراه دانایی',
    descriptionFa: 'آموزش داوطلبانه یک درس یا مهارت',
    suggestedPoints: 40,
  },
  {
    code: 'kind_giver',
    titleFa: 'گره‌گشای مهربان',
    descriptionFa: 'اهدای کالای قابل استفاده به نیازمندان',
    suggestedPoints: 20,
  },
  {
    code: 'neighborhood_heart',
    titleFa: 'قلب محله',
    descriptionFa: 'مشارکت فعال در فعالیت‌های گروهی و محله‌محور',
    suggestedPoints: 50,
  },
  {
    code: 'chain_builder',
    titleFa: 'زنجیره‌ساز',
    descriptionFa: 'ایجاد پیوند مؤثر در زنجیره مهربانی',
    suggestedPoints: 40,
  },
];
