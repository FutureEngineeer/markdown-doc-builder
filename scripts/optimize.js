// optimize.js - Автоматическая оптимизация ресурсов
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting optimization...\n');

/**
 * 1. Оптимизация HTML - добавление preconnect и defer
 */
function optimizeHTML() {
  console.log('📄 Optimizing HTML files...');
  
  const distDir = path.join(process.cwd(), 'dist');
  
  function processHTMLFile(filePath) {
    let html = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Добавляем preconnect если его нет
    if (!html.includes('rel="preconnect"')) {
      const preconnect = `  <!-- Preconnect to CDNs for faster loading -->
  <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin>
  <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
  `;
      html = html.replace('<link rel="stylesheet"', preconnect + '<link rel="stylesheet"');
      modified = true;
    }
    
    // Добавляем defer к скриптам без defer
    html = html.replace(/<script src="(?!.*defer)([^"]+)">/g, '<script defer src="$1">');
    
    // Добавляем loading="lazy" к изображениям
    html = html.replace(/<img(?![^>]*loading=)([^>]*)>/g, '<img loading="lazy" decoding="async"$1>');
    
    if (modified || html !== fs.readFileSync(filePath, 'utf8')) {
      fs.writeFileSync(filePath, html);
      console.log(`   ✓ ${path.relative(distDir, filePath)}`);
      return true;
    }
    
    return false;
  }
  
  function walkDir(dir) {
    let count = 0;
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    files.forEach(file => {
      const fullPath = path.join(dir, file.name);
      
      if (file.isDirectory() && !file.name.startsWith('.') && file.name !== 'assets') {
        count += walkDir(fullPath);
      } else if (file.name.endsWith('.html')) {
        if (processHTMLFile(fullPath)) count++;
      }
    });
    
    return count;
  }
  
  if (fs.existsSync(distDir)) {
    const count = walkDir(distDir);
    console.log(`   ✓ Optimized ${count} HTML files\n`);
  } else {
    console.log('   ⚠️  dist/ directory not found. Run build first.\n');
  }
}

/**
 * 2. Объединение CSS файлов
 */
function bundleCSS() {
  console.log('🎨 Bundling CSS files...');
  
  const stylesDir = path.join(process.cwd(), 'assets', 'styles');
  const mainCSS = path.join(process.cwd(), 'assets', 'styles.css');
  
  if (!fs.existsSync(mainCSS)) {
    console.log('   ⚠️  styles.css not found\n');
    return;
  }
  
  let mainContent = fs.readFileSync(mainCSS, 'utf8');
  const imports = mainContent.match(/@import url\('([^']+)'\);/g) || [];
  
  if (imports.length === 0) {
    console.log('   ℹ️  No @import statements found\n');
    return;
  }
  
  let bundled = mainContent;
  
  imports.forEach(importStatement => {
    const match = importStatement.match(/@import url\('([^']+)'\);/);
    if (match) {
      const importPath = match[1];
      const fullPath = path.join(process.cwd(), 'assets', importPath);
      
      if (fs.existsSync(fullPath)) {
        const importedContent = fs.readFileSync(fullPath, 'utf8');
        bundled = bundled.replace(importStatement, `\n/* === ${importPath} === */\n${importedContent}\n`);
        console.log(`   ✓ Bundled ${importPath}`);
      }
    }
  });
  
  // Сохраняем bundled версию
  const outputPath = path.join(process.cwd(), 'dist', 'assets', 'styles.bundled.css');
  const outputDir = path.dirname(outputPath);
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, bundled);
  
  const originalSize = Buffer.byteLength(mainContent, 'utf8');
  const bundledSize = Buffer.byteLength(bundled, 'utf8');
  
  console.log(`   ✓ Created styles.bundled.css`);
  console.log(`   📊 Size: ${(originalSize / 1024).toFixed(2)}KB → ${(bundledSize / 1024).toFixed(2)}KB\n`);
}

/**
 * 3. Минификация CSS (простая версия без зависимостей)
 */
function minifyCSS() {
  console.log('⚡ Minifying CSS...');
  
  const bundledPath = path.join(process.cwd(), 'dist', 'assets', 'styles.bundled.css');
  
  if (!fs.existsSync(bundledPath)) {
    console.log('   ⚠️  styles.bundled.css not found. Run bundleCSS first.\n');
    return;
  }
  
  let css = fs.readFileSync(bundledPath, 'utf8');
  
  // Простая минификация
  css = css
    .replace(/\/\*[\s\S]*?\*\//g, '') // Удаляем комментарии
    .replace(/\s+/g, ' ') // Множественные пробелы в один
    .replace(/\s*([{}:;,])\s*/g, '$1') // Удаляем пробелы вокруг спецсимволов
    .replace(/;}/g, '}') // Удаляем последнюю точку с запятой
    .trim();
  
  const minifiedPath = path.join(process.cwd(), 'dist', 'assets', 'styles.min.css');
  fs.writeFileSync(minifiedPath, css);
  
  const originalSize = fs.statSync(bundledPath).size;
  const minifiedSize = fs.statSync(minifiedPath).size;
  const savings = ((1 - minifiedSize / originalSize) * 100).toFixed(1);
  
  console.log(`   ✓ Created styles.min.css`);
  console.log(`   📊 Size: ${(originalSize / 1024).toFixed(2)}KB → ${(minifiedSize / 1024).toFixed(2)}KB (-${savings}%)\n`);
}

