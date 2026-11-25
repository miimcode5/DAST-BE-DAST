# مستندات فنی و معماری دست‌به‌دست (نسخه ۱.۰.۰)

## ۱. طراحی پایگاه‌داده و جداول

در نسخه `1.0.0` پایگاه‌داده شامل ۱۰ جدول با `Row Level Security` فعال و یک نمای عمومی امن است:

1. **`public.profiles`**
   - متصل به `auth.users(id)` با تریگر خودکار `handle_new_user()` هنگام ثبت‌نام (همراه با ثبت اعلان خوش‌آمدگویی).
   - شامل: `display_name`, `avatar_url`, `bio`, `province`, `city`, `neighborhood`, `skills`, `role`, `completed_helps_count`.
   - دسترسی مستقیم `SELECT` برای نقش `anon` بسته شده است (`revoke select on public.profiles from anon`) و فقط کاربران احرازشده دسترسی مجاز دارند؛ مهمانان صرفاً از طریق نمای `public_help_requests_feed` نام و تصویر نمایشی صاحب درخواست را می‌بینند.
   - تریگر `guard_profile_protected_fields` مانع از تغییر مستقیم `role` و `completed_helps_count` از سمت کلاینت می‌شود.

2. **`public.help_requests`**
   - درخواست‌های کمک ثبت‌شده توسط کاربران با اعتبارسنجی طول رشته‌ها، دسته‌بندی‌های هشت‌گانه، نوع کمک، شهر و محدوده تقریبی.
   - وضعیت‌ها: `open`, `in_progress`, `completed`, `cancelled`.
   - تریگر `guard_help_request_update` تغییر وضعیت غیرمجاز یا ویرایش درخواست دیگران را در لایه دیتابیس مسدود می‌کند.

3. **`public.volunteer_responses`**
   - اعلام آمادگی داوطلبان برای هر درخواست.
   - دارای محدودیت یکتا `UNIQUE (request_id, volunteer_id)` برای جلوگیری از ثبت اعلام آمادگی تکراری.
   - وضعیت‌ها: `pending`, `accepted`, `in_progress`, `completed`, `rejected`, `cancelled`.
   - تغییر وضعیت‌ها فقط از طریق توابع `SECURITY DEFINER` مجاز سیستم انجام می‌شوند:
     - `submit_volunteer_response(request_id, message)` (با بررسی عدم مسدودیت بین دو کاربر)
     - `withdraw_volunteer_response(response_id)`
     - `accept_volunteer_response(response_id)`
     - `reject_volunteer_response(response_id)`
     - `start_volunteer_response(response_id)`
     - `mark_volunteer_done(response_id)`
     - `confirm_help_completion(response_id)`

4. **`public.saved_requests`**
   - ذخیره درخواست‌های موردعلاقه کاربر با محدودیت یکتا `UNIQUE (user_id, request_id)`.

5. **نمای عمومی امن و آمار (`public_help_requests_feed`, `get_platform_stats`, `get_kindness_chain`)**
   - `public_help_requests_feed`: فقط فیلدهای عمومی درخواست، نام/تصویر نمایشی درخواست‌کننده و تعداد تجمیعی اعلام آمادگی‌ها را نمایش می‌دهد (بدون افشای هویت داوطلبان، محله پروفایل، یا اطلاعات تماس).
   - `get_platform_stats()`: آمار زنده و واقعی پلتفرم را محاسبه می‌کند.
   - `get_kindness_chain()`: پیوندهای واقعی و تأییدشده (`status = 'completed'` و `requester_confirmed = true`) را برمی‌گرداند.

6. **سیستم گفت‌وگوی خصوصی و لحظه‌ای (`public.conversations`, `public.messages`, `public.conversation_reports`)**
   - **`conversations`:** اتصال یکتا به `(request_id, volunteer_id)` و `response_id` تا برای یک درخواست با چند داوطلب، هر داوطلب گفت‌وگوی کاملاً جداگانه با درخواست‌کننده داشته باشد.
   - **`messages`:** نگهداری پیام‌های هر گفت‌وگو با `sender_id`، محدودیت طول (`۱` تا `۲۰۰۰` کاراکتر)، زمان خوانده‌شدن (`read_at`) و مسدودسازی ویرایش/حذف پیام پس از ثبت.
   - **`conversation_reports`:** ثبت گزارش تخلف یا رفتار نامناسب در چت.
   - **همگام‌سازی خودکار با چرخه درخواست و مسدودسازی:** هنگام ثبت اعلام آمادگی، گفت‌وگو ساخته یا فعال می‌شود؛ هنگام لغو، رد، تکمیل یا مسدودسازی کاربر (`block_user`) وضعیت گفت‌وگو متناسب با آن به‌روز می‌شود تا تاریخچه محفوظ بماند و پیام جدید مسدود گردد.
   - **Supabase Realtime:** انتشار تغییرات جداول `conversations`, `messages`, `notifications` و `user_blocks` با `REPLICA IDENTITY FULL`.

