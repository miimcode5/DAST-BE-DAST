# مستندات فنی و معماری دست‌به‌دست (نسخه اول - MVP)

## ۱. طراحی پایگاه‌داده و جداول

در نسخه اول فقط جداول ضروری پیاده‌سازی شده‌اند تا معماری ساده، ایمن و قابل نگهداری باشد:

1. **`public.profiles`**
   - متصل به `auth.users(id)` با تریگر خودکار `handle_new_user()` هنگام ثبت‌نام.
   - شامل: `display_name`, `avatar_url`, `bio`, `province`, `city`, `neighborhood`, `skills`, `role`, `completed_helps_count`.
   - تریگر `guard_profile_protected_fields` مانع از تغییر مستقیم `role` و `completed_helps_count` از سمت کلاینت می‌شود.

2. **`public.help_requests`**
   - درخواست‌های کمک ثبت‌شده توسط کاربران با اعتبارسنجی طول رشته‌ها، دسته‌بندی‌های هشت‌گانه، نوع کمک، شهر و محدوده تقریبی.
   - وضعیت‌ها: `open`, `in_progress`, `completed`, `cancelled`.
   - تریگر `guard_help_request_update` تغییر وضعیت غیرمجاز یا ویرایش درخواست دیگران را در لایه دیتابیس مسدود می‌کند.

3. **`public.volunteer_responses`**
   - اعلام آمادگی داوطلبان برای هر درخواست.
   - دارای محدودیت یکتا `UNIQUE (request_id, volunteer_id)` برای جلوگیری از ثبت اعلام آمادگی تکراری.
   - وضعیت‌ها: `pending`, `accepted`, `in_progress`, `completed`, `rejected`, `cancelled`.
   - تغییر وضعیت‌ها فقط از طریق توابع `SECURITY DEFINER` مجاز سیستم انجام می‌شوند تا هیچ کاربری نتواند وضعیت را جعل کند:
     - `submit_volunteer_response(request_id, message)`
     - `withdraw_volunteer_response(response_id)`
     - `accept_volunteer_response(response_id)`
     - `reject_volunteer_response(response_id)`
     - `start_volunteer_response(response_id)`
     - `mark_volunteer_done(response_id)`
     - `confirm_help_completion(response_id)`

4. **`public.saved_requests`**
   - ذخیره درخواست‌های موردعلاقه کاربر با محدودیت یکتا `UNIQUE (user_id, request_id)`.

5. **نمای عمومی امن و آمار (`public_help_requests_feed`, `get_platform_stats`, `get_kindness_chain`)**
   - `public_help_requests_feed`: فقط فیلدهای عمومی درخواست، نام/تصویر نمایشی درخواست‌کننده و تعداد تجمیعی اعلام آمادگی‌ها را نمایش می‌دهد (بدون افشای هویت داوطلبان یا اطلاعات تماس).
   - `get_platform_stats()`: آمار زنده و واقعی پلتفرم را محاسبه می‌کند.
   - `get_kindness_chain()`: پیوندهای واقعی و تأییدشده (`status = 'completed'` و `requester_confirmed = true`) را برمی‌گرداند.

---

## ۲. امنیت و حریم خصوصی

- **RLS فعال روی همه جداول:** کاربران عادی فقط به داده‌های مجاز دسترسی دارند.
- **حفظ حریم خصوصی مکان و تماس:** شماره تلفن و آدرس دقیق در جداول عمومی ذخیره و نمایش داده نمی‌شوند و موتور محلی در فرم ثبت درخواست نیز در صورت تشخیص شماره تلفن یا پلاک هشدار می‌دهد.
- **محدودیت آپلود فایل:** تصاویر پروفایل (حداکثر ۲ مگابایت) و تصاویر درخواست (حداکثر ۳ مگابایت) در فرمت‌های `JPG / PNG / WebP` در سطل‌های Storage با سیاست مالکیت پوشه کاربر (`auth.uid()`) بارگذاری می‌شوند.

---

## ۳. معماری آفلاین و PWA

- **`vite-plugin-pwa` (Workbox):** فایل‌های اصلی برنامه، استایل‌ها، فونت محلی `Vazirmatn`، آیکون‌ها و `offline.html` را در Service Worker پیش‌کش می‌کند. درخواست‌های Auth و REST به Supabase با استراتژی `NetworkOnly` ارسال می‌شوند تا داده‌های احراز هویت و تغییرات هرگز با کش قدیمی تداخل نداشته باشند.
- **IndexedDB (`src/lib/offlineDb.ts`):**
  - کش خواندنی آخرین درخواست‌ها، آمار و پروفایل کاربر برای نمایش در حالت آفلاین.
  - صف همگام‌سازی درخواست‌های جدید ثبت‌شده در حالت آفلاین با شناسه یکتای کلاینت (`clientMutationId`) و قفل همگام‌سازی (`syncInFlight`) برای جلوگیری از ارسال تکراری.

---

## ۴. مسیر توسعه آینده (نسخه دوم به بعد)

قراردادهای تایپ‌شده برای گزارش تخلف و سیستم امتیاز و نشان‌های افتخار در فایل `src/types/future.ts` در نظر گرفته شده‌اند تا در نسخه‌های تکمیلی (همراه با جداول `reports`، `achievements`، `notifications` و گروه‌های محله‌ای) بدون تغییر ساختار هسته اضافه شوند.
