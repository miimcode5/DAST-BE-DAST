import { useState } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Code2,
  Database,
  HandHelping,
  HeartHandshake,
  Layers,
  MapPin,
  Mic,
  Pause,
  Play,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { ProtectedImage } from '../components/ProtectedImage';
import { getInitials } from '../lib/formatters';

interface RassaMember {
  id: string;
  orderFa: string;
  name: string;
  shortName: string;
  role: string;
  shortRole: string;
  photoUrl: string;
  icon: LucideIcon;
  highlights: string[];
  accentTone: 'gold' | 'green';
}

const RASSA_TEAM_MEMBERS: RassaMember[] = [
  {
    id: 'mojtaba',
    orderFa: '۰۱',
    name: 'مجتبی میدانی',
    shortName: 'مجتبی',
    role: 'سرپرست تیم و فرانت‌اندکار',
    shortRole: 'سرپرست و فرانت‌اند',
    photoUrl: `${import.meta.env.BASE_URL}member-photos/mojtaba.jpg`,
    icon: Code2,
    highlights: ['هدایت تیم', 'معماری رابط کاربری', 'React & PWA'],
    accentTone: 'gold',
  },
  {
    id: 'mohammad',
    orderFa: '۰۲',
    name: 'محمد صحرانورد',
    shortName: 'محمد',
    role: 'توسعه‌دهنده موبایل و ادیتور',
    shortRole: 'موبایل و ادیتور',
    photoUrl: `${import.meta.env.BASE_URL}member-photos/mohammad.jpg`,
    icon: Smartphone,
    highlights: ['تجربه موبایل', 'تدوین و موشن', 'نسخه اندروید'],
    accentTone: 'green',
  },
  {
    id: 'abolfazl',
    orderFa: '۰۳',
    name: 'سید ابوالفضل میرزازاده',
    shortName: 'ابوالفضل',
    role: 'بک‌اندکار و پشتیبان‌گیری',
    shortRole: 'بک‌اند و امنیت',
    photoUrl: `${import.meta.env.BASE_URL}member-photos/abolfazl.jpg`,
    icon: Database,
    highlights: ['پایگاه‌داده و RLS', 'امنیت داده‌ها', 'پشتیبان‌گیری'],
    accentTone: 'gold',
  },
  {
    id: 'alireza',
    orderFa: '۰۴',
    name: 'علیرضا حاجی‌زاده',
    shortName: 'علیرضا',
    role: 'مسئول محتوا و ارائه',
    shortRole: 'محتوا و ارائه',
    photoUrl: `${import.meta.env.BASE_URL}member-photos/alireza.jpg`,
    icon: Mic,
    highlights: ['تولید محتوا', 'روایت محصول', 'ارائه رویداد'],
    accentTone: 'green',
  },
];

function MemberAvatarFallback({ name, sizeClass = 'text-2xl' }: { name: string; sizeClass?: string }) {
  return (
    <div className={`flex h-full w-full items-center justify-center bg-brand-primary font-extrabold text-white ${sizeClass}`}>
      {getInitials(name)}
    </div>
  );
}

