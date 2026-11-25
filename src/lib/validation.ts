export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB
export const MAX_REQUEST_IMAGE_BYTES = 3 * 1024 * 1024; // 3 MB

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return 'لطفاً ایمیل خود را وارد کنید.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return 'فرمت ایمیل واردشده معتبر نیست.';
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'لطفاً رمز عبور را وارد کنید.';
  if (password.length < 6) return 'رمز عبور باید حداقل ۶ کاراکتر باشد.';
  return null;
}

export function validateDisplayName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 2) return 'نام نمایشی باید حداقل ۲ کاراکتر باشد.';
  if (trimmed.length > 80) return 'نام نمایشی نباید بیش از ۸۰ کاراکتر باشد.';
  return null;
}

export function validateRequestFields(fields: {
  title: string;
  description: string;
  category: string;
  help_type: string;
  province: string;
  city: string;
  area: string;
  needed_at: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};

  const title = fields.title.trim();
  if (title.length < 5) {
    errors.title = 'عنوان درخواست باید حداقل ۵ کاراکتر و گویا باشد.';
  } else if (title.length > 140) {
    errors.title = 'عنوان درخواست نباید بیش از ۱۴۰ کاراکتر باشد.';
  }

  const description = fields.description.trim();
  if (description.length < 15) {
    errors.description = 'لطفاً توضیحات درخواست را کامل‌تر بنویسید (حداقل ۱۵ کاراکتر).';
  } else if (description.length > 3000) {
    errors.description = 'توضیحات نباید بیش از ۳۰۰۰ کاراکتر باشد.';
  }

  if (!fields.category) {
    errors.category = 'انتخاب دسته‌بندی الزامی است.';
  }

  if (!fields.help_type) {
    errors.help_type = 'انتخاب نوع کمک الزامی است.';
  }

  if (!fields.province.trim()) {
    errors.province = 'استان را انتخاب کنید.';
  }

  if (fields.city.trim().length < 2) {
    errors.city = 'نام شهر را وارد یا انتخاب کنید.';
  }

  const area = fields.area.trim();
  if (area.length < 2) {
    errors.area = 'محدوده یا محله تقریبی را مشخص کنید.';
  } else if (area.length > 120) {
    errors.area = 'نام محله نباید بیش از ۱۲۰ کاراکتر باشد.';
  }

  if (fields.needed_at.trim().length < 2) {
    errors.needed_at = 'زمان تقریبی موردنیاز را مشخص کنید.';
  }

  return errors;
}

export function validateImageFile(file: File, maxBytes: number): string | null {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
    return 'فقط تصاویر با فرمت JPG، PNG یا WebP مجاز هستند.';
  }
  if (file.size > maxBytes) {
    const mb = Math.round(maxBytes / (1024 * 1024));
    return `حجم تصویر نباید بیشتر از ${mb} مگابایت باشد.`;
  }
  return null;
}

export function detectSensitivePrivacyText(text: string): {
  hasPhoneNumber: boolean;
  hasExactAddressHint: boolean;
} {
  const normalized = text.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
  const hasPhoneNumber = /(?:09\d{9}|0\d{2,3}[-\s]?\d{7,8}|\+98\s?9\d{9})/.test(normalized);
  const hasExactAddressHint = /(پلاک\s*\d+|واحد\s*\d+|طبقه\s*\d+|کد\s*پستی\s*\d{5,10})/.test(normalized);

  return { hasPhoneNumber, hasExactAddressHint };
}
