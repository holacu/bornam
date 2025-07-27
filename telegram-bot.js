const TelegramBot = require('node-telegram-bot-api');
const BotManager = require('./bot-manager');
const Database = require('./database');
const logger = require('./logger');
const { config } = require('./config');

class MinecraftTelegramBot {
    constructor(token) {
        this.bot = new TelegramBot(token, { polling: true });
        this.botManager = new BotManager();
        this.database = new Database();
        this.admins = new Set();
        this.userSessions = new Map(); // لحفظ جلسات المستخدمين
        
        this.setupCommands();
        this.setupEventHandlers();
        
        logger.telegramLog('info', 'تم إنشاء بوت التلغرام');
    }

    // إعداد الأوامر
    setupCommands() {
        // الأوامر الأساسية
        this.bot.onText(/\/start/, (msg) => this.handleStart(msg));
        this.bot.onText(/\/help/, (msg) => this.handleHelp(msg));
        this.bot.onText(/\/create/, (msg) => this.handleCreate(msg));
        this.bot.onText(/\/list/, (msg) => this.handleList(msg));
        this.bot.onText(/\/status/, (msg) => this.handleStatus(msg));
        this.bot.onText(/\/stop (.+)/, (msg, match) => this.handleStop(msg, match));
        this.bot.onText(/\/start_bot (.+)/, (msg, match) => this.handleStartBot(msg, match));
        this.bot.onText(/\/delete (.+)/, (msg, match) => this.handleDelete(msg, match));
        this.bot.onText(/\/send (.+) (.+)/, (msg, match) => this.handleSend(msg, match));
        this.bot.onText(/\/command (.+) (.+)/, (msg, match) => this.handleCommand(msg, match));
        
        // أوامر الأدمن
        this.bot.onText(/\/admin/, (msg) => this.handleAdmin(msg));
        this.bot.onText(/\/stats/, (msg) => this.handleStats(msg));
        this.bot.onText(/\/users/, (msg) => this.handleUsers(msg));
        this.bot.onText(/\/broadcast (.+)/, (msg, match) => this.handleBroadcast(msg, match));
    }

    // إعداد معالجات الأحداث
    setupEventHandlers() {
        this.bot.on('callback_query', (query) => this.handleCallbackQuery(query));
        this.bot.on('message', (msg) => this.handleMessage(msg));
        
        this.bot.on('polling_error', (error) => {
            logger.telegramLog('error', 'خطأ في polling', { error: error.message });
        });
    }

    // معالج الرسائل العامة
    async handleMessage(msg) {
        const userId = msg.from.id;
        const session = this.userSessions.get(userId);
        
        if (session && session.waitingFor) {
            await this.handleSessionInput(msg, session);
        }
    }

    // معالج إدخال الجلسة
    async handleSessionInput(msg, session) {
        const userId = msg.from.id;
        const text = msg.text;
        
        switch (session.waitingFor) {
            case 'bot_name':
                session.botConfig.name = text;
                session.waitingFor = 'server_host';
                await this.sendMessage(userId, '🌐 أدخل عنوان السيرفر (IP أو Domain):');
                break;
                
            case 'server_host':
                session.botConfig.host = text;
                session.waitingFor = 'server_port';
                await this.sendMessage(userId, '🔌 أدخل منفذ السيرفر (Port):');
                break;
                
            case 'server_port':
                const port = parseInt(text);
                if (isNaN(port) || port < 1 || port > 65535) {
                    await this.sendMessage(userId, '❌ منفذ غير صحيح. أدخل رقم بين 1 و 65535:');
                    return;
                }
                session.botConfig.port = port;
                session.waitingFor = 'username';
                await this.sendMessage(userId, '👤 أدخل اسم المستخدم للبوت:');
                break;
                
            case 'username':
                session.botConfig.username = text;
                session.waitingFor = null;
                await this.createBotFromSession(userId, session);
                break;
        }
        
        this.userSessions.set(userId, session);
    }

    // إنشاء بوت من الجلسة
    async createBotFromSession(userId, session) {
        try {
            const botConfig = {
                ...session.botConfig,
                userId: userId,
                type: session.botType
            };
            
            const result = await this.botManager.createBot(botConfig);
            
            if (result.success) {
                await this.sendMessage(userId, `✅ تم إنشاء البوت بنجاح!\n\n🤖 **${botConfig.name}**\n🌐 ${botConfig.host}:${botConfig.port}\n👤 ${botConfig.username}\n📱 النوع: ${botConfig.type}`);
            } else {
                await this.sendMessage(userId, `❌ فشل في إنشاء البوت: ${result.error}`);
            }
        } catch (error) {
            logger.telegramLog('error', 'خطأ في إنشاء البوت من الجلسة', { error: error.message });
            await this.sendMessage(userId, '❌ حدث خطأ في إنشاء البوت');
        }
        
        this.userSessions.delete(userId);
    }

