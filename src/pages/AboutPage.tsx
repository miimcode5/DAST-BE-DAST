import { useState } from 'react';
import {
  BookOpen,
  HandHelping,
  HeartHandshake,
  MapPin,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { getInitials } from '../lib/formatters';

interface RassaMember {
  id: string;
  name: string;
  role: string;
  photoUrl: string;
}

const RASSA_TEAM_MEMBERS: RassaMember[] = [
  {
    id: 'mojtaba',
    name: 'مجتبی میدانی',
    role: 'سرپرست تیم و فرانت‌اندکار',
    photoUrl:
      'https://raw.githubusercontent.com/gk99boys-collab/RASSA/main/public/member-photos/mojtaba.jpg',
  },
  {
    id: 'mohammad',
    name: 'محمد صحرانورد',
    role: 'توسعه‌دهنده موبایل و ادیتور',
    photoUrl:
      'https://raw.githubusercontent.com/gk99boys-collab/RASSA/main/public/member-photos/mohammad.jpg',
  },
  {
    id: 'abolfazl',
    name: 'سید ابوالفضل میرزازاده',
    role: 'بک‌اندکار و پشتیبان‌گیری',
    photoUrl:
      'https://raw.githubusercontent.com/gk99boys-collab/RASSA/main/public/member-photos/abolfazl.jpg',
  },
  {
    id: 'alireza',
    name: 'علیرضا حاجی‌زاده',
    role: 'مسئول محتوا و ارائه',
    photoUrl:
      'https://raw.githubusercontent.com/gk99boys-collab/RASSA/main/public/member-photos/alireza.jpg',
  },
];

function MemberPortraitCard({ member }: { member: RassaMember }) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <article
      dir="rtl"
      className="group/card relative w-[184px] shrink-0 overflow-hidden rounded-3xl border border-[#DCEBDD] bg-[#F6F7F2] shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-[#78B98A] hover:shadow-md sm:w-[214px]"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-gradient-to-b from-[#DCEBDD]/50 to-[#174D35]/15">
        {!imgFailed ? (
          <img
            src={member.photoUrl}
            alt={member.name}
            loading="eager"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover object-top transition-transform duration-500 ease-out group-hover/card:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#174D35] to-[#26734B] text-2xl font-extrabold text-[#F6F7F2]">
            {getInitials(member.name)}
          </div>
        )}

        {/* Subtle bottom scrim to keep portrait edge refined */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#174D35]/35 via-[#174D35]/10 to-transparent"
        />
      </div>

      <div className="flex flex-col items-center justify-center gap-1 border-t border-[#DCEBDD] bg-white px-2.5 py-3 text-center sm:px-3">
        <h3 className="text-sm font-extrabold leading-5 text-[#174D35] sm:text-[15px]">
          {member.name}
        </h3>
        <p className="text-[11px] font-semibold leading-4 text-[#26734B] sm:text-xs">
          {member.role}
        </p>
      </div>
    </article>
  );
}

export function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-up">
      {/* Main About & RASSA Team Showcase */}
      <section className="overflow-hidden rounded-3xl border border-[#DCEBDD] bg-white shadow-xs">
        {/* Top Intro Header */}
        <div className="space-y-4 p-5 sm:p-8 sm:pb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <BrandLogo />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#78B98A]/50 bg-[#DCEBDD]/55 px-3 py-1 text-[11px] font-bold text-[#174D35] sm:text-xs">
              <Sparkles className="h-3.5 w-3.5 text-[#E9B949]" />
              گروه رَسا · رویداد هشتم
            </span>
          </div>

          <div className="space-y-2.5 pt-1">
            <h1 className="text-xl font-extrabold text-[#174D35] sm:text-2xl">
              درباره ما
            </h1>
            <p className="rounded-2xl border border-[#DCEBDD]/80 bg-[#F6F7F2]/85 px-4 py-3.5 text-sm leading-8 text-[#202820] sm:px-5 sm:text-[15px]">
              دست‌به‌دست، حاصل تلاش <strong className="font-extrabold text-[#174D35]">گروه رَسا</strong> در{' '}
              <strong className="font-bold text-[#174D35]">هشتمین رویداد تولید محتوای دیجیتال بسیج</strong> است؛ با هدف بهره‌گیری از توان مردم برای ایجاد همدلی، مشارکت و کمک به یکدیگر.
            </p>
          </div>
        </div>

        {/* Team Members Seamless Infinite Loop Carousel */}
        <div className="border-t border-[#DCEBDD]/70 bg-gradient-to-b from-[#F6F7F2]/60 to-white py-5 sm:py-6">
          <div className="mb-4 flex items-center justify-between px-5 sm:px-8">
            <h2 className="text-sm font-extrabold text-[#174D35] sm:text-base">
              اعضای گروه رَسا
            </h2>
            <span className="text-[11px] font-medium text-[#556455]">
              تیم طراحی و توسعه دست‌به‌دست
            </span>
          </div>

          {/* LTR wrapper guarantees uniform continuous horizontal scroll in RTL pages without jump */}
          <div
            dir="ltr"
            className="rassa-marquee-viewport relative w-full overflow-hidden py-1"
            aria-label="اعضای گروه رَسا"
          >
            <div className="rassa-marquee-track flex w-max">
              <div className="flex shrink-0 gap-4 pr-4">
                {RASSA_TEAM_MEMBERS.map((member) => (
                  <MemberPortraitCard key={`primary-${member.id}`} member={member} />
                ))}
              </div>
              <div className="flex shrink-0 gap-4 pr-4" aria-hidden="true">
                {RASSA_TEAM_MEMBERS.map((member) => (
                  <MemberPortraitCard key={`loop-${member.id}`} member={member} />
                ))}
              </div>
            </div>
          </div>

          {/* Closing Signature */}
          <div className="mt-5 px-5 text-center sm:px-8">
            <p className="inline-flex items-center justify-center rounded-full border border-[#DCEBDD] bg-[#F6F7F2] px-4 py-1.5 text-[11px] font-semibold text-[#3A4A3A] sm:text-xs">
              ساخته‌شده با همت گروه رَسا | هشتمین رویداد تولید محتوای دیجیتال بسیج
            </p>
          </div>
        </div>
      </section>

      {/* Usage Guide Cards */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2.5 rounded-3xl border border-[#DCEBDD] bg-white p-5 sm:p-6">
          <div className="flex items-center gap-2 text-base font-extrabold text-[#174D35]">
            <HandHelping className="h-5 w-5 text-[#26734B]" />
            <span>راهنمای درخواست‌کنندگان</span>
          </div>
          <ul className="list-disc space-y-2 pr-5 text-xs leading-6 text-[#465346]">
            <li>پس از ثبت‌نام، وارد بخش «ثبت درخواست کمک» شوید.</li>
            <li>عنوان واضح، دسته‌بندی درست، نوع کمک و شهر خود را انتخاب کنید.</li>
            <li>در بخش محله فقط محدوده تقریبی بنویسید و از نوشتن نشانی دقیق یا شماره تلفن خودداری کنید.</li>
            <li>در صفحه جزئیات درخواست، اعلام آمادگی داوطلبان را بررسی، از طریق گفت‌وگوی خصوصی با هر داوطلب هماهنگ شوید و پس از انجام کمک، آن را تأیید کنید.</li>
          </ul>
        </div>

        <div className="space-y-2.5 rounded-3xl border border-[#DCEBDD] bg-white p-5 sm:p-6">
          <div className="flex items-center gap-2 text-base font-extrabold text-[#174D35]">
            <HeartHandshake className="h-5 w-5 text-[#26734B]" />
            <span>راهنمای داوطلبان و متخصصان</span>
          </div>
          <ul className="list-disc space-y-2 pr-5 text-xs leading-6 text-[#465346]">
            <li>در پروفایل خود شهر، محدوده و مهارت‌هایتان را ثبت کنید تا درخواست‌های متناسب با شما برجسته شوند.</li>
            <li>در فهرست درخواست‌ها بر اساس شهر یا دسته‌بندی جست‌وجو کنید.</li>
            <li>در صفحه درخواست موردنظر روی «من می‌توانم کمک کنم» بزنید تا گفت‌وگوی خصوصی با درخواست‌کننده ایجاد شود.</li>
            <li>وضعیت همکاری‌ها و گفت‌وگوهای خود را در بخش «پیام‌ها» و «فعالیت‌های من» پیگیری کنید.</li>
          </ul>
        </div>
      </section>

      <section className="space-y-3 rounded-3xl border border-[#DCEBDD] bg-white p-5 sm:p-6">
        <div className="flex items-center gap-2 text-base font-extrabold text-[#174D35]">
          <ShieldCheck className="h-5 w-5 text-[#26734B]" />
          <span>اصول امنیت و حریم خصوصی</span>
        </div>
        <p className="text-xs leading-7 text-[#465346] sm:text-sm">
          در دست‌به‌دست تمام اطلاعات کاربران و گفت‌وگوهای خصوصی با سیاست‌های دسترسی سطح سطر (RLS) در پایگاه‌داده محافظت می‌شوند. فقط درخواست‌کننده و داوطلب هر گفت‌وگو به پیام‌های همان مشارکت دسترسی دارند و هیچ کاربر سومی قادر به مشاهده گفت‌وگوهای دیگران نیست.
        </p>
      </section>

      <section className="space-y-3 rounded-3xl border border-[#DCEBDD] bg-[#DCEBDD]/40 p-5 sm:p-6">
        <div className="flex items-center gap-2 text-base font-extrabold text-[#174D35]">
          <Smartphone className="h-5 w-5 text-[#26734B]" />
          <span>نصب نسخه موبایل روی اندروید (PWA)</span>
        </div>
        <p className="text-xs leading-7 text-[#344634] sm:text-sm">
          برای نصب دست‌به‌دست روی گوشی اندروید بدون نیاز به فروشگاه، برنامه را با مرورگر کروم باز کرده و گزینه «نصب اپلیکیشن» یا از منوی مرورگر «افزودن به صفحه اصلی (Install App / Add to Home Screen)» را انتخاب کنید.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link
            to="/settings"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#174D35] px-4 py-2 text-xs font-bold text-white hover:bg-[#26734B]"
          >
            <BookOpen className="h-4 w-4" />
            تنظیمات و وضعیت نصب
          </Link>
          <Link
            to="/requests"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#174D35] bg-white px-4 py-2 text-xs font-bold text-[#174D35]"
          >
            <MapPin className="h-4 w-4" />
            مشاهده درخواست‌های خراسان جنوبی
          </Link>
        </div>
      </section>
    </div>
  );
}
