const fs = require('fs');
const path = require('path');

// محاولة تحميل sqlite3 مع fallback آمن
let sqlite3;
let useSQLite = false;

try {
    sqlite3 = require('sqlite3').verbose();
    useSQLite = true;
    console.log('✅ SQLite3 loaded successfully');
} catch (error) {
    console.log('⚠️ SQLite3 not available, using JSON fallback:', error.message);
    useSQLite = false;
}

class Database {
    constructor() {
        this.dbPath = process.env.DATABASE_PATH || '/tmp/minecraft_bot.db';
        this.jsonPath = '/tmp/minecraft_bot_data.json';
        this.db = null;
        this.data = null;
        this.initialized = false;

        if (useSQLite) {
            console.log(`📁 Using SQLite database: ${this.dbPath}`);
        } else {
            console.log(`📁 Using JSON fallback: ${this.jsonPath}`);
        }
    }

    async init() {
        if (this.initialized) return this;

        if (useSQLite) {
            await this.initSQLite();
        } else {
            await this.initJSON();
        }

        this.initialized = true;
        console.log('✅ Database initialized');
        return this;
    }

    async initSQLite() {
        // التأكد من وجود المجلد
        const dbDir = path.dirname(this.dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        this.db = new sqlite3.Database(this.dbPath);

        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                // جدول المستخدمين
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        telegram_id INTEGER UNIQUE NOT NULL,
                        username TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `, (err) => {
                    if (err) reject(err);
                });

                // جدول البوتات
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS bots (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        name TEXT NOT NULL,
                        host TEXT NOT NULL,
                        port INTEGER NOT NULL,
                        type TEXT NOT NULL CHECK(type IN ('java', 'bedrock')),
                        username TEXT NOT NULL,
                        version TEXT,
                        status TEXT DEFAULT 'stopped' CHECK(status IN ('running', 'stopped', 'error')),
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users (telegram_id)
                    )
                `, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });
    }

    async initJSON() {
        // إنشاء المجلد إذا لم يكن موجوداً
        const jsonDir = path.dirname(this.jsonPath);
        if (!fs.existsSync(jsonDir)) {
            fs.mkdirSync(jsonDir, { recursive: true });
        }

        // تحميل البيانات الموجودة أو إنشاء بيانات جديدة
        if (fs.existsSync(this.jsonPath)) {
            try {
                const rawData = fs.readFileSync(this.jsonPath, 'utf8');
                this.data = JSON.parse(rawData);
            } catch (error) {
                console.log('⚠️ Failed to load existing data, creating new:', error.message);
                this.data = this.createEmptyData();
            }
        } else {
            this.data = this.createEmptyData();
        }

        // حفظ البيانات
        this.saveJSON();
    }

    createEmptyData() {
        return {
            users: [],
            bots: [],
            lastUserId: 0,
            lastBotId: 0
        };
    }

    saveJSON() {
        try {
            fs.writeFileSync(this.jsonPath, JSON.stringify(this.data, null, 2));
        } catch (error) {
            console.error('❌ Failed to save JSON data:', error.message);
        }
    }

    // إضافة مستخدم
    async addUser(telegramId, username) {
        if (useSQLite) {
            return this.addUserSQLite(telegramId, username);
        } else {
            return this.addUserJSON(telegramId, username);
        }
    }

    async addUserSQLite(telegramId, username) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT OR IGNORE INTO users (telegram_id, username) VALUES (?, ?)',
                [telegramId, username],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    addUserJSON(telegramId, username) {
        const existingUser = this.data.users.find(u => u.telegram_id === telegramId);
        if (existingUser) {
            existingUser.username = username; // تحديث اسم المستخدم
            this.saveJSON();
            return existingUser.id;
        }

        const newUser = {
            id: ++this.data.lastUserId,
            telegram_id: telegramId,
            username: username,
            created_at: new Date().toISOString()
        };

        this.data.users.push(newUser);
        this.saveJSON();
        return newUser.id;
    }

    // إنشاء بوت
    async createBot(userId, config) {
        if (useSQLite) {
            return this.createBotSQLite(userId, config);
        } else {
            return this.createBotJSON(userId, config);
        }
    }

    async createBotSQLite(userId, config) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT INTO bots (user_id, name, host, port, type, username, version) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [userId, config.name, config.host, config.port, config.type, config.username, config.version],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    createBotJSON(userId, config) {
        const newBot = {
            id: ++this.data.lastBotId,
            user_id: userId,
            name: config.name,
            host: config.host,
            port: config.port,
            type: config.type,
            username: config.username,
            version: config.version || (config.type === 'java' ? '1.20.1' : '1.21.0'),
            status: 'stopped',
            created_at: new Date().toISOString()
        };

        this.data.bots.push(newBot);
        this.saveJSON();
        return newBot.id;
    }

    // الحصول على بوتات المستخدم
    async getUserBots(telegramId) {
        if (useSQLite) {
            return this.getUserBotsSQLite(telegramId);
        } else {
            return this.getUserBotsJSON(telegramId);
        }
    }

    async getUserBotsSQLite(telegramId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM bots WHERE user_id = ? ORDER BY created_at DESC',
                [telegramId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                }
            );
        });
    }

    getUserBotsJSON(telegramId) {
        return this.data.bots.filter(bot => bot.user_id === telegramId);
    }

    // تحديث حالة البوت
    async updateBotStatus(botId, status) {
        if (useSQLite) {
            return this.updateBotStatusSQLite(botId, status);
        } else {
            return this.updateBotStatusJSON(botId, status);
        }
    }

    async updateBotStatusSQLite(botId, status) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE bots SET status = ? WHERE id = ?',
                [status, botId],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    updateBotStatusJSON(botId, status) {
        const bot = this.data.bots.find(b => b.id === botId);
        if (bot) {
            bot.status = status;
            this.saveJSON();
            return 1;
        }
        return 0;
    }

    // حذف بوت
    async deleteBot(botId) {
        if (useSQLite) {
            return this.deleteBotSQLite(botId);
        } else {
            return this.deleteBotJSON(botId);
        }
    }

    async deleteBotSQLite(botId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'DELETE FROM bots WHERE id = ?',
                [botId],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    deleteBotJSON(botId) {
        const index = this.data.bots.findIndex(b => b.id === botId);
        if (index !== -1) {
            this.data.bots.splice(index, 1);
            this.saveJSON();
            return 1;
        }
        return 0;
    }

    // الحصول على بوت بالمعرف
    async getBot(botId) {
        if (useSQLite) {
            return this.getBotSQLite(botId);
        } else {
            return this.getBotJSON(botId);
        }
    }

    async getBotSQLite(botId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM bots WHERE id = ?',
                [botId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    getBotJSON(botId) {
        return this.data.bots.find(b => b.id === botId);
    }

    // إغلاق قاعدة البيانات
    close() {
        if (useSQLite && this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('❌ Error closing database:', err.message);
                } else {
                    console.log('✅ Database connection closed');
                }
            });
        }
    }

    // إحصائيات
    async getStats() {
        if (useSQLite) {
            return this.getStatsSQLite();
        } else {
            return this.getStatsJSON();
        }
    }

    async getStatsSQLite() {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT 
                    (SELECT COUNT(*) FROM users) as total_users,
                    (SELECT COUNT(*) FROM bots) as total_bots,
                    (SELECT COUNT(*) FROM bots WHERE status = 'running') as running_bots,
                    (SELECT COUNT(*) FROM bots WHERE type = 'java') as java_bots,
                    (SELECT COUNT(*) FROM bots WHERE type = 'bedrock') as bedrock_bots`,
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows[0]);
                }
            );
        });
    }

    getStatsJSON() {
        return {
            total_users: this.data.users.length,
            total_bots: this.data.bots.length,
            running_bots: this.data.bots.filter(b => b.status === 'running').length,
            java_bots: this.data.bots.filter(b => b.type === 'java').length,
            bedrock_bots: this.data.bots.filter(b => b.type === 'bedrock').length
        };
    }
}

module.exports = Database;
