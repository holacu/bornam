# 🎮 نظام بوت ماينكرافت المتكامل

نظام متكامل لإنشاء وإدارة بوتات ماينكرافت Java و Bedrock عبر بوت التلغرام مع دعم كامل للنشر على Railway.

## ✨ الميزات

- 🤖 **إنشاء بوتات ماينكرافت** - دعم Java و Bedrock
- 📱 **واجهة تلغرام سهلة** - تحكم كامل عبر بوت التلغرام
- 🔧 **إدارة متقدمة** - تشغيل/إيقاف/مراقبة البوتات
- 📊 **إحصائيات مفصلة** - مراقبة الأداء والاتصالات
- 🛡️ **نظام أمان** - إدارة الأدمن والصلاحيات
- 🌐 **دعم Railway** - نشر سهل وسريع
- 💾 **قاعدة بيانات SQLite** - حفظ البيانات بشكل آمن
- 🏥 **Health Check** - مراقبة صحة التطبيق

## 🚀 النشر السريع على Railway

### 1. إعداد المشروع

```bash
# استنساخ المشروع
git clone https://github.com/your-username/minecraft-telegram-bot-system.git
cd minecraft-telegram-bot-system

# تثبيت التبعيات
npm install
```

### 2. إنشاء بوت التلغرام

