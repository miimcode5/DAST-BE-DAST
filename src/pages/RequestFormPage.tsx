import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { ArrowRight, ImagePlus, Save, Send, ShieldCheck, X } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { LoadingState } from '../components/LoadingState';
import { ProtectedImage } from '../components/ProtectedImage';
import { SmartAssistantPanel } from '../components/SmartAssistantPanel';
import { HELP_CATEGORIES, HELP_TYPES } from '../constants/categories';
import {
  DEFAULT_PROVINCE,
  IRAN_PROVINCES_CITIES,
  NEEDED_AT_PRESETS,
  PROVINCES_LIST,
} from '../constants/locations';
import { useAuth } from '../contexts/AuthContext';
import { usePwa } from '../contexts/PwaContext';
import { useToast } from '../contexts/ToastContext';
import { MAX_REQUEST_IMAGE_BYTES, validateImageFile, validateRequestFields } from '../lib/validation';
import { createHelpRequest, getRequestById, updateHelpRequest } from '../services/requestsService';
import type { HelpCategory, HelpType } from '../types/database';

export function RequestFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const { refreshPendingCount } = usePwa();
  const { showToast } = useToast();
  const navigate = useNavigate();

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
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
          showToast(
            'درخواست شما در حالت آفلاین ذخیره شد و در صف «در انتظار همگام‌سازی» قرار گرفت. به‌محض اتصال اینترنت ارسال می‌شود.',
            'warning'
          );
          navigate('/my-activities', { replace: true });
        } else {
          showToast('درخواست کمک شما با موفقیت ثبت و در فهرست عمومی منتشر شد.', 'success');
          navigate(`/requests/${result.request.id}`, { replace: true });
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
        navigate(`/requests/${updated.id}`, { replace: true });
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'ثبت درخواست با خطا مواجه شد.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingExisting) {
    return <LoadingState label="در حال بارگذاری اطلاعات درخواست..." />;
  }

  const displayedPreview = removeImage ? null : imagePreview || existingImageUrl;

  return (
    <div className="mx-auto max-w-2xl space-y-5 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-[#174D35]">
            {mode === 'create' ? 'ثبت درخواست کمک جدید' : 'ویرایش درخواست کمک'}
          </h1>
          <p className="mt-1 text-sm text-[#505E50]">
            نیاز خود را شفاف و محترمانه بنویسید تا داوطلب مناسب سریع‌تر پیدا شود.
          </p>
        </div>
        <Link
          to={mode === 'edit' && id ? `/requests/${id}` : '/requests'}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCEBDD] bg-white px-3.5 py-2 text-xs font-bold text-[#174D35]"
        >
          <ArrowRight className="h-4 w-4" />
          بازگشت
        </Link>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-4 rounded-3xl border border-[#DCEBDD] bg-white p-4 shadow-xs sm:space-y-5 sm:p-7"
      >
        {formError && (
          <div
            role="alert"
            className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800"
          >
            {formError}
          </div>
        )}

        <div>
          <label htmlFor="req-title" className="mb-1.5 block text-sm font-semibold text-[#202820]">
            عنوان درخواست *
          </label>
          <input
            id="req-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثلاً: نیاز به همراهی برای خرید روزانه سالمند یا تدریس ریاضی پایه هشتم"
            className="min-h-[44px] w-full rounded-2xl border border-[#DCEBDD] bg-[#F6F7F2]/60 px-4 py-3 text-[15px] outline-none focus:border-[#26734B] focus:bg-white sm:text-sm"
            required
          />
          {fieldErrors.title && (
            <p className="mt-1 text-xs font-medium text-rose-600">{fieldErrors.title}</p>
          )}
        </div>

        <div>
          <label htmlFor="req-desc" className="mb-1.5 block text-sm font-semibold text-[#202820]">
            توضیحات کامل *
          </label>
          <textarea
            id="req-desc"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="شرح دهید چه کمکی نیاز است، در چه شرایطی انجام می‌شود و چه مهارت یا وسیله‌ای لازم دارد..."
            className="w-full rounded-2xl border border-[#DCEBDD] bg-[#F6F7F2]/60 px-4 py-3 text-[15px] leading-7 outline-none focus:border-[#26734B] focus:bg-white sm:text-sm"
            required
          />
          {fieldErrors.description && (
            <p className="mt-1 text-xs font-medium text-rose-600">{fieldErrors.description}</p>
          )}
        </div>

        {/* Local Rule-Based Smart Assistant */}
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

        <div className="grid gap-3.5 sm:grid-cols-2 sm:gap-4">
          <div>
            <label htmlFor="req-cat" className="mb-1.5 block text-sm font-semibold text-[#202820]">
              دسته‌بندی *
            </label>
            <select
              id="req-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value as HelpCategory)}
              className="min-h-[44px] w-full rounded-2xl border border-[#DCEBDD] bg-[#F6F7F2]/60 px-3.5 py-2.5 text-[15px] outline-none focus:border-[#26734B] focus:bg-white sm:text-sm"
            >
              {HELP_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="req-type" className="mb-1.5 block text-sm font-semibold text-[#202820]">
              نوع کمک *
            </label>
            <select
              id="req-type"
              value={helpType}
              onChange={(e) => setHelpType(e.target.value as HelpType)}
              className="min-h-[44px] w-full rounded-2xl border border-[#DCEBDD] bg-[#F6F7F2]/60 px-3.5 py-2.5 text-[15px] outline-none focus:border-[#26734B] focus:bg-white sm:text-sm"
            >
              {HELP_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

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
              className="min-h-[44px] w-full rounded-2xl border border-[#DCEBDD] bg-[#F6F7F2]/60 px-3.5 py-2.5 text-[15px] outline-none focus:border-[#26734B] focus:bg-white sm:text-sm"
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
              className="min-h-[44px] w-full rounded-2xl border border-[#DCEBDD] bg-[#F6F7F2]/60 px-3.5 py-2.5 text-[15px] outline-none focus:border-[#26734B] focus:bg-white sm:text-sm"
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
          <label htmlFor="req-area" className="mb-1.5 block text-sm font-semibold text-[#202820]">
            محله یا محدوده مکانی تقریبی *
          </label>
          <input
            id="req-area"
            type="text"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="مثلاً: محدوده خیابان طالقانی یا محله توحید"
            className="min-h-[44px] w-full rounded-2xl border border-[#DCEBDD] bg-[#F6F7F2]/60 px-4 py-3 text-[15px] outline-none focus:border-[#26734B] focus:bg-white sm:text-sm"
            required
          />
          {fieldErrors.area && (
            <p className="mt-1 text-xs font-medium text-rose-600">{fieldErrors.area}</p>
          )}
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#556455]">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#26734B]" />
            <span>برای حفظ امنیت خود، پلاک، نشانی دقیق منزل و شماره تلفن را در فرم عمومی ننویسید.</span>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="req-needed" className="block text-sm font-semibold text-[#202820]">
            زمان موردنیاز *
          </label>
          <div className="flex flex-wrap gap-1.5">
            {NEEDED_AT_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setNeededAt(preset)}
                className={`min-h-[36px] rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
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
            onChange={(e) => setNeededAt(e.target.value)}
            placeholder="یا زمان دقیق‌تر بنویسید..."
            className="min-h-[44px] w-full rounded-2xl border border-[#DCEBDD] bg-[#F6F7F2]/60 px-4 py-2.5 text-[15px] outline-none focus:border-[#26734B] focus:bg-white sm:text-sm"
            required
          />
          {fieldErrors.needed_at && (
            <p className="mt-1 text-xs font-medium text-rose-600">{fieldErrors.needed_at}</p>
          )}
        </div>

        {/* Optional Image Upload */}
        <div className="space-y-2">
          <span className="block text-sm font-semibold text-[#202820]">
            تصویر توضیحی (اختیاری)
          </span>
          {displayedPreview ? (
            <div className="relative overflow-hidden rounded-2xl border border-[#DCEBDD]">
              <ProtectedImage
                src={displayedPreview}
                alt="پیش‌نمایش تصویر درخواست"
                wrapperClassName="relative block w-full overflow-hidden"
                className="max-h-60 w-full object-cover"
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
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#78B98A] bg-[#F6F7F2]/70 p-6 text-center transition hover:bg-[#DCEBDD]/30"
            >
              <ImagePlus className="h-7 w-7 text-[#26734B]" />
              <span className="text-xs font-bold text-[#174D35]">
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

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#174D35] py-3.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#26734B] disabled:opacity-60"
        >
          {mode === 'create' ? <Send className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {submitting
            ? 'در حال ثبت...'
            : mode === 'create'
              ? 'انتشار درخواست کمک'
              : 'ذخیره تغییرات درخواست'}
        </button>
      </form>
    </div>
  );
}
