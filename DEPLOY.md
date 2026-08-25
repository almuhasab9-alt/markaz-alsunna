# 🚀 دليل النشر على Cloudflare — مركز السنة

نشر كامل على Cloudflare Pages + قاعدة D1 إنتاجية. **التكلفة: 0 ريال** ضمن الخطة المجانية (مركز بحجمك سيستخدم أقل من 1% من الحدود).

---

## المرحلة 1 — التحضير (مرة واحدة)

1. **حساب Cloudflare** (مجاني، بلا بطاقة بنانية): سجّل في `dash.cloudflare.com`
2. **Node.js 18 أو أحدث** على جهازك: `node -v`
3. **تسجيل الدخول من الطرفية:**
   ```bash
   npx wrangler login
   ```
   سيفتح المتصفح → اضغط Allow. تحقق:
   ```bash
   npx wrangler whoami
   ```

---

## المرحلة 2 — إنشاء قاعدة البيانات الإنتاجية

```bash
npx wrangler d1 create webapp-production
```

سينسخ لك `database_id` بهذا الشكل:
```
✅ Successfully created DB 'webapp-production' in region ...
database_id = "a1b2c3d4-...."
```

**ضع هذا المعرّف في `wrangler.jsonc`** بدل القيمة المؤقتة:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "webapp-production",
    "database_id": "الصق-المعرّف-هنا",
    "migrations_dir": "migrations"
  }
]
```

> ⚠️ احتفظ بالمعرّف — هو الوحيد الذي يتغير بين جهازك والخادم.

---

## المرحلة 3 — النشر

```bash
npm install
npm run deploy        # = npm run build && wrangler pages deploy
```

- أول نشر ينشئ مشروع Pages باسم `markaz-alsunna` تلقائياً (من `wrangler.jsonc`)
- ستحصل على رابط: **`https://markaz-alsunna.pages.dev`** 🎉
- الربط بين التطبيق وقاعدة D1 يُطبَّق تلقائياً من `wrangler.jsonc`

**تحقق من الربط** (Dashboard → Workers & Pages → markaz-alsunna → Settings → Bindings): يجب أن ترى `D1 Database: DB → webapp-production`. إن لم يظهر (نادراً)، أضفه يدوياً من نفس الصفحة.

---

## المرحلة 4 — تهيئة قاعدة الإنتاج

### 1) تطبيق مخطط الجداول (إلزامي)
```bash
npm run db:migrate:remote
```

### 2) إنشاء حساب المدير (إلزامي)
> ⛔ **لا تنفّذ `seed.sql` على الإنتاج أبداً** — فيه بيانات تجريبية وكلمة مرور معروفة منشورة في المستودع!

استخدم السكربت المرفق (ينشئ المدير فقط بتشفير مطابق للتطبيق):
```bash
npm run create-admin -- "اسم المدير" admin@نطاقك.com "كلمة-مرور-قوية"
```
- يعمل على الإنتاج مباشرة (أضف `--local` للتجربة محلياً)
- إن كرّرته بنفس البريد يحدّث كلمة المرور بدل التكرار

### 3) التحقق
افتح `https://markaz-alsunna.pages.dev` وسجّل الدخول بحساب المدير، ثم:
- ⚙️ غيّر كلمة المرور من داخل التطبيق فوراً
- أنشئ المعلمين والحلقات والطلاب الحقيقيين من الواجهة
- عدّل اسم المركز والعنوان الفرعي من `PUT /api/settings` أو من شاشة الإعدادات

---

## المرحلة 5 — نطاق خاص (اختياري)

Dashboard → Workers & Pages → markaz-alsunna → **Custom domains** → Set up:
- **نطاق على Cloudflare**: اختره من القائمة (الشهادة والـ SSL تلقائية فوراً)
- **نطاق من مزوّد آخر**: أضف سجل `CNAME` يشير إلى `markaz-alsunna.pages.dev`

كل المسارات تمر عبر الـ Worker (`app.get('*')`) فلا تحتاج أي إعداد إضافي للـ SPA.

---

## التشغيل اليومي

| المهمة | الأمر |
|---|---|
| نشر تحديث | `npm run deploy` |
| ترحيل تعديلات قاعدة | ضع ملفاً في `migrations/` ثم `npm run db:migrate:remote` |
| استعلام سريع | `npx wrangler d1 execute webapp-production --remote --command "SELECT COUNT(*) FROM students"` |
| نسخة احتياطية | `npx wrangler d1 export webapp-production --remote --output backup.sql` |
| استرجاع نسخة | `npx wrangler d1 execute webapp-production --remote --file backup.sql` |
| سجلات الخادم الحية | `npx wrangler tail` (أو Dashboard → Deployments → Functions → Real-time logs) |

---

## ✅ قائمة فحص ما قبل الإنتاج (مهمة!)

- [ ] `seed.sql` **لم** يُنفّذ على قاعدة الإنتاج
- [ ] كلمة مرور المدير قوية وتم تغييرها من داخل التطبيق
- [ ] `database_id` الصحيح في `wrangler.jsonc` (وليس `local-dev-placeholder`)
- [ ] فحص Bindings في الداشبورد: `DB → webapp-production`
- [ ] تجربة تسجيل الدخول بثلاثة أدوار: مدير / معلم / ولي أمر
- [ ] أخذ أول نسخة احتياطية بعد إدخال البيانات الحقيقية

## حدود الخطة المجانية (للاطمئنان)

| المورد | الحد المجاني | استخدامك المتوقع |
|---|---|---|
| طلبات API | 100,000 / يوم | بضعة آلاف |
| قراءة صفوف D1 | 5,000,000 / يوم | عشرات آلاف |
| كتابة صفوف D1 | 100,000 / يوم | مئات |
| مساحة D1 | 5 GB | أقل من 50 MB |
| باندويث الواجهة | غير محدود | — |

حتى لو تجاوزت كل التوقعات، الخطة المدفوعة كلها **5$/شهر**.