    // معالج أمر /start
    async handleStart(msg) {
        const userId = msg.from.id;
        const username = msg.from.username || msg.from.first_name;
        
        try {
            await this.database.addUser(userId, username);
            
            const welcomeMessage = `
🎮 **مرحباً بك في نظام بوت ماينكرافت!**

يمكنك إنشاء وإدارة بوتات ماينكرافت Java و Bedrock بسهولة.

📋 **الأوامر المتاحة:**
/create - إنشاء بوت جديد
/list - عرض بوتاتك
/status - حالة البوتات
/help - المساعدة

🚀 ابدأ بإنشاء أول بوت لك باستخدام /create
            `;
            
            await this.sendMessage(userId, welcomeMessage);
            logger.telegramLog('info', `مستخدم جديد: ${username} (${userId})`);
        } catch (error) {
            logger.telegramLog('error', 'خطأ في معالج /start', { error: error.message });
        }
    }

    // معالج أمر /help
    async handleHelp(msg) {
        const helpMessage = `
🆘 **مساعدة نظام بوت ماينكرافت**

📋 **الأوامر الأساسية:**
/start - بدء استخدام البوت
/create - إنشاء بوت ماينكرافت جديد
/list - عرض قائمة بوتاتك
/status - عرض حالة جميع البوتات
/help - عرض هذه المساعدة

🎮 **إدارة البوتات:**
/start_bot [اسم البوت] - تشغيل بوت
/stop [اسم البوت] - إيقاف بوت
/delete [اسم البوت] - حذف بوت
/send [اسم البوت] [الرسالة] - إرسال رسالة
/command [اسم البوت] [الأمر] - تنفيذ أمر

💡 **نصائح:**
• يمكنك إنشاء حتى ${config.limits.maxBotsPerUser} بوتات
• البوتات تدعم Java و Bedrock
• استخدم الأزرار للتحكم السريع

❓ للمزيد من المساعدة، تواصل مع المطور.
        `;
        
        await this.sendMessage(msg.from.id, helpMessage);
    }

    // معالج أمر /create
    async handleCreate(msg) {
        const userId = msg.from.id;
        
        const keyboard = {
            inline_keyboard: [
                [
                    { text: '☕ Java Edition', callback_data: 'create_java' },
                    { text: '🛏️ Bedrock Edition', callback_data: 'create_bedrock' }
                ]
            ]
        };
        
        await this.sendMessage(userId, '🎮 اختر نوع البوت:', { reply_markup: keyboard });
    }

    // معالج الاستعلامات
    async handleCallbackQuery(query) {
        const userId = query.from.id;
        const data = query.data;
        
        await this.bot.answerCallbackQuery(query.id);
        
        if (data === 'create_java' || data === 'create_bedrock') {
            const botType = data === 'create_java' ? 'java' : 'bedrock';
            
            this.userSessions.set(userId, {
                botType: botType,
                botConfig: {},
                waitingFor: 'bot_name'
            });
            
            await this.sendMessage(userId, `🤖 إنشاء بوت ${botType === 'java' ? 'Java' : 'Bedrock'}\n\n📝 أدخل اسم البوت:`);
        }
    }

    // إرسال رسالة
    async sendMessage(chatId, text, options = {}) {
        try {
            return await this.bot.sendMessage(chatId, text, {
                parse_mode: 'Markdown',
                ...options
            });
        } catch (error) {
            logger.telegramLog('error', 'خطأ في إرسال الرسالة', { error: error.message });
        }
    }

    // إضافة أدمن
    async addAdmin(userId) {
        this.admins.add(userId);
        await this.database.addAdmin(userId);
        logger.telegramLog('info', `تم إضافة أدمن: ${userId}`);
    }

    // تحميل الأدمن من قاعدة البيانات
    async loadAdmins() {
        try {
            const admins = await this.database.getAdmins();
            admins.forEach(admin => this.admins.add(admin.user_id));
            logger.telegramLog('info', `تم تحميل ${admins.length} أدمن`);
        } catch (error) {
            logger.telegramLog('error', 'خطأ في تحميل الأدمن', { error: error.message });
        }
    }