function MemberPortraitCard({
  member,
  index,
  isSelected,
  onSelect,
  decorative = false,
}: {
  member: RassaMember;
  index: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
  decorative?: boolean;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const Icon = member.icon;
  const floatClass = index % 2 === 0 ? 'rassa-card-float-even' : 'rassa-card-float-odd';

  return (
    <button
      type="button"
      dir="rtl"
      onClick={() => onSelect(member.id)}
      tabIndex={decorative ? -1 : 0}
      aria-pressed={decorative ? undefined : isSelected}
      aria-label={`نمایش مشخصات ${member.name} — ${member.role}`}
      className={`group/card relative w-[196px] shrink-0 cursor-pointer overflow-hidden rounded-2xl border bg-white text-right transition-all duration-300 hover:-translate-y-1.5 sm:w-[222px] ${floatClass} ${
        isSelected
          ? 'border-brand-gold shadow-md ring-2 ring-brand-gold/45'
          : 'border-brand-surface shadow-xs hover:border-brand-soft hover:shadow-md'
      }`}
    >
      {/* Top Graphical Header Bar */}
      <div className="relative flex items-center justify-between border-b border-brand-surface/80 bg-brand-bg/90 px-3 py-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-brand-primary">
          <span
            className={`h-2 w-2 rounded-full ${
              isSelected ? 'bg-brand-gold animate-pulse' : 'bg-brand-soft'
            }`}
          />
          <span>عضو {member.orderFa}</span>
        </span>

        {/* Rotating Orbital Badge Icon */}
        <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-surface/70 text-brand-primary transition-transform duration-300 group-hover/card:scale-110">
          <span
            aria-hidden="true"
            className={`rassa-halo-spin pointer-events-none absolute -inset-0.5 rounded-full border border-dashed ${
              member.accentTone === 'gold' ? 'border-brand-gold/80' : 'border-brand-green/60'
            }`}
          />
          <Icon className="relative h-3.5 w-3.5" />
        </span>
      </div>

      {/* Portrait Frame with Animated Sheen & Corner Brackets */}
      <div className="p-2.5 pb-2">
        <div className="rassa-sheen relative aspect-square w-full overflow-hidden rounded-xl border border-brand-surface bg-brand-primary/10">
          {!imgFailed ? (
            <ProtectedImage
              src={member.photoUrl}
              alt={member.name}
              loading="eager"
              decoding="async"
              onError={() => setImgFailed(true)}
              wrapperClassName="relative block h-full w-full overflow-hidden"
              className="h-full w-full object-cover object-top transition-transform duration-500 ease-out group-hover/card:scale-[1.06]"
            />
          ) : (
            <MemberAvatarFallback name={member.name} />
          )}

          {/* Animated Decorative Frame Corner Brackets */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-2 right-2 z-10 h-3.5 w-3.5 rounded-tr-md border-t-2 border-r-2 border-brand-gold/90 opacity-75 transition-all duration-300 group-hover/card:top-1.5 group-hover/card:right-1.5 group-hover/card:opacity-100"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-2 left-2 z-10 h-3.5 w-3.5 rounded-tl-md border-t-2 border-l-2 border-white/85 opacity-60 transition-all duration-300 group-hover/card:top-1.5 group-hover/card:left-1.5 group-hover/card:opacity-100"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-2 right-2 z-10 h-3.5 w-3.5 rounded-br-md border-r-2 border-b-2 border-white/85 opacity-60 transition-all duration-300 group-hover/card:bottom-1.5 group-hover/card:right-1.5 group-hover/card:opacity-100"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-2 left-2 z-10 h-3.5 w-3.5 rounded-bl-md border-b-2 border-l-2 border-brand-gold/90 opacity-75 transition-all duration-300 group-hover/card:bottom-1.5 group-hover/card:left-1.5 group-hover/card:opacity-100"
          />

          {/* Floating Short Role Pill Inside Frame */}
          <span className="pointer-events-none absolute right-2 bottom-2 z-10 inline-flex items-center gap-1 rounded-lg border border-white/25 bg-brand-primary/85 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
            <Sparkles className="h-2.5 w-2.5 text-brand-gold" />
            {member.shortRole}
          </span>
        </div>
      </div>

      {/* Bottom Typography & Equalizer Strip */}
      <div className="rassa-dot-grid relative flex flex-col items-center justify-center gap-1 border-t border-brand-surface/80 bg-white px-3 py-3 text-center">
        <h3 className="text-sm font-extrabold leading-5 text-brand-primary sm:text-[15px]">
          {member.name}
        </h3>
        <p className="text-[11px] font-semibold leading-4 text-brand-green sm:text-xs">
          {member.role}
        </p>

        {/* Live Animated Graphical Bars */}
        <div
          aria-hidden="true"
          className="mt-1.5 flex h-3 items-end justify-center gap-1"
        >
          <span
            className="rassa-eq-bar h-2 w-1 rounded-full bg-brand-soft"
            style={{ animationDelay: '0ms' }}
          />
          <span
            className="rassa-eq-bar h-3 w-1 rounded-full bg-brand-green"
            style={{ animationDelay: '180ms' }}
          />
          <span
            className="rassa-eq-bar h-2.5 w-1 rounded-full bg-brand-gold"
            style={{ animationDelay: '340ms' }}
          />
          <span
            className="rassa-eq-bar h-3 w-1 rounded-full bg-brand-primary"
            style={{ animationDelay: '520ms' }}
          />
        </div>
      </div>
    </button>
  );
}

function SpotlightPanel({
  member,
  onPrev,
  onNext,
}: {
  member: RassaMember;
  onPrev: () => void;
  onNext: () => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const Icon = member.icon;

  return (
    <div className="rassa-spotlight-enter relative overflow-hidden rounded-2xl border border-brand-surface bg-white p-4 shadow-xs sm:p-5">
      {/* Subtle Decorative Vector Network in Spotlight Corner */}
      <svg
        aria-hidden="true"
        viewBox="0 0 180 120"
        className="pointer-events-none absolute top-0 left-0 h-28 w-44 text-brand-surface/80"
        fill="none"
      >
        <path
          d="M12 18 L68 42 L118 14 L164 58"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        <circle cx="12" cy="18" r="3.5" fill="currentColor" />
        <circle cx="68" cy="42" r="4.5" fill="var(--color-soft-green)" opacity="0.45" />
        <circle cx="118" cy="14" r="3" fill="var(--color-gold)" opacity="0.6" />
        <circle cx="164" cy="58" r="3.5" fill="currentColor" />
      </svg>

      {/* Watermark Member Number */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-1 left-4 select-none text-5xl font-black text-brand-surface/65 sm:text-6xl"
      >
        {member.orderFa}
      </span>

      <div className="relative z-10 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
        {/* Double Orbital Halo Portrait */}
        <div className="relative flex h-28 w-28 shrink-0 items-center justify-center sm:h-32 sm:w-32">
          <span
            aria-hidden="true"
            className="rassa-halo-spin pointer-events-none absolute inset-0 rounded-full border-2 border-dashed border-brand-gold/80"
          />
          <span
            aria-hidden="true"
            className="rassa-halo-spin-reverse pointer-events-none absolute inset-1.5 rounded-full border border-brand-soft/80"
          />
          <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-white bg-brand-surface shadow-sm sm:h-28 sm:w-28">
            {!imgFailed ? (
              <ProtectedImage
                src={member.photoUrl}
                alt={member.name}
                loading="eager"
                decoding="async"
                onError={() => setImgFailed(true)}
                wrapperClassName="relative block h-full w-full overflow-hidden rounded-full"
                className="h-full w-full object-cover object-top"
              />
            ) : (
              <MemberAvatarFallback name={member.name} sizeClass="text-xl" />
            )}
          </div>
          <span className="absolute -bottom-0.5 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1 rounded-full border border-brand-surface bg-brand-primary px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow-xs">
            <Icon className="h-3 w-3 text-brand-gold" />
            <span>{member.orderFa}</span>
          </span>
        </div>

        {/* Member Info & Role Highlights */}
        <div className="flex-1 space-y-2.5 text-center sm:text-right">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-gold/45 bg-brand-gold/15 px-3 py-0.5 text-[11px] font-extrabold text-brand-primary">
              <Sparkles className="h-3 w-3 text-brand-gold" />
              معرفی عضو منتخب گروه رَسا
            </span>

            {/* Next / Prev Controls */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onPrev}
                aria-label="عضو قبلی"
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-brand-surface bg-brand-bg text-brand-primary transition-colors hover:border-brand-soft hover:bg-brand-surface/60"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onNext}
                aria-label="عضو بعدی"
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-brand-surface bg-brand-bg text-brand-primary transition-colors hover:border-brand-soft hover:bg-brand-surface/60"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-black text-brand-primary sm:text-xl">
              {member.name}
            </h3>
            <p className="text-xs font-bold text-brand-green sm:text-sm">
              {member.role}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-0.5 sm:justify-start">
            {member.highlights.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-xl border border-brand-surface bg-brand-bg px-2.5 py-1 text-[11px] font-bold text-brand-primary"
              >
                <Layers className="h-3 w-3 text-brand-green" />
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AboutPage() {
  const [selectedId, setSelectedId] = useState<string>(RASSA_TEAM_MEMBERS[0].id);
  const [isPaused, setIsPaused] = useState(false);

  const selectedIndex = Math.max(
    0,
    RASSA_TEAM_MEMBERS.findIndex((m) => m.id === selectedId)
  );
  const selectedMember = RASSA_TEAM_MEMBERS[selectedIndex];

  const handlePrev = () => {
    const prevIdx =
      (selectedIndex - 1 + RASSA_TEAM_MEMBERS.length) % RASSA_TEAM_MEMBERS.length;
    setSelectedId(RASSA_TEAM_MEMBERS[prevIdx].id);
  };

  const handleNext = () => {
    const nextIdx = (selectedIndex + 1) % RASSA_TEAM_MEMBERS.length;
    setSelectedId(RASSA_TEAM_MEMBERS[nextIdx].id);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-up">
      {/* Main About & RASSA Team Showcase */}
      <section className="overflow-hidden rounded-2xl border border-brand-surface bg-white">
        {/* Top Intro Header */}
        <div className="space-y-4 p-5 sm:p-8 sm:pb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <BrandLogo />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-surface bg-brand-surface/55 px-3 py-1 text-[11px] font-bold text-brand-primary sm:text-xs">
              <Sparkles className="h-3.5 w-3.5 text-brand-gold" />
              گروه رَسا · رویداد هشتم
            </span>
          </div>

          <div className="space-y-2.5 pt-1">
            <h1 className="text-xl font-extrabold text-brand-primary sm:text-2xl">
              درباره ما
            </h1>
            <p className="rounded-xl border border-brand-surface bg-brand-bg px-4 py-3.5 text-sm leading-8 text-brand-text sm:px-5 sm:text-[15px]">
              دست‌به‌دست، حاصل تلاش <strong className="font-extrabold text-brand-primary">گروه رَسا</strong> در{' '}
              <strong className="font-bold text-brand-primary">هشتمین رویداد تولید محتوای دیجیتال بسیج</strong> است؛ با هدف بهره‌گیری از توان مردم برای ایجاد همدلی، مشارکت و کمک به یکدیگر.
            </p>
          </div>
        </div>

        {/* Graphical & Animated RASSA Team Stage */}
        <div className="rassa-stage relative overflow-hidden border-t border-brand-surface py-6 sm:py-7">
          {/* Ambient Animated Orbs & Geometric Backdrop */}
          <div
            aria-hidden="true"
            className="rassa-orb-slow pointer-events-none absolute -top-12 -right-10 h-44 w-44 rounded-full bg-brand-soft/20 blur-2xl"
          />
          <div
            aria-hidden="true"
            className="rassa-orb-reverse pointer-events-none absolute -bottom-14 -left-10 h-48 w-48 rounded-full bg-brand-gold/15 blur-2xl"
          />

          <svg
            aria-hidden="true"
            viewBox="0 0 800 180"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-x-0 top-0 h-32 w-full text-brand-primary/[0.045]"
            fill="none"
          >
            <path
              d="M0 95 Q 160 25, 320 90 T 640 85 T 800 50"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M0 130 Q 200 65, 410 120 T 800 95"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="6 6"
            />
          </svg>

          {/* Graphical Header + Play/Pause Motion Control */}
          <div className="relative z-10 mb-4 flex flex-wrap items-center justify-between gap-3 px-5 sm:px-8">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-brand-surface bg-white shadow-xs">
                <span
                  aria-hidden="true"
                  className="rassa-halo-spin pointer-events-none absolute -inset-1 rounded-xl border border-dashed border-brand-gold/70"
                />
                <Sparkles className="relative h-5 w-5 text-brand-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-black text-brand-primary sm:text-base">
                    اعضای گروه رَسا
                  </h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-primary px-2 py-0.5 text-[10px] font-extrabold text-white">
                    ۴ هم‌پیمان
                  </span>
                </div>
                <p className="text-[11px] font-medium text-brand-text/70">
                  روی هر کارت بزنید تا جزئیات و نقش گرافیکی عضو نمایش داده شود
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsPaused((prev) => !prev)}
              aria-pressed={isPaused}
              className="inline-flex items-center gap-1.5 rounded-xl border border-brand-surface bg-white px-3 py-1.5 text-xs font-bold text-brand-primary shadow-xs transition-colors hover:border-brand-soft hover:bg-brand-surface/40"
            >
              {isPaused ? (
                <>
                  <Play className="h-3.5 w-3.5 text-brand-green" />
                  <span>ادامه حرکت</span>
                </>
              ) : (
                <>
                  <Pause className="h-3.5 w-3.5 text-brand-green" />
                  <span>توقف حرکت</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Member Selector Pills */}
          <div className="relative z-10 mb-4 flex flex-wrap items-center gap-2 px-5 sm:px-8">
            {RASSA_TEAM_MEMBERS.map((member) => {
              const Icon = member.icon;
              const active = member.id === selectedMember.id;
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setSelectedId(member.id)}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition-all ${
                    active
                      ? 'border-brand-primary bg-brand-primary text-white shadow-xs'
                      : 'border-brand-surface bg-white/90 text-brand-primary hover:border-brand-soft hover:bg-white'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${active ? 'text-brand-gold' : 'text-brand-green'}`} />
                  <span>{member.shortName}</span>
                  <span className={`text-[10px] ${active ? 'text-brand-gold' : 'text-brand-text/55'}`}>
                    {member.orderFa}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Interactive Spotlight Card */}
          <div className="relative z-10 mb-5 px-5 sm:px-8">
            <SpotlightPanel
              key={selectedMember.id}
              member={selectedMember}
              onPrev={handlePrev}
              onNext={handleNext}
            />
          </div>

          {/* LTR wrapper guarantees uniform continuous horizontal scroll in RTL pages without jump */}
          <div
            dir="ltr"
            className={`rassa-marquee-viewport relative z-10 w-full overflow-hidden py-2 ${
              isPaused ? 'rassa-marquee-paused' : ''
            }`}
            aria-label="گالری متحرک اعضای گروه رَسا"
          >
            <div className="rassa-marquee-track flex w-max">
              <div className="flex shrink-0 gap-4 pr-4">
                {RASSA_TEAM_MEMBERS.map((member, index) => (
                  <MemberPortraitCard
                    key={`primary-${member.id}`}
                    member={member}
                    index={index}
                    isSelected={member.id === selectedMember.id}
                    onSelect={setSelectedId}
                  />
                ))}
              </div>
              <div className="flex shrink-0 gap-4 pr-4" aria-hidden="true">
                {RASSA_TEAM_MEMBERS.map((member, index) => (
                  <MemberPortraitCard
                    key={`loop-${member.id}`}
                    member={member}
                    index={index}
                    isSelected={member.id === selectedMember.id}
                    onSelect={setSelectedId}
                    decorative
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Graphical Connected Team Signature */}
          <div className="relative z-10 mt-5 flex flex-col items-center gap-2.5 px-5 text-center sm:px-8">
            <div
              aria-hidden="true"
              className="flex items-center justify-center gap-1.5"
            >
              {RASSA_TEAM_MEMBERS.map((member, idx) => (
                <div key={member.id} className="flex items-center gap-1.5">
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setSelectedId(member.id)}
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      member.id === selectedMember.id
                        ? 'w-7 bg-brand-gold'
                        : 'w-2.5 bg-brand-soft/80 hover:bg-brand-green'
                    }`}
                  />
                  {idx < RASSA_TEAM_MEMBERS.length - 1 && (
                    <span className="h-px w-4 bg-brand-surface" />
                  )}
                </div>
              ))}
            </div>
            <p className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-surface bg-white/90 px-4 py-1.5 text-[11px] font-semibold text-brand-text/85 shadow-xs sm:text-xs">
              <span className="h-2 w-2 rounded-full bg-brand-green" />
              ساخته‌شده با همت گروه رَسا | هشتمین رویداد تولید محتوای دیجیتال بسیج
            </p>
          </div>
        </div>
      </section>

      {/* Usage Guide Cards */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2.5 rounded-2xl border border-brand-surface bg-white p-5 sm:p-6">
          <div className="flex items-center gap-2 text-base font-extrabold text-brand-primary">
            <HandHelping className="h-5 w-5 text-brand-green" />
            <span>راهنمای درخواست‌کنندگان</span>
          </div>
          <ul className="list-disc space-y-2 pr-5 text-xs leading-6 text-brand-text/80">
            <li>پس از ثبت‌نام، وارد بخش «ثبت درخواست کمک» شوید.</li>
            <li>عنوان واضح، دسته‌بندی درست، نوع کمک و شهر خود را انتخاب کنید.</li>
            <li>در بخش محله فقط محدوده تقریبی بنویسید و از نوشتن نشانی دقیق یا شماره تلفن خودداری کنید.</li>
            <li>در صفحه جزئیات درخواست، اعلام آمادگی داوطلبان را بررسی، از طریق گفت‌وگوی خصوصی با هر داوطلب هماهنگ شوید و پس از انجام کمک، آن را تأیید کنید.</li>
          </ul>
        </div>

        <div className="space-y-2.5 rounded-2xl border border-brand-surface bg-white p-5 sm:p-6">
          <div className="flex items-center gap-2 text-base font-extrabold text-brand-primary">
            <HeartHandshake className="h-5 w-5 text-brand-green" />
            <span>راهنمای داوطلبان و متخصصان</span>
          </div>
          <ul className="list-disc space-y-2 pr-5 text-xs leading-6 text-brand-text/80">
            <li>در پروفایل خود شهر، محدوده و مهارت‌هایتان را ثبت کنید تا درخواست‌های متناسب با شما برجسته شوند.</li>
            <li>در فهرست درخواست‌ها بر اساس شهر یا دسته‌بندی جست‌وجو کنید.</li>
            <li>در صفحه درخواست موردنظر روی «من می‌توانم کمک کنم» بزنید تا گفت‌وگوی خصوصی با درخواست‌کننده ایجاد شود.</li>
            <li>وضعیت همکاری‌ها و گفت‌وگوهای خود را در بخش «پیام‌ها» و «فعالیت‌های من» پیگیری کنید.</li>
          </ul>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-brand-surface bg-white p-5 sm:p-6">
        <div className="flex items-center gap-2 text-base font-extrabold text-brand-primary">
          <ShieldCheck className="h-5 w-5 text-brand-green" />
          <span>اصول امنیت و حریم خصوصی</span>
        </div>
        <p className="text-xs leading-7 text-brand-text/80 sm:text-sm">
          در دست‌به‌دست تمام اطلاعات کاربران و گفت‌وگوهای خصوصی با سیاست‌های دسترسی سطح سطر (RLS) در پایگاه‌داده محافظت می‌شوند. فقط درخواست‌کننده و داوطلب هر گفت‌وگو به پیام‌های همان مشارکت دسترسی دارند و هیچ کاربر سومی قادر به مشاهده گفت‌وگوهای دیگران نیست.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-brand-surface bg-brand-surface/40 p-5 sm:p-6">
        <div className="flex items-center gap-2 text-base font-extrabold text-brand-primary">
          <Smartphone className="h-5 w-5 text-brand-green" />
          <span>نصب نسخه موبایل روی اندروید (PWA)</span>
        </div>
        <p className="text-xs leading-7 text-brand-text/80 sm:text-sm">
          برای نصب دست‌به‌دست روی گوشی اندروید بدون نیاز به فروشگاه، برنامه را با مرورگر کروم باز کرده و گزینه «نصب اپلیکیشن» یا از منوی مرورگر «افزودن به صفحه اصلی (Install App / Add to Home Screen)» را انتخاب کنید.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link
            to="/settings"
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-white hover:bg-brand-green"
          >
            <BookOpen className="h-4 w-4" />
            تنظیمات و وضعیت نصب
          </Link>
          <Link
            to="/requests"
            className="inline-flex items-center gap-1.5 rounded-xl border border-brand-primary bg-white px-4 py-2 text-xs font-bold text-brand-primary"
          >
            <MapPin className="h-4 w-4" />
            مشاهده درخواست‌های خراسان جنوبی
          </Link>
        </div>
      </section>
    </div>
  );
}
