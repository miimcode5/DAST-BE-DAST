import { ArrowLeft, HandHelping, HeartHandshake, MapPin, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { useAuth } from '../contexts/AuthContext';

export function WelcomePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-8 animate-fade-up">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-bl from-[#174D35] via-[#1E5D40] to-[#26734B] p-6 text-white shadow-xl sm:p-10">
        <div className="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-[#78B98A]/15 blur-2xl" />
        <div className="relative z-10 max-w-2xl space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-semibold text-[#DCEBDD]">
            <MapPin className="h-3.5 w-3.5 text-[#E9B949]" />
            شروع فعالیت از استان خراسان جنوبی · قابل گسترش در سراسر ایران
          </div>
          <h1 className="text-2xl font-extrabold leading-10 sm:text-4xl sm:leading-[3.1rem]">
            دست‌به‌دست؛ شبکه همیاری، مهارت و کمک متقابل مردمی
          </h1>
          <p className="text-sm leading-7 text-[#DCEBDD] sm:text-base">
            گاهی چیزی که برای تو ساده است، می‌تواند مشکل بزرگی را برای دیگری حل کند. دست‌به‌دست پلی است میان کسانی که نیازی دارند و هم‌شهریانی که مهارت، زمان یا امکان کمک کردن دارند.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            {user ? (
              <>
                <Link
                  to="/requests/new"
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#E9B949] px-5 py-3 text-sm font-extrabold text-[#174D35] shadow-md transition hover:bg-[#F3C860]"
                >
                  ثبت درخواست کمک
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <Link
                  to="/requests"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/20"
                >
                  مشاهده درخواست‌های فعال
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/auth/register"
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#E9B949] px-6 py-3 text-sm font-extrabold text-[#174D35] shadow-md transition hover:bg-[#F3C860]"
                >
                  عضویت رایگان در دست‌به‌دست
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <Link
                  to="/requests"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/20"
                >
                  مرور درخواست‌های کمک
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-[#DCEBDD] bg-white p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#DCEBDD] text-[#174D35]">
            <HandHelping className="h-6 w-6" />
          </div>
          <h2 className="mb-2 text-base font-bold text-[#202820]">۱. ثبت نیاز واقعی</h2>
          <p className="text-sm leading-7 text-[#4D5B4D]">
            نیاز خود را در یکی از ۸ دسته مشخص کنید و فقط نام شهر و محدوده تقریبی محله را بنویسید.
          </p>
        </div>

        <div className="rounded-3xl border border-[#DCEBDD] bg-white p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#DCEBDD] text-[#174D35]">
            <Users className="h-6 w-6" />
          </div>
          <h2 className="mb-2 text-base font-bold text-[#202820]">۲. اعلام آمادگی داوطلبان</h2>
          <p className="text-sm leading-7 text-[#4D5B4D]">
            افراد دارای مهارت، همسایگان و داوطلبان با گزینه «من می‌توانم کمک کنم» برای یاری اعلام آمادگی می‌کنند.
          </p>
        </div>

        <div className="rounded-3xl border border-[#DCEBDD] bg-white p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#DCEBDD] text-[#174D35]">
            <HeartHandshake className="h-6 w-6" />
          </div>
          <h2 className="mb-2 text-base font-bold text-[#202820]">۳. تکمیل و زنجیره مهربانی</h2>
          <p className="text-sm leading-7 text-[#4D5B4D]">
            با تأیید کمک، مشارکت در زنجیره مهربانی ثبت می‌شود تا فرهنگ همیاری و «ایران به توان مردم» گسترش یابد.
          </p>
        </div>
      </section>

      <section className="flex flex-col justify-between gap-5 rounded-3xl border border-[#DCEBDD] bg-[#DCEBDD]/45 p-6 sm:flex-row sm:items-center">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-bold text-[#174D35]">
            <ShieldCheck className="h-5 w-5 text-[#26734B]" />
            <span>حریم خصوصی و امنیت کاربران در اولویت است</span>
          </div>
          <p className="text-xs leading-6 text-[#344634] sm:text-sm">
            شماره تماس و نشانی دقیق در صفحات عمومی منتشر نمی‌شوند؛ تنها شهر و محدوده تقریبی نمایش داده می‌شود.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <BrandLogo compact />
          <Link
            to="/kindness-chain"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#174D35] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#26734B]"
          >
            <Sparkles className="h-4 w-4 text-[#E9B949]" />
            زنجیره مهربانی
          </Link>
        </div>
      </section>
    </div>
  );
}
