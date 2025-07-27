#!/usr/bin/env node

// ملف لإزالة raknet-native بعد التثبيت
const fs = require('fs');
const path = require('path');

console.log('🔧 بدء تنظيف raknet-native...');

// مسارات محتملة لـ raknet-native
const possiblePaths = [
    path.join(__dirname, 'node_modules', 'raknet-native'),
    path.join(__dirname, 'node_modules', 'bedrock-protocol', 'node_modules', 'raknet-native'),
    path.join(__dirname, 'node_modules', '@types', 'raknet-native')
];

let removed = false;

// إزالة raknet-native من جميع المسارات المحتملة
possiblePaths.forEach(raknetPath => {
    if (fs.existsSync(raknetPath)) {
        try {
            console.log(`🗑️ إزالة raknet-native من: ${raknetPath}`);
            fs.rmSync(raknetPath, { recursive: true, force: true });
            console.log('✅ تم حذف raknet-native بنجاح');
            removed = true;
        } catch (error) {
            console.log('⚠️ تعذر حذف raknet-native:', error.message);
        }
    }
});

if (!removed) {
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
