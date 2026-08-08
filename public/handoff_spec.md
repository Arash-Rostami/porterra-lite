# پنل مشتریان — مستند فنی تحویل به توسعه‌دهنده

> نسخه‌ی به‌روزشده — ۵ اوت ۲۰۲۶

> این سند برای برنامه‌نویسی نوشته شده که قراره بک‌اند و فرانت‌اند واقعی برای این سیستم بسازه.
> نسخه‌ی فعلی یک **پروتوتایپ کاملاً کارکردی** است (یک فایل HTML مستقل با جاوااسکریپت، بدون سرور واقعی) که دقیقاً همون منطق، قوانین کسب‌وکار و رفتاری که باید توی نسخه‌ی نهایی باشه رو پیاده‌سازی کرده.

---

## ۰. تغییرات نسبت به نسخه‌ی قبلی این مستند (مهم — از اینجا شروع کن)

اگه قبلاً نسخه‌ی قدیمی‌تر این مستند رو دیدی، این بخش خلاصه‌ی چیزیه که از اون موقع عوض شده — چون **مدل وضعیت رکورد به‌کل بازطراحی شد**:

### تغییر اصلی: سیستم وضعیت از ۴ حالت آزاد به یک ماشین‌حالت مشخص تبدیل شد

قبلاً `result` می‌تونست `موفق`, `ناموفق`, `در حال پیگیری`, `بی‌پاسخ` باشه. **الان فقط ۴ مقدار مجازه:**

| مقدار `result` | معنی |
|---|---|
| `در حال پیگیری` | نیاز به تماس مجدد؛ می‌تونه یادآوری داشته باشه؛ توی «پیشنهاد تماس امروز» می‌آد |
| `در حال استعلام` | یک «استعلام» باز شده برای این سرنخ — وارد چرخه‌ی جدید قیمت/نتیجه می‌شه (بخش ۴.۲) |
| `بی‌پاسخ` | تماس گرفته شده ولی جواب نداده؛ هم دستی قابل‌انتخابه هم خودکار از روی یادداشت تشخیص داده می‌شه |
| `غیرفعال` | سرنخ کلاً کنار گذاشته شده؛ نیاز به دلیل اجباریه؛ به‌طور پیش‌فرض از جدول اصلی مخفیه |
| *(خالی/null)* | هنوز هیچ اقدامی نشده |

⚠️ **«موفق» و «ناموفق» دیگه مقادیر مستقیم `result` نیستن.** «موفق‌شدن» فقط از طریق حل‌شدن یک استعلام به نتیجه می‌رسه (بخش ۴.۲) و باعث `converted = true` می‌شه.

### قابلیت‌های کاملاً جدید که اضافه شدن
- **زیرسیستم استعلام (Quote)** با گردش‌کار سه‌مرحله‌ای: باز شدن استعلام → اعلام قیمت → نتیجه (بخش ۴.۲)
- **پنل استعلام‌های باز** با آمار کلیک‌پذیر (باز/موفق/ناموفق) که لیست پایینش فیلتر می‌شه
- **جعبه‌ی جزئیات استعلام** (مودال سبک، جدا از فرم کامل تماس)
- **افزودن محصول جدید** از داخل هر فرم، با دسته‌بندی، که برای همیشه به لیست عمومی اضافه می‌شه
- **گزارش‌ساز شخصی‌سازی‌شده** (انتخاب ستون + فیلتر + خروجی اکسل)
- **میانبرهای شناور کناری صفحه**
- **حالت تیره/روشن**
- فانل تبدیل بازطراحی شد: `کل سرنخ‌ها → در حال استعلام → فروش شده` + دو نرخ تبدیل جدا (سرنخ→مشتری، استعلام→فروش)
- KPI بالای صفحه بازطراحی شد: تعداد کل سرنخ‌ها / مشتری شده / استعلام‌های در جریان / غیرفعال شده / در حال پیگیری / بی‌پاسخ

---

## ۱. خلاصه‌ی سیستم

یک CRM ساده برای تیم فروش (کارشناسان تماس) که:
- تماس‌ها و سرنخ‌های بالقوه/موجود رو ثبت و پیگیری می‌کنه
- استعلام‌های قیمت رو با گردش‌کار مشخص (اعلام قیمت → نتیجه) پیگیری می‌کنه
- به هر کارشناس پیشنهاد می‌ده امروز با کی تماس بگیره
- گزارش عملکرد (بر اساس کارشناس، بر اساس شرکت، یا کاملاً سفارشی) می‌سازه
- امکان یادآوری، مکاتبات داخلی، ورود/خروج اکسل داره

