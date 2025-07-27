const TelegramBot = require('node-telegram-bot-api');
const Database = require('./database');
const MinecraftPlayerManager = require('./minecraftManager');
const config = require('./config');
const Utils = require('./utils');
const moment = require('moment');
const http = require('http');

// إعداد البوت
const BOT_TOKEN = config.telegram.token;
const ADMIN_IDS = config.telegram.adminIds;

const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const db = new Database();
const playerManager = new MinecraftPlayerManager(db);

// حالات المحادثة
const userStates = new Map();

// الرسائل والنصوص
const messages = {
    welcome: config.messages.ar.welcome,

    getMainMenu: (isAdmin = false) => {
        const buttons = config.messages.ar.buttons;
        const keyboard = [
            [{ text: buttons.createBot, callback_data: 'create_bot' }],
            [{ text: buttons.myBots, callback_data: 'my_bots' }, { text: buttons.stats, callback_data: 'stats' }],
            [{ text: buttons.help, callback_data: 'help' }]
        ];

        if (isAdmin) {
            keyboard.push([{ text: buttons.adminPanel, callback_data: 'admin_panel' }]);
        }

        return {
            reply_markup: {
                inline_keyboard: keyboard
            }
        };
    },

    minecraftTypes: {
        reply_markup: {
            inline_keyboard: [
                [{ text: config.messages.ar.buttons.javaEdition, callback_data: 'type_java' }],
                [{ text: config.messages.ar.buttons.bedrockEdition, callback_data: 'type_bedrock' }],
                [{ text: config.messages.ar.buttons.back, callback_data: 'back_main' }]
            ]
        }
    },

    getBotMenu: (bot) => {
        const buttons = config.messages.ar.buttons;
        const statusIcon = bot.status === 'running' ? '🟢' : '🔴';
        const statusText = config.messages.ar.status[bot.status] || config.messages.ar.status.unknown;

        const keyboard = [
            [
                { text: buttons.start, callback_data: `start_${bot.id}` },
                { text: buttons.stop, callback_data: `stop_${bot.id}` }
            ],
            [
                { text: buttons.refresh, callback_data: `refresh_${bot.id}` },
                { text: buttons.delete, callback_data: `delete_${bot.id}` }
            ],
            [{ text: buttons.back, callback_data: 'my_bots' }]
        ];

        // حالة الخادم
        let serverInfo = '';
        if (arguments[1]) { // serverStatus
            const serverStatus = arguments[1];
            const serverStatusIcon = serverStatus.online ? '🟢' : '🔴';
            const serverStatusText = serverStatus.online ? 'متاح' : 'غير متاح';
            const playersInfo = serverStatus.online ?
                `👥 اللاعبين: ${serverStatus.players.online}/${serverStatus.players.max}` :
                '👥 اللاعبين: غير متاح';

            serverInfo = `${serverStatusIcon} حالة الخادم: ${serverStatusText}\n${playersInfo}\n`;
        }

        return {
            text: `👤 ${bot.bot_name}\n\n` +
                  `${statusIcon} حالة اللاعب: ${statusText}\n` +
                  serverInfo +
                  `🌐 الخادم: ${bot.server_host}:${bot.server_port}\n` +
                  `📦 النوع: ${bot.minecraft_type === 'java' ? 'جافا' : 'بيدروك'} ${bot.minecraft_version}\n` +
                  `📅 تم الإنشاء: ${moment(bot.created_at).format('YYYY-MM-DD HH:mm')}\n` +
                  (bot.last_started ? `⏰ آخر تشغيل: ${moment(bot.last_started).format('YYYY-MM-DD HH:mm')}\n` : '') +
                  (bot.last_error ? `❌ آخر خطأ: ${bot.last_error}\n` : ''),
            reply_markup: {
                inline_keyboard: keyboard
            }
        };
    }
};

// التحقق من صلاحيات الأدمن
function isAdmin(userId) {
    return ADMIN_IDS.includes(userId);
}

// معالج الأوامر الأساسية
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const user = msg.from;

    try {
        await db.addOrUpdateUser(user);
        const mainMenu = messages.getMainMenu(isAdmin(user.id));
        await bot.sendMessage(chatId, messages.welcome, mainMenu);
    } catch (error) {
        console.error('Error in /start:', error);
        await bot.sendMessage(chatId, '❌ حدث خطأ، يرجى المحاولة مرة أخرى');
    }
});

