const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toPersianDigits(input: string | number): string {
  return String(input).replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)] ?? digit);
}

export function formatRelativeTimeFa(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'نامشخص';

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHour = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return 'هم‌اکنون';
  if (diffMin < 60) return `${toPersianDigits(diffMin)} دقیقه پیش`;
  if (diffHour < 24) return `${toPersianDigits(diffHour)} ساعت پیش`;
  if (diffDay === 1) return 'دیروز';
  if (diffDay < 7) return `${toPersianDigits(diffDay)} روز پیش`;
  if (diffDay < 30) return `${toPersianDigits(Math.floor(diffDay / 7))} هفته پیش`;

  return formatDateFa(isoString);
}

export function formatDateFa(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'نامشخص';
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch {
    return toPersianDigits(date.toLocaleDateString());
  }
}

export function getInitials(name: string | null | undefined): string {
  const clean = (name ?? '').trim();
  if (!clean) return 'د';
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`;
  }
  return clean.slice(0, 2);
}