**کاربران:** ۳ کارشناس فروش (فرناز، پردیس، زهره) — سیستم چندکاربره بدون احراز هویت واقعی.

**حجم فعلی داده:** ~۱,۴۷۷ رکورد تماس.

---

## ۲. وضعیت فعلی (پروتوتایپ) — محدودیت‌ها

| محدودیت فعلی | چرا مهمه برای بک‌اند واقعی |
|---|---|
| بدون احراز هویت واقعی | باید سیستم لاگین واقعی (JWT/session) پیاده بشه |
| بدون کنترل دسترسی | نیاز به نقش‌بندی (admin/agent) و مجوزها |
| بدون تراکنش/قفل — آخرین نوشته برنده‌ست | دیتابیس واقعی + تراکنش لازمه |
| بدون pagination سمت سرور | باید API صفحه‌بندی/فیلتر سمت سرور داشته باشه |
| تاریخ‌ها رشته‌ی متنی `dd.mm.yyyy` هستن، نه `Date` واقعی | باید در دیتابیس `DATE` باشه |
| منطق (پیشنهادها، تشخیص تکراری، اعتبارسنجی استعلام) فقط سمت کلاینته | **باید عیناً سمت سرور هم enforce بشه** |

---

## ۳. مدل داده (Entities)

### ۳.۱ `CallRecord` — موجودیت اصلی

هر رکورد یعنی **یک تماس/تعامل با یک شرکت در یک تاریخ مشخص**.

| فیلد | نوع فعلی (JS) | توضیح | پیشنهاد نوع DB |
|---|---|---|---|
| `id` | string | شناسه یکتا (پیشوند نشون‌دهنده منبع: `REC-`ایمپورت اولیه، `NEW-`فرم مشتری جدید، `CALL-`ثبت تماس جدید) | `BIGINT AUTO_INCREMENT` / `UUID` |
| `coordinator` | enum: `FARNAZ`\|`PARDIS`\|`ZOHREH` | کارشناس مسئول | `FK -> agents.id` |
| `company` | string | نام شرکت | `VARCHAR(255)` + ایندکس |
| `name` | string\|null | نام مخاطب | `VARCHAR(255)` NULL |
| `phone` | string\|null | تلفن | `VARCHAR(50)` NULL |
| `product` | string\|null | محصول — از یک لیست قابل‌گسترش (بخش ۴.۹) | `VARCHAR(100)` NULL، یا `FK -> products.id` |
| `category` | enum: `Chemical/Polymer`\|`Solar` | فقط همین دو دسته | `ENUM` |
| `source` | string\|null | منبع سرنخ | `VARCHAR(100)` NULL |
| `date` | string `dd.mm.yyyy` | تاریخ تماس/ثبت سرنخ | `DATE` |
| `price` | string\|null | فیلد قدیمی «قیمت اعلامی» — فقط در فرم مشتری‌جدید و پروفایل باقی مونده؛ از فرم «ثبت تماس جدید» حذف شده | `VARCHAR` NULL |
| `result` | enum یا null | یکی از ۴ مقدار بخش ۰، یا خالی | `ENUM('در حال پیگیری','در حال استعلام','بی‌پاسخ','غیرفعال')` NULL |
| `priority` | enum یا null | `بالا`\|`متوسط`\|`پایین` | `ENUM` NULL |
| `notes` | text\|null | یادداشت آزاد | `TEXT` NULL |
| `converted` | boolean | مشتری نهایی شده؟ فقط با حل موفق یک استعلام `true` می‌شه | `BOOLEAN DEFAULT false` |
| `deactivateReason` | string\|null | **الزامی وقتی `result==='غیرفعال'`** | `TEXT` NULL |
| **فیلدهای زیرسیستم استعلام (فقط وقتی `result==='در حال استعلام'` معنا دارن):** |
| `quotePrice` | string\|null | قیمت اعلامی به مشتری | `VARCHAR` NULL |
| `quotePriceType` | string\|null | نوع قیمت (مثلاً FOB/CIF/نقدی) | `VARCHAR(50)` NULL |
| `quoteTerms` | string\|null | شرایط (تحویل، پرداخت و...) | `TEXT` NULL |
| `quotePriceDate` | string `dd.mm.yyyy`\|null | تاریخ اعلام قیمت — **جدا از تاریخ ثبت اولیه‌ی سرنخ** | `DATE` NULL |
| `quoteResult` | `موفق`\|`ناموفق`\|null | نتیجه‌ی نهایی استعلام؛ `null` یعنی هنوز باز/حل‌نشده | `ENUM` NULL |
| `quoteResultDate` | string `dd.mm.yyyy`\|null | تاریخ ثبت نتیجه | `DATE` NULL |
| `quoteFailReason` | string\|null | **الزامی وقتی `quoteResult==='ناموفق'`** | `TEXT` NULL |