// أمر خاص بالأدمن لإضافة أدمن جديد
bot.onText(/\/addadmin (\d+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const newAdminId = parseInt(match[1]);

    if (!isAdmin(userId)) {
        await bot.sendMessage(chatId, '❌ ليس لديك صلاحية لتنفيذ هذا الأمر');
        return;
    }

    if (!ADMIN_IDS.includes(newAdminId)) {
        ADMIN_IDS.push(newAdminId);
        await bot.sendMessage(chatId, `✅ تم إضافة ${newAdminId} كأدمن`);
    } else {
        await bot.sendMessage(chatId, '⚠️ هذا المستخدم أدمن بالفعل');
    }
});

// معالج الاستعلامات المضمنة
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;

    try {
        await bot.answerCallbackQuery(query.id);

        switch (data) {
            case 'create_bot':
                await handleCreatePlayer(chatId, userId);
                break;
            case 'my_bots':
                await handleMyPlayers(chatId, userId);
                break;
            case 'stats':
                await handleStats(chatId, userId);
                break;
            case 'help':
                await handleHelp(chatId);
                break;
            case 'admin_panel':
                await handleAdminPanel(chatId, userId);
                break;
            case 'type_java':
                await handleMinecraftType(chatId, userId, 'java');
                break;
            case 'type_bedrock':
                await handleMinecraftType(chatId, userId, 'bedrock');
                break;
            case 'back_main':
                const mainMenu = messages.getMainMenu(isAdmin(userId));
                await bot.editMessageText(messages.welcome, {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    ...mainMenu
                });
                break;
            default:
                if (data.startsWith('version_')) {
                    await handleVersionSelection(chatId, userId, data, query.message.message_id);
                } else if (data.startsWith('bot_')) {
                    await handleBotAction(chatId, userId, data, query.message.message_id);
                } else if (data.startsWith('start_')) {
                    await handleStartBot(chatId, userId, data);
                } else if (data.startsWith('stop_')) {
                    await handleStopBot(chatId, userId, data);
                } else if (data.startsWith('delete_')) {
                    await handleDeleteBot(chatId, userId, data);
                } else if (data.startsWith('refresh_')) {
                    await handleRefreshBot(chatId, userId, data, query.message.message_id, query.id);
                } else if (data.startsWith('confirm_delete_')) {
                    await handleConfirmDelete(chatId, userId, data);
                } else if (data.startsWith('admin_')) {
                    await handleAdminActions(chatId, userId, data, query.message.message_id);
                }
                break;
        }
    } catch (error) {
        console.error('Error in callback query:', error);
        await bot.sendMessage(chatId, '❌ حدث خطأ، يرجى المحاولة مرة أخرى');
    }
});

// إنشاء لاعب جديد
async function handleCreatePlayer(chatId, userId) {
    await bot.sendMessage(chatId, config.messages.ar.prompts.selectMinecraftType, messages.minecraftTypes);
}

// اختيار نوع Minecraft
async function handleMinecraftType(chatId, userId, type) {
    const versions = playerManager.getSupportedVersions()[type];
    const keyboard = versions.map(version => [{
        text: `📦 ${version}`,
        callback_data: `version_${type}_${version}`
    }]);
    keyboard.push([{ text: '🔙 رجوع', callback_data: 'create_bot' }]);

    const typeText = type === 'java' ? 'Java Edition ☕' : 'Bedrock Edition 🏗️';
    const note = type === 'bedrock' ? '\n\n💡 ملاحظة: إذا كان خادمك يستخدم إصدار أحدث (مثل 1.21.94)، اختر 1.21.93 للتوافق' : '';

    await bot.sendMessage(chatId, `اختر إصدار ${typeText}:${note}`, {
        reply_markup: { inline_keyboard: keyboard }
    });
}

// اختيار الإصدار
async function handleVersionSelection(chatId, userId, data, messageId) {
    const [, type, version] = data.split('_');
    
    userStates.set(userId, {
        step: 'waiting_server_host',
        type,
        version
    });

    await bot.editMessageText(
        `✅ تم اختيار ${type === 'java' ? 'Java' : 'Bedrock'} ${version}\n\n🌐 الآن أرسل عنوان الخادم (Host):`,
        {
            chat_id: chatId,
            message_id: messageId
        }
    );
}

