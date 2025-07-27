// إعدادات التطبيق
const config = {
    // إعدادات بوت التلغرام
    telegram: {
        token: process.env.TELEGRAM_BOT_TOKEN || '8147667148:AAEq8lfdIV42sOFwf3Cdf9ZYpinm3pUgkZU',
        adminIds: process.env.TELEGRAM_ADMIN_IDS ?
            process.env.TELEGRAM_ADMIN_IDS.split(',').map(id => parseInt(id.trim())) :
            [], // سيتم تحديثها تلقائياً
        polling: {
            interval: parseInt(process.env.POLLING_INTERVAL) || 300,
            timeout: parseInt(process.env.POLLING_TIMEOUT) || 10
        }
    },

    // إعدادات قاعدة البيانات
    database: {
        path: process.env.DATABASE_PATH || './data/bot_data.db',
        backup: {
            enabled: process.env.BACKUP_ENABLED === 'true' || true,
            interval: parseInt(process.env.BACKUP_INTERVAL) || 24 * 60 * 60 * 1000, // 24 ساعة
            maxBackups: parseInt(process.env.MAX_BACKUPS) || 7
        }
    },

    // إعدادات Minecraft
    minecraft: {
        // الإصدارات المدعومة (بناءً على ما تدعمه المكتبات فعلياً)
        supportedVersions: {
            java: ['1.21.4', '1.21.3', '1.21.1', '1.21', '1.20.6'],
            bedrock: ['1.21.93', '1.21.90', '1.21.80', '1.21.70', '1.21.60']
        },
        
        // إعدادات البوت الافتراضية
        defaultSettings: {
            viewDistance: process.env.DEFAULT_VIEW_DISTANCE || 'tiny',
            chat: process.env.DEFAULT_CHAT_ENABLED === 'false' ? 'disabled' : 'enabled',
            hideErrors: process.env.HIDE_ERRORS === 'true' || false,
            reconnectAttempts: parseInt(process.env.DEFAULT_RECONNECT_ATTEMPTS) || 5,
            reconnectDelay: parseInt(process.env.DEFAULT_RECONNECT_DELAY) || 5000
        },

        // رسائل البوت التلقائية
        autoMessages: {
            onJoin: 'مرحباً! أنا متصل الآن 🤖',
            onGreeting: 'مرحباً {username}! 👋',
            onDisconnect: 'تم إيقاف البوت من قبل المستخدم'
        }
    },

    // إعدادات النظام
    system: {
        maxBotsPerUser: parseInt(process.env.MAX_BOTS_PER_USER) || 10,
        maxTotalBots: parseInt(process.env.MAX_TOTAL_BOTS) || 1000,
        logLevel: process.env.LOG_LEVEL || 'info',
        enableMetrics: process.env.ENABLE_METRICS === 'false' ? false : true,
        metricsInterval: parseInt(process.env.METRICS_INTERVAL) || 60000, // دقيقة واحدة
        port: parseInt(process.env.PORT) || 3000
    },

    // رسائل واجهة المستخدم
    messages: {
        ar: {
            welcome: `🎮 أهلاً وسهلاً بك في مدير لاعبي ماين كرافت!

✨ ما يمكنك فعله:
👤 إنشاء لاعبين افتراضيين لخوادم Java و Bedrock
⚡ تشغيل وإيقاف اللاعبين بسهولة
📊 مراقبة الإحصائيات والأداء
🔧 إدارة الخوادم والإعدادات

🚀 ابدأ رحلتك الآن!`,

            errors: {
                general: '❌ عذراً، حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى',
                unauthorized: '🚫 عذراً، ليس لديك صلاحية لتنفيذ هذا الأمر',
                botNotFound: '🔍 البوت المطلوب غير موجود أو تم حذفه',
                invalidPort: '🔢 رقم البورت غير صحيح! يجب أن يكون بين 1 و 65535',
                invalidBotName: '📝 اسم البوت يجب أن يكون بين 3 و 16 حرف (أحرف وأرقام فقط)',
                invalidHost: '🌐 عنوان الخادم غير صحيح! تأكد من كتابته بشكل صحيح',
                maxBotsReached: '⚠️ وصلت للحد الأقصى من البوتات المسموح بها',
                botAlreadyRunning: '🟢 البوت يعمل بالفعل!',
                botNotRunning: '🔴 البوت متوقف بالفعل',
                connectionFailed: '🔌 فشل في الاتصال بالخادم. تحقق من العنوان والبورت',
                serverOffline: '📡 الخادم غير متاح حالياً أو غير متصل',
                authenticationFailed: '🔐 فشل في المصادقة. تحقق من إعدادات الخادم',
                notAuthenticated: '🚫 الخادم رفض البوت - قد تحتاج إضافة البوت للـ whitelist',
                serverFull: '👥 الخادم ممتلئ - لا توجد أماكن متاحة',
                banned: '🚫 البوت محظور من هذا الخادم',
                versionNotSupported: '📦 إصدار ماين كرافت غير مدعوم',
                networkError: '🌐 خطأ في الشبكة. تحقق من اتصالك بالإنترنت'
            },

            success: {
                botCreated: '🎉 تم إنشاء البوت بنجاح! يمكنك الآن تشغيله',
                botStarted: '✅ تم تشغيل البوت بنجاح! البوت متصل الآن',
                botStopped: '⏹️ تم إيقاف البوت بنجاح',
                botDeleted: '🗑️ تم حذف البوت نهائياً',
                adminAdded: '👑 تم إضافة مدير جديد بنجاح',
                connected: '🔗 تم الاتصال بالخادم بنجاح',
                disconnected: '📡 تم قطع الاتصال بالخادم'
            },

            buttons: {
                createBot: '👤 إنشاء لاعب جديد',
                myBots: '📋 لاعبيني',
                stats: '📊 الإحصائيات',
                help: '❓ المساعدة',
                adminPanel: '⚙️ لوحة الإدارة',
                back: '🔙 رجوع',
                start: '▶️ تشغيل',
                stop: '⏹️ إيقاف',
                delete: '🗑️ حذف',
                edit: '✏️ تعديل',
                refresh: '🔄 تحديث',
                javaEdition: '☕ جافا إديشن',
                bedrockEdition: '🏗️ بيدروك إديشن',
                mainMenu: '🏠 القائمة الرئيسية'
            },

            prompts: {
                selectMinecraftType: '🎮 اختر نوع ماين كرافت:',
                selectVersion: '📦 اختر إصدار {type}:',
                enterServerHost: '🌐 أدخل عنوان الخادم:\n\n💡 أمثلة:\n• Aternos: yourserver.aternos.me\n• Hypixel: play.hypixel.net\n• خادم محلي: localhost أو 192.168.1.100',
                enterServerPort: '🔌 أدخل رقم البورت:\n\n💡 البورت الافتراضي:\n• Java Edition: 25565\n• Bedrock Edition: 19132\n• Aternos: يظهر في لوحة التحكم',
                enterBotName: '🤖 أدخل اسم البوت في اللعبة:\n\n📝 يجب أن يكون بين 3-16 حرف (أحرف وأرقام فقط)\n⚠️ ملاحظة: إذا كان الخادم يتطلب whitelist، تأكد من إضافة هذا الاسم للقائمة'
            },

            status: {
                running: '🟢 يعمل',
                stopped: '🔴 متوقف',
                connecting: '🟡 يتصل...',
                error: '❌ خطأ',
                unknown: '⚪ غير معروف'
            },

            help: {
                text: `❓ دليل الاستخدام:

🤖 إنشاء بوت جديد:
   • اختر نوع ماين كرافت (جافا أو بيدروك)
   • حدد الإصدار المناسب
   • أدخل بيانات الخادم
   • اختر اسم البوت

📋 إدارة البوتات:
   • عرض جميع بوتاتك
   • تشغيل وإيقاف البوتات
   • حذف البوتات غير المرغوبة
   • مراقبة حالة الاتصال

📊 الإحصائيات:
   • عدد البوتات الإجمالي
   • البوتات النشطة
   • إحصائيات الاستخدام

💡 نصائح مهمة:
• تأكد من صحة عنوان الخادم والبورت
• استخدم أسماء مختلفة لكل بوت
• تحقق من أن الخادم يسمح بالبوتات
• استخدم البوتات بمسؤولية`
            }
        }
    }
};

module.exports = config;
