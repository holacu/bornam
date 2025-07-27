const mineflayer = require('mineflayer');
const { EventEmitter } = require('events');

class MinecraftJavaBot extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.bot = null;
        this.isConnected = false;
        this.connectionTime = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 5000; // 5 ثواني
        this.shouldReconnect = true;
        this.reconnectTimeout = null;
        this.playerInfo = {};
    }

    async connect() {
        try {
            console.log(`🔄 محاولة الاتصال بسيرفر Java: ${this.config.host}:${this.config.port}`);
            
            const botOptions = {
                host: this.config.host,
                port: this.config.port,
                username: this.config.username,
                version: this.config.version || '1.20.1',
                auth: 'offline', // للسيرفرات التي لا تتطلب مصادقة Mojang
                hideErrors: false,
                checkTimeoutInterval: 30000, // 30 ثانية
                keepAlive: true,
                connectTimeout: 10000 // 10 ثواني timeout
            };

            // إضافة مصادقة Mojang إذا كانت مطلوبة
            if (this.config.mojangAuth) {
                botOptions.auth = 'mojang';
                botOptions.password = this.config.password;
            }

            this.bot = mineflayer.createBot(botOptions);
            this.setupEventHandlers();
            
        } catch (error) {
            console.error(`❌ خطأ في إنشاء البوت Java: ${error.message}`);
            this.emit('error', error);
        }
    }

    setupEventHandlers() {
        if (!this.bot) return;

        // عند نجاح الاتصال
        this.bot.on('spawn', () => {
            this.isConnected = true;
            this.connectionTime = new Date();
            this.reconnectAttempts = 0;
            
            console.log(`✅ تم الاتصال بنجاح: ${this.config.username} في ${this.config.host}:${this.config.port}`);
            
            // جمع معلومات اللاعب
            this.updatePlayerInfo();
            
            this.emit('connected', {
                username: this.config.username,
                server: `${this.config.host}:${this.config.port}`,
                time: this.connectionTime
            });
        });

        // عند قطع الاتصال
        this.bot.on('end', (reason) => {
            this.isConnected = false;
            this.connectionTime = null;
            
            console.log(`🔌 انقطع الاتصال: ${this.config.username} - السبب: ${reason || 'غير محدد'}`);
            
            this.emit('disconnected', {
                username: this.config.username,
                reason: reason || 'غير محدد'
            });

            // إعادة الاتصال التلقائي
            if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
                this.scheduleReconnect();
            }
        });

        // عند حدوث خطأ
        this.bot.on('error', (error) => {
            console.error(`❌ خطأ في البوت Java ${this.config.username}: ${error.message}`);
            
            this.emit('error', {
                username: this.config.username,
                error: error.message,
                code: error.code
            });

            // إعادة الاتصال في حالة أخطاء معينة
            if (this.shouldReconnect && this.isRecoverableError(error)) {
                this.scheduleReconnect();
            }
        });

        // عند استقبال رسالة في الشات
        this.bot.on('chat', (username, message) => {
            if (username !== this.config.username) {
                console.log(`💬 ${username}: ${message}`);
                this.emit('chat', { 
                    username: username, 
                    message: message 
                });
            }
        });

        // عند تحديث الصحة
        this.bot.on('health', () => {
            this.playerInfo.health = this.bot.health;
            this.playerInfo.food = this.bot.food;
            this.emit('health', {
                health: this.bot.health,
                food: this.bot.food
            });
        });

        // عند تحديث الموقع
        this.bot.on('move', () => {
            if (this.bot.entity) {
                this.playerInfo.position = this.bot.entity.position;
                this.emit('position', this.bot.entity.position);
            }
        });

        // عند انضمام لاعب
        this.bot.on('playerJoined', (player) => {
            console.log(`👋 انضم اللاعب: ${player.username}`);
            this.emit('playerJoined', { username: player.username });
        });

        // عند مغادرة لاعب
        this.bot.on('playerLeft', (player) => {
            console.log(`👋 غادر اللاعب: ${player.username}`);
            this.emit('playerLeft', { username: player.username });
        });

        // عند الموت
        this.bot.on('death', () => {
            console.log(`💀 مات البوت ${this.config.username}`);
            this.emit('death', { username: this.config.username });
        });

        // عند إعادة الإحياء
        this.bot.on('respawn', () => {
            console.log(`🔄 تم إحياء البوت ${this.config.username}`);
            this.emit('respawn', { username: this.config.username });
        });
    }

    // تحديث معلومات اللاعب
    updatePlayerInfo() {
        if (this.bot) {
            this.playerInfo = {
                username: this.config.username,
                health: this.bot.health || 20,
                food: this.bot.food || 20,
                position: this.bot.entity ? this.bot.entity.position : null,
                gameMode: this.bot.game ? this.bot.game.gameMode : null,
                level: this.bot.game ? this.bot.game.levelType : null
            };
        }
    }

    // جدولة إعادة الاتصال
    scheduleReconnect() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
        
        console.log(`🔄 محاولة إعادة الاتصال ${this.reconnectAttempts}/${this.maxReconnectAttempts} خلال ${delay/1000} ثانية...`);
        
        this.reconnectTimeout = setTimeout(() => {
            this.connect();
        }, delay);
    }

    // التحقق من إمكانية التعافي من الخطأ
    isRecoverableError(error) {
        const recoverableErrors = [
            'ECONNREFUSED',
            'ENOTFOUND',
            'ETIMEDOUT',
            'ECONNRESET'
        ];
        
        return recoverableErrors.includes(error.code);
    }

    // إرسال رسالة في الشات
    sendMessage(message) {
        if (this.isConnected && this.bot) {
            try {
                this.bot.chat(message);
                console.log(`📤 تم إرسال رسالة Java: ${message}`);
                return true;
            } catch (error) {
                console.error(`❌ خطأ في إرسال الرسالة: ${error.message}`);
                return false;
            }
        }
        return false;
    }

    // تنفيذ أمر
    executeCommand(command) {
        if (this.isConnected && this.bot) {
            try {
                this.bot.chat(`/${command}`);
                console.log(`⚡ تم تنفيذ أمر Java: /${command}`);
                return true;
            } catch (error) {
                console.error(`❌ خطأ في تنفيذ الأمر: ${error.message}`);
                return false;
            }
        }
        return false;
    }

    // الحصول على معلومات السيرفر
    getServerInfo() {
        if (this.isConnected && this.bot) {
            return {
                host: this.config.host,
                port: this.config.port,
                version: this.bot.version,
                players: Object.keys(this.bot.players).length,
                maxPlayers: this.bot.game ? this.bot.game.maxPlayers : null,
                gameMode: this.bot.game ? this.bot.game.gameMode : null,
                difficulty: this.bot.game ? this.bot.game.difficulty : null
            };
        }
        return null;
    }

    // الحصول على قائمة اللاعبين
    getPlayers() {
        if (this.isConnected && this.bot) {
            return Object.keys(this.bot.players).map(username => ({
                username: username,
                ping: this.bot.players[username].ping
            }));
        }
        return [];
    }

    // الحصول على معلومات اللاعب
    getPlayerInfo() {
        return this.playerInfo;
    }

    // قطع الاتصال
    disconnect() {
        this.shouldReconnect = false; // منع إعادة الاتصال التلقائي
        
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.bot) {
            console.log(`🔌 قطع الاتصال مع البوت Java ${this.config.username}`);
            try {
                this.bot.quit('تم إيقاف البوت');
            } catch (error) {
                console.error(`خطأ في قطع الاتصال: ${error.message}`);
            }
            this.bot = null;
            this.isConnected = false;
            this.connectionTime = null;
        }
    }

    // تحديث إعدادات البوت
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }

    // فحص حالة الاتصال
    isAlive() {
        return this.isConnected && this.bot;
    }

    // الحصول على إحصائيات البوت
    getStats() {
        return {
            isConnected: this.isConnected,
            connectionTime: this.connectionTime,
            reconnectAttempts: this.reconnectAttempts,
            playerInfo: this.playerInfo,
            serverInfo: this.getServerInfo()
        };
    }
}

module.exports = MinecraftJavaBot;
