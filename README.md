
# 🤖 Minecraft Telegram Bot Manager

بوت تلغرام لإدارة بوتات ماين كرافت Java و Bedrock Edition. يمكنك إنشاء وإدارة عدة بوتات من خلال تلغرام.

## 🌟 المميزات

- 🎮 دعم Java Edition و Bedrock Edition
- 📱 إدارة من خلال تلغرام
- 🔄 إعادة اتصال تلقائية
- 📊 إحصائيات البوتات
- 🌐 دعم خوادم متعددة
- 💾 قاعدة بيانات SQLite

## 📋 المتطلبات

- Node.js 18.0.0 أو أحدث
- npm 8.0.0 أو أحدث
- بوت تلغرام (من @BotFather)

## 🚀 التثبيت السريع

### 1. تحميل المشروع
```bash
git clone https://github.com/yourusername/minecraft-telegram-bot.git
cd minecraft-telegram-bot
```

### 2. تثبيت التبعيات
```bash
npm install
```

### 3. إعداد البيئة
```bash
cp .env.example .env
# قم بتعديل ملف .env بالقيم الصحيحة
```

### 4. تشغيل البوت
```bash
# Windows
start.bat

# Linux/macOS
chmod +x start.sh
./start.sh

# أو مباشرة
npm start
```

## 🎯 كيفية الاستخدام

### 1. إنشاء بوت تلغرام
1. ابحث عن `@BotFather` في تلغرام
2. أرسل `/newbot`
3. اتبع التعليمات واحفظ التوكن

### 2. معرفة معرف المستخدم
1. ابحث عن `@userinfobot` في تلغرام
2. أرسل `/start` واحفظ الرقم

### 3. إعداد ملف .env
```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_ADMIN_IDS=your_user_id
DATABASE_PATH=./data/bot_data.db
NODE_ENV=production
PORT=3000
```

### 4. استخدام البوت
- أرسل `/start` للبوت في تلغرام
- اختر "إنشاء لاعب جديد"
- اتبع التعليمات لإعداد البوت
- استمتع بإدارة بوتاتك!

## 🐳 تشغيل باستخدام Docker

```bash
# بناء الصورة
docker build -t minecraft-telegram-bot .

# تشغيل الحاوية
docker run -d --name minecraft-bot \
  -v $(pwd)/data:/app/data \
  -p 3000:3000 \
  --env-file .env \
  minecraft-telegram-bot
```

أو باستخدام Docker Compose:
```bash
docker-compose up -d
```

## ☁️ النشر على Fly.io

للحصول على دليل مفصل للنشر على Fly.io، راجع [README-DEPLOYMENT.md](README-DEPLOYMENT.md)

```bash
# تثبيت Fly CLI
curl -L https://fly.io/install.sh | sh

# تسجيل الدخول
fly auth login

# تهيئة التطبيق
fly launch

# إعداد المتغيرات
fly secrets set TELEGRAM_BOT_TOKEN="your_token"
fly secrets set TELEGRAM_ADMIN_IDS="your_id"

# النشر
fly deploy
```

## 🔧 استكشاف الأخطاء

### مشاكل شائعة وحلولها

| المشكلة | السبب المحتمل | الحل |
|---------|---------------|------|
| البوت لا يرد في تلغرام | توكن خاطئ | تحقق من التوكن في `.env` |
| خطأ في قاعدة البيانات | مجلد البيانات غير موجود | تشغيل `mkdir data` |
| فشل الاتصال بماين كرافت | عنوان خاطئ أو خادم مغلق | تحقق من العنوان والبورت |
| البوت يتوقف تلقائياً | خطأ في الكود | راجع السجلات `npm run logs` |

### فحص الحالة
```bash
# فحص صحة التطبيق
curl http://localhost:3000/health

# عرض السجلات
npm run logs

# فحص حالة التطبيق
npm run status
```

## 📊 المراقبة والإحصائيات

البوت يوفر endpoint للمراقبة على `/health` يعرض:
- حالة الاتصال بتلغرام
- حالة قاعدة البيانات
- عدد البوتات النشطة
- استخدام الذاكرة
- وقت التشغيل

## 🤝 المساهمة

نرحب بالمساهمات! يرجى:
1. عمل Fork للمشروع
2. إنشاء branch جديد للميزة
3. إضافة التحسينات
4. إرسال Pull Request

## 📞 الدعم

- 📧 البريد الإلكتروني: support@example.com
- 💬 تلغرام: @YourSupportBot
- 🐛 الأخطاء: [GitHub Issues](https://github.com/yourusername/minecraft-telegram-bot/issues)

## ⚠️ تنبيهات مهمة

- **لا تشارك ملف `.env` مع أحد**
- **استخدم البوتات فقط في الخوادم التي تسمح بها**
- **احترم قوانين الخوادم التي تتصل بها**
- **هذا المشروع للاستخدام التعليمي والشخصي**

## 📄 الترخيص

هذا المشروع مفتوح المصدر ومتاح للاستخدام التعليمي والشخصي. الاستخدام على مسؤوليتك الشخصية.

## 🙏 شكر خاص

- [Mineflayer](https://github.com/PrismarineJS/mineflayer) - مكتبة ماين كرافت الرائعة
- [node-telegram-bot-api](https://github.com/yagop/node-telegram-bot-api) - مكتبة تلغرام
- [Fly.io](https://fly.io) - منصة الاستضافة السحابية

---

<div align="center">
  <strong>صنع بـ ❤️ للمجتمع العربي</strong>
</div>
