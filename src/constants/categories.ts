import type {
  ConversationReportReason,
  ConversationStatus,
  HelpCategory,
  HelpType,
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
    accentBg: 'bg-[#DCEBDD]',
    accentText: 'text-[#174D35]',
    accentBorder: 'border-[#78B98A]/40',
  },
  {
    id: 'education',
    label: 'آموزش و یادگیری',
    shortLabel: 'آموزش',
    description: 'تدریس دروس، آموزش زبان، آموزش مهارت، مشاوره تحصیلی و کلاس رایگان',
    examples: ['تدریس دروس', 'آموزش زبان', 'آموزش مهارت', 'مشاوره تحصیلی'],
    accentBg: 'bg-emerald-50',
    accentText: 'text-emerald-800',
    accentBorder: 'border-emerald-200',
  },
  {
    id: 'repair',
    label: 'تعمیرات و خدمات فنی',
    shortLabel: 'فنی و تعمیرات',
    description: 'تعمیر وسایل خانگی، خدمات برق، لوله‌کشی و تعمیر تجهیزات',
    examples: ['تعمیر وسایل خانگی', 'خدمات برق', 'خدمات لوله‌کشی', 'تعمیر تجهیزات'],
    accentBg: 'bg-amber-50',
    accentText: 'text-amber-900',
    accentBorder: 'border-amber-200',
  },
  {
    id: 'donation',
    label: 'اهدای وسایل',
    shortLabel: 'اهدای کالا',
    description: 'لباس، کتاب، لوازم منزل، لوازم تحریر، تجهیزات آموزشی و کالاهای قابل استفاده',
    examples: ['لباس و پوشاک', 'کتاب و لوازم تحریر', 'لوازم منزل', 'تجهیزات آموزشی'],
    accentBg: 'bg-teal-50',
    accentText: 'text-teal-900',
    accentBorder: 'border-teal-200',
  },
  {
    id: 'elderly',
    label: 'کمک به سالمندان',
    shortLabel: 'سالمندان',
    description: 'خرید روزانه، همراهی، انجام امور بیرون از منزل و کمک در امور روزمره سالمندان',
    examples: ['خرید روزانه', 'همراهی به مراکز درمانی', 'امور اداری و بیرون از منزل'],
    accentBg: 'bg-[#DCEBDD]/80',
    accentText: 'text-[#174D35]',
    accentBorder: 'border-[#78B98A]/50',
  },
  {
    id: 'voluntary',
    label: 'فعالیت‌های داوطلبانه',
    shortLabel: 'داوطلبانه',
    description: 'پاک‌سازی محیط، فعالیت‌های محله‌محور، برنامه‌های اجتماعی و کارهای گروهی',
    examples: ['پاک‌سازی محیط', 'فعالیت محله‌محور', 'برنامه اجتماعی', 'همیاری گروهی'],
    accentBg: 'bg-lime-50',
    accentText: 'text-lime-900',
    accentBorder: 'border-lime-200',
  },
  {
    id: 'urgent',
    label: 'کمک‌های فوری و محلی',
    shortLabel: 'فوری و محلی',
    description: 'نیازهای ضروری، کمک در شرایط دشوار و مشارکت سریع همسایگان',
    examples: ['نیاز ضروری', 'شرایط دشوار', 'کمک فوری همسایگی'],
    accentBg: 'bg-rose-50',
    accentText: 'text-rose-900',
    accentBorder: 'border-rose-200',
  },
  {
    id: 'specialized',
    label: 'خدمات تخصصی و مهارتی',
    shortLabel: 'تخصصی',
    description: 'مشاوره، خدمات طراحی، خدمات دیجیتال، خدمات اداری و تخصص‌های حرفه‌ای',
    examples: ['مشاوره تخصصی', 'خدمات دیجیتال و رایانه', 'طراحی و گرافیک', 'راهنمایی اداری'],
    accentBg: 'bg-sky-50',
    accentText: 'text-sky-900',
    accentBorder: 'border-sky-200',
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
    badgeClass: 'bg-[#DCEBDD] text-[#174D35] border-[#78B98A]/50',
    dotClass: 'bg-[#26734B]',
  },
  in_progress: {
    label: 'در حال انجام',
    badgeClass: 'bg-[#E9B949]/20 text-[#7A5807] border-[#E9B949]/60',
    dotClass: 'bg-[#E9B949]',
  },
  completed: {
    label: 'تکمیل‌شده',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    dotClass: 'bg-emerald-600',
  },
  cancelled: {
    label: 'لغوشده',
    badgeClass: 'bg-stone-100 text-stone-600 border-stone-300',
    dotClass: 'bg-stone-400',
  },
};

export const RESPONSE_STATUS_META: Record<
  ResponseStatus,
  { label: string; badgeClass: string; description: string }
> = {
  pending: {
    label: 'در انتظار بررسی',
    badgeClass: 'bg-amber-50 text-amber-900 border-amber-200',
    description: 'ثبت‌کننده درخواست به‌زودی اعلام آمادگی شما را بررسی می‌کند.',
  },
  accepted: {
    label: 'پذیرفته‌شده',
    badgeClass: 'bg-[#DCEBDD] text-[#174D35] border-[#78B98A]',
    description: 'اعلام آمادگی شما پذیرفته شد و آماده هماهنگی است.',
  },
  in_progress: {
    label: 'در حال انجام',
    badgeClass: 'bg-[#E9B949]/20 text-[#7A5807] border-[#E9B949]',
    description: 'همکاری میان داوطلب و درخواست‌کننده در جریان است.',
  },
  completed: {
    label: 'تکمیل‌شده و تأییدشده',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    description: 'این همیاری با موفقیت انجام و توسط درخواست‌کننده تأیید شد.',
  },
  rejected: {
    label: 'پذیرفته نشد',
    badgeClass: 'bg-stone-100 text-stone-600 border-stone-200',
    description: 'درخواست‌کننده داوطلب دیگری را انتخاب کرد یا پاسخ را نپذیرفت.',
  },
  cancelled: {
    label: 'لغوشده',
    badgeClass: 'bg-stone-100 text-stone-500 border-stone-200',
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
    badgeClass: 'bg-[#DCEBDD] text-[#174D35] border-[#78B98A]/60',
    helperNote: 'امکان ارسال پیام و هماهنگی بین درخواست‌کننده و داوطلب برقرار است.',
  },
  completed: {
    label: 'همیاری تکمیل‌شده',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    helperNote: 'این همیاری با موفقیت تکمیل شده است؛ تاریخچه گفت‌وگو فقط برای مشاهده نگهداری می‌شود.',
  },
  cancelled: {
    label: 'لغوشده',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    helperNote: 'درخواست یا اعلام آمادگی این گفت‌وگو لغو شده و ارسال پیام جدید بسته است.',
  },
  closed: {
    label: 'بسته‌شده',
    badgeClass: 'bg-stone-100 text-stone-700 border-stone-300',
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
