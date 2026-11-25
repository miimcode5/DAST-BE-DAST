/**
 * Architecture extension types reserved for future versions (v2+):
 * - Web Push Notifications (Service Worker Push API)
 *
 * Note: Real-time Private Chat (`conversations`, `messages`), Notifications (`notifications`),
 * User Blocking (`user_blocks`), Content Reporting (`content_reports`), and Non-Monetary
 * Achievements & Participation Points (`badge_definitions`, `user_achievements`)
 * are implemented and active in V1.0.
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
    code: 'neighborhood_heart',
    titleFa: 'قلب محله',
    descriptionFa: 'مشارکت فعال در فعالیت‌های گروهی و محله‌محور',
    suggestedPoints: 50,
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
    code: 'elderly_friend',
    titleFa: 'همدل سالمندان',
    descriptionFa: 'همراهی و یاری‌رسانی به سالمندان و کم‌توانان',
    suggestedPoints: 35,
  },
  {
    code: 'technical_helper',
    titleFa: 'دست توانا',
    descriptionFa: 'انجام داوطلبانه تعمیرات و خدمات فنی یا تخصصی',
    suggestedPoints: 35,
  },
  {
    code: 'chain_builder',
    titleFa: 'زنجیره‌ساز',
    descriptionFa: 'ایجاد پیوند مؤثر و واقعی در زنجیره مهربانی',
    suggestedPoints: 40,
  },
  {
    code: 'steady_supporter',
    titleFa: 'یاور همیشگی',
    descriptionFa: 'استمرار مهربانی با تکمیل ۳ همیاری معتبر',
    suggestedPoints: 60,
  },
];

