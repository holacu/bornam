// بديل آمن لقاعدة البيانات يعمل بدون sqlite3 native bindings
const fs = require('fs');
const path = require('path');

class DatabaseFallback {
    constructor() {
        this.dataPath = process.env.DATABASE_PATH || '/tmp/minecraft_bot_data.json';
        this.data = {
            users: [],
            bots: [],
            admins: [],
            stats: []
        };
        this.loadData();
        console.log('⚠️ استخدام Database Fallback - JSON file storage');
    }

    // تحميل البيانات من الملف
    loadData() {
        try {
            if (fs.existsSync(this.dataPath)) {
                const fileData = fs.readFileSync(this.dataPath, 'utf8');
                this.data = JSON.parse(fileData);
                console.log('✅ تم تحميل البيانات من الملف');
            } else {
                console.log('📝 إنشاء ملف بيانات جديد');
                this.saveData();
            }
        } catch (error) {
            console.error('❌ خطأ في تحميل البيانات:', error.message);
            this.data = {
                users: [],
                bots: [],
                admins: [],
                stats: []
            };
        }
    }

    // حفظ البيانات في الملف
    saveData() {
        try {
            const dir = path.dirname(this.dataPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.dataPath, JSON.stringify(this.data, null, 2));
        } catch (error) {
            console.error('❌ خطأ في حفظ البيانات:', error.message);
        }
    }

    // إنشاء الجداول (محاكاة)
    async createTables() {
        console.log('📋 إنشاء هيكل البيانات (JSON)');
        return Promise.resolve();
    }

    // إضافة مستخدم
    async addUser(userId, username) {
        return new Promise((resolve) => {
            const existingUser = this.data.users.find(u => u.id === userId);
            if (!existingUser) {
                this.data.users.push({
                    id: userId,
                    username: username,
                    created_at: new Date().toISOString()
                });
                this.saveData();
            }
            resolve(userId);
        });
    }

    // الحصول على مستخدم
    async getUser(userId) {
        return new Promise((resolve) => {
            const user = this.data.users.find(u => u.id === userId);
            resolve(user || null);
        });
    }

    // إنشاء بوت
    async createBot(userId, botName, serverHost, serverPort, minecraftVersion, edition) {
        return new Promise((resolve) => {
            const botId = Date.now(); // استخدام timestamp كـ ID
            this.data.bots.push({
                id: botId,
                user_id: userId,
                bot_name: botName,
                server_host: serverHost,
                server_port: serverPort,
                minecraft_version: minecraftVersion,
                edition: edition,
                status: 'stopped',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
            this.saveData();
            resolve(botId);
        });
    }

    // الحصول على بوتات المستخدم
    async getUserBots(userId) {
        return new Promise((resolve) => {
            const userBots = this.data.bots.filter(b => b.user_id === userId);
            resolve(userBots);
        });
    }

    // تحديث حالة البوت
    async updateBotStatus(botId, status) {
        return new Promise((resolve) => {
            const bot = this.data.bots.find(b => b.id === botId);
            if (bot) {
                bot.status = status;
                bot.updated_at = new Date().toISOString();
                this.saveData();
            }
            resolve();
        });
    }

    // حذف بوت
    async deleteBot(botId) {
        return new Promise((resolve) => {
            this.data.bots = this.data.bots.filter(b => b.id !== botId);
            this.saveData();
            resolve();
        });
    }

    // إضافة أدمن
    async addAdmin(userId) {
        return new Promise((resolve) => {
            const existingAdmin = this.data.admins.find(a => a.user_id === userId);
            if (!existingAdmin) {
                this.data.admins.push({
                    user_id: userId,
                    created_at: new Date().toISOString()
                });
                this.saveData();
            }
            resolve();
        });
    }

    // الحصول على الأدمن
    async getAdmins() {
        return new Promise((resolve) => {
            resolve(this.data.admins);
        });
    }

    // إضافة إحصائية
    async addStat(type, data) {
        return new Promise((resolve) => {
            this.data.stats.push({
                type: type,
                data: data,
                timestamp: new Date().toISOString()
            });
            
            // الاحتفاظ بآخر 1000 إحصائية فقط
            if (this.data.stats.length > 1000) {
                this.data.stats = this.data.stats.slice(-1000);
            }
            
            this.saveData();
            resolve();
        });
    }

    // الحصول على الإحصائيات
    async getStats(type = null, limit = 100) {
        return new Promise((resolve) => {
            let stats = this.data.stats;
            
            if (type) {
                stats = stats.filter(s => s.type === type);
            }
            
            stats = stats.slice(-limit);
            resolve(stats);
        });
    }

    // عدد المستخدمين
    async getUserCount() {
        return new Promise((resolve) => {
            resolve(this.data.users.length);
        });
    }

    // عدد البوتات
    async getBotCount() {
        return new Promise((resolve) => {
            resolve(this.data.bots.length);
        });
    }

    // تنظيف البيانات القديمة
    async cleanup() {
        return new Promise((resolve) => {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            // حذف الإحصائيات القديمة
            this.data.stats = this.data.stats.filter(s => 
                new Date(s.timestamp) > thirtyDaysAgo
            );
            
            this.saveData();
            console.log('🧹 تم تنظيف البيانات القديمة');
            resolve();
        });
    }

    // إغلاق الاتصال (محاكاة)
    async close() {
        console.log('📁 حفظ البيانات النهائي');
        this.saveData();
        return Promise.resolve();
    }
}

module.exports = DatabaseFallback;
