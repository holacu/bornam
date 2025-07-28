#!/usr/bin/env node

const http = require('http');
const TelegramBot = require('node-telegram-bot-api');
const MinecraftBotManager = require('./minecraft-bot-manager');
const Database = require('./database');

// تحميل متغيرات البيئة
require('dotenv').config();

console.log('🚀 Starting Minecraft Telegram Bot System...');
console.log(`📅 Time: ${new Date().toISOString()}`);
console.log(`🌐 Port: ${process.env.PORT || 3000}`);
console.log(`📍 Environment: ${process.env.NODE_ENV || 'production'}`);

class MinecraftTelegramBotSystem {
    constructor() {
        this.port = process.env.PORT || 3000;
        this.telegramBot = null;
        this.minecraftManager = null;
        this.database = null;
        this.httpServer = null;
        this.isRunning = false;
    }

    async start() {
        try {
            // 1. إنشاء HTTP Server للـ Health Check
            this.createHealthServer();

            // 2. تهيئة قاعدة البيانات
            this.database = new Database();
            await this.database.init();
            console.log('✅ Database initialized');

            // 3. تهيئة مدير بوتات ماينكرافت
            this.minecraftManager = new MinecraftBotManager(this.database);
            console.log('✅ Minecraft Bot Manager initialized');

            // 4. تهيئة بوت التلغرام
            await this.initTelegramBot();

            this.isRunning = true;
            console.log('🎉 System started successfully!');
            console.log('📱 Telegram bot is ready');
            console.log('🎮 Minecraft bot system is ready');

        } catch (error) {
            console.error('❌ Failed to start system:', error.message);
            process.exit(1);
        }
    }

    createHealthServer() {
        this.httpServer = http.createServer((req, res) => {
            const url = req.url;
            
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');

            if (url === '/health' || url === '/' || url === '/ping') {
                res.statusCode = 200;
                res.end(JSON.stringify({
                    status: 'healthy',
                    timestamp: new Date().toISOString(),
                    service: 'minecraft-telegram-bot',
                    uptime: process.uptime()
                }));
            } else {
                res.statusCode = 200; // دائماً 200 للـ Railway
                res.end(JSON.stringify({ status: 'ok' }));
            }
        });

        this.httpServer.listen(this.port, '0.0.0.0', () => {
            console.log(`✅ Health server running on port ${this.port}`);
        });

        this.httpServer.on('error', (error) => {
            console.error('❌ Health server error:', error);
            process.exit(1);
        });
    }

    async initTelegramBot() {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        
        if (!token || token === 'your_bot_token_here') {
            throw new Error('❌ TELEGRAM_BOT_TOKEN is required');
        }

        this.telegramBot = new TelegramBot(token, { polling: true });
        
        // إعداد الأوامر
        this.setupTelegramCommands();
        
        console.log('✅ Telegram bot initialized');
    }

    setupTelegramCommands() {
        // أمر البداية
        this.telegramBot.onText(/\/start/, async (msg) => {
            const chatId = msg.chat.id;
            const username = msg.from.username || msg.from.first_name;
            
            await this.database.addUser(chatId, username);
            
            const welcomeMessage = `
🎮 **مرحباً بك في بوت ماينكرافت!**

يمكنك إنشاء وإدارة بوتات ماينكرافت Java و Bedrock بسهولة.

📋 **الأوامر المتاحة:**
/create - إنشاء بوت جديد
/list - عرض بوتاتك
/help - المساعدة

🚀 ابدأ بإنشاء أول بوت لك!
            `;
            
            this.telegramBot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
        });

        // أمر المساعدة
        this.telegramBot.onText(/\/help/, (msg) => {
            const helpMessage = `
🆘 **مساعدة بوت ماينكرافت**

📋 **الأوامر:**
/start - بدء استخدام البوت
/create - إنشاء بوت ماينكرافت
/list - عرض بوتاتك
/status - حالة البوتات
/help - هذه المساعدة

🎮 **إدارة البوتات:**
/start_bot [اسم] - تشغيل بوت
/stop_bot [اسم] - إيقاف بوت
/delete_bot [اسم] - حذف بوت

💡 استخدم الأزرار للتحكم السريع!
            `;
            
            this.telegramBot.sendMessage(msg.chat.id, helpMessage, { parse_mode: 'Markdown' });
        });

        // أمر إنشاء بوت
        this.telegramBot.onText(/\/create/, (msg) => {
            const keyboard = {
                inline_keyboard: [
                    [
                        { text: '☕ Java Edition', callback_data: 'create_java' },
                        { text: '🛏️ Bedrock Edition', callback_data: 'create_bedrock' }
                    ]
                ]
            };
            
            this.telegramBot.sendMessage(msg.chat.id, '🎮 اختر نوع البوت:', { 
                reply_markup: keyboard 
            });
        });

        // أمر عرض البوتات
        this.telegramBot.onText(/\/list/, async (msg) => {
            const chatId = msg.chat.id;
            const bots = await this.database.getUserBots(chatId);
            
            if (bots.length === 0) {
                this.telegramBot.sendMessage(chatId, '📭 لا توجد بوتات. استخدم /create لإنشاء بوت جديد.');
                return;
            }
            
            let message = '🤖 **بوتاتك:**\n\n';
            bots.forEach((bot, index) => {
                message += `${index + 1}. **${bot.name}**\n`;
                message += `   🌐 ${bot.host}:${bot.port}\n`;
                message += `   📱 ${bot.type}\n`;
                message += `   🔄 ${bot.status}\n\n`;
            });
            
            this.telegramBot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        });

        // معالج الأزرار
        this.telegramBot.on('callback_query', async (query) => {
            const chatId = query.message.chat.id;
            const data = query.data;
            
            if (data === 'create_java' || data === 'create_bedrock') {
                const type = data.split('_')[1];
                await this.handleBotCreation(chatId, type);
            }
            
            this.telegramBot.answerCallbackQuery(query.id);
        });

        // معالج الرسائل العامة
        this.telegramBot.on('message', async (msg) => {
            if (msg.text && !msg.text.startsWith('/')) {
                await this.handleUserInput(msg);
            }
        });

        // معالج الأخطاء
        this.telegramBot.on('polling_error', (error) => {
            console.log('⚠️ Telegram polling error:', error.message);
        });
    }