7. **سیستم اعلان‌های خودکار و لحظه‌ای (`public.notifications`)**
   - تولید خودکار اعلان در سمت سرور توسط تریگرها برای رویدادهای واقعی:
     - پیام جدید (`new_message`) — و خوانده‌شدن خودکار به محض `mark_conversation_messages_read`
     - پیشنهاد کمک جدید (`new_offer`) بدون اعلان پیام تکراری روی پیام اولیه پیشنهاد
     - پذیرش/رد داوطلب، شروع همکاری، اعلام اتمام داوطلب، تأیید تکمیل کمک، لغو درخواست، انصراف داوطلب
     - خوش‌آمدگویی ثبت‌نام (`account_welcome`) و تغییر رمز عبور (`account_security` از طریق `record_password_changed_notification`).
   - محافظت کامل با RLS و تریگر `guard_notification_update` (کاربر فقط مجاز به به‌روزرسانی `read_at` و حذف اعلان خودش است؛ درج مستقیم اعلان از سمت کلاینت بسته است).

8. **ایمنی، مسدودسازی و نظارت (`public.user_blocks`, `public.content_reports`)**
   - **`user_blocks`:** ذخیره مسدودسازی بین کاربران و اعمال محدودیت در `is_user_blocked_between(u1, u2)` در سطح RPCهای گفت‌وگو و اعلام آمادگی و تریگر درج پیام.
   - **`content_reports`:** ثبت گزارش تخلف برای درخواست، پروفایل یا پاسخ داوطلب با یکتایی گزارش باز در هر هدف.
   - **نظارت سمت سرور (`is_moderator_or_admin()`):** دسترسی مشاهده و تغییر وضعیت گزارش‌ها در `get_moderation_reports()` و `update_moderation_report_status()` صرفاً برای کاربرانی که در `public.profiles` دارای نقش تأییدشده `admin` یا `moderator` هستند باز است.

---

## ۲. امنیت و حریم خصوصی

- **RLS + لغو دسترسی جدول‌های خصوصی برای `anon`:** نقش `anon` دسترسی مستقیم به `profiles`, `notifications`, `user_blocks`, `content_reports`, `messages`, `conversations`, `conversation_reports`, `volunteer_responses` و `saved_requests` ندارد.
- **اتکا به امنیت سرور به‌جای شیلد ظاهری:** محدودیت‌های سمت سرور (RLS، توابع `SECURITY DEFINER`، محدودیت Storage، بررسی نقش و مسدودسازی) جایگزین هرگونه مسدودسازی مصنوعی کلیک‌راست یا انتخاب متن سراسری در مرورگر شده‌اند.
- **حفظ حریم خصوصی مکان و تماس:** شماره تلفن و آدرس دقیق در جداول عمومی ذخیره و نمایش داده نمی‌شوند و دستیار محلی هنگام نگارش درخواست وجود شماره تماس یا پلاک را هشدار می‌دهد.
- **محدودیت آپلود فایل:** تصاویر پروفایل (حداکثر ۲ مگابایت) و تصاویر درخواست (حداکثر ۳ مگابایت) در فرمت‌های `JPG / PNG / WebP` در سطل‌های Storage با سیاست مالکیت پوشه کاربر (`auth.uid()`) بارگذاری می‌شوند.

---

## ۳. معماری آفلاین، فونت و PWA

- **`vite-plugin-pwa` (Workbox):** فایل‌های اصلی برنامه، استایل‌ها، فونت رسمی `Pinar FD` (`public/fonts/pinar/*.woff2`)، تصاویر تیم راسا، آیکون‌ها و `offline.html` در Service Worker پیش‌کش می‌شوند. درخواست‌های Auth و REST به Supabase با استراتژی `NetworkOnly` ارسال می‌شوند.
- **IndexedDB (`src/lib/offlineDb.ts` - نسخه ۳):**
  - کش خواندنی آخرین درخواست‌ها، آمار، پروفایل، گفت‌وگوها و اعلان‌ها (`notifications_cache`) برای نمایش در حالت آفلاین.
  - صف همگام‌سازی درخواست‌های جدید ثبت‌شده در حالت آفلاین با شناسه یکتای کلاینت (`clientMutationId`) و قفل همگام‌سازی (`syncInFlight`).

---

## ۴. مسیر توسعه آینده (نسخه دوم به بعد)

قراردادهای تایپ‌شده برای سیستم نشان‌های افتخار و امتیازات مشارکت بدون ارزش مالی (`achievements` & `PLANNED_BADGES_ROADMAP`) و اعلان‌های Push مرورگر در `src/types/future.ts` نگهداری می‌شوند تا در نسخه ۲ اضافه شوند.
