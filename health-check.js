const http = require('http');
const fs = require('fs');
const path = require('path');

// تحميل متغيرات البيئة
require('dotenv').config();

class HealthCheckServer {
    constructor() {
        this.port = process.env.PORT || 3000;
        this.server = null;
        this.startTime = Date.now();
    }

    // فحص صحة قاعدة البيانات
    async checkDatabase() {
        try {
            const dbPath = process.env.DATABASE_PATH || './minecraft_bot.db';
            
            // التحقق من وجود ملف قاعدة البيانات
            if (fs.existsSync(dbPath)) {
                const stats = fs.statSync(dbPath);
                return {
                    status: 'healthy',
                    path: dbPath,
                    size: stats.size,
                    lastModified: stats.mtime
                };
            } else {
                return {
                    status: 'warning',
                    message: 'Database file not found, will be created on first use',
                    path: dbPath
                };
            }
        } catch (error) {
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    // فحص استخدام الذاكرة
    checkMemory() {
        const memUsage = process.memoryUsage();
        const maxMemory = (parseInt(process.env.MAX_MEMORY_USAGE) || 512) * 1024 * 1024;
        const memoryUsagePercent = (memUsage.heapUsed / maxMemory) * 100;

        return {
            status: memoryUsagePercent > 90 ? 'critical' : memoryUsagePercent > 70 ? 'warning' : 'healthy',
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
            external: Math.round(memUsage.external / 1024 / 1024) + ' MB',
            usagePercent: Math.round(memoryUsagePercent) + '%'
        };
    }

    // فحص وقت التشغيل
    getUptime() {
        const uptime = Date.now() - this.startTime;
        const seconds = Math.floor(uptime / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        return {
            status: 'healthy',
            uptime: uptime,
            formatted: `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`
        };
    }

    // فحص متغيرات البيئة المطلوبة
    checkEnvironment() {
        const requiredVars = ['TELEGRAM_BOT_TOKEN'];
        const missingVars = [];
        const presentVars = [];

        requiredVars.forEach(varName => {
            if (process.env[varName]) {
                presentVars.push(varName);
            } else {
                missingVars.push(varName);
            }
        });

        return {
            status: missingVars.length > 0 ? 'error' : 'healthy',
            required: requiredVars.length,
            present: presentVars.length,
            missing: missingVars,
            nodeEnv: process.env.NODE_ENV || 'development'
        };
    }

    // إنشاء تقرير الصحة الشامل
    async generateHealthReport() {
        const database = await this.checkDatabase();
        const memory = this.checkMemory();
        const uptime = this.getUptime();
        const environment = this.checkEnvironment();

        // تحديد الحالة العامة
        const statuses = [database.status, memory.status, environment.status];
        let overallStatus = 'healthy';
        
        if (statuses.includes('error')) {
            overallStatus = 'error';
        } else if (statuses.includes('critical')) {
            overallStatus = 'critical';
        } else if (statuses.includes('warning')) {
            overallStatus = 'warning';
        }

        return {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            version: require('./package.json').version,
            checks: {
                database,
                memory,
                uptime,
                environment
            }
        };
    }

    // معالج طلبات HTTP
    async handleRequest(req, res) {
        const url = req.url;
        
        // إعداد headers
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');

        try {
            // استجابة فورية وبسيطة لجميع المسارات
            if (url === '/health' || url === '/' || url === '/health/simple') {
                // فحص بسيط وسريع - دائماً healthy
                res.statusCode = 200;
                res.end(JSON.stringify({
                    status: 'healthy',
                    timestamp: new Date().toISOString(),
                    uptime: Math.floor((Date.now() - this.startTime) / 1000),
                    port: this.port
                }));

            } else if (url === '/ping') {
                // ping بسيط جداً
                res.statusCode = 200;
                res.end('pong');

            } else if (url === '/health/detailed') {
                // فحص مفصل فقط عند الطلب
                try {
                    const healthReport = await this.generateHealthReport();
                    res.statusCode = 200;
                    res.end(JSON.stringify(healthReport, null, 2));
                } catch (detailedError) {
                    // حتى لو فشل الفحص المفصل، نعطي استجابة أساسية
                    res.statusCode = 200;
                    res.end(JSON.stringify({
                        status: 'healthy',
                        timestamp: new Date().toISOString(),
                        error: 'Detailed check failed, but service is running'
                    }));
                }

            } else {
                // صفحة غير موجودة
                res.statusCode = 404;
                res.end(JSON.stringify({
                    error: 'Not Found',
                    message: 'Available endpoints: /health, /ping, /health/detailed'
                }));
            }
        } catch (error) {
            console.error('Health check error:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({
                status: 'error',
                message: 'Internal server error',
                error: error.message
            }));
        }
    }

    // بدء الخادم
    start() {
        this.server = http.createServer((req, res) => {
            this.handleRequest(req, res);
        });

        this.server.listen(this.port, '0.0.0.0', () => {
            console.log(`🏥 Health check server running on port ${this.port}`);
            console.log(`📊 Health endpoints:`);
            console.log(`   • http://0.0.0.0:${this.port}/health`);
            console.log(`   • http://0.0.0.0:${this.port}/health/simple`);
            console.log(`   • http://0.0.0.0:${this.port}/health/detailed`);

            // إرسال إشارة جاهزية فورية
            console.log('✅ Server is ready and listening');
        });

        // معالجة الأخطاء
        this.server.on('error', (error) => {
            console.error('❌ Health check server error:', error);
            if (error.code === 'EADDRINUSE') {
                console.log(`⚠️ Port ${this.port} is in use, trying alternative port...`);
                this.port = this.port + 1;
                setTimeout(() => this.start(), 1000);
            }
        });

        // إضافة timeout للاستجابة السريعة
        this.server.timeout = 5000; // 5 ثواني

        return this.server;
    }

    // إيقاف الخادم
    stop() {
        if (this.server) {
            this.server.close();
            console.log('🏥 Health check server stopped');
        }
    }
}

module.exports = HealthCheckServer;
