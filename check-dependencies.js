#!/usr/bin/env node

// فحص التبعيات والتأكد من عملها
console.log('🔍 فحص التبعيات...');

const dependencies = [
    { name: 'dotenv', required: true },
    { name: 'node-telegram-bot-api', required: true },
    { name: 'mineflayer', required: true },
    { name: 'uuid', required: true },
    { name: 'bedrock-protocol', required: false },
    { name: 'sqlite3', required: false }
];

let allGood = true;
const results = [];

dependencies.forEach(dep => {
    try {
        require(dep.name);
        console.log(`✅ ${dep.name} - متاح`);
        results.push({ name: dep.name, status: 'available', required: dep.required });
    } catch (error) {
        if (dep.required) {
            console.log(`❌ ${dep.name} - مطلوب ولكن غير متاح: ${error.message}`);
            allGood = false;
        } else {
            console.log(`⚠️ ${dep.name} - اختياري وغير متاح: ${error.message}`);
        }
        results.push({ name: dep.name, status: 'missing', required: dep.required, error: error.message });
    }
});

// فحص قاعدة البيانات
console.log('\n📊 فحص قاعدة البيانات...');
try {
    const Database = require('./database');
    const db = new Database();
    console.log('✅ قاعدة البيانات - متاحة');
    results.push({ name: 'database', status: 'available', required: true });
} catch (error) {
    console.log(`❌ قاعدة البيانات - خطأ: ${error.message}`);
    results.push({ name: 'database', status: 'error', required: true, error: error.message });
    allGood = false;
}

// فحص bedrock-protocol
console.log('\n🛏️ فحص bedrock-protocol...');
try {
    const bedrock = require('./bedrock-fallback');
    console.log('✅ bedrock-protocol - متاح (مع fallback)');
    results.push({ name: 'bedrock-fallback', status: 'available', required: false });
} catch (error) {
    console.log(`⚠️ bedrock-protocol - خطأ: ${error.message}`);
    results.push({ name: 'bedrock-fallback', status: 'error', required: false, error: error.message });
}

// تقرير نهائي
console.log('\n📋 تقرير التبعيات:');
console.log('='.repeat(50));

results.forEach(result => {
    const status = result.status === 'available' ? '✅' : 
                   result.status === 'missing' ? '❌' : '⚠️';
    const required = result.required ? '(مطلوب)' : '(اختياري)';
    console.log(`${status} ${result.name} ${required}`);
    if (result.error) {
        console.log(`   └─ ${result.error}`);
    }
});

console.log('='.repeat(50));

if (allGood) {
    console.log('🎉 جميع التبعيات المطلوبة متاحة!');
    process.exit(0);
} else {
    console.log('❌ بعض التبعيات المطلوبة مفقودة!');
    process.exit(1);
}
