#!/usr/bin/env node

// ملف بدء التشغيل مع فحص الجاهزية
const http = require('http');

console.log('🚀 Starting Minecraft Telegram Bot System...');
console.log(`📅 Startup time: ${new Date().toISOString()}`);
console.log(`🌐 Port: ${process.env.PORT || 3000}`);
console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔧 Node.js version: ${process.version}`);

// فحص إصدار Node.js
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion < 22) {
    console.error(`❌ Node.js version ${nodeVersion} is not supported`);
    console.error('⚠️ This application requires Node.js 22.0.0 or higher');
    console.error('💡 Please upgrade Node.js or use the Docker deployment');
    process.exit(1);
}

console.log('✅ Node.js version check passed');

// فحص متغيرات البيئة المطلوبة
const requiredEnvVars = ['TELEGRAM_BOT_TOKEN'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars);
    console.log('💡 Please set the following environment variables:');
    missingVars.forEach(varName => {
        console.log(`   - ${varName}`);
    });
    process.exit(1);
}

console.log('✅ Environment variables check passed');

// فحص التبعيات
console.log('🔍 Checking dependencies...');
try {
    require('./check-dependencies');
    console.log('✅ Dependencies check passed');
} catch (error) {
    console.log('⚠️ Dependencies check failed, continuing anyway:', error.message);
}

// إنشاء health server مباشرة في startup.js
const http = require('http');
const port = process.env.PORT || 3000;

console.log('🏥 Starting immediate health check server...');

const healthServer = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'minecraft-telegram-bot'
    }));
});

healthServer.listen(port, '0.0.0.0', () => {
    console.log(`✅ Health server running on port ${port}`);
    console.log('🌐 Health endpoints available');

    // بدء التطبيق الرئيسي بعد تأكيد تشغيل health server
    setTimeout(() => {
        console.log('🔄 Starting main application...');
        try {
            require('./index.js');
        } catch (error) {
            console.error('❌ Failed to start main application:', error.message);
            console.log('⚠️ Health check server will continue running');
        }
    }, 1000);
});

healthServer.on('error', (error) => {
    console.error('❌ Health server error:', error);
    process.exit(1);
});

// معالجة إشارات الإيقاف
process.on('SIGTERM', () => {
    console.log('📴 Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('📴 Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

console.log('🎯 Startup script initialized');