⚠️ همینجا هم توصیه‌ی قبلی رو تکرار می‌کنم: پیشنهاد می‌شه یک جدول `Customer` جدا با `id` واقعی بسازی و `CallRecord.customer_id` بهش وصل بشه، به‌جای گروه‌بندی بر اساس نام نرمال‌شده‌ی شرکت (`custKey`) که در پروتوتایپ فعلی استفاده می‌شه.

### ۳.۲ `CustomerMeta` (مکاتبات + تاریخچه تغییرات)

بدون تغییر نسبت به قبل — به ازای هر شرکت، دو آرایه‌ی `comments[]` و `changeLog[]` که با `ts` مرتب و در یک فید ادغام می‌شن.

### ۳.۳ `Reminder`

بدون تغییر — `{ id, custKey, company, dueDate, dueTime, forAgent, text, createdAt, done }`.

### ۳.۴ `Agent`

بدون تغییر — فعلاً hardcoded (`FARNAZ`, `PARDIS`, `ZOHREH`)، باید جدول واقعی بشه.

### ۳.۵ `Product` (جدید)

قبلاً یک لیست ثابت (`PRODUCT_OPTS`) بود. الان کاربر می‌تونه از داخل هر فرم محصول جدید اضافه کنه که در `localStorage`-معادل (`window.storage`, کلید `crm_custom_products_v1`) ذخیره می‌شه:

```json
{ "name": "SODIUM SULFATE", "category": "Chemical/Polymer" }
```

**پیشنهاد جدول واقعی:**
```sql
CREATE TABLE products (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(150) UNIQUE NOT NULL,
  category   VARCHAR(50) NOT NULL,
  is_custom  BOOLEAN DEFAULT true,   -- false برای ۱۹ محصول پایه‌ی اولیه
  created_at TIMESTAMP DEFAULT now()
);
```

### دیاگرام رابطه‌ی پیشنهادی

```
Agent (1) ───< (N) CallRecord (N) >─── (1) Customer
                      │                        │
                      │                        └──< CustomerActivity (comments + changelog)
                      │
                      └──< (Product می‌تونه FK باشه)

Customer (1) ───< (N) Reminder >─── (1) Agent (forAgent)
```

---

## ۴. منطق کسب‌وکار (باید عیناً در بک‌اند پیاده بشه)

### ۴.۱ تشخیص خودکار «بی‌پاسخ» از روی یادداشت

```js
const FAIL_NOTE_PATTERNS = ['یادم نمیاد','جواب نداد','پاسخ نداد','جواب نمی','پاسخ نمی'];

function effectiveResult(record) {
  if (record.result) return record.result;
  if (record.notes && FAIL_NOTE_PATTERNS.some(p => record.notes.includes(p))) return 'بی‌پاسخ';
  return null;
}
```

### ۴.۲ گردش‌کار استعلام (Quote Lifecycle) — مهم‌ترین بخش جدید سیستم

وقتی کارشناس وضعیت رکوردی رو `در حال استعلام` می‌ذاره، اون رکورد وارد یک ماشین‌حالت سه‌مرحله‌ای می‌شه:

