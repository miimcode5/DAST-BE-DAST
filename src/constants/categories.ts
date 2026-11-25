import type {
  ContentReportReason,
  ConversationReportReason,
  ConversationStatus,
  HelpCategory,
  HelpType,
  NotificationType,
  RequestStatus,
  ResponseStatus,
} from '../types/database';

export interface CategoryMeta {
  id: HelpCategory;
  label: string;
  shortLabel: string;
  description: string;
  examples: string[];
  accentBg: string;
  accentText: string;
  accentBorder: string;
}

export const HELP_CATEGORIES: CategoryMeta[] = [
  {
    id: 'daily',
    label: 'کمک‌های روزمره',
    shortLabel: 'روزمره',
    description: 'خرید مایحتاج، کارهای ضروری، جابه‌جایی و همراهی در امور روزانه',
    examples: ['خرید مایحتاج', 'انجام کارهای ضروری', 'جابه‌جایی وسایل', 'همراهی در امور'],
    accentBg: 'bg-brand-surface',
    accentText: 'text-brand-primary',
    accentBorder: 'border-brand-soft/45',
  },
  {
    id: 'education',
    label: 'آموزش و یادگیری',
    shortLabel: 'آموزش',
    description: 'تدریس دروس، آموزش زبان، آموزش مهارت، مشاوره تحصیلی و کلاس رایگان',
    examples: ['تدریس دروس', 'آموزش زبان', 'آموزش مهارت', 'مشاوره تحصیلی'],
    accentBg: 'bg-brand-surface',
    accentText: 'text-brand-primary',
    accentBorder: 'border-brand-soft/45',
  },
  {
    id: 'repair',
    label: 'تعمیرات و خدمات فنی',
    shortLabel: 'فنی و تعمیرات',
    description: 'تعمیر وسایل خانگی، خدمات برق، لوله‌کشی و تعمیر تجهیزات',
    examples: ['تعمیر وسایل خانگی', 'خدمات برق', 'خدمات لوله‌کشی', 'تعمیر تجهیزات'],
    accentBg: 'bg-brand-surface',
    accentText: 'text-brand-primary',
    accentBorder: 'border-brand-soft/45',
  },
  {
    id: 'donation',
    label: 'اهدای وسایل',
    shortLabel: 'اهدای کالا',
    description: 'لباس، کتاب، لوازم منزل، لوازم تحریر، تجهیزات آموزشی و کالاهای قابل استفاده',
    examples: ['لباس و پوشاک', 'کتاب و لوازم تحریر', 'لوازم منزل', 'تجهیزات آموزشی'],
    accentBg: 'bg-brand-surface',
    accentText: 'text-brand-primary',
    accentBorder: 'border-brand-soft/45',
  },
  {
    id: 'elderly',
    label: 'کمک به سالمندان',
    shortLabel: 'سالمندان',
    description: 'خرید روزانه، همراهی، انجام امور بیرون از منزل و کمک در امور روزمره سالمندان',
    examples: ['خرید روزانه', 'همراهی به مراکز درمانی', 'امور اداری و بیرون از منزل'],
    accentBg: 'bg-brand-surface',
    accentText: 'text-brand-primary',
    accentBorder: 'border-brand-soft/45',
  },
  {
    id: 'voluntary',
    label: 'فعالیت‌های داوطلبانه',
    shortLabel: 'داوطلبانه',
    description: 'پاک‌سازی محیط، فعالیت‌های محله‌محور، برنامه‌های اجتماعی و کارهای گروهی',
    examples: ['پاک‌سازی محیط', 'فعالیت محله‌محور', 'برنامه اجتماعی', 'همیاری گروهی'],
    accentBg: 'bg-brand-surface',
    accentText: 'text-brand-primary',
    accentBorder: 'border-brand-soft/45',
  },
  {
    id: 'urgent',
    label: 'کمک‌های فوری و محلی',
    shortLabel: 'فوری و محلی',
    description: 'نیازهای ضروری، کمک در شرایط دشوار و مشارکت سریع همسایگان',
    examples: ['نیاز ضروری', 'شرایط دشوار', 'کمک فوری همسایگی'],
    accentBg: 'bg-brand-gold/15',
    accentText: 'text-brand-text',
    accentBorder: 'border-brand-gold/60',
  },
  {
    id: 'specialized',
    label: 'خدمات تخصصی و مهارتی',
    shortLabel: 'تخصصی',
    description: 'مشاوره، خدمات طراحی، خدمات دیجیتال، خدمات اداری و تخصص‌های حرفه‌ای',
    examples: ['مشاوره تخصصی', 'خدمات دیجیتال و رایانه', 'طراحی و گرافیک', 'راهنمایی اداری'],
    accentBg: 'bg-brand-surface',
    accentText: 'text-brand-primary',
    accentBorder: 'border-brand-soft/45',
  },
];