// معالج الرسائل النصية
bot.on('message', async (msg) => {
    if (msg.text && msg.text.startsWith('/')) return; // تجاهل الأوامر

    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    const userState = userStates.get(userId);
    if (!userState) return;

    try {
        switch (userState.step) {
            case 'waiting_server_host':
                // التحقق من صحة عنوان الخادم
                if (!Utils.isValidHost(text)) {
                    await bot.sendMessage(chatId, config.messages.ar.errors.invalidHost);
                    return;
                }
                userState.host = text;
                userState.step = 'waiting_server_port';
                await bot.sendMessage(chatId, config.messages.ar.prompts.enterServerPort);
                break;

            case 'waiting_server_port':
                const port = parseInt(text);
                if (!Utils.isValidPort(port)) {
                    await bot.sendMessage(chatId, config.messages.ar.errors.invalidPort);
                    return;
                }
                userState.port = port;
                userState.step = 'waiting_bot_name';
                await bot.sendMessage(chatId, config.messages.ar.prompts.enterBotName);
                break;

            case 'waiting_bot_name':
                if (!Utils.isValidBotName(text)) {
                    await bot.sendMessage(chatId, config.messages.ar.errors.invalidBotName);
                    return;
                }
                userState.botName = text;
                await createMinecraftBot(chatId, userId, userState);
                userStates.delete(userId);
                break;
        }
    } catch (error) {
        console.error('Error in message handler:', error);
        await bot.sendMessage(chatId, '❌ حدث خطأ، يرجى المحاولة مرة أخرى');
        userStates.delete(userId);
    }
});

// إنشاء بوت Minecraft
async function createMinecraftBot(chatId, userId, config) {
    try {
        const botData = {
            bot_name: config.botName,
            server_host: config.host,
            server_port: config.port,
            minecraft_type: config.type,
            minecraft_version: config.version,
            auth_type: 'offline'
        };

        const botId = await db.addMinecraftBot(userId, botData);
        
        await bot.sendMessage(chatId, 
            `✅ تم إنشاء البوت بنجاح!\n\n` +
            `🤖 اسم البوت: ${config.botName}\n` +
            `🌐 الخادم: ${config.host}:${config.port}\n` +
            `📦 النوع: ${config.type === 'java' ? 'Java' : 'Bedrock'} ${config.version}\n\n` +
            `يمكنك الآن إدارة البوت من قائمة "بوتاتي"`,
            messages.mainMenu
        );
    } catch (error) {
        console.error('Error creating bot:', error);
        await bot.sendMessage(chatId, '❌ فشل في إنشاء البوت، يرجى المحاولة مرة أخرى');
    }
}

// عرض لاعبي المستخدم
async function handleMyPlayers(chatId, userId) {
    try {
        const bots = await db.getUserBots(userId);

        if (bots.length === 0) {
            const mainMenu = messages.getMainMenu(isAdmin(userId));
            await bot.sendMessage(chatId,
                '📭 لا توجد لديك بوتات حالياً\n\n🎯 ابدأ بإنشاء بوت جديد لتجربة مميزة!',
                mainMenu
            );
            return;
        }

        let text = `👤 لاعبيك (${bots.length}):\n\n`;

        const keyboard = bots.map((botItem, index) => {
            const statusIcon = botItem.status === 'running' ? '🟢' :
                              botItem.status === 'error' ? '❌' : '🔴';
            const typeIcon = botItem.minecraft_type === 'java' ? '☕' : '🏗️';

            return [{
                text: `${statusIcon} ${typeIcon} ${botItem.bot_name}`,
                callback_data: `bot_${botItem.id}`
            }];
        });

        keyboard.push([
            { text: '🤖 إنشاء بوت جديد', callback_data: 'create_bot' },
            { text: '🔄 تحديث', callback_data: 'my_bots' }
        ]);
        keyboard.push([{ text: '🏠 القائمة الرئيسية', callback_data: 'back_main' }]);

        text += `💡 اضغط على أي بوت لإدارته`;

        await bot.sendMessage(chatId, text, {
            reply_markup: { inline_keyboard: keyboard }
        });
    } catch (error) {
        console.error('Error getting user bots:', error);
        await bot.sendMessage(chatId, config.messages.ar.errors.general);
    }
}

