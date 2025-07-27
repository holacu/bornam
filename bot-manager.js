const MinecraftJavaBot = require('./minecraft-java-bot');
const MinecraftBedrockBot = require('./minecraft-bedrock-bot');
const Database = require('./database');
const logger = require('./logger');
const { config } = require('./config');

class BotManager {
    constructor() {
        this.bots = new Map(); // Map<botId, botInstance>
        this.database = new Database();
        this.botStats = new Map(); // إحصائيات البوتات
        
        logger.info('🤖 تم إنشاء مدير البوتات');
    }

    // إنشاء بوت جديد
    async createBot(botConfig) {
        try {
            const { userId, name, host, port, username, type, version } = botConfig;
            
            // التحقق من عدد البوتات للمستخدم
            const userBots = await this.database.getUserBots(userId);
            if (userBots.length >= config.bots.maxBotsPerUser) {
                return {
                    success: false,
                    error: `تجاوزت الحد الأقصى للبوتات (${config.bots.maxBotsPerUser})`
                };
            }

            // التحقق من عدم تكرار الاسم
            const existingBot = userBots.find(bot => bot.bot_name === name);
            if (existingBot) {
                return {
                    success: false,
                    error: 'اسم البوت موجود بالفعل'
                };
            }

            // إنشاء البوت في قاعدة البيانات
            const botId = await this.database.createBot(
                userId,
                name,
                host,
                port,
                version || this.getDefaultVersion(type),
                type
            );

            // إنشاء instance البوت
            const botInstance = this.createBotInstance(type, {
                id: botId,
                name,
                host,
                port,
                username,
                version: version || this.getDefaultVersion(type)
            });

            // حفظ البوت في الذاكرة
            this.bots.set(botId, botInstance);
            
            // إعداد معالجات الأحداث
            this.setupBotEventHandlers(botId, botInstance);

            // تحديث الإحصائيات
            this.updateBotStats(botId, 'created');

            logger.info(`✅ تم إنشاء البوت: ${name} (${type}) للمستخدم ${userId}`);

            return {
                success: true,
                botId: botId,
                message: 'تم إنشاء البوت بنجاح'
            };

        } catch (error) {
            logger.error('❌ خطأ في إنشاء البوت', { error: error.message });
            return {
                success: false,
                error: 'حدث خطأ في إنشاء البوت'
            };
        }
    }

    // إنشاء instance البوت حسب النوع
    createBotInstance(type, config) {
        switch (type.toLowerCase()) {
            case 'java':
                return new MinecraftJavaBot(config);
            case 'bedrock':
                return new MinecraftBedrockBot(config);
            default:
                throw new Error(`نوع البوت غير مدعوم: ${type}`);
        }
    }

    // الحصول على الإصدار الافتراضي
    getDefaultVersion(type) {
        switch (type.toLowerCase()) {
            case 'java':
                return config.supportedVersions.java[0] || '1.20.1';
            case 'bedrock':
                return config.supportedVersions.bedrock[0] || '1.20.30';
            default:
                return '1.20.1';
        }
    }

    // إعداد معالجات أحداث البوت
    setupBotEventHandlers(botId, botInstance) {
        botInstance.on('connected', () => {
            this.updateBotStats(botId, 'connected');
            logger.botLog(botInstance.config.name, 'info', 'تم الاتصال بنجاح');
        });

        botInstance.on('disconnected', () => {
            this.updateBotStats(botId, 'disconnected');
            logger.botLog(botInstance.config.name, 'info', 'تم قطع الاتصال');
        });

        botInstance.on('error', (error) => {
            this.updateBotStats(botId, 'error');
            logger.botLog(botInstance.config.name, 'error', 'خطأ في البوت', { error: error.message });
        });

        botInstance.on('chat', (data) => {
            logger.botLog(botInstance.config.name, 'info', `رسالة شات: ${data.username}: ${data.message}`);
        });
    }

    // تشغيل البوت
    async startBot(botId) {
        try {
            const botInstance = this.bots.get(botId);
            if (!botInstance) {
                return { success: false, error: 'البوت غير موجود' };
            }

            await botInstance.connect();
            await this.database.updateBotStatus(botId, 'running');

            return { success: true, message: 'تم تشغيل البوت' };
        } catch (error) {
            logger.error('❌ خطأ في تشغيل البوت', { botId, error: error.message });
            return { success: false, error: 'فشل في تشغيل البوت' };
        }
    }

