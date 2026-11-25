import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Edit3,
  ImagePlus,
  MapPin,
  Plus,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  WifiOff,
  X,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { LoadingState } from '../components/LoadingState';
import { ProtectedImage } from '../components/ProtectedImage';
import { SmartAssistantPanel } from '../components/SmartAssistantPanel';
import { CategoryBadge, CategoryIcon } from '../components/StatusBadge';
import { CATEGORY_MAP, HELP_CATEGORIES, HELP_TYPES, HELP_TYPE_MAP } from '../constants/categories';
import {
  DEFAULT_PROVINCE,
  IRAN_PROVINCES_CITIES,
  NEEDED_AT_PRESETS,
  PROVINCES_LIST,
} from '../constants/locations';
import { useAuth } from '../contexts/AuthContext';
import { usePwa } from '../contexts/PwaContext';
import { useToast } from '../contexts/ToastContext';
import { toPersianDigits } from '../lib/formatters';
import { MAX_REQUEST_IMAGE_BYTES, validateImageFile, validateRequestFields } from '../lib/validation';
import { createHelpRequest, getRequestById, updateHelpRequest } from '../services/requestsService';
import type { HelpCategory, HelpType } from '../types/database';

type WizardStep = 1 | 2 | 3 | 4;

const STEPS: { step: WizardStep; title: string; short: string }[] = [
  { step: 1, title: 'نوع و دسته‌بندی', short: 'نوع کمک' },
  { step: 2, title: 'عنوان و توضیحات', short: 'شرح نیاز' },
  { step: 3, title: 'زمان و محدوده مکانی', short: 'زمان و مکان' },
  { step: 4, title: 'مرور و ثبت نهایی', short: 'مرور و ثبت' },
];

