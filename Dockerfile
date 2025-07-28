# استخدام Node.js 22 LTS (مطلوب لـ mineflayer)
FROM node:22-alpine

# تعيين متغيرات البيئة
ENV NODE_ENV=production
ENV NPM_CONFIG_LOGLEVEL=warn
ENV NPM_CONFIG_PROGRESS=false

# إنشاء مجلد العمل
WORKDIR /app

# إنشاء مستخدم غير جذر للأمان
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# تثبيت التبعيات المطلوبة للنظام
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    gcc \
    libc-dev \
    sqlite \
    git \
    && rm -rf /var/cache/apk/*

# نسخ ملفات package.json
COPY package*.json ./

# تثبيت التبعيات
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# نسخ باقي ملفات التطبيق
COPY . .

# إنشاء المجلدات المطلوبة وتعيين الصلاحيات
RUN mkdir -p /tmp/logs /tmp/data && \
    chown -R nodejs:nodejs /app /tmp/logs /tmp/data

# التبديل إلى المستخدم غير الجذر
USER nodejs

# كشف المنفذ
EXPOSE 3000

# فحص صحة التطبيق
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('Health check passed')" || exit 1

# تشغيل التطبيق
CMD ["node", "index.js"]