export const CATEGORY_MAP: Record<HelpCategory, CategoryMeta> = HELP_CATEGORIES.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<HelpCategory, CategoryMeta>
);

export interface HelpTypeMeta {
  id: HelpType;
  label: string;
  description: string;
}

export const HELP_TYPES: HelpTypeMeta[] = [
  { id: 'service', label: 'خدمت و کار اجرایی', description: 'انجام یک کار عملی یا فنی' },
  { id: 'education', label: 'آموزش و مشاوره', description: 'تدریس، راهنمایی یا انتقال مهارت' },
  { id: 'donation', label: 'اهدای کالا / وسیله', description: 'در اختیار گذاشتن کالای قابل استفاده' },
  { id: 'companionship', label: 'همراهی و پشتیبانی', description: 'همراهی حضوری یا کمک در امور بیرون' },
  { id: 'group_activity', label: 'فعالیت گروهی و مردمی', description: 'اقدام جمعی با حضور چند داوطلب' },
];

export const HELP_TYPE_MAP: Record<HelpType, HelpTypeMeta> = HELP_TYPES.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<HelpType, HelpTypeMeta>
);

export const REQUEST_STATUS_META: Record<
  RequestStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  open: {
    label: 'باز و نیازمند همیاری',
    badgeClass: 'bg-white text-brand-primary border-brand-soft',
    dotClass: 'bg-brand-green',
  },
  in_progress: {
    label: 'در حال انجام',
    badgeClass: 'bg-brand-gold/15 text-brand-text border-brand-gold/60',
    dotClass: 'bg-brand-gold',
  },
  completed: {
    label: 'تکمیل‌شده',
    badgeClass: 'bg-brand-surface text-brand-primary border-brand-soft',
    dotClass: 'bg-brand-primary',
  },
  cancelled: {
    label: 'لغوشده',
    badgeClass: 'bg-brand-bg text-brand-text/70 border-brand-surface',
    dotClass: 'bg-brand-soft/60',
  },
};

export const RESPONSE_STATUS_META: Record<
  ResponseStatus,
  { label: string; badgeClass: string; description: string }
> = {
  pending: {
    label: 'در انتظار بررسی',
    badgeClass: 'bg-white text-brand-green border-brand-surface',
    description: 'ثبت‌کننده درخواست به‌زودی اعلام آمادگی شما را بررسی می‌کند.',
  },
  accepted: {
    label: 'پذیرفته‌شده',
    badgeClass: 'bg-brand-surface text-brand-primary border-brand-soft',
    description: 'اعلام آمادگی شما پذیرفته شد و آماده هماهنگی است.',
  },
  in_progress: {
    label: 'در حال انجام',
    badgeClass: 'bg-brand-gold/15 text-brand-text border-brand-gold/60',
    description: 'همکاری میان داوطلب و درخواست‌کننده در جریان است.',
  },
  completed: {
    label: 'تکمیل‌شده و تأییدشده',
    badgeClass: 'bg-brand-primary text-white border-brand-primary',
    description: 'این همیاری با موفقیت انجام و توسط درخواست‌کننده تأیید شد.',
  },
  rejected: {
    label: 'پذیرفته نشد',
    badgeClass: 'bg-brand-bg text-brand-text/70 border-brand-surface',
    description: 'درخواست‌کننده داوطلب دیگری را انتخاب کرد یا پاسخ را نپذیرفت.',
  },
  cancelled: {
    label: 'لغوشده',
    badgeClass: 'bg-brand-bg text-brand-text/65 border-brand-surface',
    description: 'این اعلام آمادگی لغو شده است.',
  },
};

export const SUGGESTED_SKILLS = [
  'تدریس ریاضی و علوم',
  'آموزش زبان انگلیسی',
  'تعمیر لوازم خانگی',
  'برق‌کاری و تأسیسات',
  'لوله‌کشی',
  'رانندگی و جابه‌جایی',
  'خرید و همراهی سالمندان',
  'مشاوره تحصیلی',
  'طراحی و گرافیک',
  'رایانه و امور دیجیتال',
  'کارهای اداری و ثبت‌نام',
  'خیاطی و تعمیرات پوشاک',
  'فعالیت‌های جهادی و گروهی',
];

export const CONVERSATION_STATUS_META: Record<
  ConversationStatus,
  { label: string; badgeClass: string; helperNote: string }