```
[در حال استعلام، بدون قیمت]
        │  کارشناس روی «اعلام قیمت» کلیک می‌کنه
        │  و quotePrice + quotePriceType + quoteTerms رو پر می‌کنه
        ▼
[در انتظار جواب مشتری]   (quotePrice ست شده، quoteResult هنوز خالیه)
   quotePriceDate = تاریخ همین لحظه
        │  کارشناس روی «موفق» یا «ناموفق» کلیک می‌کنه
        ▼
[حل‌شده]
   quoteResult = 'موفق' | 'ناموفق'
   quoteResultDate = تاریخ همین لحظه
   اگر 'موفق': customer.converted = true
   اگر 'ناموفق': quoteFailReason الزامیه (نمی‌شه بدون دلیل ثبت کرد)
```

**نکته‌ی مهم محاسباتی:** «مدت‌زمان استعلام» (که در پنل استعلام‌ها نمایش داده می‌شه) از تفاضل `quoteResultDate - quotePriceDate` محاسبه می‌شه، **نه** از تاریخ اولیه‌ی ثبت سرنخ. یعنی می‌خوایم بدونیم «از وقتی قیمت اعلام شد تا وقتی مشتری جواب داد چقدر طول کشید»، نه کل عمر سرنخ.

```js
const duration = (quoteResultDate && quotePriceDate)
  ? daysBetween(quotePriceDate, quoteResultDate)
  : null;
```

هر ۳ رکورد UI متفاوت بر همین ۳ حالت سوار می‌شن (پنل لیست استعلام‌ها، جعبه‌ی جزئیات استعلام، و بنر بالای صفحه).

### ۴.۳ موتور «پیشنهاد تماس امروز»

بدون تغییر ساختاری نسبت به قبل، فقط با enum جدید هماهنگ شده:
1. فقط **آخرین رکورد هر شرکت** در نظر گرفته می‌شه.
2. اگه `converted===true` یا `result==='غیرفعال'` یا `result==='در حال استعلام'` باشه → پیشنهاد نمی‌شه (استعلام‌ها جای دیگه‌ای پیگیری می‌شن، نه اینجا).
3. اگه تاریخ آخرین تماس امروز یا آینده باشه → پیشنهاد نمی‌شه.
4. اولویت‌بندی: بدون‌وضعیت (فوری) > بی‌پاسخ (همیشه) > اولویت بالا > گذشت ≥۳ روز.

### ۴.۴ قیف تبدیل (Funnel) — بازطراحی‌شده

```
کل سرنخ‌ها (کل رکوردها)
  → در حال استعلام: تعداد رکوردهایی که result === 'در حال استعلام' (صرف‌نظر از حل‌شدن)
    → فروش‌شده: از بین اونا، quoteResult === 'موفق'

نرخ تبدیل سرنخ‌به‌مشتری = (کل converted===true) / (کل سرنخ‌ها)
نرخ تبدیل استعلام‌به‌فروش = (quoteResult==='موفق') / (کل رکوردهای در-حال-استعلام، باز یا بسته)
```

### ۴.۵ گزارش کارشناس / پروفایل کارشناس

هر دو (کارت خلاصه و پروفایل کامل) از یک منطق مشترک تغذیه می‌شن — به ازای هر کارشناس (با فیلتر اختیاری بازه‌ی تاریخ):

```
noAnswer     = تعداد effectiveResult === 'بی‌پاسخ'
deactivated  = تعداد effectiveResult === 'غیرفعال'
followUp     = تعداد effectiveResult === 'در حال پیگیری'
quoteOpen    = تعداد result==='در حال استعلام' && !quoteResult
quoteWon     = تعداد quoteResult === 'موفق'
quoteLost    = تعداد quoteResult === 'ناموفق'
customers    = تعداد converted === true
conversionRate    = customers / کل × ۱۰۰                              (سرنخ→مشتری)
quoteToSaleRate   = quoteWon / (quoteWon+quoteLost+quoteOpen) × ۱۰۰   (استعلام→فروش)
```

⚠️ **این یه باگ واقعی بود که در همین دور توسعه پیدا و رفع شد:** نسخه‌ی قبلی این محاسبه هنوز دنبال enumهای حذف‌شده‌ی `موفق`/`ناموفق` می‌گشت و همیشه صفر برمی‌گردوند. اگه یه‌جای دیگه از کد هم مشابه این الگو دیدی، حتماً چک کن enumهای جدید استفاده شده باشن.

### ۴.۶ تشخیص داده‌ی تکراری

بدون تغییر — مقایسه‌ی نام شرکت نرمال‌شده + ۸ رقم آخر تلفن.

