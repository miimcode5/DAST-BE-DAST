# راهنمای پشتیبان‌گیری و بازیابی پایگاه‌داده (Backup & Recovery)

این سند رویه‌های عملی پشتیبان‌گیری، محافظت از داده‌های زنده و بازیابی ایمن پایگاه‌داده پروژه «دست‌به‌دست» روی Supabase (PostgreSQL 17) را شرح می‌دهد.

---

## ۱. پیش‌نیازهای قبل از هر تغییر ساختار (Migration)

پیش از اجرای هر فایل Migration روی پایگاه‌داده تولیدی:

1. **بررسی سلامت پروژه و فهرست جداول زنده:**
   - وضعیت همه سرویس‌ها (Database, Auth, Realtime, Storage) را از پنل Supabase یا ابزار مدیریت بررسی کنید.
   - شمارش ردیف‌های کلیدی (`auth.users`, `public.profiles`, `public.help_requests`, `public.volunteer_responses`, `public.conversations`, `public.messages`, `public.notifications`, `public.user_blocks`, `public.content_reports`) را ثبت کنید.
2. **تهیه Snapshot پیش از Migration:**
   - از داشبورد Supabase (بخش Database → Backups) یا از طریق `pg_dump` / کوئری استخراج JSON تمام جداول `public` یک فایل پشتیبان در محیط امن خارج از مخزن Git ذخیره کنید.
   - **هرگز فایل پشتیبان حاوی اطلاعات کاربران یا توکن‌ها را در مخزن Git کامیت نکنید.**
3. **اصل Migration غیرمخرب (Additive / Non-destructive):**
   - هرگز از `DROP TABLE`, `TRUNCATE` یا حذف ستون‌های حاوی داده واقعی استفاده نکنید.
   - برای تغییر ساختار از `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` و `CREATE OR REPLACE FUNCTION` با حفظ امضای خروجی توابع موجود استفاده کنید.

---

## ۲. بررسی‌های پس از اجرای Migration

بلافاصله پس از اعمال Migration روی پایگاه‌داده زنده:

1. تطابق تعداد ردیف‌های کاربران و درخواست‌های واقعی قبل و بعد از Migration را تأیید کنید.
2. فعال بودن `rowsecurity = true` روی تمام جداول `public` و حضور جداول بلادرنگ در `supabase_realtime` (`conversations`, `messages`, `notifications`, `user_blocks`) را بررسی کنید.
3. دسترسی نقش `anon` را بیازمایید:
   - `public.public_help_requests_feed`: مجاز (`SELECT = true`)
   - جدول‌های خصوصی (`profiles`, `notifications`, `user_blocks`, `content_reports`, `messages`, `conversations`, `conversation_reports`, `volunteer_responses`, `saved_requests`): مسدود برای `anon` (`SELECT = false`)
4. تست تراکنشی کامل چرخه همیاری، اعلان‌ها، مسدودسازی و دسترسی نظارت را اجرا کنید.

---

## ۳. رویه بازیابی (Recovery)

- **بازیابی نقطه‌ای (Point-in-Time / Daily Backup در Supabase):**
  در صورت نیاز به بازگشت کل پایگاه‌داده، از بخش *Database → Backups* در داشبورد Supabase نزدیک‌ترین نقطه پشتیبان پیش از رویداد را بازیابی کنید.
- **بازیابی دستی جداول و اسکیما:**
  1. ابتدا Migrationهای نسخه‌بندی‌شده داخل `supabase/migrations/` را به‌ترتیب زمانی اعمال کنید تا تمام جداول، سیاست‌های RLS، تریگرها و توابع `SECURITY DEFINER` بازسازی شوند.
  2. سپس ردیف‌های پشتیبان‌گیری‌شده را درون تراکنش (`BEGIN; ... COMMIT;`) با `SET session_replication_role = replica;` (در صورت نیاز به حفظ دقیق زمان‌ها و شناسه‌های قبلی) بازیابی کرده و شمارنده‌هایی مانند `completed_helps_count` را بررسی کنید.
