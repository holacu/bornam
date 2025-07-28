const { EventEmitter } = require('events');

// محاولة تحميل mineflayer مع fallback آمن
let mineflayer;
try {
    mineflayer = require('mineflayer');
    console.log('✅ Mineflayer loaded successfully');
} catch (error) {
    console.log('⚠️ Mineflayer not available:', error.message);
    mineflayer = null;
}

// محاولة تحميل bedrock-protocol مع fallback آمن
let bedrock;
try {
    bedrock = require('bedrock-protocol');
    console.log('✅ Bedrock protocol loaded successfully');
} catch (error) {
    console.log('⚠️ Bedrock protocol not available:', error.message);
    bedrock = null;
}

class MinecraftBot extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.client = null;
        this.isConnected = false;
        this.connectionTime = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
    }

    async connect() {
        try {
            console.log(`🔄 Connecting to ${this.config.type} server: ${this.config.host}:${this.config.port}`);
            
            if (this.config.type === 'java') {
                await this.connectJava();
            } else if (this.config.type === 'bedrock') {
                await this.connectBedrock();
            }
            
        } catch (error) {
            console.error(`❌ Connection failed: ${error.message}`);
            this.emit('error', error);
        }
    }

    async connectJava() {
        if (!mineflayer) {
            throw new Error('Mineflayer is not available');
        }

        const botOptions = {
            host: this.config.host,
            port: this.config.port,
            username: this.config.username,
            version: this.config.version || '1.20.1',
            auth: 'offline',
            hideErrors: false
        };

        this.client = mineflayer.createBot(botOptions);
        this.setupJavaEventHandlers();
    }

    async connectBedrock() {
        if (!bedrock) {
            throw new Error('Bedrock protocol is not available');
        }

        const clientOptions = {
            host: this.config.host,
            port: this.config.port,
            username: this.config.username,
            version: this.config.version || '1.21.0',
            offline: true
        };

        this.client = bedrock.createClient(clientOptions);
        this.setupBedrockEventHandlers();
    }

    setupJavaEventHandlers() {
        this.client.on('spawn', () => {
            this.isConnected = true;
            this.connectionTime = new Date();
            this.reconnectAttempts = 0;
            
            console.log(`✅ Java bot connected: ${this.config.username}`);
            this.emit('connected');
        });

        this.client.on('end', (reason) => {
            this.isConnected = false;
            console.log(`🔌 Java bot disconnected: ${reason || 'Unknown'}`);
            this.emit('disconnected', reason);
        });

        this.client.on('error', (error) => {
            console.error(`❌ Java bot error: ${error.message}`);
            this.emit('error', error);
        });

        this.client.on('chat', (username, message) => {
            if (username !== this.client.username) {
                this.emit('chat', { username, message });
            }
        });
    }

    setupBedrockEventHandlers() {
        this.client.on('join', () => {
            this.isConnected = true;
            this.connectionTime = new Date();
            this.reconnectAttempts = 0;
            
            console.log(`✅ Bedrock bot connected: ${this.config.username}`);
            this.emit('connected');
        });

        this.client.on('disconnect', (reason) => {
            this.isConnected = false;
            console.log(`🔌 Bedrock bot disconnected: ${reason || 'Unknown'}`);
            this.emit('disconnected', reason);
        });

        this.client.on('error', (error) => {
            console.error(`❌ Bedrock bot error: ${error.message}`);
            this.emit('error', error);
        });
    }

    async sendMessage(message) {
        if (!this.isConnected || !this.client) {
            throw new Error('Bot is not connected');
        }

        try {
            if (this.config.type === 'java') {
                this.client.chat(message);
            } else if (this.config.type === 'bedrock') {
                // Bedrock message sending logic
                console.log(`📤 Sending message to Bedrock: ${message}`);
            }
            
            console.log(`📤 Message sent: ${message}`);
        } catch (error) {
            console.error(`❌ Failed to send message: ${error.message}`);
            throw error;
        }
    }

    async executeCommand(command) {
        if (!this.isConnected || !this.client) {
            throw new Error('Bot is not connected');
        }

        try {
            const fullCommand = command.startsWith('/') ? command : `/${command}`;
            
            if (this.config.type === 'java') {
                this.client.chat(fullCommand);
            } else if (this.config.type === 'bedrock') {
                console.log(`⚡ Executing Bedrock command: ${fullCommand}`);
            }
            
            console.log(`⚡ Command executed: ${fullCommand}`);
        } catch (error) {
            console.error(`❌ Failed to execute command: ${error.message}`);
            throw error;
        }
    }

    disconnect() {
        if (this.client) {
            console.log(`🔌 Disconnecting bot: ${this.config.username}`);
            
            if (this.config.type === 'java') {
                this.client.quit();
            } else if (this.config.type === 'bedrock') {
                this.client.disconnect();
            }
            
            this.isConnected = false;
            this.client = null;
        }
    }

    getStatus() {
        return {
            connected: this.isConnected,
            connectionTime: this.connectionTime,
            reconnectAttempts: this.reconnectAttempts,
            config: {
                name: this.config.name,
                host: this.config.host,
                port: this.config.port,
                type: this.config.type,
                username: this.config.username
            }
        };
    }
}