    // إيقاف البوت
    async stopBot(botId) {
        try {
            const botInstance = this.bots.get(botId);
            if (!botInstance) {
                return { success: false, error: 'البوت غير موجود' };
            }

            botInstance.disconnect();
            await this.database.updateBotStatus(botId, 'stopped');

            return { success: true, message: 'تم إيقاف البوت' };
        } catch (error) {
            logger.error('❌ خطأ في إيقاف البوت', { botId, error: error.message });
            return { success: false, error: 'فشل في إيقاف البوت' };
        }
    }

    // حذف البوت
    async deleteBot(botId) {
        try {
            // إيقاف البوت أولاً
            await this.stopBot(botId);

            // حذف من قاعدة البيانات
            await this.database.deleteBot(botId);

            // حذف من الذاكرة
            this.bots.delete(botId);
            this.botStats.delete(botId);

            return { success: true, message: 'تم حذف البوت' };
        } catch (error) {
            logger.error('❌ خطأ في حذف البوت', { botId, error: error.message });
            return { success: false, error: 'فشل في حذف البوت' };
        }
    }

    // إرسال رسالة عبر البوت
    async sendMessage(botId, message) {
        try {
            const botInstance = this.bots.get(botId);
            if (!botInstance) {
                return { success: false, error: 'البوت غير موجود' };
            }

            if (!botInstance.isConnected) {
                return { success: false, error: 'البوت غير متصل' };
            }

            const result = botInstance.sendMessage(message);
            return { success: result, message: result ? 'تم إرسال الرسالة' : 'فشل في إرسال الرسالة' };
        } catch (error) {
            logger.error('❌ خطأ في إرسال الرسالة', { botId, error: error.message });
            return { success: false, error: 'فشل في إرسال الرسالة' };
        }
    }

    // تنفيذ أمر عبر البوت
    async executeCommand(botId, command) {
        try {
            const botInstance = this.bots.get(botId);
            if (!botInstance) {
                return { success: false, error: 'البوت غير موجود' };
            }

            if (!botInstance.isConnected) {
                return { success: false, error: 'البوت غير متصل' };
            }

            const result = botInstance.executeCommand(command);
            return { success: result, message: result ? 'تم تنفيذ الأمر' : 'فشل في تنفيذ الأمر' };
        } catch (error) {
            logger.error('❌ خطأ في تنفيذ الأمر', { botId, command, error: error.message });
            return { success: false, error: 'فشل في تنفيذ الأمر' };
        }
    }

    // الحصول على حالة البوت
    getBotStatus(botId) {
        const botInstance = this.bots.get(botId);
        if (!botInstance) {
            return 'not_found';
        }

        if (botInstance.isConnected) {
            return 'connected';
        } else if (botInstance.reconnectAttempts > 0) {
            return 'connecting';
        } else {
            return 'disconnected';
        }
    }

    // الحصول على معلومات البوت
    getBotInfo(botId) {
        const botInstance = this.bots.get(botId);
        if (!botInstance) {
            return null;
        }

        return {
            id: botId,
            name: botInstance.config.name,
            host: botInstance.config.host,
            port: botInstance.config.port,
            username: botInstance.config.username,
            status: this.getBotStatus(botId),
            isConnected: botInstance.isConnected,
            connectionTime: botInstance.connectionTime,
            stats: this.botStats.get(botId) || {}
        };
    }

    // تحديث إحصائيات البوت
    updateBotStats(botId, event) {
        if (!this.botStats.has(botId)) {
            this.botStats.set(botId, {
                created: 0,
                connected: 0,
                disconnected: 0,
                errors: 0,
                messages: 0,
                commands: 0
            });
        }

        const stats = this.botStats.get(botId);
        if (stats[event] !== undefined) {
            stats[event]++;
        }
    }

    // الحصول على جميع البوتات
    getAllBots() {
        const bots = [];
        for (const [botId, botInstance] of this.bots) {
            bots.push(this.getBotInfo(botId));
        }
        return bots;
    }

    // الحصول على إحصائيات عامة
    getGeneralStats() {
        return {
            totalBots: this.bots.size,
            connectedBots: Array.from(this.bots.values()).filter(bot => bot.isConnected).length,
            totalUsers: this.database.getUserCount ? this.database.getUserCount() : 0
        };
    }

    // تنظيف البوتات المنقطعة
    async cleanup() {
        logger.info('🧹 بدء تنظيف البوتات...');
        
        for (const [botId, botInstance] of this.bots) {
            if (!botInstance.isAlive()) {
                logger.info(`🗑️ إزالة البوت المنقطع: ${botId}`);
                this.bots.delete(botId);
                this.botStats.delete(botId);
            }
        }
    }
}

module.exports = BotManager;
