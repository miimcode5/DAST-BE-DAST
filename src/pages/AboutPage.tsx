import { BookOpen, HandHelping, HeartHandshake, MapPin, ShieldCheck, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';

export function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-up">
      <section className="rounded-3xl border border-[#DCEBDD] bg-white p-6 shadow-xs sm:p-8">
        <BrandLogo />
        <h1 className="mt-4 text-xl font-extrabold text-[#174D35] sm:text-2xl">
          درباره دست‌به‌دست و راهنمای استفاده
        </h1>
        <p className="mt-3 text-sm leading-8 text-[#3A473A]">
          «دست‌به‌دست» یک پلتفرم اجتماعی کمک متقابل و مشارکت مردمی است که با شعار{' '}
          <strong className="font-bold text-[#174D35]">«توان ما، کنار هم معنا پیدا می‌کند»</strong>{' '}
          و در راستای موضوع <strong className="font-bold text-[#174D35]">«ایران به توان مردم»</strong>{' '}
          طراحی شده است. نقطه شروع این شبکه استان خراسان جنوبی است و زیرساخت آن قابلیت گسترش به تمام شهرهای ایران را دارد.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-[#DCEBDD] bg-white p-6 space-y-2.5">
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

        <div className="rounded-3xl border border-[#DCEBDD] bg-white p-6 space-y-2.5">
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

      <section className="rounded-3xl border border-[#DCEBDD] bg-white p-6 space-y-3">
        <div className="flex items-center gap-2 text-base font-extrabold text-[#174D35]">
          <ShieldCheck className="h-5 w-5 text-[#26734B]" />
          <span>اصول امنیت و حریم خصوصی</span>
        </div>
        <p className="text-xs leading-7 text-[#465346] sm:text-sm">
          در دست‌به‌دست تمام اطلاعات کاربران و گفت‌وگوهای خصوصی با سیاست‌های دسترسی سطح سطر (RLS) در پایگاه‌داده محافظت می‌شوند. فقط درخواست‌کننده و داوطلب هر گفت‌وگو به پیام‌های همان مشارکت دسترسی دارند و هیچ کاربر سومی قادر به مشاهده گفت‌وگوهای دیگران نیست.
        </p>
      </section>

      <section className="rounded-3xl border border-[#DCEBDD] bg-[#DCEBDD]/40 p-6 space-y-3">
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
