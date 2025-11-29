// optimize-images-smart.js - Умная оптимизация изображений (только новые файлы)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🖼️  Smart Image Optimization\n');

const CACHE_FILE = '.temp/image-optimization-cache.json';

/**
 * Загрузка кеша оптимизированных файлов
 */
function loadCache() {
  if (fs.existsSync(CACHE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    } catch (error) {
      console.warn('⚠️  Cache corrupted, will rebuild');
      return {};
    }
  }
  return {};
}

/**
 * Сохранение кеша
 */
function saveCache(cache) {
  const dir = path.dirname(CACHE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

/**
 * Вычисление хеша файла
 */
function getFileHash(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Сканирование изображений
 */
function scanImages(dir) {
  const images = [];
  
  function scan(currentDir) {
    if (!fs.existsSync(currentDir)) return;
    
    const items = fs.readdirSync(currentDir, { withFileTypes: true });
    
    items.forEach(item => {
      const fullPath = path.join(currentDir, item.name);
      
      if (item.isDirectory()) {
        scan(fullPath);
      } else if (/\.(jpg|jpeg|png|gif|svg)$/i.test(item.name)) {
        const stats = fs.statSync(fullPath);
        images.push({
          path: fullPath,
          relativePath: path.relative(dir, fullPath),
          size: stats.size,
          ext: path.extname(item.name).toLowerCase(),
          hash: getFileHash(fullPath)
        });
      }
    });
  }
  
  scan(dir);
  return images;
}

/**
 * Оптимизация изображений
 */
async function optimizeImages() {
  const distAssetsDir = path.join(process.cwd(), 'dist', 'assets');
  
  if (!fs.existsSync(distAssetsDir)) {
    console.log('⊘ No dist/assets folder found\n');
    return;
  }
  
  // Загружаем кеш
  const cache = loadCache();
  
  // Сканируем изображения
  const images = scanImages(distAssetsDir);
  
  if (images.length === 0) {
    console.log('⊘ No images found\n');
    return;
  }
  
  console.log(`📊 Found ${images.length} images\n`);
  
  // Определяем какие файлы нужно оптимизировать
  const toOptimize = [];
  const alreadyOptimized = [];
  
  images.forEach(img => {
    const cacheKey = img.relativePath;
    const cached = cache[cacheKey];
    
    if (cached && cached.hash === img.hash && cached.optimized) {
      alreadyOptimized.push(img);
    } else {
      toOptimize.push(img);
    }
  });
  
  console.log(`✓ Already optimized: ${alreadyOptimized.length} files`);
  console.log(`⚡ Need optimization: ${toOptimize.length} files\n`);
  
  if (toOptimize.length === 0) {
    console.log('✅ All images are already optimized!\n');
    return;
  }
  
  // Пытаемся загрузить imagemin
  let imagemin, imageminMozjpeg, imageminPngquant, imageminGifsicle, imageminSvgo;
  
  try {
    imagemin = (await import('imagemin')).default;
    imageminMozjpeg = (await import('imagemin-mozjpeg')).default;
    imageminPngquant = (await import('imagemin-pngquant')).default;
    imageminGifsicle = (await import('imagemin-gifsicle')).default;
    imageminSvgo = (await import('imagemin-svgo')).default;
  } catch (error) {
    console.log('⚠️  Image optimization packages not installed');
    console.log('💡 Install: npm install --save-dev imagemin imagemin-mozjpeg imagemin-pngquant imagemin-gifsicle imagemin-svgo\n');
    return;
  }
  
  // Оптимизируем каждый файл
  let optimizedCount = 0;
  let totalSaved = 0;
  
  for (const img of toOptimize) {
    try {
      const plugins = [];
      
      // Выбираем плагины в зависимости от типа
      if (img.ext === '.jpg' || img.ext === '.jpeg') {
        plugins.push(imageminMozjpeg({ quality: 85 }));
      } else if (img.ext === '.png') {
        plugins.push(imageminPngquant({ quality: [0.7, 0.9] }));
      } else if (img.ext === '.gif') {
        plugins.push(imageminGifsicle({ optimizationLevel: 2 }));
      } else if (img.ext === '.svg') {
        plugins.push(imageminSvgo({
          plugins: [
            {
              name: 'preset-default',
              params: {
                overrides: {
                  removeViewBox: false,
                  cleanupIds: false
                }
              }
            }
          ]
        }));
      }
      
      if (plugins.length > 0) {
        const buffer = fs.readFileSync(img.path);
        const optimized = await imagemin.buffer(buffer, { plugins });
        
        if (optimized && optimized.length < buffer.length) {
          fs.writeFileSync(img.path, optimized);
          const saved = buffer.length - optimized.length;
          totalSaved += saved;
          optimizedCount++;
          
          // Обновляем кеш
          cache[img.relativePath] = {
            hash: getFileHash(img.path),
            optimized: true,
            originalSize: img.size,
            optimizedSize: optimized.length,
            savedBytes: saved,
            timestamp: new Date().toISOString()
          };
          
          console.log(`✓ ${img.relativePath} (saved ${(saved / 1024).toFixed(1)}KB)`);
        } else {
          // Файл уже оптимален
          cache[img.relativePath] = {
            hash: img.hash,
            optimized: true,
            originalSize: img.size,
            optimizedSize: img.size,
            savedBytes: 0,
            timestamp: new Date().toISOString()
          };
        }
      }
    } catch (error) {
      console.error(`❌ Error optimizing ${img.relativePath}:`, error.message);
    }
  }
  
  // Сохраняем кеш
  saveCache(cache);
  
  console.log(`\n✅ Optimized ${optimizedCount} new images`);
  if (totalSaved > 0) {
    console.log(`💾 Total saved: ${(totalSaved / 1024).toFixed(1)}KB\n`);
  } else {
    console.log(`💾 No size reduction (files already optimal)\n`);
  }
}

// Запуск
if (require.main === module) {
  optimizeImages().catch(error => {
    console.error('❌ Optimization failed:', error);
    process.exit(1);
  });
}

module.exports = { optimizeImages };
