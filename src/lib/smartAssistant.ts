import { CATEGORY_MAP, HELP_TYPE_MAP } from '../constants/categories';
import type { HelpCategory, HelpRequestFeedItem, HelpType, Profile } from '../types/database';
import { detectSensitivePrivacyText } from './validation';

export interface AssistantAnalysis {
  suggestedCategory: HelpCategory | null;
  suggestedHelpType: HelpType | null;
  suggestedTitle: string | null;
  suggestedSkills: string[];
  missingInfoWarnings: string[];
  privacyWarnings: string[];
}

interface Rule {
  keywords: string[];
  category: HelpCategory;
  helpType: HelpType;
  skills: string[];
}

const CLASSIFICATION_RULES: Rule[] = [
  {
    keywords: ['سالمند', 'پدربزرگ', 'مادربزرگ', 'سالخورده', 'بازنشسته', 'درمانگاه سالمند', 'خرید سالمند'],
    category: 'elderly',
    helpType: 'companionship',
    skills: ['خرید و همراهی سالمندان', 'همراهی حضوری'],
  },
  {
    keywords: ['درس', 'ریاضی', 'فیزیک', 'شیمی', 'امتحان', 'کنکور', 'تدریس', 'آموزش', 'معلم', 'زبان', 'انگلیسی', 'تکلیف', 'دانش‌آموز', 'کلاس'],
    category: 'education',
    helpType: 'education',
    skills: ['تدریس ریاضی و علوم', 'آموزش زبان انگلیسی', 'مشاوره تحصیلی'],
  },
  {
    keywords: ['تعمیر', 'خراب', 'یخچال', 'لباسشویی', 'کولر', 'لوله', 'لوله‌کشی', 'برق', 'کلید', 'پریز', 'آبگرمکن', 'بخاری', 'پنجره', 'قفل', 'نجاری'],
    category: 'repair',
    helpType: 'service',
    skills: ['تعمیر لوازم خانگی', 'برق‌کاری و تأسیسات', 'لوله‌کشی'],
  },
  {
    keywords: ['اهدا', 'اهدای', 'بخشش', 'کتاب', 'دفتر', 'کیف', 'لباس', 'کاپشن', 'کفش', 'لوازم تحریر', 'بخاری اضافه', 'فرش', 'تخت', 'ویلچر', 'کالا'],
    category: 'donation',
    helpType: 'donation',
    skills: ['اهدای کالا', 'جمع‌آوری و توزیع کمک‌ها'],
  },
  {
    keywords: ['پاکسازی', 'پاک‌سازی', 'محله', 'مسجد', 'پارک', 'گروهی', 'جهادی', 'نهال', 'کاشت', 'رنگ‌آمیزی مدرسه', 'همگانی', 'داوطلبان'],
    category: 'voluntary',
    helpType: 'group_activity',
    skills: ['فعالیت‌های جهادی و گروهی', 'هماهنگی محلی'],
  },
  {
    keywords: ['فوری', 'اضطراری', 'اورژانس', 'سیل', 'زلزله', 'آتش', 'بیمارستان', 'دارو فوری', 'کمک سریع'],
    category: 'urgent',
    helpType: 'service',
    skills: ['امداد و کمک فوری', 'پشتیبانی محلی'],
  },
  {
    keywords: ['طراحی', 'گرافیک', 'فتوشاپ', 'سایت', 'کامپیوتر', 'رایانه', 'نرم‌افزار', 'مشاوره', 'حقوقی', 'روانشناسی', 'ثبت‌نام اینترنتی', 'اداری', 'تایپ'],
    category: 'specialized',
    helpType: 'service',
    skills: ['رایانه و امور دیجیتال', 'طراحی و گرافیک', 'کارهای اداری و ثبت‌نام'],
  },
  {
    keywords: ['خرید', 'سوپرمارکت', 'نان', 'جابه‌جایی', 'اسباب‌کشی', 'حمل', 'بسته', 'همراهی', 'کار روزمره', 'داروخانه'],
    category: 'daily',
    helpType: 'service',
    skills: ['رانندگی و جابه‌جایی', 'خرید و انجام امور روزمره'],
  },
];