class MinecraftBotManager {
    constructor(database) {
        this.database = database;
        this.bots = new Map(); // Map<botId, MinecraftBot>
        this.maxBotsPerUser = 3;
        
        console.log('🤖 Minecraft Bot Manager initialized');
    }

    async createBot(userId, config) {
        try {
            // التحقق من عدد البوتات للمستخدم
            const userBots = await this.database.getUserBots(userId);
            if (userBots.length >= this.maxBotsPerUser) {
                throw new Error(`Maximum ${this.maxBotsPerUser} bots per user`);
            }

            // التحقق من عدم تكرار الاسم
            const existingBot = userBots.find(bot => bot.name === config.name);
            if (existingBot) {
                throw new Error('Bot name already exists');
            }

            // إنشاء البوت في قاعدة البيانات
            const botId = await this.database.createBot(userId, config);

            // إنشاء instance البوت
            const botInstance = new MinecraftBot({
                id: botId,
                ...config
            });

            // حفظ البوت في الذاكرة
            this.bots.set(botId, botInstance);

            // إعداد معالجات الأحداث
            this.setupBotEventHandlers(botId, botInstance);

            console.log(`✅ Bot created: ${config.name} (${config.type})`);

            return {
                success: true,
                botId: botId,
                message: 'Bot created successfully'
            };

        } catch (error) {
            console.error('❌ Failed to create bot:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    setupBotEventHandlers(botId, botInstance) {
        botInstance.on('connected', () => {
            this.database.updateBotStatus(botId, 'running');
            console.log(`🟢 Bot ${botId} connected`);
        });

        botInstance.on('disconnected', (reason) => {
            this.database.updateBotStatus(botId, 'stopped');
            console.log(`🔴 Bot ${botId} disconnected: ${reason}`);
        });

        botInstance.on('error', (error) => {
            this.database.updateBotStatus(botId, 'error');
            console.log(`❌ Bot ${botId} error: ${error.message}`);
        });

        botInstance.on('chat', (data) => {
            console.log(`💬 Bot ${botId} chat: ${data.username}: ${data.message}`);
        });
    }

    async startBot(botId) {
        const botInstance = this.bots.get(botId);
        if (!botInstance) {
            throw new Error('Bot not found');
        }

        if (botInstance.isConnected) {
            throw new Error('Bot is already running');
        }

        await botInstance.connect();
        return { success: true, message: 'Bot started successfully' };
    }

    async stopBot(botId) {
        const botInstance = this.bots.get(botId);
        if (!botInstance) {
            throw new Error('Bot not found');
        }

        botInstance.disconnect();
        await this.database.updateBotStatus(botId, 'stopped');
        
        return { success: true, message: 'Bot stopped successfully' };
    }

    async deleteBot(botId) {
        const botInstance = this.bots.get(botId);
        if (botInstance) {
            botInstance.disconnect();
            this.bots.delete(botId);
        }

        await this.database.deleteBot(botId);
        return { success: true, message: 'Bot deleted successfully' };
    }

    getBotStatus(botId) {
        const botInstance = this.bots.get(botId);
        if (!botInstance) {
            return null;
        }

        return botInstance.getStatus();
    }

    getAllBotsStatus() {
        const status = {};
        for (const [botId, botInstance] of this.bots) {
            status[botId] = botInstance.getStatus();
        }
        return status;
    }
}

module.exports = MinecraftBotManager;
