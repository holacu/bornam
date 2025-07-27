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

// قراءة package.json وإزالة التبعيات المشكلة
const packageJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
    try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        // إزالة التبعيات المشكلة
        const problematicDeps = ['raknet-native'];
        let modified = false;
        
        if (packageJson.dependencies) {
            problematicDeps.forEach(dep => {
                if (packageJson.dependencies[dep]) {
                    console.log(`🗑️ إزالة ${dep} من dependencies`);
                    delete packageJson.dependencies[dep];
                    modified = true;
                }
            });
        }
        
        if (packageJson.optionalDependencies) {
            problematicDeps.forEach(dep => {
                if (packageJson.optionalDependencies[dep]) {
                    console.log(`🗑️ إزالة ${dep} من optionalDependencies`);
                    delete packageJson.optionalDependencies[dep];
                    modified = true;
                }
            });
        }
        
        if (modified) {
            fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
            console.log('✅ تم تحديث package.json');
        }
        
    } catch (error) {
        console.log('⚠️ خطأ في معالجة package.json:', error.message);
    }
}

console.log('✅ انتهى إصلاح مشاكل التثبيت');
console.log('🚀 يمكن الآن تشغيل npm install');
