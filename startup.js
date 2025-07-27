#!/usr/bin/env node

// ملف بدء التشغيل مع فحص الجاهزية
const http = require('http');

console.log('🚀 Starting Minecraft Telegram Bot System...');
console.log(`📅 Startup time: ${new Date().toISOString()}`);
console.log(`🌐 Port: ${process.env.PORT || 3000}`);
console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);

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

// إنشاء خادم بسيط للاستجابة الفورية
const port = process.env.PORT || 3000;
const quickServer = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        status: 'starting',
        message: 'Minecraft Telegram Bot System is starting up...',
        timestamp: new Date().toISOString(),
        port: port
    }));
});

quickServer.listen(port, '0.0.0.0', () => {
    console.log(`🌐 Quick response server started on port ${port}`);
    console.log('✅ READY TO ACCEPT CONNECTIONS');
    
    // بدء التطبيق الرئيسي بعد ثانية واحدة
    setTimeout(() => {
        console.log('🔄 Starting main application...');
        quickServer.close(() => {
            console.log('🔄 Quick server closed, starting main app...');
            require('./index.js');
        });
    }, 1000);
});

// معالجة الأخطاء
quickServer.on('error', (error) => {
    console.error('❌ Quick server error:', error);
    if (error.code === 'EADDRINUSE') {
        console.log(`⚠️ Port ${port} is in use, starting main app directly...`);
        require('./index.js');
    } else {
        process.exit(1);
    }
});

// معالجة إشارات الإيقاف
process.on('SIGTERM', () => {
    console.log('📴 Received SIGTERM, shutting down gracefully...');
    quickServer.close(() => {
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('📴 Received SIGINT, shutting down gracefully...');
    quickServer.close(() => {
        process.exit(0);
    });
});

console.log('🎯 Startup script initialized');
