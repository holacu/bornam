const moment = require('moment');
const fs = require('fs');
const path = require('path');

class Utils {
    // تنسيق الوقت
    static formatTime(date) {
        return moment(date).format('YYYY-MM-DD HH:mm:ss');
    }

    // تنسيق المدة
    static formatDuration(milliseconds) {
        const duration = moment.duration(milliseconds);
        const days = Math.floor(duration.asDays());
        const hours = duration.hours();
        const minutes = duration.minutes();
        
        if (days > 0) {
            return `${days}د ${hours}س ${minutes}ق`;
        } else if (hours > 0) {
            return `${hours}س ${minutes}ق`;
        } else {
            return `${minutes}ق`;
        }
    }

    // التحقق من صحة عنوان IP أو اسم النطاق
    static isValidHost(host) {
        // التحقق من IP
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        
        // التحقق من اسم النطاق
        const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
        
        return ipRegex.test(host) || domainRegex.test(host);
    }

    // التحقق من صحة رقم البورت
    static isValidPort(port) {
        const portNum = parseInt(port);
        return !isNaN(portNum) && portNum >= 1 && portNum <= 65535;
    }

    // التحقق من صحة اسم البوت
    static isValidBotName(name) {
        if (!name || typeof name !== 'string') return false;
        
        // يجب أن يكون بين 3 و 16 حرف
        if (name.length < 3 || name.length > 16) return false;
        
        // يجب أن يحتوي على أحرف وأرقام فقط
        const nameRegex = /^[a-zA-Z0-9_]+$/;
        return nameRegex.test(name);
    }

    // إنشاء معرف فريد
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // تسجيل الأحداث
    static log(level, message, data = null) {
        const timestamp = this.formatTime(new Date());
        const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        
        console.log(logMessage);
        
        if (data) {
            console.log(JSON.stringify(data, null, 2));
        }

        // حفظ في ملف السجل
        this.writeToLogFile(logMessage, data);
    }

    // كتابة في ملف السجل
    static writeToLogFile(message, data = null) {
        try {
            const logDir = path.join(__dirname, 'logs');
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir);
            }

            const logFile = path.join(logDir, `app-${moment().format('YYYY-MM-DD')}.log`);
            const logEntry = message + (data ? '\n' + JSON.stringify(data, null, 2) : '') + '\n';
            
            fs.appendFileSync(logFile, logEntry);
        } catch (error) {
            console.error('Error writing to log file:', error);
        }
    }

    // تنظيف ملفات السجل القديمة
    static cleanOldLogs(daysToKeep = 7) {
        try {
            const logDir = path.join(__dirname, 'logs');
            if (!fs.existsSync(logDir)) return;

            const files = fs.readdirSync(logDir);
            const cutoffDate = moment().subtract(daysToKeep, 'days');

            files.forEach(file => {
                if (file.startsWith('app-') && file.endsWith('.log')) {
                    const filePath = path.join(logDir, file);
                    const stats = fs.statSync(filePath);
                    const fileDate = moment(stats.mtime);

                    if (fileDate.isBefore(cutoffDate)) {
                        fs.unlinkSync(filePath);
                        console.log(`Deleted old log file: ${file}`);
                    }
                }
            });
        } catch (error) {
            console.error('Error cleaning old logs:', error);
        }
    }

    // إنشاء نسخة احتياطية من قاعدة البيانات
    static backupDatabase(dbPath) {
        try {
            if (!fs.existsSync(dbPath)) return false;

            const backupDir = path.join(__dirname, 'backups');
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir);
            }

            const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
            const backupPath = path.join(backupDir, `backup_${timestamp}.db`);
            
            fs.copyFileSync(dbPath, backupPath);
            
            this.log('info', `Database backup created: ${backupPath}`);
            
            // تنظيف النسخ الاحتياطية القديمة
            this.cleanOldBackups(backupDir);
            
            return true;
        } catch (error) {
            this.log('error', 'Error creating database backup', error);
            return false;
        }
    }

    // تنظيف النسخ الاحتياطية القديمة
    static cleanOldBackups(backupDir, maxBackups = 7) {
        try {
            const files = fs.readdirSync(backupDir)
                .filter(file => file.startsWith('backup_') && file.endsWith('.db'))
                .map(file => ({
                    name: file,
                    path: path.join(backupDir, file),
                    mtime: fs.statSync(path.join(backupDir, file)).mtime
                }))
                .sort((a, b) => b.mtime - a.mtime);

            // حذف النسخ الزائدة
            if (files.length > maxBackups) {
                const filesToDelete = files.slice(maxBackups);
                filesToDelete.forEach(file => {
                    fs.unlinkSync(file.path);
                    console.log(`Deleted old backup: ${file.name}`);
                });
            }
        } catch (error) {
            console.error('Error cleaning old backups:', error);
        }
    }

    // تحويل البايتات إلى تنسيق قابل للقراءة
    static formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // تأخير التنفيذ
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // تشفير بسيط للبيانات الحساسة
    static simpleEncrypt(text, key = 'minecraft-bot-key') {
        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(
                text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
            );
        }
        return Buffer.from(result).toString('base64');
    }

    // فك التشفير
    static simpleDecrypt(encryptedText, key = 'minecraft-bot-key') {
        const text = Buffer.from(encryptedText, 'base64').toString();
        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(
                text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
            );
        }
        return result;
    }

    // التحقق من حالة الشبكة
    static async checkNetworkConnectivity(host = 'google.com', port = 80) {
        return new Promise((resolve) => {
            const net = require('net');
            const socket = new net.Socket();
            
            const timeout = setTimeout(() => {
                socket.destroy();
                resolve(false);
            }, 5000);
            
            socket.connect(port, host, () => {
                clearTimeout(timeout);
                socket.destroy();
                resolve(true);
            });
            
            socket.on('error', () => {
                clearTimeout(timeout);
                resolve(false);
            });
        });
    }

    // إحصائيات استخدام الذاكرة
    static getMemoryUsage() {
        const usage = process.memoryUsage();
        return {
            rss: this.formatBytes(usage.rss),
            heapTotal: this.formatBytes(usage.heapTotal),
            heapUsed: this.formatBytes(usage.heapUsed),
            external: this.formatBytes(usage.external)
        };
    }

    // معلومات النظام
    static getSystemInfo() {
        const os = require('os');
        return {
            platform: os.platform(),
            arch: os.arch(),
            nodeVersion: process.version,
            uptime: this.formatDuration(process.uptime() * 1000),
            memory: this.getMemoryUsage(),
            cpus: os.cpus().length
        };
    }
}

module.exports = Utils;
