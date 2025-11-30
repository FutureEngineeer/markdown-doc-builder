const { generateErrorPages } = require('../components/errorPageGenerator');

// Генерация страниц
console.log('🚀 Generating error pages...\n');
generateErrorPages();

console.log('\n📝 Usage:');
console.log('   Configure your web server to serve these pages for respective error codes.');
console.log('   Example for Nginx:');
console.log('     error_page 404 /404.html;');
console.log('     error_page 500 501 502 503 504 /500.html;');