    async handleBotCreation(chatId, type) {
        // بدء عملية إنشاء البوت التفاعلية
        const message = `
🎮 **إنشاء بوت ${type === 'java' ? 'Java Edition' : 'Bedrock Edition'}**

📝 أدخل اسم البوت:
        `;

        this.telegramBot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

        // حفظ حالة المستخدم لمتابعة الإدخال
        this.userSessions = this.userSessions || new Map();
        this.userSessions.set(chatId, {
            step: 'name',
            type: type,
            config: {}
        });
    }

    async handleUserInput(msg) {
        const chatId = msg.chat.id;
        const text = msg.text;

        if (!this.userSessions || !this.userSessions.has(chatId)) {
            return; // لا توجد جلسة نشطة
        }

        const session = this.userSessions.get(chatId);

        switch (session.step) {
            case 'name':
                session.config.name = text;
                session.step = 'host';
                this.telegramBot.sendMessage(chatId, '🌐 أدخل عنوان السيرفر (IP أو Domain):');
                break;

            case 'host':
                session.config.host = text;
                session.step = 'port';
                this.telegramBot.sendMessage(chatId, '🔌 أدخل منفذ السيرفر (Port):');
                break;

            case 'port':
                const port = parseInt(text);
                if (isNaN(port) || port < 1 || port > 65535) {
                    this.telegramBot.sendMessage(chatId, '❌ منفذ غير صحيح. أدخل رقم بين 1 و 65535:');
                    return;
                }
                session.config.port = port;
                session.step = 'username';
                this.telegramBot.sendMessage(chatId, '👤 أدخل اسم المستخدم للبوت:');
                break;

            case 'username':
                session.config.username = text;
                await this.createMinecraftBot(chatId, session);
                this.userSessions.delete(chatId);
                break;
        }

        this.userSessions.set(chatId, session);
    }

    async createMinecraftBot(chatId, session) {
        try {
            const config = {
                ...session.config,
                type: session.type,
                version: session.type === 'java' ? '1.20.1' : '1.21.0'
            };

            const result = await this.minecraftManager.createBot(chatId, config);

            if (result.success) {
                const message = `
✅ **تم إنشاء البوت بنجاح!**

🤖 **${config.name}**
🌐 ${config.host}:${config.port}
👤 ${config.username}
📱 النوع: ${config.type}
📦 الإصدار: ${config.version}

استخدم /list لعرض جميع بوتاتك
                `;

                this.telegramBot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
            } else {
                this.telegramBot.sendMessage(chatId, `❌ فشل في إنشاء البوت: ${result.error}`);
            }
        } catch (error) {
            console.error('❌ Error creating bot:', error.message);
            this.telegramBot.sendMessage(chatId, '❌ حدث خطأ في إنشاء البوت');
        }
    }

    async stop() {
        if (this.isRunning) {
            console.log('🔄 Stopping system...');
            
            if (this.telegramBot) {
                this.telegramBot.stopPolling();
            }
            
            if (this.httpServer) {
                this.httpServer.close();
            }
            
            if (this.database) {
                this.database.close();
            }
            
            this.isRunning = false;
            console.log('✅ System stopped');
        }
    }
}

// إنشاء وتشغيل النظام
const system = new MinecraftTelegramBotSystem();

// معالجة إشارات الإيقاف
process.on('SIGTERM', async () => {
    console.log('📴 Received SIGTERM');
    await system.stop();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('📴 Received SIGINT');
    await system.stop();
    process.exit(0);
});

// بدء التشغيل
system.start().catch(error => {
    console.error('❌ System startup failed:', error);
    process.exit(1);
});

module.exports = MinecraftTelegramBotSystem;