// التعامل مع إجراءات اللاعب
async function handleBotAction(chatId, userId, data, messageId) {
    const playerId = parseInt(data.split('_')[1]);

    try {
        const playerData = await db.getBot(playerId);
        if (!playerData || playerData.user_id !== userId) {
            await bot.sendMessage(chatId, config.messages.ar.errors.botNotFound);
            return;
        }

        // فحص حالة الخادم
        const serverStatus = await playerManager.checkServerStatus(
            playerData.server_host,
            playerData.server_port,
            playerData.minecraft_type
        );

        const botMenu = messages.getBotMenu(playerData, serverStatus);

        try {
            await bot.editMessageText(botMenu.text, {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: botMenu.reply_markup
            });
        } catch (error) {
            // تجاهل خطأ "message is not modified" لأنه غير مهم
            if (!error.message.includes('message is not modified')) {
                console.error('Error updating message:', error.message);
            }
        }
    } catch (error) {
        console.error('Error in bot action:', error);
        await bot.sendMessage(chatId, config.messages.ar.errors.general);
    }
}

// تحديث حالة البوت
async function handleRefreshBot(chatId, userId, data, messageId, queryId) {
    const botId = parseInt(data.split('_')[1]);

    try {
        const botData = await db.getBot(botId);
        if (!botData || botData.user_id !== userId) {
            await bot.sendMessage(chatId, config.messages.ar.errors.botNotFound);
            return;
        }

        // تحديث حالة اللاعب من المدير
        const isActive = playerManager.getBotStatus(botId).isActive;
        const currentStatus = isActive ? 'running' : 'stopped';

        if (botData.status !== currentStatus) {
            await db.updateBotStatus(botId, currentStatus);
            botData.status = currentStatus;
        }

        const botMenu = messages.getBotMenu(botData);

        try {
            await bot.editMessageText(botMenu.text, {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: botMenu.reply_markup
            });
        } catch (error) {
            // تجاهل خطأ "message is not modified" لأنه غير مهم
            if (!error.message.includes('message is not modified')) {
                console.error('Error updating message:', error.message);
            }
        }

        // إشعار بالتحديث
        if (queryId) {
            await bot.answerCallbackQuery(queryId, { text: '🔄 تم تحديث الحالة' });
        }
    } catch (error) {
        console.error('Error refreshing bot:', error);
        await bot.sendMessage(chatId, config.messages.ar.errors.general);
    }
}

// تشغيل البوت
async function handleStartBot(chatId, userId, data) {
    const botId = parseInt(data.split('_')[1]);

    try {
        // إرسال رسالة انتظار
        const waitMsg = await bot.sendMessage(chatId, '🔄 جاري تشغيل البوت...');

        const result = await playerManager.startBot(botId);

        // حذف رسالة الانتظار
        await bot.deleteMessage(chatId, waitMsg.message_id);

        if (result.success) {
            await bot.sendMessage(chatId, `🎉 ${config.messages.ar.success.botStarted}`);
        } else {
            // تحديد نوع الخطأ وإرسال رسالة مناسبة
            let errorMessage = config.messages.ar.errors.general;

            if (result.message.includes('connection') || result.message.includes('connect')) {
                errorMessage = config.messages.ar.errors.connectionFailed;
            } else if (result.message.includes('auth')) {
                errorMessage = config.messages.ar.errors.authenticationFailed;
            } else if (result.message.includes('version')) {
                errorMessage = config.messages.ar.errors.versionNotSupported;
            } else if (result.message.includes('running')) {
                errorMessage = config.messages.ar.errors.botAlreadyRunning;
            }

            await bot.sendMessage(chatId, `${errorMessage}\n\n🔍 تفاصيل الخطأ: ${result.message}`);
        }
    } catch (error) {
        console.error('Error starting bot:', error);
        await bot.sendMessage(chatId, config.messages.ar.errors.general);
    }
}

// إيقاف البوت
async function handleStopBot(chatId, userId, data) {
    const botId = parseInt(data.split('_')[1]);

    try {
        const waitMsg = await bot.sendMessage(chatId, '⏹️ جاري إيقاف البوت...');

        const result = await playerManager.stopBot(botId);

        await bot.deleteMessage(chatId, waitMsg.message_id);

        if (result.success) {
            await bot.sendMessage(chatId, config.messages.ar.success.botStopped);
        } else {
            let errorMessage = config.messages.ar.errors.general;

            if (result.message.includes('not running') || result.message.includes('stopped')) {
                errorMessage = config.messages.ar.errors.botNotRunning;
            }

            await bot.sendMessage(chatId, `${errorMessage}\n\n🔍 تفاصيل: ${result.message}`);
        }
    } catch (error) {
        console.error('Error stopping bot:', error);
        await bot.sendMessage(chatId, config.messages.ar.errors.general);
    }
}

