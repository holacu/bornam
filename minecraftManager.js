const mineflayer = require('mineflayer');
const bedrock = require('bedrock-protocol');
const { v4: uuidv4 } = require('uuid');

class MinecraftPlayerManager {
    constructor(database) {
        this.db = database;
        this.activePlayers = new Map(); // playerId -> player instance
        this.playerSessions = new Map(); // playerId -> session info
    }

    // إصدارات Minecraft المدعومة
    getSupportedVersions() {
        return {
            java: ['1.21.4', '1.21.3', '1.21.1', '1.21', '1.20.6'],
            bedrock: ['1.21.93', '1.21.90', '1.21.80', '1.21.70', '1.21.60']
        };
    }

    // فحص حالة الخادم
    async checkServerStatus(host, port, type = 'java') {
        try {
            if (type === 'java') {
                return await this.pingJavaServer(host, port);
            } else {
                return await this.pingBedrockServer(host, port);
            }
        } catch (error) {
            return {
                online: false,
                error: error.message,
                players: { online: 0, max: 0 },
                version: 'Unknown',
                motd: 'Server Offline'
            };
        }
    }

    // فحص خادم Java باستخدام minecraft-server-util
    async pingJavaServer(host, port) {
        return new Promise((resolve) => {
            try {
                // استخدام ping بسيط للتحقق من الاتصال
                const net = require('net');
                const socket = new net.Socket();

                socket.setTimeout(3000);

                const startTime = Date.now();
                socket.connect(port, host, () => {
                    const ping = Date.now() - startTime;
                    socket.destroy();
                    resolve({
                        online: true,
                        players: { online: '?', max: '?' },
                        version: 'Java Server',
                        motd: 'Server Online',
                        ping: ping
                    });
                });

                socket.on('error', (err) => {
                    let errorMsg = 'Connection failed';
                    if (err.code === 'ENOTFOUND') {
                        errorMsg = 'Server not found';
                    } else if (err.code === 'ECONNREFUSED') {
                        errorMsg = 'Connection refused';
                    } else if (err.code === 'ETIMEDOUT') {
                        errorMsg = 'Connection timeout';
                    }

                    resolve({
                        online: false,
                        error: errorMsg,
                        players: { online: 0, max: 0 },
                        version: 'Unknown',
                        motd: 'Server Offline'
                    });
                });

                socket.on('timeout', () => {
                    socket.destroy();
                    resolve({
                        online: false,
                        error: 'Connection timeout',
                        players: { online: 0, max: 0 },
                        version: 'Unknown',
                        motd: 'Server Offline'
                    });
                });
            } catch (error) {
                resolve({
                    online: false,
                    error: error.message,
                    players: { online: 0, max: 0 },
                    version: 'Unknown',
                    motd: 'Server Offline'
                });
            }
        });
    }

