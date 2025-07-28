// خادم health check بسيط جداً للتأكد من عمل التطبيق
const http = require('http');

const port = process.env.PORT || 3000;

console.log('🏥 Starting simple health check server...');

const server = http.createServer((req, res) => {
    const url = req.url;
    
    // إعداد headers أساسية
    res.setHeader('Content-Type', 'application/json');
    
    if (url === '/health' || url === '/' || url === '/ping') {
        res.statusCode = 200;
        res.end(JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: 'minecraft-telegram-bot'
        }));
    } else {
        res.statusCode = 200; // حتى للمسارات غير الموجودة نعطي 200
        res.end(JSON.stringify({
            status: 'healthy',
            message: 'Service is running'
        }));
    }
});

server.listen(port, '0.0.0.0', () => {
    console.log(`✅ Simple health server running on port ${port}`);
    console.log('🌐 Health endpoints available at:');
    console.log(`   • http://0.0.0.0:${port}/health`);
    console.log(`   • http://0.0.0.0:${port}/ping`);
});

server.on('error', (error) => {
    console.error('❌ Simple health server error:', error);
    process.exit(1);
});

// معالجة إشارات الإيقاف
process.on('SIGTERM', () => {
    console.log('📴 Simple health server shutting down...');
    server.close(() => {
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('📴 Simple health server shutting down...');
    server.close(() => {
        process.exit(0);
    });
});

module.exports = server;
