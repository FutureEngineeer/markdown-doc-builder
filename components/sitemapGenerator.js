// sitemapGenerator.js - Генератор sitemap.xml для SEO
const fs = require('fs');
const path = require('path');

/**
 * Генерирует sitemap.xml для всех HTML страниц в dist
 */
function generateSitemap(distDir, baseUrl, outputPath = null) {
  const sitemapPath = outputPath || path.join(distDir, 'sitemap.xml');
  const urls = [];
  
  // Рекурсивно собираем все HTML файлы
  function collectHtmlFiles(dir, relativePath = '') {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Пропускаем служебные директории
        if (file.startsWith('.') || file === 'node_modules') {
          return;
        }
        collectHtmlFiles(fullPath, path.join(relativePath, file));
      } else if (file.endsWith('.html')) {
        // Пропускаем страницы ошибок
        if (/^\d{3}\.html$/.test(file)) {
          return;
        }
        
        const urlPath = path.join(relativePath, file).replace(/\\/g, '/');
        const lastMod = stat.mtime.toISOString().split('T')[0];
        
        // Определяем приоритет и частоту обновления
        let priority = '0.5';
        let changefreq = 'monthly';
        
        if (file === 'index.html' && relativePath === '') {
          // Главная страница
          priority = '1.0';
          changefreq = 'weekly';
        } else if (file === 'index.html') {
          // Индексные страницы разделов
          priority = '0.8';
          changefreq = 'weekly';
        } else if (relativePath.includes('guide') || relativePath.includes('tutorial')) {
          // Руководства и туториалы
          priority = '0.7';
          changefreq = 'monthly';
        }
        
        urls.push({
          loc: `${baseUrl}/${urlPath}`,
          lastmod: lastMod,
          changefreq: changefreq,
          priority: priority
        });
      }
    });
  }
  
  collectHtmlFiles(distDir);
  
  // Генерируем XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
  
  fs.writeFileSync(sitemapPath, xml, 'utf8');
  console.log(`   ✓ Generated sitemap.xml with ${urls.length} URLs`);
  
  return sitemapPath;
}

module.exports = {
  generateSitemap
};