export function RequestFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const { refreshPendingCount } = usePwa();
  const { showToast } = useToast();

  const [step, setStep] = useState<WizardStep>(1);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<HelpCategory>('daily');
  const [helpType, setHelpType] = useState<HelpType>('service');
  const [province, setProvince] = useState(profile?.province || DEFAULT_PROVINCE);
  const [city, setCity] = useState(
    profile?.city || IRAN_PROVINCES_CITIES[DEFAULT_PROVINCE][0]
  );
  const [area, setArea] = useState(profile?.neighborhood || '');
  const [neededAt, setNeededAt] = useState(NEEDED_AT_PRESETS[2]);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(mode === 'edit');
  const [submitting, setSubmitting] = useState(false);

  const [submittedResult, setSubmittedResult] = useState<{
    id?: string;
    queuedOffline: boolean;
    edited?: boolean;
  } | null>(null);

  useEffect(() => {
    if (mode === 'create' && profile) {
      setProvince((prev) => prev || profile.province || DEFAULT_PROVINCE);
      if (profile.city) setCity(profile.city);
      if (profile.neighborhood) setArea((prev) => prev || profile.neighborhood || '');
    }
  }, [mode, profile]);

  useEffect(() => {
    if (mode !== 'edit' || !id) return;
    let active = true;

    async function loadExisting() {
      setLoadingExisting(true);
      try {
        const { item } = await getRequestById(id!);
        if (!active) return;
        if (!item) {
          setFormError('درخواست موردنظر برای ویرایش یافت نشد.');
          return;
        }
        if (user && item.user_id !== user.id) {
          setFormError('شما اجازه ویرایش درخواست دیگران را ندارید.');
          return;
        }
        if (item.status === 'completed' || item.status === 'cancelled') {
          setFormError('درخواست تکمیل‌شده یا لغوشده قابل ویرایش نیست.');
          return;
        }

        setTitle(item.title);
        setDescription(item.description);
        setCategory(item.category);
        setHelpType(item.help_type);
        setProvince(item.province);
        setCity(item.city);
        setArea(item.area);
        setNeededAt(item.needed_at);
        setExistingImageUrl(item.image_url);
      } catch (err) {
        if (active) setFormError(err instanceof Error ? err.message : 'خطا در بارگذاری درخواست');
      } finally {
        if (active) setLoadingExisting(false);
      }
    }

    void loadExisting();
    return () => {
      active = false;
    };
  }, [mode, id, user]);

  const citiesForProvince = IRAN_PROVINCES_CITIES[province] ?? ['سایر شهرها'];

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateImageFile(file, MAX_REQUEST_IMAGE_BYTES);
    if (err) {
      setFormError(err);
      return;
    }
    setFormError(null);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setRemoveImage(false);
  };

  const validateStep = (targetStep: WizardStep): boolean => {
    setFormError(null);
    const allErrors = validateRequestFields({
      title,
      description,
      category,
      help_type: helpType,
      province,
      city,
      area,
      needed_at: neededAt,
    });

    if (targetStep === 2) {
      const stepErrors: Record<string, string> = {};
      if (allErrors.title) stepErrors.title = allErrors.title;
      if (allErrors.description) stepErrors.description = allErrors.description;
      setFieldErrors(stepErrors);
      return Object.keys(stepErrors).length === 0;
    }

    if (targetStep === 3) {
      const stepErrors: Record<string, string> = {};
      if (allErrors.area) stepErrors.area = allErrors.area;
      if (allErrors.needed_at) stepErrors.needed_at = allErrors.needed_at;
      setFieldErrors(stepErrors);
      return Object.keys(stepErrors).length === 0;
    }

    setFieldErrors({});
    return true;
  };

  const goNextStep = () => {
    if (!validateStep(step)) return;
    setStep((prev) => Math.min(4, prev + 1) as WizardStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goPrevStep = () => {
    setFormError(null);
    setFieldErrors({});
    setStep((prev) => Math.max(1, prev - 1) as WizardStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const jumpToStep = (target: WizardStep) => {
    if (mode === 'create' && target > step) {
      // Validate intermediate steps so user doesn't skip invalid fields
      for (let s = step; s < target; s += 1) {
        if (!validateStep(s as WizardStep)) {
          setStep(s as WizardStep);
          return;
        }
      }
    }
    setFormError(null);
    setFieldErrors({});
    setStep(target);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || submitting) return;
    setFormError(null);

    const errors = validateRequestFields({
      title,
      description,
      category,
      help_type: helpType,
      province,
      city,
      area,
      needed_at: neededAt,
    });
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setFormError('لطفاً خطاهای مشخص‌شده در فرم را اصلاح کنید.');
      if (errors.title || errors.description) setStep(2);
      else if (errors.area || errors.needed_at) setStep(3);
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'create') {
        const result = await createHelpRequest(
          user.id,
          {
            title,
            description,
            category,
            help_type: helpType,
            province,
            city,
            area,
            needed_at: neededAt,
          },
          imageFile
        );

        if (result.queuedOffline) {
          await refreshPendingCount();
          showToast('درخواست در صف آفلاین ذخیره شد و با اتصال اینترنت ارسال می‌شود.', 'warning');
          setSubmittedResult({ queuedOffline: true });
        } else {
          showToast('درخواست کمک شما با موفقیت ثبت شد.', 'success');
          setSubmittedResult({ id: result.request.id, queuedOffline: false });
        }
      } else if (id) {
        const updated = await updateHelpRequest(
          id,
          user.id,
          {
            title,
            description,
            category,
            help_type: helpType,
            province,
            city,
            area,
            needed_at: neededAt,
            existingImageUrl,
          },
          imageFile,
          removeImage
        );
        showToast('تغییرات درخواست با موفقیت ذخیره شد.', 'success');
        setSubmittedResult({ id: updated.id, queuedOffline: false, edited: true });
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'ثبت درخواست با خطا مواجه شد.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForAnother = () => {
    setTitle('');
    setDescription('');
    setCategory('daily');
    setHelpType('service');
    setNeededAt(NEEDED_AT_PRESETS[2]);
    setImageFile(null);
    setImagePreview(null);
    setExistingImageUrl(null);
    setRemoveImage(false);
    setFieldErrors({});
    setFormError(null);
    setStep(1);
    setSubmittedResult(null);
  };

  if (loadingExisting) {
    return <LoadingState label="در حال بارگذاری اطلاعات درخواست..." />;
  }

  // Dedicated warm Success State after submission
  if (submittedResult) {
    return (
      <div className="mx-auto max-w-lg py-4 animate-pop-in">
        <div className="rounded-3xl border border-[#78B98A]/60 bg-white p-6 text-center shadow-sm sm:p-8">
          <div
            className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl ${
              submittedResult.queuedOffline
                ? 'bg-[#E9B949]/20 text-[#6F4E06]'
                : 'bg-[#DCEBDD] text-[#174D35]'
            }`}
          >
            {submittedResult.queuedOffline ? (
              <WifiOff className="h-8 w-8" />
            ) : (
              <CheckCircle2 className="h-8 w-8" />
            )}
          </div>

          <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-[#E9B949]/20 px-3 py-1 text-xs font-semibold text-[#6F4E06]">
            <Sparkles className="h-3.5 w-3.5 text-[#E9B949]" />
            <span>
              {submittedResult.queuedOffline
                ? 'ذخیره در صف آفلاین'
                : submittedResult.edited
                  ? 'تغییرات ذخیره شد'
                  : 'با موفقیت ثبت شد'}
            </span>
          </div>

          <h1 className="mt-2 text-xl font-bold text-[#174D35]">
            {submittedResult.queuedOffline
              ? 'درخواست شما در صف ارسال قرار گرفت'
              : submittedResult.edited
                ? 'درخواست کمک شما به‌روزرسانی شد'
                : 'درخواست کمک شما منتشر شد 🌱'}
          </h1>

          <p className="mt-2.5 text-sm font-normal leading-7 text-[#465346]">
            {submittedResult.queuedOffline
              ? 'به دلیل قطع اینترنت، درخواست به‌طور امن در حافظه دستگاه ذخیره شد و به‌محض اتصال به صورت خودکار به سرور ارسال می‌شود.'
              : 'هم‌شهریان و داوطلبان دست‌به‌دست هم‌اکنون می‌توانند درخواست شما را ببینند و برای کمک اعلام آمادگی کنند.'}
          </p>

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            {submittedResult.id ? (
              <Link
                to={`/requests/${submittedResult.id}`}
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-[#174D35] px-5 py-3 text-sm font-bold text-white hover:bg-[#26734B]"
              >
                <span>مشاهده درخواست</span>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                to="/my-activities"
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-[#174D35] px-5 py-3 text-sm font-bold text-white hover:bg-[#26734B]"
              >
                <span>مشاهده فعالیت‌های من</span>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            )}

            {mode === 'create' && (
              <button
                type="button"
                onClick={resetForAnother}
                className="inline-flex min-h-[46px] items-center justify-center gap-1.5 rounded-2xl border border-[#DCEBDD] bg-[#F6F7F2] px-5 py-3 text-sm font-semibold text-[#174D35] hover:border-[#78B98A]"
              >
                <Plus className="h-4 w-4" />
                <span>ثبت درخواست دیگر</span>
              </button>
            )}
          </div>

          <div className="mt-4">
            <Link to="/" className="text-xs font-medium text-[#26734B] hover:underline">
              بازگشت به صفحه اصلی
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const displayedPreview = removeImage ? null : imagePreview || existingImageUrl;

  return (
    <div className="mx-auto max-w-2xl space-y-5 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[#174D35] sm:text-2xl">
            {mode === 'create' ? 'ثبت درخواست کمک' : 'ویرایش درخواست کمک'}
          </h1>
          <p className="mt-0.5 text-xs font-normal text-[#505E50] sm:text-sm">
            در ۴ گام ساده نیاز خود را ثبت کنید تا داوطلب مناسب سریع‌تر پیدا شود.
          </p>
        </div>
        <Link
          to={mode === 'edit' && id ? `/requests/${id}` : '/requests'}
          className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl border border-[#DCEBDD] bg-white px-3.5 py-2 text-xs font-semibold text-[#174D35] hover:bg-[#F6F7F2]"
        >
          <ArrowRight className="h-4 w-4" />
          <span>بازگشت</span>
        </Link>
      </div>

      {/* 4-Step Progress Indicator */}
      <nav aria-label="مراحل ثبت درخواست" className="rounded-3xl border border-[#DCEBDD] bg-white p-3.5 sm:p-4">
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5">
          {STEPS.map((s) => {
            const isCurrent = step === s.step;
            const isDone = step > s.step;
            return (
              <button
                key={s.step}
                type="button"
                onClick={() => jumpToStep(s.step)}
                className={`flex flex-col items-center gap-1.5 rounded-2xl px-1.5 py-2 text-center transition ${
                  isCurrent
                    ? 'bg-[#DCEBDD]/70 text-[#174D35]'
                    : isDone
                      ? 'bg-[#F6F7F2] text-[#26734B] hover:bg-[#DCEBDD]/40'
                      : 'text-[#667466] hover:bg-[#F6F7F2]'
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition ${
                    isCurrent
                      ? 'bg-[#174D35] text-white'
                      : isDone
                        ? 'bg-[#26734B] text-white'
                        : 'border border-[#DCEBDD] bg-white text-[#556455]'
                  }`}
                >
                  {isDone ? <Check className="h-3.5 w-3.5" /> : toPersianDigits(s.step)}
                </span>
                <span className="line-clamp-1 text-[11px] font-semibold sm:text-xs">
                  {s.short}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Wizard Form Container */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-5 rounded-3xl border border-[#DCEBDD] bg-white p-4 shadow-[0_2px_10px_rgba(23,77,53,0.03)] sm:p-7"
      >
        {formError && (
          <div
            role="alert"
            className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800 sm:text-sm"
          >
            {formError}
          </div>
        )}

        {/* STEP 1: Help Type & Category */}
        {step === 1 && (
          <div className="space-y-5 animate-fade-up">
            <div>
              <h2 className="text-base font-bold text-[#174D35]">۱. نوع کمک مورد نیاز را انتخاب کنید</h2>
              <p className="mt-1 text-xs font-normal text-[#556455]">
                مشخص کنید کمک موردنظر چه شکلی دارد تا داوطلبان مرتبط سریع‌تر مطلع شوند.
              </p>

              <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                {HELP_TYPES.map((t) => {
                  const selected = helpType === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setHelpType(t.id)}
                      className={`flex items-start justify-between gap-3 rounded-2xl border p-3.5 text-right transition ${
                        selected
                          ? 'border-[#174D35] bg-[#DCEBDD]/55 ring-1 ring-[#174D35]/20'
                          : 'border-[#DCEBDD] bg-[#F6F7F2]/60 hover:border-[#78B98A]'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-semibold text-[#174D35]">{t.label}</div>
                        <div className="mt-0.5 text-xs font-normal text-[#505E50]">{t.description}</div>
                      </div>
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                          selected
                            ? 'border-[#174D35] bg-[#174D35] text-white'
                            : 'border-[#78B98A]/60 bg-white'
                        }`}
                      >
                        {selected && <Check className="h-3 w-3" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h2 className="text-base font-bold text-[#174D35]">۲. دسته‌بندی درخواست</h2>
              <p className="mt-1 text-xs font-normal text-[#556455]">
                نزدیک‌ترین موضوع به نیاز خودتان را انتخاب کنید.
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {HELP_CATEGORIES.map((cat) => {
                  const selected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`flex flex-col items-center justify-center gap-2 rounded-2xl border px-2.5 py-3.5 text-center transition ${
                        selected
                          ? 'border-[#174D35] bg-[#174D35] text-white shadow-xs'
                          : 'border-[#DCEBDD] bg-[#F6F7F2]/60 text-[#202820] hover:border-[#78B98A]'
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                          selected ? 'bg-white/15 text-[#E9B949]' : 'bg-[#DCEBDD]/70 text-[#174D35]'
                        }`}
                      >
                        <CategoryIcon category={cat.id} className="h-[18px] w-[18px]" />
                      </span>
                      <span className="text-xs font-semibold">{cat.shortLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Title, Description, Smart Assistant & Optional Image */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-up">
            <div>
              <label htmlFor="req-title" className="mb-1 block text-sm font-semibold text-[#202820]">
                عنوان کوتاه و روشن *
              </label>
              <p className="mb-2 text-xs font-light text-[#556455]">
                مثل: «همراهی برای خرید روزانه سالمند» یا «تدریس ریاضی پایه هشتم»
              </p>
              <input
                id="req-title"
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (fieldErrors.title) setFieldErrors((p) => ({ ...p, title: '' }));
                }}
                placeholder="نیاز خود را در یک جمله خلاصه بنویسید..."
                className="min-h-[46px] w-full rounded-2xl border border-[#DCEBDD] bg-[#F6F7F2]/60 px-4 py-3 text-[15px] font-normal outline-none focus:border-[#26734B] focus:bg-white sm:text-sm"
                required
              />
              {fieldErrors.title && (
                <p className="mt-1.5 text-xs font-medium text-rose-600">{fieldErrors.title}</p>
              )}
            </div>

            <div>
              <label htmlFor="req-desc" className="mb-1 block text-sm font-semibold text-[#202820]">
                توضیحات کامل *
              </label>
              <p className="mb-2 text-xs font-light text-[#556455]">
                توضیح دهید چه کمکی لازم است و چه مهارت یا ابزاری برای انجام آن مناسب‌تر است.
              </p>
              <textarea
                id="req-desc"
                rows={4}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (fieldErrors.description) setFieldErrors((p) => ({ ...p, description: '' }));
                }}
                placeholder="شرح کامل و محترمانه نیاز شما..."
                className="w-full rounded-2xl border border-[#DCEBDD] bg-[#F6F7F2]/60 px-4 py-3 text-[15px] font-normal leading-7 outline-none focus:border-[#26734B] focus:bg-white sm:text-sm"
                required
              />
              {fieldErrors.description && (
                <p className="mt-1.5 text-xs font-medium text-rose-600">{fieldErrors.description}</p>
              )}
            </div>

            <SmartAssistantPanel
              title={title}
              description={description}
              category={category}
              helpType={helpType}
              area={area}
              neededAt={neededAt}
              onApplyCategory={(cat) => setCategory(cat)}
              onApplyHelpType={(type) => setHelpType(type)}
              onApplyTitle={(nextTitle) => setTitle(nextTitle)}
            />

            {/* Optional Image Upload */}
            <div className="space-y-2 pt-1">
              <span className="block text-sm font-semibold text-[#202820]">
                تصویر توضیحی (اختیاری)
              </span>
              {displayedPreview ? (
                <div className="relative overflow-hidden rounded-2xl border border-[#DCEBDD]">
                  <ProtectedImage
                    src={displayedPreview}
                    alt="پیش‌نمایش تصویر درخواست"
                    wrapperClassName="relative block w-full overflow-hidden"
                    className="max-h-56 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                      setRemoveImage(true);
                    }}
                    className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-xl bg-black/65 px-3 py-1.5 text-xs font-bold text-white hover:bg-black/80"
                  >
                    <X className="h-3.5 w-3.5" />
                    حذف تصویر
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="req-image"
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#78B98A] bg-[#F6F7F2]/70 p-5 text-center transition hover:bg-[#DCEBDD]/30"
                >
                  <ImagePlus className="h-6 w-6 text-[#26734B]" />
                  <span className="text-xs font-semibold text-[#174D35]">
                    انتخاب تصویر (JPG، PNG یا WebP تا ۳ مگابایت)
                  </span>
                  <input
                    id="req-image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: Time & Approximate Location */}
        {step === 3 && (
          <div className="space-y-5 animate-fade-up">
            <div className="grid gap-3.5 sm:grid-cols-2 sm:gap-4">
              <div>
                <label htmlFor="req-prov" className="mb-1.5 block text-sm font-semibold text-[#202820]">
                  استان *
                </label>
                <select
                  id="req-prov"
                  value={province}
                  onChange={(e) => {
                    const nextProv = e.target.value;
                    setProvince(nextProv);
                    setCity((IRAN_PROVINCES_CITIES[nextProv] ?? ['سایر شهرها'])[0]);
                  }}
                  className="min-h-[46px] w-full rounded-2xl border border-[#DCEBDD] bg-[#F6F7F2]/60 px-3.5 py-2.5 text-[15px] font-normal outline-none focus:border-[#26734B] focus:bg-white sm:text-sm"
                >
                  {PROVINCES_LIST.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="req-city" className="mb-1.5 block text-sm font-semibold text-[#202820]">
                  شهر *
                </label>
                <select
                  id="req-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="min-h-[46px] w-full rounded-2xl border border-[#DCEBDD] bg-[#F6F7F2]/60 px-3.5 py-2.5 text-[15px] font-normal outline-none focus:border-[#26734B] focus:bg-white sm:text-sm"
                >
                  {citiesForProvince.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="req-area" className="mb-1 block text-sm font-semibold text-[#202820]">
                محله یا محدوده مکانی تقریبی *
              </label>
              <input
                id="req-area"
                type="text"
                value={area}
                onChange={(e) => {
                  setArea(e.target.value);
                  if (fieldErrors.area) setFieldErrors((p) => ({ ...p, area: '' }));
                }}
                placeholder="مثلاً: محدوده خیابان طالقانی یا محله توحید"
                className="min-h-[46px] w-full rounded-2xl border border-[#DCEBDD] bg-[#F6F7F2]/60 px-4 py-3 text-[15px] font-normal outline-none focus:border-[#26734B] focus:bg-white sm:text-sm"
                required
              />
              {fieldErrors.area && (
                <p className="mt-1.5 text-xs font-medium text-rose-600">{fieldErrors.area}</p>
              )}
              <div className="mt-2 flex items-start gap-2 rounded-2xl bg-[#DCEBDD]/35 px-3 py-2.5 text-[11px] font-normal leading-5 text-[#174D35]">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#26734B]" />
                <span>
                  برای حفظ امنیت و حریم خصوصی، پلاک، نشانی دقیق منزل یا شماره تلفن را در فرم عمومی ننویسید.
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              <label htmlFor="req-needed" className="block text-sm font-semibold text-[#202820]">
                زمان موردنیاز *
              </label>
              <div className="flex flex-wrap gap-2">
                {NEEDED_AT_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setNeededAt(preset);
                      if (fieldErrors.needed_at) setFieldErrors((p) => ({ ...p, needed_at: '' }));
                    }}
                    className={`min-h-[38px] rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition ${
                      neededAt === preset
                        ? 'border-[#174D35] bg-[#174D35] text-white'
                        : 'border-[#DCEBDD] bg-[#F6F7F2] text-[#202820] hover:border-[#78B98A]'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <input
                id="req-needed"
                type="text"
                value={neededAt}
                onChange={(e) => {
                  setNeededAt(e.target.value);
                  if (fieldErrors.needed_at) setFieldErrors((p) => ({ ...p, needed_at: '' }));
                }}
                placeholder="یا زمان دقیق‌تر را بنویسید..."
                className="min-h-[46px] w-full rounded-2xl border border-[#DCEBDD] bg-[#F6F7F2]/60 px-4 py-2.5 text-[15px] font-normal outline-none focus:border-[#26734B] focus:bg-white sm:text-sm"
                required
              />
              {fieldErrors.needed_at && (
                <p className="mt-1 text-xs font-medium text-rose-600">{fieldErrors.needed_at}</p>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: Review & Submit */}
        {step === 4 && (
          <div className="space-y-4 animate-fade-up">
            <div>
              <h2 className="text-base font-bold text-[#174D35]">مرور نهایی اطلاعات درخواست</h2>
              <p className="mt-0.5 text-xs font-normal text-[#556455]">
                پیش از انتشار، اطلاعات را مرور کنید. با زدن «ویرایش» می‌توانید به هر مرحله برگردید.
              </p>
            </div>

            <div className="space-y-3 rounded-2xl border border-[#DCEBDD] bg-[#F6F7F2]/75 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#DCEBDD]/70 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <CategoryBadge category={category} />
                  <span className="rounded-full border border-[#DCEBDD] bg-white px-2.5 py-1 text-xs font-medium text-[#174D35]">
                    {HELP_TYPE_MAP[helpType]?.label}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#26734B] hover:underline"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  ویرایش نوع
                </button>
              </div>

              <div className="space-y-1.5 border-b border-[#DCEBDD]/70 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-semibold text-[#202820]">{title}</h3>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#26734B] hover:underline"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    ویرایش متن
                  </button>
                </div>
                <p className="whitespace-pre-line text-sm font-normal leading-7 text-[#465346]">
                  {description}
                </p>
                {displayedPreview && (
                  <div className="pt-2">
                    <ProtectedImage
                      src={displayedPreview}
                      alt="تصویر پیوست درخواست"
                      wrapperClassName="relative block max-h-48 w-full overflow-hidden rounded-2xl border border-[#DCEBDD]"
                      className="h-44 w-full object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-start justify-between gap-3 pt-0.5 text-xs text-[#344634]">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 font-medium">
                    <MapPin className="h-4 w-4 text-[#26734B]" />
                    <span>
                      {province}، {city} — {area}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <Clock className="h-4 w-4 text-[#26734B]" />
                    <span>زمان موردنیاز: {neededAt}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#26734B] hover:underline"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  ویرایش مکان و زمان
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-[#DCEBDD]/40 px-3.5 py-2.5 text-xs font-normal text-[#174D35]">
              دسته‌بندی انتخاب‌شده: <strong className="font-semibold">{CATEGORY_MAP[category].label}</strong>
            </div>
          </div>
        )}

        {/* Wizard Navigation Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-[#F6F7F2] pt-4">
          {step > 1 ? (
            <button
              type="button"
              onClick={goPrevStep}
              disabled={submitting}
              className="inline-flex min-h-[46px] items-center gap-1.5 rounded-2xl border border-[#DCEBDD] bg-[#F6F7F2] px-4 py-2.5 text-sm font-semibold text-[#202820] hover:border-[#78B98A] disabled:opacity-60"
            >
              <ArrowRight className="h-4 w-4" />
              <span>مرحله قبل</span>
            </button>
          ) : (
            <span className="text-xs font-light text-[#667466]">
              مرحله {toPersianDigits(step)} از {toPersianDigits(4)}
            </span>
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={goNextStep}
              className="inline-flex min-h-[46px] items-center gap-2 rounded-2xl bg-[#174D35] px-6 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-[#26734B]"
            >
              <span>ادامه</span>
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl bg-[#174D35] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#26734B] disabled:opacity-60 sm:flex-initial"
            >
              {mode === 'create' ? <Send className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              <span>
                {submitting
                  ? 'در حال ثبت...'
                  : mode === 'create'
                    ? 'ثبت نهایی درخواست کمک'
                    : 'ذخیره تغییرات'}
              </span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