    // فحص خادم Bedrock
    async pingBedrockServer(host, port) {
        return new Promise((resolve) => {
            try {
                // استخدام UDP ping للـ Bedrock
                const dgram = require('dgram');
                const socket = dgram.createSocket('udp4');

                const startTime = Date.now();
                let resolved = false;

                // إرسال ping packet
                const pingPacket = Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

                socket.send(pingPacket, port, host, (err) => {
                    if (err && !resolved) {
                        resolved = true;
                        socket.close();
                        resolve({
                            online: false,
                            error: 'Failed to send ping',
                            players: { online: 0, max: 0 },
                            version: 'Unknown',
                            motd: 'Server Offline'
                        });
                    }
                });

                socket.on('message', (msg) => {
                    if (!resolved) {
                        resolved = true;
                        const ping = Date.now() - startTime;
                        socket.close();
                        resolve({
                            online: true,
                            players: { online: '?', max: '?' },
                            version: 'Bedrock Server',
                            motd: 'Server Online',
                            ping: ping
                        });
                    }
                });

                socket.on('error', (err) => {
                    if (!resolved) {
                        resolved = true;
                        socket.close();
                        resolve({
                            online: false,
                            error: err.message,
                            players: { online: 0, max: 0 },
                            version: 'Unknown',
                            motd: 'Server Offline'
                        });
                    }
                });

                // مهلة زمنية
                setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        socket.close();
                        resolve({
                            online: false,
                            error: 'Connection timeout',
                            players: { online: 0, max: 0 },
                            version: 'Unknown',
                            motd: 'Server Offline'
                        });
                    }
                }, 3000);

            } catch (error) {
                resolve({
                    online: false,
                    error: error.message,
                    players: { online: 0, max: 0 },
                    version: 'Unknown',
                    motd: 'Server Offline'
                });
            }
        });
    }

    // إنشاء لاعب Java Edition
    async createJavaPlayer(playerConfig) {
        return new Promise((resolve, reject) => {
            try {
                console.log(`👤 Creating Java player: ${playerConfig.bot_name} for ${playerConfig.server_host}:${playerConfig.server_port}`);
                console.log(`📦 Version: ${playerConfig.minecraft_version}`);

                // إنشاء لاعب بإعدادات طبيعية
                const player = mineflayer.createBot({
                    host: playerConfig.server_host,
                    port: parseInt(playerConfig.server_port),
                    username: playerConfig.bot_name,
                    version: playerConfig.minecraft_version,
                    auth: 'offline',
                    // إعدادات لاعب طبيعي
                    viewDistance: 'normal',
                    chat: 'enabled',
                    colorsEnabled: false,
                    hideErrors: true,
                    // إعدادات إضافية للاستقرار
                    checkTimeoutInterval: 30000,
                    keepAlive: true
                });

                // إضافة معلومات اللاعب
                player.playerConfig = playerConfig;
                player.reconnectAttempts = 0;
                player.maxReconnectAttempts = 3; // أقل من البوت العادي

                // انتظار الاتصال الناجح أو الفشل
                let resolved = false;

                // معالج تسجيل الدخول الناجح
                player.once('login', () => {
                    if (!resolved) {
                        resolved = true;
                        console.log(`✅ Player ${playerConfig.bot_name} joined the server successfully!`);
                        player.reconnectAttempts = 0;
                        resolve(player);
                    }
                });

                // معالج الأخطاء
                player.once('error', (error) => {
                    if (!resolved) {
                        resolved = true;
                        console.error(`❌ Player ${playerConfig.bot_name} connection failed:`, error.message);

                        // تحديد نوع الخطأ
                        let errorMessage = error.message;
                        if (error.message.includes('getaddrinfo ENOTFOUND')) {
                            errorMessage = 'عنوان الخادم غير صحيح أو غير موجود';
                        } else if (error.message.includes('ECONNREFUSED')) {
                            errorMessage = 'الخادم رفض الاتصال - تحقق من البورت والخادم';
                        } else if (error.message.includes('ETIMEDOUT')) {
                            errorMessage = 'انتهت مهلة الاتصال - الخادم قد يكون غير متاح';
                        } else if (error.message.includes('Invalid username')) {
                            errorMessage = 'اسم اللاعب غير صالح';
                        } else if (error.message.includes('version')) {
                            errorMessage = 'إصدار ماين كرافت غير مدعوم أو غير صحيح';
                        }

                        reject(new Error(errorMessage));
                    }
                });

                // معالج انتهاء الاتصال
                player.once('end', () => {
                    if (!resolved) {
                        resolved = true;
                        reject(new Error('انقطع الاتصال قبل تسجيل الدخول'));
                    }
                });

                // مهلة زمنية للاتصال (30 ثانية)
                setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        try {
                            player.end();
                        } catch (e) {
                            // تجاهل أخطاء إغلاق اللاعب
                        }
                        reject(new Error('انتهت مهلة الاتصال (30 ثانية)'));
                    }
                }, 30000);

                // إعداد سلوك اللاعب
                this.setupJavaPlayerBehavior(player, playerConfig);

            } catch (error) {
                console.error(`❌ Failed to create Java player: ${error.message}`);
                reject(new Error(`فشل في إنشاء لاعب Java: ${error.message}`));
            }
        });
    }

    // إعداد سلوك اللاعب Java - طبيعي ومتكامل
    setupJavaPlayerBehavior(player, playerConfig) {
        const playerId = playerConfig.id;

        // معالج تسجيل الدخول
        player.once('login', async () => {
            console.log(`✅ ${player.username} joined the server`);
            player.reconnectAttempts = 0;
            await this.db.updateBotStatus(playerId, 'running');
            await this.db.addEventLog(playerId, playerConfig.user_id, 'connect', 'دخل اللاعب للخادم بنجاح');
        });

        // معالج الدخول للعالم - سلوك طبيعي
        player.on('spawn', async () => {
            console.log(`🌍 ${player.username} spawned in the world`);
            await this.db.addEventLog(playerId, playerConfig.user_id, 'spawn', 'دخل اللاعب للعالم');

            // سلوك طبيعي للاعب - حركة خفيفة بعد الدخول
            setTimeout(() => {
                try {
                    // نظرة حول المكان
                    player.look(Math.random() * Math.PI * 2, 0);

                    // حركة بسيطة للأمام
                    setTimeout(() => {
                        player.setControlState('forward', true);
                        setTimeout(() => {
                            player.setControlState('forward', false);
                        }, 1000);
                    }, 2000);
                } catch (error) {
                    // تجاهل أخطاء الحركة
                }
            }, 3000);
        });

        // معالج الدردشة - ردود طبيعية
        player.on('chat', (username, message) => {
            if (username === player.username) return;
            console.log(`💬 ${username}: ${message}`);

            // ردود طبيعية مع تأخير عشوائي
            try {
                const msg = message.toLowerCase();
                if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
                    const delay = 2000 + Math.random() * 4000; // 2-6 ثواني
                    setTimeout(() => {
                        const responses = [`hi ${username}`, `hello ${username}`, `hey ${username}`];
                        const response = responses[Math.floor(Math.random() * responses.length)];
                        player.chat(response);
                    }, delay);
                } else if (msg.includes(player.username.toLowerCase())) {
                    // إذا ذكر اسم اللاعب
                    const delay = 1000 + Math.random() * 3000;
                    setTimeout(() => {
                        player.chat('yes?');
                    }, delay);
                }
            } catch (error) {
                // تجاهل أخطاء الدردشة
            }
        });

        // معالج الطرد
        player.on('kicked', async (reason) => {
            console.log(`❌ ${player.username} was kicked: ${JSON.stringify(reason)}`);
            await this.db.updateBotStatus(playerId, 'error', `تم طرد اللاعب: ${JSON.stringify(reason)}`);
            await this.db.addEventLog(playerId, playerConfig.user_id, 'disconnect', `تم طرد اللاعب: ${JSON.stringify(reason)}`);
            this.handlePlayerReconnect(player, playerConfig);
        });

        // معالج الأخطاء
        player.on('error', async (err) => {
            console.error(`❌ Player ${player.username} error: ${err.message}`);

            // لا تعيد الاتصال في حالة أخطاء المصادقة
            if (err.message.includes('auth') || err.message.includes('login')) {
                console.error('Authentication error for player. Stopping reconnection.');
                await this.db.updateBotStatus(playerId, 'error', `خطأ في المصادقة: ${err.message}`);
                await this.db.addEventLog(playerId, playerConfig.user_id, 'error', `خطأ في المصادقة: ${err.message}`);
                this.activePlayers.delete(playerId);
                return;
            }

            await this.db.updateBotStatus(playerId, 'error', err.message);
            await this.db.addEventLog(playerId, playerConfig.user_id, 'error', err.message);
            this.handlePlayerReconnect(player, playerConfig);
        });

        // معالج انتهاء الاتصال
        player.on('end', async () => {
            console.log(`🔌 ${player.username} disconnected from server`);
            await this.db.updateBotStatus(playerId, 'stopped');
            await this.db.addEventLog(playerId, playerConfig.user_id, 'disconnect', 'انقطع الاتصال');
            this.handlePlayerReconnect(player, playerConfig);
        });
    }

    // إعداد أحداث بوت Java (مطابق لـ bot.js الأصلي)
    setupJavaBotEvents(bot, botConfig) {
        const botId = botConfig.id;

        // معالج تسجيل الدخول - بسيط وطبيعي
        bot.once('login', async () => {
            console.log(`✅ ${bot.username} connected to server`);
            bot.reconnectAttempts = 0;
            await this.db.updateBotStatus(botId, 'running');
            await this.db.addEventLog(botId, botConfig.user_id, 'connect', 'تم الاتصال بنجاح');
        });

        // معالج الدخول للعالم - سلوك بسيط كلاعب
        bot.on('spawn', async () => {
            console.log(`✅ ${botConfig.bot_name} spawned in world`);
            await this.db.addEventLog(botId, botConfig.user_id, 'spawn', 'تم الدخول للعالم');

            // سلوك بسيط كلاعب حقيقي - حركة خفيفة
            setTimeout(() => {
                try {
                    bot.setControlState('forward', true);
                    setTimeout(() => bot.setControlState('forward', false), 500);
                } catch (error) {
                    // تجاهل أخطاء الحركة
                }
            }, 3000);
        });

        // معالج الدردشة - ردود طبيعية كلاعب
        bot.on('chat', (username, message) => {
            if (username === bot.username) return;
            console.log(`💬 ${username}: ${message}`);

            // ردود بسيطة وطبيعية مع تأخير عشوائي
            try {
                const msg = message.toLowerCase();
                if (msg.includes('hello') || msg.includes('hi')) {
                    const delay = 1000 + Math.random() * 3000; // 1-4 ثواني
                    setTimeout(() => {
                        bot.chat(`hi ${username}`);
                    }, delay);
                }
            } catch (error) {
                // تجاهل الأخطاء بصمت
            }
        });

        // معالج الطرد (مطابق لـ bot.js)
        bot.on('kicked', async (reason) => {
            console.log(`❌ Kicked: ${JSON.stringify(reason)}`);
            await this.db.updateBotStatus(botId, 'error', `تم طرد البوت: ${JSON.stringify(reason)}`);
            await this.db.addEventLog(botId, botConfig.user_id, 'disconnect', `تم طرد البوت: ${JSON.stringify(reason)}`);
            this.handleReconnect(bot, botConfig);
        });

        // معالج الأخطاء (مطابق لـ bot.js)
        bot.on('error', async (err) => {
            console.error(`❌ Bot error: ${err.message}`);

            // Don't reconnect on authentication errors (مطابق لـ bot.js)
            if (err.message.includes('auth') || err.message.includes('login')) {
                console.error('Authentication error. Please check your credentials.');
                await this.db.updateBotStatus(botId, 'error', `خطأ في المصادقة: ${err.message}`);
                await this.db.addEventLog(botId, botConfig.user_id, 'error', `خطأ في المصادقة: ${err.message}`);
                this.activePlayers.delete(botId);
                return;
            }

            await this.db.updateBotStatus(botId, 'error', err.message);
            await this.db.addEventLog(botId, botConfig.user_id, 'error', err.message);
            this.handleReconnect(bot, botConfig);
        });

        // معالج انتهاء الاتصال (مطابق لـ bot.js)
        bot.on('end', async () => {
            console.log('🔌 Connection ended');
            await this.db.updateBotStatus(botId, 'stopped');
            await this.db.addEventLog(botId, botConfig.user_id, 'disconnect', 'انقطع الاتصال');
            this.handleReconnect(bot, botConfig);
        });

        // Handle server messages (مطابق لـ bot.js)
        bot.on('message', async (message) => {
            try {
                const msg = message.toString();
                if (msg.includes('whitelist') || msg.includes('banned') || msg.includes('kick')) {
                    console.log(`⚠️ Server message: ${msg}`);
                    await this.db.addEventLog(botId, botConfig.user_id, 'server_message', msg);
                }
            } catch (error) {
                console.error(`Error handling server message: ${error.message}`);
            }
        });
    }

    // إنشاء لاعب Bedrock Edition
    async createBedrockPlayer(botConfig) {
        return new Promise((resolve, reject) => {
            try {
                console.log(`🚀 Creating Bedrock bot: ${botConfig.bot_name} for ${botConfig.server_host}:${botConfig.server_port}`);
                console.log(`📦 Version: ${botConfig.minecraft_version}, Auth: ${botConfig.auth_type || 'offline'}`);

                // إعدادات خاصة لخوادم Aternos
                const isAternos = botConfig.server_host.includes('aternos');

                // إعدادات بسيطة لتبدو كلاعب حقيقي
                const client = bedrock.createClient({
                    host: botConfig.server_host,
                    port: parseInt(botConfig.server_port),
                    username: botConfig.bot_name,
                    offline: true,
                    version: botConfig.minecraft_version,
                    skipPing: false,
                    connectTimeout: 30000,
                    // إعدادات لتبدو كلاعب عادي
                    hideErrors: true
                });

                // إضافة معلومات إضافية للبوت
                client.botConfig = botConfig;
                client.reconnectAttempts = 0;
                client.maxReconnectAttempts = 5;

                // انتظار الاتصال الناجح أو الفشل
                let resolved = false;

                // معالج الاتصال الناجح
                client.once('spawn', () => {
                    if (!resolved) {
                        resolved = true;
                        console.log(`✅ Bedrock Bot ${botConfig.bot_name} connected and spawned successfully!`);
                        resolve(client);
                    }
                });

                // معالج الأخطاء
                client.once('error', (error) => {
                    if (!resolved) {
                        resolved = true;
                        console.error(`❌ Bedrock Bot ${botConfig.bot_name} connection failed:`, error.message);

                        let errorMessage = error.message;
                        if (error.message.includes('getaddrinfo ENOTFOUND')) {
                            errorMessage = 'عنوان الخادم غير صحيح أو غير موجود';
                        } else if (error.message.includes('ECONNREFUSED')) {
                            errorMessage = 'الخادم رفض الاتصال - تحقق من البورت والخادم';
                        } else if (error.message.includes('ETIMEDOUT')) {
                            errorMessage = 'انتهت مهلة الاتصال - الخادم قد يكون غير متاح';
                        } else if (error.message.includes('Unsupported version')) {
                            errorMessage = `إصدار ${botConfig.minecraft_version} غير مدعوم. جرب إصدار 1.21.93 أو أقدم`;
                        }

                        reject(new Error(errorMessage));
                    }
                });

                // معالج قطع الاتصال
                client.once('disconnect', (packet) => {
                    if (!resolved) {
                        resolved = true;
                        const reason = packet?.message || 'Unknown reason';
                        console.error(`❌ Bedrock Bot ${botConfig.bot_name} disconnected during connection:`, reason);

                        let errorMessage = reason;
                        if (reason.includes('notAuthenticated')) {
                            errorMessage = 'الخادم رفض البوت - قد تحتاج إضافة البوت للـ whitelist أو تغيير إعدادات الخادم';
                        } else if (reason.includes('serverFull')) {
                            errorMessage = 'الخادم ممتلئ - لا توجد أماكن متاحة';
                        } else if (reason.includes('banned')) {
                            errorMessage = 'البوت محظور من هذا الخادم';
                        }

                        reject(new Error(errorMessage));
                    }
                });

                // مهلة زمنية للاتصال (30 ثانية)
                setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        try {
                            client.disconnect();
                        } catch (e) {
                            // تجاهل أخطاء قطع الاتصال
                        }
                        reject(new Error('انتهت مهلة الاتصال (30 ثانية)'));
                    }
                }, 30000);

                this.setupBedrockBotEvents(client, botConfig);

            } catch (error) {
                console.error(`❌ Failed to create Bedrock bot: ${error.message}`);
                reject(new Error(`فشل في إنشاء بوت Bedrock: ${error.message}`));
            }
        });
    }

    // إعداد أحداث بوت Bedrock
    setupBedrockBotEvents(client, botConfig) {
        const botId = botConfig.id;
        let isConnected = false;

        // معالج الدخول للعالم - سلوك بسيط كلاعب
        client.on('spawn', async () => {
            console.log(`✅ Bedrock Bot ${botConfig.bot_name} spawned in world`);
            isConnected = true;
            client.reconnectAttempts = 0;
            await this.db.updateBotStatus(botId, 'running');
            await this.db.addEventLog(botId, botConfig.user_id, 'connect', 'تم الاتصال والدخول للعالم بنجاح');

            // سلوك بسيط - لا نرسل رسائل فورية لتبدو طبيعية أكثر
        });

        // معالج الدردشة - ردود طبيعية كلاعب
        client.on('text', async (packet) => {
            if (packet.type === 'chat' && packet.source_name !== botConfig.bot_name) {
                console.log(`💬 [${botConfig.bot_name}] ${packet.source_name}: ${packet.message}`);

                // ردود بسيطة وطبيعية مع تأخير عشوائي
                try {
                    const msg = packet.message.toLowerCase();
                    if (msg.includes('hello') || msg.includes('hi')) {
                        const delay = 2000 + Math.random() * 4000; // 2-6 ثواني
                        setTimeout(() => {
                            client.queue('text', {
                                type: 'chat',
                                needs_translation: false,
                                source_name: botConfig.bot_name,
                                xuid: '',
                                platform_chat_id: '',
                                message: `hi ${packet.source_name}`
                            });
                        }, delay);
                    }
                } catch (error) {
                    // تجاهل الأخطاء بصمت
                }
            }
        });

        // معالج قطع الاتصال
        client.on('disconnect', async (packet) => {
            const disconnectReason = packet?.message || 'Unknown reason';
            console.log(`❌ Bedrock Bot ${botConfig.bot_name} disconnected: ${disconnectReason}`);

            // تحديد نوع الخطأ بناءً على رسالة القطع
            const isAternos = botConfig.server_host.includes('aternos');
            let errorMessage = disconnectReason;

            if (disconnectReason.includes('notAuthenticated')) {
                if (isAternos) {
                    errorMessage = '🔐 خادم Aternos يتطلب إعدادات خاصة:\n\n' +
                                 '💡 الحلول (اختر واحد):\n' +
                                 '1️⃣ في لوحة تحكم Aternos → Options → server.properties\n' +
                                 '   غيّر online-mode إلى false\n\n' +
                                 '2️⃣ أو أضف اسم البوت للـ Whitelist في تبويب Players\n\n' +
                                 '3️⃣ أو تأكد أن الخادم في وضع Cracked/Offline';
                } else {
                    errorMessage = 'الخادم رفض البوت - قد تحتاج إضافة البوت للـ whitelist أو تفعيل وضع offline';
                }
            } else if (disconnectReason.includes('serverFull')) {
                errorMessage = 'الخادم ممتلئ - لا توجد أماكن متاحة';
            } else if (disconnectReason.includes('banned')) {
                errorMessage = 'البوت محظور من هذا الخادم';
            } else if (disconnectReason.includes('whitelist')) {
                errorMessage = 'البوت غير موجود في قائمة المسموحين (whitelist)';
            }

            await this.db.updateBotStatus(botId, 'error', errorMessage);
            await this.db.addEventLog(botId, botConfig.user_id, 'disconnect', errorMessage);

            // إعادة الاتصال فقط إذا كان متصلاً من قبل
            if (isConnected) {
                this.handleReconnect(client, botConfig);
            } else {
                this.activePlayers.delete(botId);
            }
        });

        // معالج الأخطاء
        client.on('error', async (err) => {
            console.error(`❌ Bedrock Bot ${botConfig.bot_name} error:`, err.message);

            let errorMessage = err.message;
            if (err.message.includes('getaddrinfo')) {
                errorMessage = 'عنوان الخادم غير صحيح أو غير موجود';
            } else if (err.message.includes('ECONNREFUSED')) {
                errorMessage = 'الخادم رفض الاتصال - تحقق من البورت';
            } else if (err.message.includes('timeout')) {
                errorMessage = 'انتهت مهلة الاتصال - الخادم قد يكون غير متاح';
            }

            await this.db.updateBotStatus(botId, 'error', errorMessage);
            await this.db.addEventLog(botId, botConfig.user_id, 'error', errorMessage);

            // إعادة الاتصال فقط إذا كان متصلاً من قبل
            if (isConnected) {
                this.handleReconnect(client, botConfig);
            } else {
                this.activePlayers.delete(botId);
            }
        });
    }

    // بدء تشغيل بوت
    async startBot(botId) {
        try {
            const botConfig = await this.db.getBot(botId);
            if (!botConfig) {
                return { success: false, message: 'البوت غير موجود في قاعدة البيانات' };
            }

            if (this.activePlayers.has(botId)) {
                return { success: false, message: 'اللاعب يعمل بالفعل' };
            }

            console.log(`🚀 Starting bot ${botConfig.bot_name} (${botConfig.minecraft_type}) for ${botConfig.server_host}:${botConfig.server_port}...`);

            // فحص خاص لخوادم Aternos
            const isAternos = botConfig.server_host.includes('aternos');
            if (isAternos) {
                console.log(`🔍 Detected Aternos server - applying special configurations...`);
                console.log(`💡 Note: If connection fails, make sure to set online-mode=false in server.properties or add bot to whitelist`);
            }

            // تحديث حالة البوت إلى "يتصل"
            await this.db.updateBotStatus(botId, 'connecting');
            await this.db.addEventLog(botId, botConfig.user_id, 'start', 'بدء محاولة الاتصال');

            let bot;
            try {
                if (botConfig.minecraft_type === 'java') {
                    bot = await this.createJavaPlayer(botConfig);
                } else if (botConfig.minecraft_type === 'bedrock') {
                    bot = await this.createBedrockPlayer(botConfig);
                } else {
                    await this.db.updateBotStatus(botId, 'error', 'نوع Minecraft غير مدعوم');
                    return { success: false, message: 'نوع Minecraft غير مدعوم' };
                }

                // إذا وصلنا هنا، فاللاعب اتصل بنجاح
                this.activePlayers.set(botId, bot);
                console.log(`✅ Player ${botConfig.bot_name} started and connected successfully!`);

                return { success: true, message: 'تم الاتصال بالخادم بنجاح' };

            } catch (connectionError) {
                // فشل في الاتصال
                console.error(`❌ Connection failed for bot ${botConfig.bot_name}:`, connectionError.message);
                await this.db.updateBotStatus(botId, 'error', connectionError.message);
                await this.db.addEventLog(botId, botConfig.user_id, 'error', `فشل في الاتصال: ${connectionError.message}`);

                // تحديد نوع الخطأ
                let errorMessage = connectionError.message;
                if (connectionError.message.includes('getaddrinfo')) {
                    errorMessage = 'عنوان الخادم غير صحيح أو غير موجود';
                } else if (connectionError.message.includes('ECONNREFUSED')) {
                    errorMessage = 'الخادم رفض الاتصال - تحقق من البورت';
                } else if (connectionError.message.includes('timeout')) {
                    errorMessage = 'انتهت مهلة الاتصال - الخادم قد يكون غير متاح';
                }

                return { success: false, message: errorMessage };
            }

        } catch (error) {
            console.error(`❌ Error starting bot ${botId}:`, error.message);
            await this.db.updateBotStatus(botId, 'error', error.message);
            // لا نحتاج botConfig هنا لأنه قد يكون غير معرف
            return { success: false, message: error.message };
        }
    }

    // إيقاف بوت
    async stopBot(botId) {
        try {
            const botConfig = await this.db.getBot(botId);
            if (!botConfig) {
                return { success: false, message: 'البوت غير موجود في قاعدة البيانات' };
            }

            const player = this.activePlayers.get(botId);
            if (!player) {
                await this.db.updateBotStatus(botId, 'stopped');
                return { success: true, message: 'اللاعب متوقف بالفعل' };
            }

            console.log(`⏹️ Stopping bot ${botConfig.bot_name}...`);

            try {
                if (botConfig.minecraft_type === 'java') {
                    bot.quit('تم إيقاف البوت من قبل المستخدم');
                } else if (botConfig.minecraft_type === 'bedrock') {
                    bot.disconnect();
                }
            } catch (error) {
                console.error(`Error disconnecting bot ${botConfig.bot_name}:`, error.message);
            }

            this.activePlayers.delete(botId);
            await this.db.updateBotStatus(botId, 'stopped');
            await this.db.addEventLog(botId, botConfig.user_id, 'stop', 'تم إيقاف اللاعب من قبل المستخدم');

            console.log(`✅ Player ${botConfig.bot_name} stopped successfully`);
            return { success: true, message: 'تم إيقاف اللاعب بنجاح' };
        } catch (error) {
            console.error(`❌ Error stopping bot ${botId}:`, error.message);
            return { success: false, message: error.message };
        }
    }

    // الحصول على حالة اللاعب
    getBotStatus(botId) {
        const isActive = this.activePlayers.has(botId);
        return {
            isActive,
            status: isActive ? 'running' : 'stopped'
        };
    }

    // الحصول على جميع اللاعبين النشطين
    getActiveBots() {
        return Array.from(this.activePlayers.keys());
    }

    // إيقاف جميع اللاعبين
    async stopAllBots() {
        const activeBotIds = Array.from(this.activePlayers.keys());
        const results = [];

        for (const botId of activeBotIds) {
            const result = await this.stopBot(botId);
            results.push({ botId, ...result });
        }

        return results;
    }

    // معالجة إعادة الاتصال مع تأخير تدريجي (مطابق لـ bot.js الأصلي)
    handleReconnect(bot, botConfig) {
        const botId = botConfig.id;

        if (bot.reconnectAttempts >= bot.maxReconnectAttempts) {
            console.error(`❌ Max reconnection attempts (${bot.maxReconnectAttempts}) reached. Exiting...`);
            this.activePlayers.delete(botId);
            this.db.updateBotStatus(botId, 'error', 'تم الوصول للحد الأقصى من محاولات الاتصال');
            return;
        }

        const delay = Math.min(5000 * Math.pow(1.5, bot.reconnectAttempts), 300000); // Cap at 5 minutes
        bot.reconnectAttempts++;

        console.log(`⏳ Reconnecting in ${delay/1000} seconds... (Attempt ${bot.reconnectAttempts}/${bot.maxReconnectAttempts})`);

        // Clear any existing bot instance (مطابق لـ bot.js)
        if (bot) {
            try {
                bot.end('reconnecting');
            } catch (error) {
                console.error('Error ending bot:', error.message);
            }
        }

        // إعادة الاتصال بعد التأخير
        setTimeout(async () => {
            try {
                console.log(`🔄 Attempting to reconnect ${botConfig.bot_name}...`);
                const newBot = await this.createJavaPlayer(botConfig);
                newBot.reconnectAttempts = bot.reconnectAttempts;
                this.activePlayers.set(botId, newBot);
            } catch (error) {
                console.error(`❌ Reconnection failed for ${botConfig.bot_name}:`, error.message);
                this.db.updateBotStatus(botId, 'error', `فشل في إعادة الاتصال: ${error.message}`);
                // إذا فشلت إعادة الاتصال، حاول مرة أخرى
                if (bot.reconnectAttempts < bot.maxReconnectAttempts) {
                    this.handleReconnect(bot, botConfig);
                } else {
                    this.activePlayers.delete(botId);
                }
            }
        }, delay);
    }

    // معالجة إعادة الاتصال للاعبين
    handlePlayerReconnect(player, playerConfig) {
        const playerId = playerConfig.id;

        if (player.reconnectAttempts >= player.maxReconnectAttempts) {
            console.error(`❌ Max reconnection attempts (${player.maxReconnectAttempts}) reached for player ${playerConfig.bot_name}.`);
            this.activePlayers.delete(playerId);
            this.db.updateBotStatus(playerId, 'error', 'تم الوصول للحد الأقصى من محاولات الاتصال');
            return;
        }

        const delay = Math.min(3000 * Math.pow(1.5, player.reconnectAttempts), 180000); // حد أقصى 3 دقائق
        player.reconnectAttempts++;

        console.log(`⏳ Reconnecting player ${playerConfig.bot_name} in ${delay/1000} seconds... (Attempt ${player.reconnectAttempts}/${player.maxReconnectAttempts})`);

        // تنظيف اللاعب الحالي
        if (player) {
            try {
                player.end('reconnecting');
            } catch (error) {
                console.error('Error ending player:', error.message);
            }
        }

        // إعادة الاتصال بعد التأخير
        setTimeout(async () => {
            try {
                console.log(`🔄 Attempting to reconnect player ${playerConfig.bot_name}...`);
                const newPlayer = await this.createJavaPlayer(playerConfig);
                newPlayer.reconnectAttempts = player.reconnectAttempts;
                this.activePlayers.set(playerId, newPlayer);
            } catch (error) {
                console.error(`❌ Player reconnection failed for ${playerConfig.bot_name}:`, error.message);
                this.db.updateBotStatus(playerId, 'error', `فشل في إعادة الاتصال: ${error.message}`);
                // إذا فشلت إعادة الاتصال، حاول مرة أخرى
                if (player.reconnectAttempts < player.maxReconnectAttempts) {
                    this.handlePlayerReconnect(player, playerConfig);
                } else {
                    this.activePlayers.delete(playerId);
                }
            }
        }, delay);
    }

    // تنظيف الموارد
    async cleanup() {
        console.log('🧹 Cleaning up all players and bots...');
        await this.stopAllBots();
        this.activePlayers.clear();
        this.playerSessions.clear();
    }
}

module.exports = MinecraftPlayerManager;
