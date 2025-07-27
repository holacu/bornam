#!/usr/bin/env node

// ملف لإصلاح مشاكل التثبيت في Railway
const fs = require('fs');
const path = require('path');

console.log('🔧 بدء إصلاح مشاكل التثبيت...');

// إزالة node_modules إذا كان موجوداً
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
    console.log('🗑️ إزالة node_modules القديم...');
    try {
        fs.rmSync(nodeModulesPath, { recursive: true, force: true });
        console.log('✅ تم حذف node_modules');
    } catch (error) {
        console.log('⚠️ تعذر حذف node_modules:', error.message);
    }
}

// إزالة package-lock.json إذا كان موجوداً
const packageLockPath = path.join(__dirname, 'package-lock.json');
if (fs.existsSync(packageLockPath)) {
    console.log('🗑️ إزالة package-lock.json القديم...');
    try {
        fs.unlinkSync(packageLockPath);
        console.log('✅ تم حذف package-lock.json');
    } catch (error) {
        console.log('⚠️ تعذر حذف package-lock.json:', error.message);
    }
}

// قراءة package.json وتعديل bedrock-protocol
const packageJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
    try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        let modified = false;

        // استبدال bedrock-protocol بإصدار أقدم يعمل بدون raknet-native
        if (packageJson.dependencies && packageJson.dependencies['bedrock-protocol']) {
            console.log('🔄 تحديث bedrock-protocol إلى إصدار متوافق...');
            packageJson.dependencies['bedrock-protocol'] = '^3.40.0'; // إصدار أقدم مستقر
            modified = true;
        }

        // إضافة resolutions لمنع تثبيت raknet-native
        if (!packageJson.resolutions) {
            packageJson.resolutions = {};
            modified = true;
        }
        if (!packageJson.resolutions['raknet-native']) {
            packageJson.resolutions['raknet-native'] = 'npm:empty-package@1.0.0';
            console.log('🚫 إضافة resolutions لمنع raknet-native');
            modified = true;
        }

        // إضافة overrides لـ npm
        if (!packageJson.overrides) {
            packageJson.overrides = {};
            modified = true;
        }
        if (!packageJson.overrides['raknet-native']) {
            packageJson.overrides['raknet-native'] = 'npm:empty-package@1.0.0';
            console.log('🚫 إضافة overrides لمنع raknet-native');
            modified = true;
        }

        if (modified) {
            fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
            console.log('✅ تم تحديث package.json');
        }

    } catch (error) {
        console.log('⚠️ خطأ في معالجة package.json:', error.message);
    }
}

// إنشاء ملف .npmrc محدث
const npmrcPath = path.join(__dirname, '.npmrc');
try {
    const npmrcContent = `# إعدادات npm للنشر على Railway
optional=false
audit=false
fund=false
progress=false
loglevel=warn

# تجاهل أخطاء التبعيات الاختيارية
ignore-scripts=false
unsafe-perm=true

# منع تثبيت raknet-native
package-lock=false
legacy-peer-deps=true

# تحسين الأداء
cache-max=86400000
prefer-offline=false`;

    fs.writeFileSync(npmrcPath, npmrcContent);
    console.log('✅ تم تحديث .npmrc');
} catch (error) {
    console.log('⚠️ تعذر تحديث .npmrc:', error.message);
}

console.log('✅ انتهى إصلاح مشاكل التثبيت');
console.log('🚀 يمكن الآن تشغيل npm install');