/**
 * 4. Генерация Critical CSS
 */
function generateCriticalCSS() {
  console.log('🎯 Generating critical CSS...');
  
  const mainCSS = path.join(process.cwd(), 'assets', 'styles.css');
  
  if (!fs.existsSync(mainCSS)) {
    console.log('   ⚠️  styles.css not found\n');
    return;
  }
  
  const css = fs.readFileSync(mainCSS, 'utf8');
  
  // Извлекаем критические стили (переменные, body, header)
  const criticalSelectors = [
    /:root\s*{[^}]+}/,
    /\*\s*{[^}]+}/,
    /body\s*{[^}]+}/,
    /\.site-wrapper[^{]*{[^}]+}/,
    /header[^{]*{[^}]+}/,
    /\.header[^{]*{[^}]+}/,
    /\.logo[^{]*{[^}]+}/
  ];
  
  let critical = '';
  criticalSelectors.forEach(selector => {
    const match = css.match(selector);
    if (match) {
      critical += match[0] + '\n';
    }
  });
  
  const criticalPath = path.join(process.cwd(), 'dist', 'assets', 'critical.css');
  const criticalDir = path.dirname(criticalPath);
  
  if (!fs.existsSync(criticalDir)) {
    fs.mkdirSync(criticalDir, { recursive: true });
  }
  
  fs.writeFileSync(criticalPath, critical);
  
  console.log(`   ✓ Created critical.css (${(Buffer.byteLength(critical, 'utf8') / 1024).toFixed(2)}KB)`);
  console.log(`   ℹ️  Inline this CSS in <head> for faster rendering\n`);
}

/**
 * 5. Анализ размеров файлов
 */
function analyzeAssets() {
  console.log('📊 Analyzing assets...\n');
  
  const assetsDir = path.join(process.cwd(), 'assets');
  const distAssetsDir = path.join(process.cwd(), 'dist', 'assets');
  
  function getDirectorySize(dir) {
    let size = 0;
    
    if (!fs.existsSync(dir)) return 0;
    
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    files.forEach(file => {
      const fullPath = path.join(dir, file.name);
      
      if (file.isDirectory()) {
        size += getDirectorySize(fullPath);
      } else {
        size += fs.statSync(fullPath).size;
      }
    });
    
    return size;
  }
  
  function analyzeImages(dir) {
    const images = [];
    
    if (!fs.existsSync(dir)) return images;
    
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    files.forEach(file => {
      const fullPath = path.join(dir, file.name);
      
      if (file.isDirectory()) {
        images.push(...analyzeImages(fullPath));
      } else if (/\.(jpg|jpeg|png|gif|svg|webp|avif)$/i.test(file.name)) {
        const size = fs.statSync(fullPath).size;
        images.push({
          name: file.name,
          path: path.relative(assetsDir, fullPath),
          size: size,
          sizeKB: (size / 1024).toFixed(2)
        });
      }
    });
    
    return images;
  }
  
  const sourceSize = getDirectorySize(assetsDir);
  const distSize = getDirectorySize(distAssetsDir);
  
  console.log(`Source assets: ${(sourceSize / 1024 / 1024).toFixed(2)}MB`);
  console.log(`Dist assets: ${(distSize / 1024 / 1024).toFixed(2)}MB\n`);
  
  const images = analyzeImages(assetsDir);
  
  if (images.length > 0) {
    console.log('Images:');
    images
      .sort((a, b) => b.size - a.size)
      .slice(0, 10)
      .forEach(img => {
        console.log(`   ${img.sizeKB}KB - ${img.path}`);
      });
    
    const totalImageSize = images.reduce((sum, img) => sum + img.size, 0);
    console.log(`\n   Total: ${(totalImageSize / 1024 / 1024).toFixed(2)}MB (${images.length} images)`);
    
    // Рекомендации
    const largeImages = images.filter(img => img.size > 100 * 1024);
    if (largeImages.length > 0) {
      console.log(`\n   ⚠️  ${largeImages.length} images > 100KB - consider optimization`);
      console.log(`   💡 Use: npm install --save-dev imagemin imagemin-webp`);
    }
  }
  
  console.log('');
}

/**
 * 6. Создание Service Worker
 */
function generateServiceWorker() {
  console.log('🔧 Generating Service Worker...');
  
  const swContent = `// Service Worker for offline caching
const CACHE_NAME = 'creapunk-v1';
const urlsToCache = [
  '/',
  '/assets/styles.min.css',
  '/assets/scripts/core.js',
  '/assets/logo.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
`;
  
  const swPath = path.join(process.cwd(), 'dist', 'sw.js');
  fs.writeFileSync(swPath, swContent);
  
  console.log(`   ✓ Created sw.js`);
  console.log(`   ℹ️  Add to HTML: <script>if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js')}</script>\n`);
}

/**
 * Main execution
 */
async function main() {
  try {
    optimizeHTML();
    bundleCSS();
    minifyCSS();
    generateCriticalCSS();
    generateServiceWorker();
    analyzeAssets();
    
    console.log('✅ Optimization complete!\n');
    console.log('📝 Next steps:');
    console.log('   1. Test with: npm run build');
    console.log('   2. Measure with Lighthouse');
    console.log('   3. Deploy to Netlify');
    console.log('   4. Check PERFORMANCE_OPTIMIZATION.md for more tips\n');
  } catch (error) {
    console.error('❌ Error during optimization:', error);
    process.exit(1);
  }
}

main();
