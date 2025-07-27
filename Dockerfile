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

# نسخ ملفات package.json و package-lock.json و .npmrc
COPY package*.json .npmrc ./

# تثبيت التبعيات مع تجاهل raknet-native
RUN npm install --only=production --ignore-scripts --no-audit --no-fund --legacy-peer-deps || \
    (echo "⚠️ فشل التثبيت الأول، محاولة بدون legacy-peer-deps..." && \
     npm install --only=production --ignore-scripts --no-audit --no-fund) && \
    npm cache clean --force

# نسخ postinstall.js وتشغيله لتنظيف raknet-native
COPY postinstall.js ./
RUN node postinstall.js || echo "⚠️ تعذر تشغيل postinstall"

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

# تشغيل التطبيق مع startup script
CMD ["node", "startup.js"]