### ۴.۷ افزودن محصول جدید

```js
function addCustomProduct(name, category) {
  const exists = customProducts.some(p => p.name.toLowerCase() === name.toLowerCase())
              || BASE_PRODUCTS.some(p => p.toLowerCase() === name.toLowerCase());
  if (!exists) {
    customProducts.push({ name, category });
    persist(customProducts);            // باید سمت سرور هم یکتا/دیدوپ بشه
  }
  return name; // بلافاصله در دراپ‌داون فعلی انتخاب می‌شه
}
```

### ۴.۸ وارد کردن گروهی از اکسل (Import)

بدون تغییر ساختاری. جدول نگاشت ستون‌ها در بخش ۵ همون سند قبلیه.

---

## ۵. فهرست کامل قابلیت‌ها (Feature Inventory)

| # | قابلیت | توضیح |
|---|---|---|
| ۱ | داشبورد KPI (۶ کارت) | تعداد کل سرنخ‌ها، مشتری شده، استعلام‌های در جریان، غیرفعال شده، در حال پیگیری، بی‌پاسخ — با انیمیشن شمارشی |
| ۲ | قیف تبدیل | کل سرنخ‌ها → در حال استعلام → فروش‌شده + دو نرخ تبدیل جدا |
| ۳ | کارشناسان | چیپ هر کارشناس (فیلتر جدول) + دکمه «پروفایل» |
| ۴ | پروفایل کارشناس | فیلتر بازه تاریخ + breakdown کامل وضعیت‌ها + دو نرخ تبدیل (حلقه‌ای) + لیست تماس‌های آن بازه |
| ۵ | گزارش‌ساز بر اساس شرکت / پروفایل شرکت | جست‌وجوی هوشمند + آمار کامل (کل تماس، پیگیری، استعلام باز/موفق/ناموفق، نرخ برد) + تایم‌لاین + نمودار ماهانه |
| ۶ | گزارش کارشناس | کارت هر کارشناس با breakdown ۵ وضعیت + دو نرخ تبدیل + تب کل/امروز/این‌هفته + دکمه نمایش لیست تماس‌های آن بازه + خروجی اکسل |
| ۷ | پیشنهاد تماس امروز | فیلتر دسته/محصول/جست‌وجو per-agent + خروجی اکسل |
| ۸ | **پنل استعلام‌های باز (جدید)** | لیست تمام استعلام‌ها با نشانگر مرحله (در انتظار قیمت / در انتظار جواب مشتری / حل‌شده)؛ ۳ کارت آمار کلیک‌پذیر (باز/موفق/ناموفق) که لیست رو فیلتر می‌کنن |
| ۹ | **جعبه‌ی جزئیات استعلام (جدید)** | مودال سبک و جدا از فرم اصلی؛ فرم اعلام قیمت (قیمت+نوع+شرایط)؛ دکمه‌های موفق/ناموفق با اجبار دلیل برای ناموفق؛ لینک به پروفایل کامل |
| ۱۰ | یادآوری‌ها | ساخت با تاریخ+ساعت هنگام «در حال پیگیری»؛ بنر یادآوری‌های سررسیدشده |
| ۱۱ | نمودار روزانه ماه جاری | به تفکیک کارشناس، سقف‌گذاری هوشمند برای روزهای پرت |
| ۱۲ | نمودار منابع سرنخ | Bar chart کلیک‌پذیر |
| ۱۳ | جدول اصلی («جدول تماس‌ها») | جست‌وجوی زنده، فیلتر کارشناس/دسته/منبع/وضعیت/قیمت/بازه تاریخ، چک‌باکس «نمایش غیرفعال‌ها»، صفحه‌بندی، مرتب‌سازی، ویرایش/حذف |
| ۱۴ | پروفایل مشتری | فرم کامل + تاریخچه + «ثبت تماس جدید» (پیش‌پرشده) + مکاتبات + تاریخچه خودکار |
| ۱۵ | افزودن مشتری جدید | فرم مستقل؛ هشدار داده تکراری زنده |
| ۱۶ | **افزودن محصول جدید (جدید)** | دکمه «+» کنار هر دراپ‌داون محصول؛ نام+دسته؛ فوراً در همه‌جا در دسترس |
| ۱۷ | ورود/خروج اکسل | Import با نگاشت هوشمند + قالب آماده + Export کامل |
| ۱۸ | حالت تیره/روشن | با پرسیستنس شخصی |
| ۱۹ | واکنش‌گرا (موبایل) | ستون‌های کم‌اهمیت جدول در موبایل مخفی می‌شن |
| ۲۰ | بخش‌های جمع‌شونده | هر ماژول/نمودار قابل جمع/باز شدن |
| ۲۱ | **میانبرهای شناور کناری (جدید)** | «ثبت تماس جدید» و «گزارش‌ساز» همیشه در دسترس |
| ۲۲ | **گزارش‌ساز شخصی‌سازی‌شده (جدید)** | انتخاب ستون + فیلتر (کارشناس/دسته/وضعیت/تاریخ) + جدول نتیجه + خروجی اکسل |