    // التحقق من صلاحيات الأدمن
    isAdmin(userId) {
        return this.admins.has(userId);
    }

    // معالج أمر /list
    async handleList(msg) {
        const userId = msg.from.id;
        
        try {
            const bots = await this.database.getUserBots(userId);
            
            if (bots.length === 0) {
                await this.sendMessage(userId, '📭 لا توجد بوتات. استخدم /create لإنشاء بوت جديد.');
                return;
            }
            
            let message = '🤖 **بوتاتك:**\n\n';
            
            bots.forEach((bot, index) => {
                const status = this.botManager.getBotStatus(bot.id);
                const statusIcon = status === 'connected' ? '🟢' : status === 'connecting' ? '🟡' : '🔴';
                
                message += `${index + 1}. ${statusIcon} **${bot.name}**\n`;
                message += `   📍 ${bot.host}:${bot.port}\n`;
                message += `   👤 ${bot.username}\n`;
                message += `   📱 ${bot.type}\n\n`;
            });
            
            await this.sendMessage(userId, message);
        } catch (error) {
            logger.telegramLog('error', 'خطأ في معالج /list', { error: error.message });
            await this.sendMessage(userId, '❌ حدث خطأ في عرض البوتات');
        }
    }

    // معالج أمر /status
    async handleStatus(msg) {
        const userId = msg.from.id;
        
        try {
            const bots = await this.database.getUserBots(userId);
            
            if (bots.length === 0) {
                await this.sendMessage(userId, '📭 لا توجد بوتات.');
                return;
            }
            
            let message = '📊 **حالة البوتات:**\n\n';
            
            bots.forEach(bot => {
                const status = this.botManager.getBotStatus(bot.id);
                const statusText = this.getStatusText(status);
                
                message += `🤖 **${bot.name}**\n`;
                message += `   ${statusText}\n`;
                message += `   🌐 ${bot.host}:${bot.port}\n\n`;
            });
            
            await this.sendMessage(userId, message);
        } catch (error) {
            logger.telegramLog('error', 'خطأ في معالج /status', { error: error.message });
        }
    }

    // الحصول على نص الحالة
    getStatusText(status) {
        switch (status) {
            case 'connected': return '🟢 متصل';
            case 'connecting': return '🟡 يتصل...';
            case 'disconnected': return '🔴 غير متصل';
            case 'error': return '❌ خطأ';
            default: return '❓ غير معروف';
        }
    }

    // معالجات الأوامر الأخرى (مبسطة)
    async handleStop(msg, match) {
        // تنفيذ إيقاف البوت
        await this.sendMessage(msg.from.id, '⏹️ تم إيقاف البوت');
    }

    async handleStartBot(msg, match) {
        // تنفيذ تشغيل البوت
        await this.sendMessage(msg.from.id, '▶️ تم تشغيل البوت');
    }

    async handleDelete(msg, match) {
        // تنفيذ حذف البوت
        await this.sendMessage(msg.from.id, '🗑️ تم حذف البوت');
    }

    async handleSend(msg, match) {
        // تنفيذ إرسال رسالة
        await this.sendMessage(msg.from.id, '📤 تم إرسال الرسالة');
    }

    async handleCommand(msg, match) {
        // تنفيذ أمر
        await this.sendMessage(msg.from.id, '⚡ تم تنفيذ الأمر');
    }

    async handleAdmin(msg) {
        if (!this.isAdmin(msg.from.id)) {
            await this.sendMessage(msg.from.id, '❌ ليس لديك صلاحية أدمن');
            return;
        }
        await this.sendMessage(msg.from.id, '👑 لوحة تحكم الأدمن');
    }

    async handleStats(msg) {
        if (!this.isAdmin(msg.from.id)) return;
        await this.sendMessage(msg.from.id, '📊 إحصائيات النظام');
    }

    async handleUsers(msg) {
        if (!this.isAdmin(msg.from.id)) return;
        await this.sendMessage(msg.from.id, '👥 قائمة المستخدمين');
    }

    async handleBroadcast(msg, match) {
        if (!this.isAdmin(msg.from.id)) return;
        await this.sendMessage(msg.from.id, '📢 تم إرسال الرسالة لجميع المستخدمين');
    }
}

module.exports = MinecraftTelegramBot;