export function analyzeRequestDraft(params: {
  title: string;
  description: string;
  category?: HelpCategory | '';
  helpType?: HelpType | '';
  area?: string;
  neededAt?: string;
}): AssistantAnalysis {
  const combined = `${params.title} ${params.description}`.trim().toLowerCase();

  let bestRule: Rule | null = null;
  let bestScore = 0;

  for (const rule of CLASSIFICATION_RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      if (combined.includes(kw)) {
        score += kw.length > 4 ? 2 : 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestRule = rule;
    }
  }

  const suggestedCategory = bestRule && bestRule.category !== params.category ? bestRule.category : null;
  const suggestedHelpType = bestRule && bestRule.helpType !== params.helpType ? bestRule.helpType : null;

  const missingInfoWarnings: string[] = [];
  const trimmedTitle = params.title.trim();
  const trimmedDesc = params.description.trim();

  if (trimmedTitle.length > 0 && trimmedTitle.length < 12) {
    missingInfoWarnings.push('عنوان کمی کوتاه است؛ ذکر موضوع دقیق‌تر (مثلاً «نیاز به تعمیر کولر آبی» یا «تدریس ریاضی پایه نهم») باعث دیده شدن سریع‌تر می‌شود.');
  }

  if (trimmedDesc.length > 0 && trimmedDesc.length < 40) {
    missingInfoWarnings.push('توضیحات کوتاه است؛ بیان جزئیاتی مثل شرایط انجام کار، ابزار موردنیاز یا وضعیت فعلی به داوطلبان کمک می‌کند تصمیم دقیق‌تری بگیرند.');
  }

  if (trimmedDesc.length >= 15 && !params.area?.trim()) {
    missingInfoWarnings.push('محدوده یا محله تقریبی را مشخص کنید تا داوطلبان نزدیک‌تر زودتر اعلام آمادگی کنند.');
  }

  if (trimmedDesc.length >= 15 && !params.neededAt?.trim()) {
    missingInfoWarnings.push('زمان تقریبی موردنیاز (مثلاً امروز عصر یا این هفته) را وارد کنید.');
  }

  const privacy = detectSensitivePrivacyText(`${params.title} ${params.description} ${params.area ?? ''}`);
  const privacyWarnings: string[] = [];
  if (privacy.hasPhoneNumber) {
    privacyWarnings.push('هشدار حریم خصوصی: به نظر می‌رسد شماره تماس در متن عمومی وارد شده است. برای امنیت خود، شماره تلفن را در متن عمومی ننویسید.');
  }
  if (privacy.hasExactAddressHint) {
    privacyWarnings.push('هشدار حریم خصوصی: از درج پلاک، طبقه یا کد پستی دقیق خودداری کنید و فقط محدوده یا نام محله را بنویسید.');
  }

  let suggestedTitle: string | null = null;
  if (trimmedTitle.length >= 3 && trimmedTitle.length < 15 && bestRule) {
    const catLabel = CATEGORY_MAP[bestRule.category].shortLabel;
    if (!trimmedTitle.includes(catLabel)) {
      suggestedTitle = `${trimmedTitle} (${HELP_TYPE_MAP[bestRule.helpType].label})`;
    }
  }

  return {
    suggestedCategory,
    suggestedHelpType,
    suggestedTitle,
    suggestedSkills: bestRule?.skills ?? [],
    missingInfoWarnings,
    privacyWarnings,
  };
}

export interface RequestMatchResult {
  score: number;
  reasons: string[];
}

export function scoreRequestForVolunteer(
  request: HelpRequestFeedItem,
  profile: Profile | null
): RequestMatchResult {
  if (!profile) return { score: 0, reasons: [] };
  if (request.user_id === profile.id) return { score: 0, reasons: [] };

  const reasons: string[] = [];
  let score = 0;

  if (profile.city && request.city.trim() === profile.city.trim()) {
    score += 3;
    reasons.push(`هم‌شهری شما در ${profile.city}`);
  }

  if (profile.neighborhood && request.area.includes(profile.neighborhood.trim())) {
    score += 2;
    reasons.push('نزدیک محدوده فعالیت شما');
  }

  const reqText = `${request.title} ${request.description} ${CATEGORY_MAP[request.category]?.label ?? ''}`.toLowerCase();
  const matchedSkill = (profile.skills ?? []).find((skill) => {
    const tokens = skill.trim().toLowerCase().split(/\s+/).filter((t) => t.length >= 3);
    return tokens.some((tok) => reqText.includes(tok));
  });

  if (matchedSkill) {
    score += 4;
    reasons.push(`مرتبط با مهارت «${matchedSkill}»`);
  }

  return { score, reasons };
}
