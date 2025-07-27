#!/usr/bin/env node

// ملف لإزالة raknet-native بعد التثبيت
const fs = require('fs');
const path = require('path');

console.log('🔧 بدء إزالة raknet-native...');

// مسار raknet-native
const raknetPath = path.join(__dirname, 'node_modules', 'raknet-native');

// إزالة raknet-native إذا كان موجود
if (fs.existsSync(raknetPath)) {
    try {
        console.log('🗑️ إزالة raknet-native...');
        fs.rmSync(raknetPath, { recursive: true, force: true });
        console.log('✅ تم حذف raknet-native بنجاح');
    } catch (error) {
        console.log('⚠️ تعذر حذف raknet-native:', error.message);
    }
} else {
    console.log('✅ raknet-native غير موجود');
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