---

## ۶. پیشنهاد Schema دیتابیس رابطه‌ای (به‌روزشده)

```sql
CREATE TABLE agents (
  id            SERIAL PRIMARY KEY,
  code          VARCHAR(20) UNIQUE NOT NULL,
  display_name  VARCHAR(100) NOT NULL,
  color_hex     VARCHAR(7),
  active        BOOLEAN DEFAULT true,
  created_at    TIMESTAMP DEFAULT now()
);

CREATE TABLE products (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(150) UNIQUE NOT NULL,
  category   VARCHAR(50) NOT NULL,      -- 'Chemical/Polymer' | 'Solar'
  is_custom  BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE customers (
  id                SERIAL PRIMARY KEY,
  company_name      VARCHAR(255) NOT NULL,
  normalized_name   VARCHAR(255) UNIQUE NOT NULL,
  converted         BOOLEAN DEFAULT false,
  created_at        TIMESTAMP DEFAULT now()
);
CREATE INDEX idx_customers_normalized ON customers(normalized_name);

CREATE TABLE call_records (
  id                 SERIAL PRIMARY KEY,
  customer_id        INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  agent_id           INTEGER REFERENCES agents(id),
  contact_name       VARCHAR(255),
  phone              VARCHAR(50),
  product_id         INTEGER REFERENCES products(id),
  category           VARCHAR(50),
  source             VARCHAR(100),
  call_date          DATE NOT NULL,
  price              VARCHAR(50),                 -- فیلد قدیمی، فقط فرم مشتری‌جدید/پروفایل
  result             VARCHAR(30),                 -- 'در حال پیگیری'|'در حال استعلام'|'بی‌پاسخ'|'غیرفعال'|NULL
  priority           VARCHAR(10),
  notes              TEXT,
  converted          BOOLEAN DEFAULT false,
  deactivate_reason  TEXT,                        -- الزامی وقتی result='غیرفعال'

  -- زیرسیستم استعلام
  quote_price        VARCHAR(100),
  quote_price_type   VARCHAR(50),
  quote_terms        TEXT,
  quote_price_date   DATE,                        -- تاریخ اعلام قیمت (جدا از call_date)
  quote_result       VARCHAR(10),                 -- 'موفق' | 'ناموفق' | NULL
  quote_result_date  DATE,
  quote_fail_reason  TEXT,                        -- الزامی وقتی quote_result='ناموفق'

  created_at         TIMESTAMP DEFAULT now(),
  updated_at         TIMESTAMP DEFAULT now(),

  CONSTRAINT chk_deactivate_reason CHECK (result != 'غیرفعال' OR deactivate_reason IS NOT NULL),
  CONSTRAINT chk_quote_fail_reason CHECK (quote_result != 'ناموفق' OR quote_fail_reason IS NOT NULL)
);
CREATE INDEX idx_calls_customer ON call_records(customer_id);
CREATE INDEX idx_calls_agent_date ON call_records(agent_id, call_date);
CREATE INDEX idx_calls_result ON call_records(result);
CREATE INDEX idx_calls_quote_open ON call_records(result, quote_result) WHERE result = 'در حال استعلام';

CREATE TABLE customer_activity (
  id           SERIAL PRIMARY KEY,
  customer_id  INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type         VARCHAR(10) NOT NULL CHECK (type IN ('comment','change')),
  author       VARCHAR(100),
  text         TEXT NOT NULL,
  created_at   TIMESTAMP DEFAULT now()
);
CREATE INDEX idx_activity_customer ON customer_activity(customer_id, created_at);

CREATE TABLE reminders (
  id           SERIAL PRIMARY KEY,
  customer_id  INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  agent_id     INTEGER REFERENCES agents(id),
  due_at       TIMESTAMP NOT NULL,
  text         TEXT,
  done         BOOLEAN DEFAULT false,
  created_at   TIMESTAMP DEFAULT now()
);
CREATE INDEX idx_reminders_due ON reminders(due_at) WHERE done = false;

CREATE TABLE users (
  id             SERIAL PRIMARY KEY,
  agent_id       INTEGER REFERENCES agents(id),
  email          VARCHAR(255) UNIQUE NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  role           VARCHAR(20) DEFAULT 'agent',
  created_at     TIMESTAMP DEFAULT now()
);
```