1. تحدث مع [@BotFather](https://t.me/BotFather) على التلغرام
2. أرسل `/newbot` واتبع التعليمات
3. احفظ التوكن الذي ستحصل عليه

### 3. النشر على Railway

#### الطريقة الأولى: من GitHub

1. ادفع الكود إلى GitHub:
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. اذهب إلى [Railway](https://railway.app)
3. اضغط "New Project" → "Deploy from GitHub repo"
4. اختر المستودع الخاص بك

#### الطريقة الثانية: Railway CLI

```bash
# تثبيت Railway CLI
npm install -g @railway/cli

# تسجيل الدخول
railway login

# إنشاء مشروع جديد
railway init

# نشر المشروع
railway up
```

### 4. إعداد متغيرات البيئة

في لوحة تحكم Railway، اذهب إلى Variables وأضف:

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
ADMIN_IDS=your_telegram_id,another_admin_id
NODE_ENV=production
DATABASE_PATH=/tmp/minecraft_bot.db
```

### 5. التحقق من النشر

بعد النشر، ستحصل على رابط التطبيق. يمكنك التحقق من صحة التطبيق عبر:
- `https://your-app.railway.app/health`

## 🔧 الإعداد المحلي

### المتطلبات
- Node.js 22.0.0 أو أحدث
- npm 10.0.0 أو أحدث

### 1. إنشاء ملف البيئة

```bash
cp .env.example .env
```

### 2. تعديل ملف .env

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
ADMIN_IDS=your_telegram_id
NODE_ENV=development
LOG_LEVEL=debug
```

### 3. تشغيل التطبيق

```bash
# للتطوير
npm run dev

# للإنتاج
npm start
```

## 📋 متغيرات البيئة

### المتغيرات المطلوبة

| المتغير | الوصف | مثال |
|---------|--------|-------|
| `TELEGRAM_BOT_TOKEN` | توكن بوت التلغرام | `123456:ABC-DEF...` |
| `ADMIN_IDS` | معرفات الأدمن (مفصولة بفواصل) | `123456789,987654321` |

### المتغيرات الاختيارية

| المتغير | الافتراضي | الوصف |
|---------|-----------|--------|
| `NODE_ENV` | `production` | بيئة التشغيل |
| `LOG_LEVEL` | `info` | مستوى السجلات |
| `DATABASE_PATH` | `/tmp/minecraft_bot.db` | مسار قاعدة البيانات |
| `MAX_BOTS_PER_USER` | `3` | عدد البوتات لكل مستخدم |
| `PORT` | `3000` | منفذ التطبيق |

## 🎮 الاستخدام

### الأوامر الأساسية

- `/start` - بدء استخدام البوت
- `/help` - عرض المساعدة
- `/create` - إنشاء بوت جديد
- `/list` - عرض البوتات الخاصة بك
- `/status` - حالة البوتات

### إنشاء بوت ماينكرافت

1. أرسل `/create` للبوت
2. اختر نوع البوت (Java أو Bedrock)
3. أدخل عنوان السيرفر والمنفذ
4. اختر الإصدار المناسب
5. أدخل اسم البوت

### إدارة البوتات

- **تشغيل**: اضغط "▶️ تشغيل" في قائمة البوتات
- **إيقاف**: اضغط "⏹️ إيقاف" في قائمة البوتات
- **حذف**: اضغط "🗑️ حذف" في قائمة البوتات

## 🛠️ التطوير

### بنية المشروع

```
├── index.js              # الملف الرئيسي
├── telegram-bot.js       # بوت التلغرام
├── minecraft-java-bot.js # بوت ماينكرافت Java
├── minecraft-bedrock-bot.js # بوت ماينكرافت Bedrock
├── bot-manager.js        # مدير البوتات
├── database.js           # قاعدة البيانات
├── config.js             # الإعدادات
├── logger.js             # نظام السجلات
├── health-check.js       # فحص الصحة
├── Dockerfile            # ملف Docker
├── railway.toml          # إعدادات Railway
└── .env.example          # مثال متغيرات البيئة
```

### إضافة ميزات جديدة

1. Fork المشروع
2. إنشاء branch جديد: `git checkout -b feature/new-feature`
3. إضافة التغييرات: `git commit -am 'Add new feature'`
4. Push للـ branch: `git push origin feature/new-feature`
5. إنشاء Pull Request

## 📊 المراقبة

### Health Check Endpoints

- `/health` - فحص شامل للصحة
- `/health/simple` - فحص بسيط
- `/health/detailed` - فحص مفصل

### السجلات

في بيئة التطوير، يتم حفظ السجلات في:
- `/tmp/logs/info.log` - سجلات عامة
- `/tmp/logs/error.log` - سجلات الأخطاء
- `/tmp/logs/security.log` - سجلات الأمان

## 🔒 الأمان

- ✅ تشفير التوكنات الحساسة
- ✅ نظام صلاحيات الأدمن
- ✅ حماية من الطلبات المتكررة
- ✅ تسجيل العمليات الأمنية
- ✅ فصل بيانات المستخدمين

## 🐛 استكشاف الأخطاء

### مشاكل شائعة

1. **خطأ في التوكن**
   ```
   ❌ يرجى إضافة توكن بوت التلغرام في متغير البيئة TELEGRAM_BOT_TOKEN
   ```
   **الحل**: تأكد من إضافة `TELEGRAM_BOT_TOKEN` في متغيرات البيئة

2. **فشل الاتصال بالسيرفر**
   ```
   ❌ فشل في الاتصال بسيرفر ماينكرافت
   ```
   **الحل**: تحقق من عنوان السيرفر والمنفذ

3. **مشكلة في قاعدة البيانات**
   ```
   ❌ خطأ في قاعدة البيانات
   ```
   **الحل**: تحقق من صلاحيات الكتابة في مجلد `/tmp`

## 📞 الدعم

- 📧 **البريد الإلكتروني**: support@example.com
- 💬 **التلغرام**: [@YourSupportBot](https://t.me/YourSupportBot)
- 🐛 **تقرير الأخطاء**: [GitHub Issues](https://github.com/your-username/minecraft-telegram-bot-system/issues)

## 📄 الترخيص

هذا المشروع مرخص تحت رخصة MIT - راجع ملف [LICENSE](LICENSE) للتفاصيل.

## 🙏 شكر وتقدير

- [Mineflayer](https://github.com/PrismarineJS/mineflayer) - مكتبة بوت ماينكرافت Java
- [Bedrock Protocol](https://github.com/PrismarineJS/bedrock-protocol) - مكتبة بوت ماينكرافت Bedrock
- [Node Telegram Bot API](https://github.com/yagop/node-telegram-bot-api) - مكتبة بوت التلغرام
- [Railway](https://railway.app) - منصة النشر

---

⭐ إذا أعجبك المشروع، لا تنس إعطاؤه نجمة على GitHub!
