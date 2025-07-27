const MinecraftTelegramBot = require('./telegram-bot');
const HealthCheckServer = require('./health-check');
const logger = require('./logger');

// تحميل متغيرات البيئة
require('dotenv').config();

// توكن بوت التلغرام من متغيرات البيئة
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// معرفات الأدمن من متغيرات البيئة
const ADMIN_IDS = process.env.ADMIN_IDS
    ? process.env.ADMIN_IDS.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
    : [];

class MinecraftBotSystem {
    constructor() {
        this.telegramBot = null;
        this.healthCheckServer = null;
        this.isRunning = false;
    }

    async start() {
        try {
            logger.info('🚀 بدء تشغيل نظام بوت ماينكرافت...');

            // بدء تشغيل Health Check Server
            this.healthCheckServer = new HealthCheckServer();
            this.healthCheckServer.start();
            logger.info('🏥 تم تشغيل Health Check Server');

            // التحقق من وجود التوكن
            if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN === 'your_telegram_bot_token_here') {
                throw new Error('❌ يرجى إضافة توكن بوت التلغرام في متغير البيئة TELEGRAM_BOT_TOKEN');
            }

            // إنشاء بوت التلغرام
            this.telegramBot = new MinecraftTelegramBot(TELEGRAM_BOT_TOKEN);

            // انتظار تهيئة البوت
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // إضافة الأدمن
            for (const adminId of ADMIN_IDS) {
                await this.telegramBot.addAdmin(adminId);
            }

            // تحميل الأدمن من قاعدة البيانات
            await this.telegramBot.loadAdmins();

            this.isRunning = true;

            logger.info('✅ تم تشغيل النظام بنجاح!');
            logger.info('📱 بوت التلغرام جاهز للاستخدام');
            logger.info('🎮 يمكن الآن إنشاء بوتات ماينكرافت Java و Bedrock');
            logger.info('📋 الميزات المتاحة:');
            logger.info('   • إنشاء بوتات ماينكرافت (Java & Bedrock)');
            logger.info('   • دعم آخر 5 إصدارات لكل نوع');
            logger.info('   • التحكم الكامل في البوتات (تشغيل/إيقاف)');
            logger.info('   • إرسال الرسائل والأوامر');
            logger.info('   • مراقبة الإحصائيات');
            logger.info('   • واجهة إدارة للأدمن');
            logger.info('   • دعم سيرفرات Aternos وغيرها');
            logger.info('🔧 للحصول على المساعدة، استخدم الأمر /help في بوت التلغرام');

        } catch (error) {
            logger.error('❌ خطأ في تشغيل النظام:', { error: error.message, stack: error.stack });
            process.exit(1);
        }
    }

    async stop() {
        if (this.isRunning) {
            logger.info('🔄 إيقاف النظام...');

            // إيقاف بوت التلغرام
            if (this.telegramBot) {
                await this.telegramBot.shutdown();
                logger.info('📱 تم إيقاف بوت التلغرام');
            }

            // إيقاف Health Check Server
            if (this.healthCheckServer) {
                this.healthCheckServer.stop();
                logger.info('🏥 تم إيقاف Health Check Server');
            }

            this.isRunning = false;
            logger.info('✅ تم إيقاف النظام بنجاح');
        }
    }

    // معالجة إشارات النظام للإيقاف الآمن
    setupGracefulShutdown() {
        const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
        
        signals.forEach(signal => {
            process.on(signal, async () => {
                logger.info(`\n📡 تم استقبال إشارة ${signal}`);
                await this.stop();
                process.exit(0);
            });
        });

        // معالجة الأخطاء غير المتوقعة
        process.on('uncaughtException', async (error) => {
            logger.error('❌ خطأ غير متوقع:', { error: error.message, stack: error.stack });
            await this.stop();
            process.exit(1);
        });

        process.on('unhandledRejection', async (reason, promise) => {
            // تجاهل أخطاء Telegram العادية
            if (reason && reason.code === 'ETELEGRAM') {
                logger.warn('تجاهل خطأ Telegram:', { code: reason.code, message: reason.message });
                return;
            }

            logger.error('❌ Promise مرفوض:', { reason, promise });
            await this.stop();
            process.exit(1);
        });
    }
}

// إنشاء وتشغيل النظام
const system = new MinecraftBotSystem();

// إعداد الإيقاف الآمن
system.setupGracefulShutdown();

// بدء التشغيل
system.start().catch(error => {
    logger.error('❌ فشل في تشغيل النظام:', { error: error.message, stack: error.stack });
    process.exit(1);
});

// تصدير النظام للاستخدام الخارجي
module.exports = MinecraftBotSystem;