---

## ۷. پیشنهاد API (REST) — به‌روزشده

```
Auth
  POST   /api/auth/login
  POST   /api/auth/logout

Customers
  GET    /api/customers?search=&page=&pageSize=
  GET    /api/customers/:id                     — شامل breakdown کامل آمار (مثل بخش ۴.۵)
  POST   /api/customers
  PATCH  /api/customers/:id

Call Records
  GET    /api/calls?agent=&category=&status=&hasPrice=&dateFrom=&dateTo=&search=&page=
  POST   /api/calls
  PATCH  /api/calls/:id                          — اعتبارسنجی deactivate_reason/quote_fail_reason سمت سرور enforce بشه
  DELETE /api/calls/:id

Quotes (زیرمجموعه‌ی call_records با result='در حال استعلام')
  GET    /api/quotes?status=open|success|fail
  POST   /api/quotes/:id/announce-price          — body: { price, priceType, terms }
  POST   /api/quotes/:id/resolve                 — body: { result: 'موفق'|'ناموفق', failReason? }
                                                     — سرور باید failReason رو وقتی result='ناموفق' الزامی کنه

Products
  GET    /api/products
  POST   /api/products                           — body: { name, category }؛ یکتایی نام enforce بشه

Suggestions
  GET    /api/suggestions?agent=&category=&product=&search=

Reports
  GET    /api/reports/funnel
  GET    /api/reports/agent/:agentId?dateFrom=&dateTo=
  GET    /api/reports/company/:customerId
  POST   /api/reports/custom                     — body: { columns[], filters{} } → جدول یا فایل اکسل

Activity / Reminders / Import-Export
  (بدون تغییر نسبت به نسخه‌ی قبلی این مستند)
```

**نکته حیاتی امنیتی:** موتور پیشنهادها، تشخیص تکراری، **و همه‌ی قوانین اعتبارسنجی زیرسیستم استعلام** (اجباری‌بودن دلیل ناموفقی، ترتیب مراحل قیمت→نتیجه، یکتایی محصول) باید در بک‌اند هم enforce بشن، چون توی پروتوتایپ فعلی این‌ها فقط سمت کلاینت چک می‌شن.

---

## ۸. نکات UI/UX

بدون تغییر نسبت به نسخه‌ی قبلی این مستند — RTL، فونت Vazirmatn/JetBrains Mono، پالت رنگ مستند شده، دراپ‌داون‌های سفارشی (به‌خاطر محدودیت sandbox، در فرانت واقعی لازم نیست). **یک نکته‌ی جدید:** به‌خاطر همون محدودیت sandbox، دیالوگ‌های تأیید (`confirm()`) و همچنین submit فرم‌های native هم غیرفعال بودن و با کامپوننت‌های سفارشی جایگزین شدن — این محدودیت‌ها هم فقط مخصوص محیط Claude Artifacts هستن و در فرانت واقعی صدق نمی‌کنن.

---

## ۹. مرجع نهایی: خود پروتوتایپ

فایل `panel_mostaqel_moshtarian.html` **دقیق‌ترین منبع رفتار سیستمه** — مخصوصاً برای گردش‌کار استعلام (بخش ۴.۲) که بهترین راه فهمیدنش امتحان‌کردن مستقیمه: یه سرنخ جدید با وضعیت «در حال استعلام» بساز، از پنل استعلام‌ها روش کلیک کن، قیمت اعلام کن، و نتیجه رو ثبت کن تا کل چرخه رو با چشم ببینی.
