const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// تحميل متغيرات البيئة
require('dotenv').config();

class Database {
    constructor() {
        // استخدام مسار قاعدة البيانات من متغيرات البيئة أو المسار الافتراضي
        this.dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'minecraft_bot.db');

        // التأكد من وجود المجلد
        const dbDir = path.dirname(this.dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        this.db = new sqlite3.Database(this.dbPath);
        this.initialized = false;

        console.log(`📁 قاعدة البيانات: ${this.dbPath}`);
    }

    async init() {
        if (!this.initialized) {
            await this.initTables();
            this.initialized = true;
        }
        return this;
    }

    initTables() {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                // جدول المستخدمين
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        telegram_id INTEGER UNIQUE NOT NULL,
                        username TEXT,
                        is_admin BOOLEAN DEFAULT 0,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `);

                // جدول البوتات
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS bots (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        bot_name TEXT NOT NULL,
                        server_host TEXT NOT NULL,
                        server_port INTEGER NOT NULL,
                        minecraft_version TEXT NOT NULL,
                        edition TEXT NOT NULL CHECK(edition IN ('java', 'bedrock')),
                        status TEXT DEFAULT 'stopped' CHECK(status IN ('running', 'stopped', 'error')),
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users (id)
                    )
                `);

                // جدول إحصائيات البوتات
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS bot_stats (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        bot_id INTEGER NOT NULL,
                        connection_time DATETIME,
                        disconnection_time DATETIME,
                        duration_minutes INTEGER,
                        error_message TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (bot_id) REFERENCES bots (id)
                    )
                `);

                // جدول الإعدادات العامة
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS settings (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        key TEXT UNIQUE NOT NULL,
                        value TEXT NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `, (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    // إدراج الإعدادات الافتراضية
                    this.db.run(`
                        INSERT OR IGNORE INTO settings (key, value) VALUES
                        ('max_bots_per_user', '3'),
                        ('supported_java_versions', '1.21.8,1.21.7,1.21.6,1.21.5,1.21.4'),
                        ('supported_bedrock_versions', '1.21.94,1.21.93,1.21.90,1.21.70,1.21.50')
                    `, (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });
            });
        });
    }

    // إدارة المستخدمين
    async createUser(telegramId, username = null) {
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

    async getUser(telegramId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM users WHERE telegram_id = ?',
                [telegramId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    async getUserById(userId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM users WHERE id = ?',
                [userId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    async getAllUsers() {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM users ORDER BY created_at DESC',
                [],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                }
            );
        });
    }

    async updateUser(telegramId, updates) {
        const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updates);
        values.push(telegramId);

        return new Promise((resolve, reject) => {
            this.db.run(
                `UPDATE users SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?`,
                values,
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    async setAdmin(telegramId, isAdmin = true) {
        return this.updateUser(telegramId, { is_admin: isAdmin ? 1 : 0 });
    }

    // إدارة البوتات
    async createBot(userId, botName, serverHost, serverPort, minecraftVersion, edition) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO bots (user_id, bot_name, server_host, server_port, minecraft_version, edition) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, botName, serverHost, serverPort, minecraftVersion, edition],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    async getUserBots(userId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM bots WHERE user_id = ? ORDER BY created_at DESC',
                [userId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    async getAllBots() {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT b.*, u.username FROM bots b LEFT JOIN users u ON b.user_id = u.id ORDER BY b.created_at DESC',
                [],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                }
            );
        });
    }

    async getBot(botId) {
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

    async updateBotStatus(botId, status, errorMessage = null) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE bots SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [status, botId],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    async updateBotName(botId, name) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE bots SET bot_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [name, botId],
                function(err) {
                    if (err) {
                        console.error('خطأ في تحديث اسم البوت:', err);
                        reject(err);
                    } else {
                        console.log(`✅ تم تحديث اسم البوت ${botId} إلى ${name}`);
                        resolve(this.changes > 0);
                    }
                }
            );
        });
    }

    async updateBotServer(botId, host, port) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE bots SET host = ?, port = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [host, port, botId],
                function(err) {
                    err ? reject(err) : resolve(this.changes > 0);
                }
            );
        });
    }

    async clearAllBots() {
        return new Promise((resolve, reject) => {
            this.db.run(
                'DELETE FROM bots',
                [],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes > 0);
                }
            );
        });
    }

    async clearUserBots(userId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'DELETE FROM bots WHERE user_id = ?',
                [userId],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes > 0);
                }
            );
        });
    }

    async cleanupDatabase() {
        return new Promise((resolve, reject) => {
            // حذف البوتات المتوقفة والتي بها أخطاء
            this.db.run(
                'DELETE FROM bots WHERE status IN ("stopped", "error")',
                [],
                (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    const deletedBots = this.changes;

                    // حذف الإحصائيات القديمة (أكثر من 30 يوم)
                    this.db.run(
                        'DELETE FROM bot_stats WHERE created_at < datetime("now", "-30 days")',
                        [],
                        (err) => {
                            if (err) {
                                reject(err);
                                return;
                            }

                            const deletedStats = this.changes;

                            // تنظيف قاعدة البيانات (VACUUM)
                            this.db.run('VACUUM', [], (err) => {
                                if (err) {
                                    reject(err);
                                } else {
                                    resolve({
                                        deletedBots,
                                        deletedStats
                                    });
                                }
                            });
                        }
                    );
                }
            );
        });
    }

    async deleteBot(botId) {
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

    // إحصائيات البوتات
    async addBotStat(botId, connectionTime, disconnectionTime = null, errorMessage = null) {
        const duration = disconnectionTime ? 
            Math.floor((new Date(disconnectionTime) - new Date(connectionTime)) / 60000) : null;

        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO bot_stats (bot_id, connection_time, disconnection_time, duration_minutes, error_message) VALUES (?, ?, ?, ?, ?)',
                [botId, connectionTime, disconnectionTime, duration, errorMessage],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    async getBotStats(botId, limit = 10) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM bot_stats WHERE bot_id = ? ORDER BY created_at DESC LIMIT ?',
                [botId, limit],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    // الإعدادات
    async getSetting(key) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT value FROM settings WHERE key = ?',
                [key],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row ? row.value : null);
                }
            );
        });
    }

    async setSetting(key, value) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
                [key, value],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    // إحصائيات عامة
    async getGeneralStats() {
        return new Promise((resolve, reject) => {
            const stats = {};
            
            // عدد المستخدمين
            this.db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
                if (err) return reject(err);
                stats.totalUsers = row.count;
                
                // عدد البوتات
                this.db.get('SELECT COUNT(*) as count FROM bots', (err, row) => {
                    if (err) return reject(err);
                    stats.totalBots = row.count;
                    
                    // البوتات النشطة
                    this.db.get('SELECT COUNT(*) as count FROM bots WHERE status = "running"', (err, row) => {
                        if (err) return reject(err);
                        stats.activeBots = row.count;
                        
                        // إجمالي وقت التشغيل
                        this.db.get('SELECT SUM(duration_minutes) as total FROM bot_stats WHERE duration_minutes IS NOT NULL', (err, row) => {
                            if (err) return reject(err);
                            stats.totalRuntime = row.total || 0;
                            resolve(stats);
                        });
                    });
                });
            });
        });
    }

    close() {
        this.db.close();
    }
}

module.exports = Database;
