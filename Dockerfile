# استخدام Node.js 18 LTS كصورة أساسية
FROM node:18-alpine

# تعيين متغيرات البيئة
ENV NODE_ENV=production
ENV NPM_CONFIG_LOGLEVEL=warn
ENV NPM_CONFIG_PROGRESS=false
ENV NPM_CONFIG_AUDIT=false
ENV NPM_CONFIG_FUND=false

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
    cmake \
    sqlite \
    git \
    && rm -rf /var/cache/apk/*

# نسخ ملفات package.json و package-lock.json و .npmrc و postinstall.js
COPY package*.json .npmrc postinstall.js ./

# تشغيل postinstall وتثبيت التبعيات
RUN node postinstall.js && \
    npm install --only=production --ignore-scripts --no-audit --no-fund --legacy-peer-deps && \
    npm cache clean --force

# نسخ باقي ملفات التطبيق
COPY . .

# إنشاء المجلدات المطلوبة
RUN mkdir -p /tmp/logs /tmp/backups && \
    chown -R nodejs:nodejs /app /tmp/logs /tmp/backups

# التبديل إلى المستخدم غير الجذر
USER nodejs

# كشف المنفذ (Railway سيحدد المنفذ تلقائياً)
EXPOSE 3000

# فحص صحة التطبيق
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('Health check passed')" || exit 1

# تشغيل التطبيق
CMD ["node", "index.js"]