> = {
  active: {
    label: 'گفت‌وگوی فعال',
    badgeClass: 'bg-brand-surface text-brand-primary border-brand-soft/60',
    helperNote: 'امکان ارسال پیام و هماهنگی بین درخواست‌کننده و داوطلب برقرار است.',
  },
  completed: {
    label: 'همیاری تکمیل‌شده',
    badgeClass: 'bg-brand-primary text-white border-brand-primary',
    helperNote: 'این همیاری با موفقیت تکمیل شده است؛ تاریخچه گفت‌وگو فقط برای مشاهده نگهداری می‌شود.',
  },
  cancelled: {
    label: 'لغوشده',
    badgeClass: 'bg-brand-bg text-brand-text/70 border-brand-surface',
    helperNote: 'درخواست یا اعلام آمادگی این گفت‌وگو لغو شده و ارسال پیام جدید بسته است.',
  },
  closed: {
    label: 'بسته‌شده',
    badgeClass: 'bg-brand-bg text-brand-text/70 border-brand-surface',
    helperNote: 'این گفت‌وگو بسته شده است؛ پیام‌های قبلی همچنان قابل مرور هستند.',
  },
};

export const CONVERSATION_REPORT_REASONS: { id: ConversationReportReason; label: string }[] = [
  { id: 'privacy_violation', label: 'درخواست اطلاعات شخصی یا نقض حریم خصوصی' },
  { id: 'harassment', label: 'رفتار نامناسب، توهین یا مزاحمت' },
  { id: 'spam', label: 'تبلیغات یا پیام‌های تکراری (اسپم)' },
  { id: 'fraud', label: 'سوءاستفاده یا درخواست مشکوک / مالی' },
  { id: 'other', label: 'سایر موارد' },
];

export const CONTENT_REPORT_REASONS: { id: ContentReportReason; label: string }[] = [
  { id: 'privacy_violation', label: 'انتشار شماره تماس، پلاک یا اطلاعات محرمانه' },
  { id: 'suspicious_or_fraud', label: 'درخواست مشکوک، مالی یا فریب‌کارانه' },
  { id: 'spam_or_commercial', label: 'آگهی تجاری یا تبلیغات نامرتبط (اسپم)' },
  { id: 'inappropriate_content', label: 'محتوای نامناسب یا مغایر با ادب و احترام' },
  { id: 'wrong_category', label: 'دسته‌بندی یا اطلاعات نادرست' },
  { id: 'other', label: 'سایر موارد' },
];

export const NOTIFICATION_TYPE_META: Record<
  NotificationType,
  { badgeLabel: string; badgeClass: string }
> = {
  new_message: {
    badgeLabel: 'پیام جدید',
    badgeClass: 'bg-brand-surface text-brand-primary border-brand-soft/60',
  },
  new_offer: {
    badgeLabel: 'پیشنهاد کمک',
    badgeClass: 'bg-brand-surface text-brand-primary border-brand-soft/60',
  },
  offer_accepted: {
    badgeLabel: 'پذیرش همکاری',
    badgeClass: 'bg-brand-primary text-white border-brand-primary',
  },
  offer_rejected: {
    badgeLabel: 'تغییر وضعیت',
    badgeClass: 'bg-brand-bg text-brand-text/75 border-brand-surface',
  },
  help_started: {
    badgeLabel: 'شروع همیاری',
    badgeClass: 'bg-brand-gold/15 text-brand-text border-brand-gold/60',
  },
  volunteer_done: {
    badgeLabel: 'نیازمند تأیید',
    badgeClass: 'bg-brand-gold/20 text-brand-text border-brand-gold/70',
  },
  help_completed: {
    badgeLabel: 'کمک تأییدشده',
    badgeClass: 'bg-brand-primary text-white border-brand-primary',
  },
  request_cancelled: {
    badgeLabel: 'لغو درخواست',
    badgeClass: 'bg-brand-bg text-brand-text/75 border-brand-surface',
  },
  offer_withdrawn: {
    badgeLabel: 'انصراف داوطلب',
    badgeClass: 'bg-brand-bg text-brand-text/75 border-brand-surface',
  },
  account_welcome: {
    badgeLabel: 'خوش‌آمدگویی',
    badgeClass: 'bg-brand-surface text-brand-primary border-brand-soft/60',
  },
  account_security: {
    badgeLabel: 'امنیت حساب',
    badgeClass: 'bg-brand-gold/15 text-brand-text border-brand-gold/60',
  },
  badge_earned: {
    badgeLabel: 'نشان افتخار',
    badgeClass: 'bg-brand-gold/25 text-brand-primary border-brand-gold/70',
  },
};

