const fs = require('fs');
const path = require('path');

// تحميل متغيرات البيئة
require('dotenv').config();

class Logger {
    constructor() {
        this.logLevel = process.env.LOG_LEVEL || 'info';
        this.logToFile = process.env.NODE_ENV === 'development';
        this.logDir = '/tmp/logs';
        
        // إنشاء مجلد السجلات إذا لم يكن موجوداً
        if (this.logToFile && !fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
        
        // مستويات السجلات
        this.levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };
        
        this.currentLevel = this.levels[this.logLevel] || 1;
    }

    // تنسيق الوقت
    formatTime() {
        return new Date().toISOString();
    }

    // تنسيق الرسالة
    formatMessage(level, message, data = null) {
        const timestamp = this.formatTime();
        const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
        
        if (data) {
            return `${prefix} ${message} ${JSON.stringify(data)}`;
        }
        return `${prefix} ${message}`;
    }

    // كتابة السجل إلى ملف
    writeToFile(level, message) {
        if (!this.logToFile) return;
        
        try {
            const logFile = path.join(this.logDir, `${level}.log`);
            const formattedMessage = this.formatMessage(level, message) + '\n';
            fs.appendFileSync(logFile, formattedMessage);
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    // كتابة السجل إلى وحدة التحكم
    writeToConsole(level, message, data = null) {
        const formattedMessage = this.formatMessage(level, message, data);
        
        switch (level) {
            case 'debug':
                console.debug(formattedMessage);
                break;
            case 'info':
                console.info(formattedMessage);
                break;
            case 'warn':
                console.warn(formattedMessage);
                break;
            case 'error':
                console.error(formattedMessage);
                break;
            default:
                console.log(formattedMessage);
        }
    }

    // دالة السجل الرئيسية
    log(level, message, data = null) {
        if (this.levels[level] < this.currentLevel) {
            return; // تجاهل السجلات أقل من المستوى المحدد
        }
        
        this.writeToConsole(level, message, data);
        this.writeToFile(level, message);
    }

    // دوال السجلات المختلفة
    debug(message, data = null) {
        this.log('debug', message, data);
    }

    info(message, data = null) {
        this.log('info', message, data);
    }

    warn(message, data = null) {
        this.log('warn', message, data);
    }

    error(message, data = null) {
        this.log('error', message, data);
    }

    // سجل خاص للبوتات
    botLog(botName, level, message, data = null) {
        const botMessage = `[BOT:${botName}] ${message}`;
        this.log(level, botMessage, data);
    }

    // سجل خاص للتلغرام
    telegramLog(level, message, data = null) {
        const telegramMessage = `[TELEGRAM] ${message}`;
        this.log(level, telegramMessage, data);
    }

    // سجل خاص لقاعدة البيانات
    databaseLog(level, message, data = null) {
        const dbMessage = `[DATABASE] ${message}`;
        this.log(level, dbMessage, data);
    }

    // سجل خاص للأمان
    securityLog(level, message, data = null) {
        const securityMessage = `[SECURITY] ${message}`;
        this.log(level, securityMessage, data);
        
        // كتابة سجلات الأمان في ملف منفصل
        if (this.logToFile) {
            try {
                const securityLogFile = path.join(this.logDir, 'security.log');
                const formattedMessage = this.formatMessage(level, securityMessage, data) + '\n';
                fs.appendFileSync(securityLogFile, formattedMessage);
            } catch (error) {
                console.error('Failed to write to security log file:', error);
            }
        }
    }

    // تنظيف السجلات القديمة
    cleanOldLogs(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 أيام افتراضياً
        if (!this.logToFile || !fs.existsSync(this.logDir)) return;
        
        try {
            const files = fs.readdirSync(this.logDir);
            const now = Date.now();
            
            files.forEach(file => {
                const filePath = path.join(this.logDir, file);
                const stats = fs.statSync(filePath);
                
                if (now - stats.mtime.getTime() > maxAge) {
                    fs.unlinkSync(filePath);
                    this.info(`Deleted old log file: ${file}`);
                }
            });
        } catch (error) {
            this.error('Failed to clean old logs:', error);
        }
    }

    // إحصائيات السجلات
    getLogStats() {
        if (!this.logToFile || !fs.existsSync(this.logDir)) {
            return { enabled: false };
        }
        
        try {
            const files = fs.readdirSync(this.logDir);
            const stats = {
                enabled: true,
                totalFiles: files.length,
                files: []
            };
            
            files.forEach(file => {
                const filePath = path.join(this.logDir, file);
                const fileStats = fs.statSync(filePath);
                stats.files.push({
                    name: file,
                    size: fileStats.size,
                    lastModified: fileStats.mtime
                });
            });
            
            return stats;
        } catch (error) {
            this.error('Failed to get log stats:', error);
            return { enabled: true, error: error.message };
        }
    }
}

// إنشاء مثيل واحد من Logger
const logger = new Logger();

// تنظيف السجلات القديمة عند بدء التشغيل
logger.cleanOldLogs();

// تنظيف دوري للسجلات القديمة (كل 24 ساعة)
setInterval(() => {
    logger.cleanOldLogs();
}, 24 * 60 * 60 * 1000);

module.exports = logger;
