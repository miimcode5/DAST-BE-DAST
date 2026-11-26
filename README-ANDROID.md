# راهنمای ساخت، امضا و انتشار اپلیکیشن اندروید دست‌به‌دست (Capacitor APK)

این سند ساختار خروجی اندروید پلتفرم **دست‌به‌دست**، پیش‌نیازهای ساخت محلی و ابری (GitHub Actions)، تنظیمات امضای Release و نکات سازگاری با اندروید ۷.۰ به بالا را شرح می‌دهد.

---

## مشخصات اپلیکیشن اندروید

| ویژگی | مقدار پیکربندی‌شده |
| --- | --- |
| **نام نمایشی (App Name)** | `دست‌به‌دست` |
| **شناسه بسته (Application ID)** | `com.rassa.dastbedast` |
| **نسخه فعلی** | `1.0.0` (`versionCode: 1`) |
| **حداقل نسخه پشتیبانی‌شده** | `minSdkVersion = 24` (**Android 7.0 Nougat** به بالا) |
| **نسخه هدف و کامپایل (SDK)** | `compileSdkVersion = 36`, `targetSdkVersion = 36` |
| **فناوری بومی** | Capacitor 8 (`@capacitor/core`, `@capacitor/android`, `app`, `browser`, `network`, `splash-screen`, `status-bar`) |
| **محتوای وب** | باندل محلی بیلدشده از `dist/` (بدون وابستگی به `server.url` در حالت پیش‌فرض) |
| **جهت‌چیدمان و فونت** | تمام‌راست‌چین (`RTL`) با فونت محلی `Pinar FD` باندل‌شده در `assets/public/fonts/pinar/` |
| **بک‌اند و دیتابیس** | اتصال مستقیم امن (HTTPS + RLS) به پروژه Supabase (`tnlskswcdacgtejgixbc`) فقط با کلید عمومی `anon` |

---

## ساختار فایل‌های اضافه‌شده برای اندروید

- `capacitor.config.ts`: پیکربندی اصلی Capacitor (شناسه بسته، `webDir: 'dist'`، تنظیمات `SplashScreen` و `StatusBar`).
- `android/`: پروژه کامل بومی Android Gradle:
  - `android/variables.gradle`: نسخه‌های SDK (`minSdkVersion = 24`, `targetSdkVersion = 36`) و کتابخانه‌های AndroidX.
  - `android/app/build.gradle`: تنظیمات `versionCode`، `versionName`، Java 21 و امضای اختیاری Release با متغیرهای محیطی.
  - `android/app/src/main/AndroidManifest.xml`: مجوزهای `INTERNET` و `ACCESS_NETWORK_STATE`، پشتیبانی `RTL`، `adjustResize` و Deep Link با طرح `com.rassa.dastbedast://`.
  - `android/app/src/main/java/com/rassa/dastbedast/MainActivity.java`: مدیریت رنگ نوار وضعیت/ناوبری متناسب با نسخه اندروید (Android 7–14 و edge-to-edge اندروید ۱۵+) و فعال‌سازی ذخیره‌سازی WebView.
  - `android/app/src/main/res/`: آیکون‌های استاندارد، گرد، Adaptive و Splash Screen برند دست‌به‌دست (`#174D35` و `#F6F7F2`).
- `src/lib/capacitorBridge.ts` و `src/components/NativeAppBridge.tsx`:
  - بستن نرم Splash Screen پس از آماده شدن احراز هویت
  - مدیریت دکمه Back اندروید (بستن مودال/منو، بازگشت در مسیرها و خروج با دو بار زدن در صفحه خانه)
  - باز کردن لینک‌های خارجی با Custom Tabs (`@capacitor/browser`)
  - همگام‌سازی وضعیت شبکه با `@capacitor/network`
  - مدیریت Deep Link برای تایید ایمیل و بازیابی رمز عبور (`com.rassa.dastbedast://auth/...`)
  - عدم ثبت Service Worker وب در محیط APK تا همیشه فایل‌های باندل‌شده جدید استفاده شوند.
- `.github/workflows/build-android-apk.yml`: Workflow خودکار ساخت APK در GitHub Actions.

---

## ساخت خودکار APK با GitHub Actions

فایل `.github/workflows/build-android-apk.yml` با هر یک از روش‌های زیر اجرا می‌شود:
1. اجرای دستی از تب **Actions -> Build Android APK (Dast Be Dast) -> Run workflow** (`workflow_dispatch`)
2. Push به شاخه `main` یا Pull Request به `main`

