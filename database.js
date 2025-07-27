const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const config = require('./config');

class Database {
    constructor() {
        // إنشاء مجلد البيانات إذا لم يكن موجوداً
        const dbPath = config.database.path;
        const dbDir = path.dirname(dbPath);

        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        this.db = new sqlite3.Database(dbPath);
        this.initTables();
    }

    initTables() {
        // جدول المستخدمين
        this.db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY,
                telegram_id INTEGER UNIQUE NOT NULL,
                username TEXT,
                first_name TEXT,
                last_name TEXT,
                is_admin INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_active DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // جدول بوتات Minecraft
        this.db.run(`
            CREATE TABLE IF NOT EXISTS minecraft_bots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                bot_name TEXT NOT NULL,
                server_host TEXT NOT NULL,
                server_port INTEGER NOT NULL,
                minecraft_type TEXT NOT NULL, -- 'java' or 'bedrock'
                minecraft_version TEXT NOT NULL,
                auth_type TEXT DEFAULT 'offline', -- 'offline', 'microsoft'
                status TEXT DEFAULT 'stopped', -- 'running', 'stopped', 'error'
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_started DATETIME,
                total_uptime INTEGER DEFAULT 0,
                connection_attempts INTEGER DEFAULT 0,
                last_error TEXT,
                FOREIGN KEY (user_id) REFERENCES users (telegram_id)
            )
        `);

        // جدول إحصائيات البوتات
        this.db.run(`
            CREATE TABLE IF NOT EXISTS bot_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bot_id INTEGER NOT NULL,
                date DATE NOT NULL,
                uptime_minutes INTEGER DEFAULT 0,
                connections INTEGER DEFAULT 0,
                disconnections INTEGER DEFAULT 0,
                messages_sent INTEGER DEFAULT 0,
                FOREIGN KEY (bot_id) REFERENCES minecraft_bots (id),
                UNIQUE(bot_id, date)
            )
        `);

        // جدول سجل الأحداث
        this.db.run(`
            CREATE TABLE IF NOT EXISTS event_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bot_id INTEGER,
                user_id INTEGER,
                event_type TEXT NOT NULL, -- 'start', 'stop', 'error', 'connect', 'disconnect'
                message TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (bot_id) REFERENCES minecraft_bots (id),
                FOREIGN KEY (user_id) REFERENCES users (telegram_id)
            )
        `);
    }

    // إضافة مستخدم جديد أو تحديث بياناته
    addOrUpdateUser(telegramUser) {
        return new Promise((resolve, reject) => {
            const { id, username, first_name, last_name } = telegramUser;
            
            this.db.run(`
                INSERT OR REPLACE INTO users 
                (telegram_id, username, first_name, last_name, last_active)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            `, [id, username, first_name, last_name], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    // الحصول على بيانات المستخدم
    getUser(telegramId) {
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

    // إضافة بوت Minecraft جديد
    addMinecraftBot(userId, botData) {
        return new Promise((resolve, reject) => {
            const { bot_name, server_host, server_port, minecraft_type, minecraft_version, auth_type } = botData;
            
            this.db.run(`
                INSERT INTO minecraft_bots 
                (user_id, bot_name, server_host, server_port, minecraft_type, minecraft_version, auth_type)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [userId, bot_name, server_host, server_port, minecraft_type, minecraft_version, auth_type], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    // الحصول على بوتات المستخدم
    getUserBots(userId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM minecraft_bots WHERE user_id = ? ORDER BY created_at DESC',
                [userId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    // تحديث حالة البوت
    updateBotStatus(botId, status, lastError = null) {
        return new Promise((resolve, reject) => {
            let query = 'UPDATE minecraft_bots SET status = ?';
            let params = [status, botId];
            
            if (status === 'running') {
                query = 'UPDATE minecraft_bots SET status = ?, last_started = CURRENT_TIMESTAMP WHERE id = ?';
            } else if (lastError) {
                query = 'UPDATE minecraft_bots SET status = ?, last_error = ? WHERE id = ?';
                params = [status, lastError, botId];
            } else {
                query += ' WHERE id = ?';
            }
            
            this.db.run(query, params, function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    }

    // الحصول على بوت محدد
    getBot(botId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM minecraft_bots WHERE id = ?',
                [botId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    // حذف بوت
    deleteBot(botId, userId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'DELETE FROM minecraft_bots WHERE id = ? AND user_id = ?',
                [botId, userId],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    // إضافة سجل حدث
    addEventLog(botId, userId, eventType, message) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                INSERT INTO event_logs (bot_id, user_id, event_type, message)
                VALUES (?, ?, ?, ?)
            `, [botId, userId, eventType, message], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    // الحصول على إحصائيات عامة
    getGeneralStats() {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT 
                    (SELECT COUNT(*) FROM users) as total_users,
                    (SELECT COUNT(*) FROM minecraft_bots) as total_bots,
                    (SELECT COUNT(*) FROM minecraft_bots WHERE status = 'running') as running_bots,
                    (SELECT COUNT(*) FROM minecraft_bots WHERE minecraft_type = 'java') as java_bots,
                    (SELECT COUNT(*) FROM minecraft_bots WHERE minecraft_type = 'bedrock') as bedrock_bots
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows[0]);
            });
        });
    }

    // إغلاق قاعدة البيانات
    close() {
        this.db.close();
    }
}

module.exports = Database;
