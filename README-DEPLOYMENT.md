# 🚀 دليل نشر مشروع Minecraft Telegram Bot على Fly.io

هذا الدليل يوضح خطوات نشر مشروع بوت تلغرام لإدارة ماين كرافت على منصة Fly.io بالتفصيل.

## 📋 المتطلبات الأساسية

### 1. إنشاء حساب على Fly.io
- اذهب إلى [fly.io](https://fly.io)
- أنشئ حساب جديد أو سجل دخول
- ستحصل على رصيد مجاني للبداية

### 2. تثبيت Fly CLI
```bash
# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex

# macOS/Linux
curl -L https://fly.io/install.sh | sh
```

### 3. تسجيل الدخول
```bash
fly auth login
```

## ⚙️ إعداد المشروع

### 1. إعداد متغيرات البيئة
انسخ ملف `.env.example` إلى `.env` وقم بتعديل القيم:

```bash
cp .env.example .env
```

قم بتعديل الملف وإضافة:
```env
TELEGRAM_BOT_TOKEN=your_actual_bot_token_here
TELEGRAM_ADMIN_IDS=your_telegram_user_id
DATABASE_PATH=/app/data/bot_data.db
NODE_ENV=production
PORT=3000
```

### 2. الحصول على توكن بوت تلغرام
1. ابحث عن `@BotFather` في تلغرام
2. أرسل `/newbot`
3. اتبع التعليمات لإنشاء بوت جديد
4. احفظ التوكن الذي ستحصل عليه

### 3. معرفة معرف المستخدم في تلغرام
1. ابحث عن `@userinfobot` في تلغرام
2. أرسل `/start`
3. احفظ الرقم الذي سيظهر لك

## 🚀 خطوات النشر

### 1. تهيئة التطبيق على Fly.io
```bash
fly launch
```

سيسألك عدة أسئلة:
- **App name**: اختر اسم فريد للتطبيق (مثل: minecraft-bot-yourname)
- **Region**: اختر `fra` (Frankfurt) للحصول على أفضل أداء في الشرق الأوسط
- **Database**: اختر `No` (سنستخدم SQLite)
- **Deploy now**: اختر `No` (سنعد المتغيرات أولاً)

### 2. إعداد متغيرات البيئة على Fly.io
```bash
# إعداد توكن البوت
fly secrets set TELEGRAM_BOT_TOKEN="your_bot_token_here"

# إعداد معرفات الأدمن
fly secrets set TELEGRAM_ADMIN_IDS="your_user_id"

# إعداد باقي المتغيرات
fly secrets set NODE_ENV="production"
fly secrets set DATABASE_PATH="/app/data/bot_data.db"
fly secrets set PORT="3000"
```

### 3. إنشاء Volume للبيانات
```bash
fly volumes create bot_data --size 1
```

### 4. نشر التطبيق
```bash
fly deploy
```

### 5. التحقق من حالة التطبيق
```bash
# عرض حالة التطبيق
fly status

# عرض السجلات
fly logs

# فتح التطبيق في المتصفح
fly open
```

## 🔧 إدارة التطبيق

### مراقبة السجلات
```bash
# عرض السجلات المباشرة
fly logs -f

# عرض آخر 100 سطر
fly logs --lines 100
```

### إعادة تشغيل التطبيق
```bash
fly restart
```

### تحديث التطبيق
```bash
# بعد تعديل الكود
fly deploy
```

### إيقاف التطبيق
```bash
fly suspend
```

### تشغيل التطبيق مرة أخرى
```bash
fly resume
```

## 🛠️ استكشاف الأخطاء

### مشكلة في الاتصال بتلغرام
```bash
# تحقق من التوكن
fly secrets list

# تحديث التوكن
fly secrets set TELEGRAM_BOT_TOKEN="new_token"
```

### مشكلة في قاعدة البيانات
```bash
# تحقق من Volume
fly volumes list

# الاتصال بالتطبيق
fly ssh console
```

### فحص صحة التطبيق
```bash
# زيارة health check endpoint
curl https://your-app-name.fly.dev/health
```

## 💰 التكلفة

- **الاستخدام المجاني**: يشمل 160 ساعة شهرياً مجاناً
- **التطبيق الصغير**: عادة يكلف أقل من $5 شهرياً
- **Volume 1GB**: مجاني ضمن الحد المسموح

## 🔒 الأمان

### حماية التوكن
- لا تضع التوكن في الكود مباشرة
- استخدم `fly secrets` دائماً
- لا تشارك ملف `.env`

### تحديث التوكن
```bash
fly secrets set TELEGRAM_BOT_TOKEN="new_token"
fly restart
```

## 📞 الدعم

إذا واجهت مشاكل:
1. تحقق من السجلات: `fly logs`
2. تحقق من حالة التطبيق: `fly status`
3. راجع [وثائق Fly.io](https://fly.io/docs/)

## 🎉 تهانينا!

مشروعك الآن يعمل على Fly.io! يمكنك:
- إنشاء بوتات ماين كرافت من تلغرام
- إدارة البوتات 24/7
- مراقبة الأداء والإحصائيات

---

**ملاحظة**: تأكد من أن خوادم ماين كرافت التي تريد الاتصال بها تسمح بالبوتات وأن البوتات تتوافق مع قوانين الخادم.

## 📝 أوامر مفيدة إضافية

### إدارة التطبيق
```bash
# عرض معلومات التطبيق
fly info

# عرض تاريخ النشر
fly releases

# التراجع عن آخر نشر
fly rollback

# تغيير حجم الذاكرة
fly scale memory 1024

# تغيير عدد المعالجات
fly scale count 2
```

### إدارة Volumes
```bash
# عرض جميع Volumes
fly volumes list

# إنشاء نسخة احتياطية
fly volumes snapshot create bot_data

# عرض النسخ الاحتياطية
fly volumes snapshots list
```

### مراقبة الأداء
```bash
# عرض استخدام الموارد
fly metrics

# عرض الأحداث
fly events

# فحص الشبكة
fly ping
```

## 🔄 التحديث التلقائي

لإعداد التحديث التلقائي عند push إلى GitHub:

### 1. إنشاء GitHub Action
أنشئ ملف `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Fly.io

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    name: Deploy app
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

### 2. إعداد Token في GitHub
```bash
# إنشاء token
fly auth token

# أضف التوكن في GitHub Secrets باسم FLY_API_TOKEN
```

## 🌍 إعداد Domain مخصص

```bash
# إضافة domain
fly certs create your-domain.com

# التحقق من الحالة
fly certs check your-domain.com
```

## 📊 مراقبة متقدمة

### إعداد Alerts
```bash
# إنشاء alert للذاكرة
fly alerts create --name "High Memory" --metric memory --threshold 80

# إنشاء alert للـ CPU
fly alerts create --name "High CPU" --metric cpu --threshold 80
```

### Dashboard
- زر [Fly.io Dashboard](https://fly.io/dashboard)
- راقب الاستخدام والتكلفة
- عرض السجلات والمقاييس