### خروجی‌های Workflow
- در هر اجرا، **Debug APK** به نام **`DastBeDast-v1.0.0-debug.apk`** به همراه فایل **`DastBeDast-v1.0.0-debug.apk.sha256`** در بخش **Artifacts** با نام `DastBeDast-v1.0.0-debug-apk` آپلود می‌شود.
- CI قبل از آپلود، به‌طور خودکار با `aapt2 dump badging` بررسی می‌کند که فایل APK سالم، غیرخالی، با `package='com.rassa.dastbedast'` و `minSdkVersion='24'` ساخته شده باشد.

---

## ساخت و تست محلی (روی سیستم توسعه یا Android Studio)

پیش‌نیازها:
- Node.js 22+ و npm
- JDK 21 (Temurin یا OpenJDK)
- Android Studio / Android SDK (با Platform 36 و Build-Tools)

مراحل اجرا:

```bash
# ۱. نصب پکیج‌ها (در صورت نصب‌نبودن)
npm ci

# ۲. بیلد نسخه وب (مسیر پایه /) و همگام‌سازی با پروژه اندروید
VITE_BASE_PATH=/ npm run android:sync

# ۳. ساخت Debug APK با Gradle
cd android
./gradlew --no-daemon assembleDebug
```

فایل خروجی در مسیر زیر ساخته می‌شود:
`android/app/build/outputs/apk/debug/app-debug.apk`

برای باز کردن مستقیم پروژه در Android Studio:

```bash
npm run android:open
```

---

## تنظیم امضای نسخه نهایی (Signed Release APK) با GitHub Secrets

**نکته امنیتی مهم:** فایل `.jks` / `.keystore` و رمزهای امضا **هرگز** نباید در مخزن Git یا کد کلاینت ذخیره شوند (در `android/.gitignore` نیز مسدود شده‌اند).

اگر هنوز Secretهای زیر در ریپازیتوری GitHub تنظیم نشده باشند، Workflow بدون خطا **Debug APK** را تولید می‌کند و مرحله Release را رد می‌کند.

### مراحل فعال‌سازی Release APK:

1. یک کلید امضای اختصاصی روی سیستم امن خود بسازید:

```bash
keytool -genkey -v \
  -keystore dastbedast-release.jks \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias dastbedast
```

2. فایل keystore را به Base64 تبدیل کنید:

```bash
# لینوکس:
base64 -w 0 dastbedast-release.jks

# مک‌اواس:
base64 -i dastbedast-release.jks | tr -d '\n'
```

3. در مخزن GitHub وارد **Settings -> Secrets and variables -> Actions -> New repository secret** شوید و این ۴ Secret را تعریف کنید:

| نام Secret | توضیح |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | خروجی Base64 فایل `dastbedast-release.jks` |
| `ANDROID_KEYSTORE_PASSWORD` | رمز فروشگاه کلید (Keystore Password) |
| `ANDROID_KEY_ALIAS` | نام Alias کلید (مثلاً `dastbedast`) |
| `ANDROID_KEY_PASSWORD` | رمز کلید (Key Password) |

4. پس از ثبت این ۴ Secret، در اجرای بعدی Workflow، خروجی **`DastBeDast-v1.0.0-release.apk`** همراه با فایل `.sha256` در Artifact با نام `DastBeDast-v1.0.0-release-apk` تولید و آپلود می‌شود.

---

## نکات تست روی گوشی یا شبیه‌ساز Android 7.0 (API 24)

پس از دانلود `DastBeDast-v1.0.0-debug.apk` از Artifacts:
- روی گوشی اندروید ۷.۰+: نصب APK و فعال‌سازی گزینه Install from unknown sources در صورت نیاز.
- بررسی موارد کلیدی:
  - نمایش آیکون، نام فارسی «دست‌به‌دست» و Splash Screen برند
  - نمایش صحیح راست‌به‌چپ (RTL) و فونت فارسی `Pinar FD`
  - ورود/ثبت‌نام Supabase و ماندگاری Session پس از بستن و باز کردن مجدد اپ
  - رفتار دکمه Back سخت‌افزاری (بستن منو/دیالوگ -> بازگشت بین صفحات -> دو بار زدن برای خروج از صفحه خانه)
  - پیام آفلاین هنگام قطع اینترنت و همگام‌سازی خودکار هنگام وصل مجدد
  - نمایش درست پیام‌های چت Realtime و اعلان‌ها
