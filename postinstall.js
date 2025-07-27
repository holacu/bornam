#!/usr/bin/env node

// ملف لإزالة raknet-native بعد التثبيت
const fs = require('fs');
const path = require('path');

console.log('🔧 بدء تنظيف المكتبات المشكلة...');

// مسارات محتملة لـ raknet-native
const raknetPaths = [
    path.join(__dirname, 'node_modules', 'raknet-native'),
    path.join(__dirname, 'node_modules', 'bedrock-protocol', 'node_modules', 'raknet-native'),
    path.join(__dirname, 'node_modules', '@types', 'raknet-native')
];

// مسارات محتملة لـ sqlite3 bindings المشكلة
const sqlite3Paths = [
    path.join(__dirname, 'node_modules', 'sqlite3', 'build'),
    path.join(__dirname, 'node_modules', 'sqlite3', 'lib', 'binding')
];

let raknetRemoved = false;
let sqlite3Cleaned = false;

// إزالة raknet-native من جميع المسارات المحتملة
raknetPaths.forEach(raknetPath => {
    if (fs.existsSync(raknetPath)) {
        try {
            console.log(`🗑️ إزالة raknet-native من: ${raknetPath}`);
            fs.rmSync(raknetPath, { recursive: true, force: true });
            console.log('✅ تم حذف raknet-native بنجاح');
            raknetRemoved = true;
        } catch (error) {
            console.log('⚠️ تعذر حذف raknet-native:', error.message);
        }
    }
});

// تنظيف sqlite3 bindings المشكلة
sqlite3Paths.forEach(sqlite3Path => {
    if (fs.existsSync(sqlite3Path)) {
        try {
            console.log(`🧹 تنظيف sqlite3 bindings من: ${sqlite3Path}`);
            fs.rmSync(sqlite3Path, { recursive: true, force: true });
            console.log('✅ تم تنظيف sqlite3 bindings');
            sqlite3Cleaned = true;
        } catch (error) {
            console.log('⚠️ تعذر تنظيف sqlite3 bindings:', error.message);
        }
    }
});

if (!raknetRemoved) {
    console.log('✅ raknet-native غير موجود');
}

if (!sqlite3Cleaned) {
    console.log('✅ sqlite3 bindings نظيفة');
}

// إنشاء ملف بديل فارغ
try {
    const emptyRaknetPath = path.join(__dirname, 'node_modules', 'raknet-native');
    if (!fs.existsSync(emptyRaknetPath)) {
        fs.mkdirSync(emptyRaknetPath, { recursive: true });
        
        // إنشاء package.json فارغ
        const emptyPackage = {
            name: 'raknet-native',
            version: '0.0.0',
            main: 'index.js'
        };
        fs.writeFileSync(path.join(emptyRaknetPath, 'package.json'), JSON.stringify(emptyPackage, null, 2));
        
        // إنشاء index.js فارغ
        const emptyIndex = `// ملف بديل فارغ لـ raknet-native
module.exports = {};
console.log('⚠️ raknet-native تم استبداله بملف فارغ');
`;
        fs.writeFileSync(path.join(emptyRaknetPath, 'index.js'), emptyIndex);
        
        console.log('✅ تم إنشاء raknet-native بديل فارغ');
    }
} catch (error) {
    console.log('⚠️ تعذر إنشاء raknet-native بديل:', error.message);
}

console.log('✅ انتهى تنظيف raknet-native');
