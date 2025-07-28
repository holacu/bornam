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

// بدء health check بسيط فوراً
console.log('🏥 Starting health check server...');
require('./simple-health.js');

// انتظار قصير ثم بدء التطبيق الرئيسي
setTimeout(() => {
    console.log('🔄 Starting main application...');
    try {
        require('./index.js');
    } catch (error) {
        console.error('❌ Failed to start main application:', error.message);
        // حتى لو فشل التطبيق الرئيسي، health check سيبقى يعمل
        console.log('⚠️ Health check server will continue running');
    }
}, 2000); // انتظار ثانيتين

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