// حذف البوت
async function handleDeleteBot(chatId, userId, data) {
    const botId = parseInt(data.split('_')[1]);

    try {
        // التحقق من وجود البوت
        const botData = await db.getBot(botId);
        if (!botData || botData.user_id !== userId) {
            await bot.sendMessage(chatId, config.messages.ar.errors.botNotFound);
            return;
        }

        // إرسال رسالة تأكيد
        const confirmKeyboard = [
            [
                { text: '✅ نعم، احذف', callback_data: `confirm_delete_${botId}` },
                { text: '❌ إلغاء', callback_data: 'my_bots' }
            ]
        ];

        await bot.sendMessage(chatId,
            `⚠️ هل أنت متأكد من حذف البوت "${botData.bot_name}"؟\n\n` +
            `🚨 هذا الإجراء لا يمكن التراجع عنه!`,
            {
                reply_markup: { inline_keyboard: confirmKeyboard }
            }
        );
    } catch (error) {
        console.error('Error in delete bot:', error);
        await bot.sendMessage(chatId, config.messages.ar.errors.general);
    }
}

// تأكيد حذف البوت
async function handleConfirmDelete(chatId, userId, data) {
    const botId = parseInt(data.split('_')[2]);

    try {
        const waitMsg = await bot.sendMessage(chatId, '🗑️ جاري حذف البوت...');

        // إيقاف اللاعب أولاً إذا كان يعمل
        await playerManager.stopBot(botId);

        // حذف البوت من قاعدة البيانات
        const deleted = await db.deleteBot(botId, userId);

        await bot.deleteMessage(chatId, waitMsg.message_id);

        if (deleted > 0) {
            await bot.sendMessage(chatId, config.messages.ar.success.botDeleted);
        } else {
            await bot.sendMessage(chatId, config.messages.ar.errors.botNotFound);
        }
    } catch (error) {
        console.error('Error deleting bot:', error);
        await bot.sendMessage(chatId, config.messages.ar.errors.general);
    }
}

// عرض الإحصائيات
async function handleStats(chatId, userId) {
    try {
        const userBots = await db.getUserBots(userId);
        const runningBots = userBots.filter(bot => bot.status === 'running').length;
        const javaBots = userBots.filter(bot => bot.minecraft_type === 'java').length;
        const bedrockBots = userBots.filter(bot => bot.minecraft_type === 'bedrock').length;

        const text = `📊 إحصائياتك:\n\n` +
                    `🤖 إجمالي البوتات: ${userBots.length}\n` +
                    `🟢 البوتات النشطة: ${runningBots}\n` +
                    `☕ Java Edition: ${javaBots}\n` +
                    `🏗️ Bedrock Edition: ${bedrockBots}`;

        await bot.sendMessage(chatId, text, messages.mainMenu);
    } catch (error) {
        console.error('Error getting stats:', error);
        await bot.sendMessage(chatId, '❌ حدث خطأ في جلب الإحصائيات');
    }
}

// المساعدة
async function handleHelp(chatId) {
    const helpText = `❓ المساعدة:\n\n` +
                    `🤖 إنشاء بوت جديد: لإنشاء بوت Minecraft جديد\n` +
                    `📋 بوتاتي: لعرض وإدارة بوتاتك\n` +
                    `📊 الإحصائيات: لعرض إحصائيات بوتاتك\n\n` +
                    `💡 نصائح:\n` +
                    `• تأكد من صحة عنوان الخادم والبورت\n` +
                    `• استخدم أسماء بوتات مختلفة لكل خادم\n` +
                    `• يمكنك إيقاف وتشغيل البوتات في أي وقت`;

    const mainMenu = messages.getMainMenu(isAdmin(chatId));
    await bot.sendMessage(chatId, helpText, mainMenu);
}

