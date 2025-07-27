# استخدام Node.js 22 كصورة أساسية
FROM node:22-alpine

# تثبيت أدوات البناء المطلوبة
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cmake \
    git

# تعيين مجلد العمل
WORKDIR /app

# نسخ ملفات package.json و package-lock.json
COPY package*.json ./

# تثبيت التبعيات
RUN npm ci --only=production && npm cache clean --force

# نسخ باقي ملفات المشروع
COPY . .

# إنشاء مستخدم غير root لتشغيل التطبيق
RUN addgroup -g 1001 -S nodejs && \
    adduser -S botuser -u 1001 -G nodejs

# تغيير ملكية الملفات للمستخدم الجديد
RUN chown -R botuser:nodejs /app
USER botuser

# كشف البورت (للـ health check)
EXPOSE 3000

# تشغيل التطبيق
CMD ["node", "index.js"]
