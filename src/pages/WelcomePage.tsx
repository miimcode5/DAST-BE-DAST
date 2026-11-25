import { ArrowLeft, HandHelping, HeartHandshake, MapPin, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { useAuth } from '../contexts/AuthContext';

export function WelcomePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-8 animate-fade-up">
      <section className="rounded-2xl border border-brand-surface bg-white p-6 sm:p-10">
        <div className="max-w-2xl space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-surface px-3.5 py-1.5 text-xs font-semibold text-brand-primary">
            <MapPin className="h-3.5 w-3.5 text-brand-green" />
            شروع فعالیت از استان خراسان جنوبی · قابل گسترش در سراسر ایران
          </div>
          <h1 className="text-2xl font-extrabold leading-10 text-brand-primary sm:text-4xl sm:leading-[3.1rem]">
            دست‌به‌دست؛ شبکه همیاری، مهارت و کمک متقابل مردمی
          </h1>
          <p className="text-sm leading-7 text-brand-text/80 sm:text-base">
            گاهی چیزی که برای تو ساده است، می‌تواند مشکل بزرگی را برای دیگری حل کند. دست‌به‌دست پلی است میان کسانی که نیازی دارند و هم‌شهریانی که مهارت، زمان یا امکان کمک کردن دارند.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            {user ? (
              <>
                <Link
                  to="/requests/new"
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-green"
                >
                  ثبت درخواست کمک
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <Link
                  to="/requests"
                  className="inline-flex items-center gap-2 rounded-xl border border-brand-soft/60 bg-brand-surface/50 px-5 py-3 text-sm font-bold text-brand-primary transition hover:bg-brand-surface"
                >
                  مشاهده درخواست‌های فعال
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/auth/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-green"
                >
                  عضویت رایگان در دست‌به‌دست
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <Link
                  to="/requests"
                  className="inline-flex items-center gap-2 rounded-xl border border-brand-soft/60 bg-brand-surface/50 px-5 py-3 text-sm font-bold text-brand-primary transition hover:bg-brand-surface"
                >
                  مرور درخواست‌های کمک
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-brand-surface bg-white p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-surface text-brand-primary">
            <HandHelping className="h-6 w-6" />
          </div>
          <h2 className="mb-2 text-base font-bold text-brand-text">۱. ثبت نیاز واقعی</h2>
          <p className="text-sm leading-7 text-brand-text/75">
            نیاز خود را در یکی از ۸ دسته مشخص کنید و فقط نام شهر و محدوده تقریبی محله را بنویسید.
          </p>
        </div>

        <div className="rounded-2xl border border-brand-surface bg-white p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-surface text-brand-primary">
            <Users className="h-6 w-6" />
          </div>
          <h2 className="mb-2 text-base font-bold text-brand-text">۲. اعلام آمادگی داوطلبان</h2>
          <p className="text-sm leading-7 text-brand-text/75">
            افراد دارای مهارت، همسایگان و داوطلبان با گزینه «من می‌توانم کمک کنم» برای یاری اعلام آمادگی می‌کنند.
          </p>
        </div>

        <div className="rounded-2xl border border-brand-surface bg-white p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-surface text-brand-primary">
            <HeartHandshake className="h-6 w-6" />
          </div>
          <h2 className="mb-2 text-base font-bold text-brand-text">۳. تکمیل و زنجیره مهربانی</h2>
          <p className="text-sm leading-7 text-brand-text/75">
            با تأیید کمک، مشارکت در زنجیره مهربانی ثبت می‌شود تا فرهنگ همیاری و «ایران به توان مردم» گسترش یابد.
          </p>
        </div>
      </section>

      <section className="flex flex-col justify-between gap-5 rounded-2xl border border-brand-surface bg-brand-surface/45 p-6 sm:flex-row sm:items-center">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-bold text-brand-primary">
            <ShieldCheck className="h-5 w-5 text-brand-green" />
            <span>حریم خصوصی و امنیت کاربران در اولویت است</span>
          </div>
          <p className="text-xs leading-6 text-brand-text/80 sm:text-sm">
            شماره تماس و نشانی دقیق در صفحات عمومی منتشر نمی‌شوند؛ تنها شهر و محدوده تقریبی نمایش داده می‌شود.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <BrandLogo compact />
          <Link
            to="/kindness-chain"
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-green"
          >
            <Sparkles className="h-4 w-4 text-brand-gold" />
            زنجیره مهربانی
          </Link>
        </div>
      </section>
    </div>
  );
}