// لوحة الإدارة
async function handleAdminPanel(chatId, userId) {
    if (!isAdmin(userId)) {
        await bot.sendMessage(chatId, '❌ ليس لديك صلاحية للوصول لهذه الصفحة');
        return;
    }

    try {
        const stats = await db.getGeneralStats();
        const activeBots = playerManager.getActiveBots();

        const text = `⚙️ لوحة الإدارة\n\n` +
                    `👥 إجمالي المستخدمين: ${stats.total_users}\n` +
                    `🤖 إجمالي البوتات: ${stats.total_bots}\n` +
                    `🟢 البوتات النشطة: ${stats.running_bots}\n` +
                    `☕ Java Edition: ${stats.java_bots}\n` +
                    `🏗️ Bedrock Edition: ${stats.bedrock_bots}\n` +
                    `💾 البوتات النشطة في الذاكرة: ${activeBots.length}`;

        const keyboard = [
            [{ text: '👥 قائمة المستخدمين', callback_data: 'admin_users' }],
            [{ text: '🤖 جميع البوتات', callback_data: 'admin_all_bots' }],
            [{ text: '📊 إحصائيات مفصلة', callback_data: 'admin_detailed_stats' }],
            [{ text: '🔄 إعادة تشغيل النظام', callback_data: 'admin_restart' }],
            [{ text: '🔙 رجوع', callback_data: 'back_main' }]
        ];

        await bot.sendMessage(chatId, text, {
            reply_markup: { inline_keyboard: keyboard }
        });
    } catch (error) {
        console.error('Error in admin panel:', error);
        await bot.sendMessage(chatId, '❌ حدث خطأ في جلب بيانات الإدارة');
    }
}

// معالجة إجراءات الأدمن
async function handleAdminActions(chatId, userId, data, messageId) {
    if (!isAdmin(userId)) {
        await bot.sendMessage(chatId, '❌ ليس لديك صلاحية للوصول لهذه الصفحة');
        return;
    }

    try {
        switch (data) {
            case 'admin_users':
                await showAllUsers(chatId, messageId);
                break;
            case 'admin_all_bots':
                await showAllBots(chatId, messageId);
                break;
            case 'admin_detailed_stats':
                await showDetailedStats(chatId, messageId);
                break;
            case 'admin_restart':
                await handleSystemRestart(chatId);
                break;
        }
    } catch (error) {
        console.error('Error in admin actions:', error);
        await bot.sendMessage(chatId, '❌ حدث خطأ في تنفيذ الإجراء');
    }
}

// عرض جميع المستخدمين
async function showAllUsers(chatId, messageId) {
    // سيتم تنفيذها لاحقاً
    await bot.editMessageText('🚧 هذه الميزة قيد التطوير', {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
            inline_keyboard: [[{ text: '🔙 رجوع', callback_data: 'admin_panel' }]]
        }
    });
}

// عرض جميع البوتات
async function showAllBots(chatId, messageId) {
    // سيتم تنفيذها لاحقاً
    await bot.editMessageText('🚧 هذه الميزة قيد التطوير', {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
            inline_keyboard: [[{ text: '🔙 رجوع', callback_data: 'admin_panel' }]]
        }
    });
}

// عرض إحصائيات مفصلة
async function showDetailedStats(chatId, messageId) {
    // سيتم تنفيذها لاحقاً
    await bot.editMessageText('🚧 هذه الميزة قيد التطوير', {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
            inline_keyboard: [[{ text: '🔙 رجوع', callback_data: 'admin_panel' }]]
        }
    });
}

// إعادة تشغيل النظام
async function handleSystemRestart(chatId) {
    await bot.sendMessage(chatId, '🔄 جاري إعادة تشغيل النظام...');

    // إيقاف جميع اللاعبين
    await playerManager.cleanup();

    // إعادة تشغيل العملية
    setTimeout(() => {
        process.exit(0);
    }, 2000);
}

// معالج الأخطاء
bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
});

process.on('SIGINT', async () => {
    console.log('🛑 Shutting down...');
    await playerManager.cleanup();
    db.close();
    process.exit(0);
});

// إعداد Health Check Server
const healthCheckServer = http.createServer((req, res) => {
    if (req.url === '/health' && req.method === 'GET') {
        // فحص حالة البوت والاتصال
        const healthStatus = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            telegram: {
                connected: typeof bot !== 'undefined' && bot !== null
            },
            database: {
                connected: typeof db !== 'undefined' && db !== null
            },
            activeBots: playerManager ? playerManager.getActiveBots().length : 0
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(healthStatus, null, 2));
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

// تشغيل Health Check Server
const healthPort = config.system.port;
healthCheckServer.listen(healthPort, () => {
    console.log(`🏥 Health Check Server running on port ${healthPort}`);
});

// بدء التشغيل
console.log('🚀 بدء تشغيل بوت تلغرام لإدارة ماين كرافت...');
console.log('📱 التوكن:', BOT_TOKEN ? 'موجود' : 'غير موجود');
console.log('💾 قاعدة البيانات: جاري التهيئة...');
console.log('🎮 مدير البوتات: جاري التهيئة...');
console.log('✅ البوت جاهز للاستخدام!');
