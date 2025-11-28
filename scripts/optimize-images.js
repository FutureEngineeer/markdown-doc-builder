// optimize-images.js - Оптимизация изображений
const fs = require('fs');
const path = require('path');

console.log('🖼️  Image Optimization Script\n');

/**
 * Анализ изображений и рекомендации
 */
function analyzeImages() {
  const assetsDir = path.join(process.cwd(), 'assets');
  const images = [];
  
  function scanDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    files.forEach(file => {
      const fullPath = path.join(dir, file.name);
      
      if (file.isDirectory()) {
        scanDirectory(fullPath);
      } else if (/\.(jpg|jpeg|png|gif|svg|webp|avif)$/i.test(file.name)) {
        const stats = fs.statSync(fullPath);
        const ext = path.extname(file.name).toLowerCase();
        
        images.push({
          name: file.name,
          path: fullPath,
          relativePath: path.relative(assetsDir, fullPath),
          size: stats.size,
          sizeKB: (stats.size / 1024).toFixed(2),
          sizeMB: (stats.size / 1024 / 1024).toFixed(2),
          ext: ext
        });
      }
    });
  }
  
  scanDirectory(assetsDir);
  
  return images.sort((a, b) => b.size - a.size);
}

/**
 * Генерация рекомендаций
 */
function generateRecommendations(images) {
  console.log('📊 Image Analysis:\n');
  
  const totalSize = images.reduce((sum, img) => sum + img.size, 0);
  console.log(`Total: ${(totalSize / 1024 / 1024).toFixed(2)}MB (${images.length} images)\n`);
  
  // Топ-10 самых больших
  console.log('🔝 Top 10 largest images:');
  images.slice(0, 10).forEach((img, index) => {
    const sizeStr = img.size > 1024 * 1024 
      ? `${img.sizeMB}MB` 
      : `${img.sizeKB}KB`;
    console.log(`   ${index + 1}. ${sizeStr.padEnd(10)} - ${img.relativePath}`);
  });
  
  console.log('\n');
  
  // Анализ по типам
  const byType = {};
  images.forEach(img => {
    if (!byType[img.ext]) {
      byType[img.ext] = { count: 0, size: 0 };
    }
    byType[img.ext].count++;
    byType[img.ext].size += img.size;
  });
  
  console.log('📁 By file type:');
  Object.entries(byType)
    .sort((a, b) => b[1].size - a[1].size)
    .forEach(([ext, data]) => {
      const sizeMB = (data.size / 1024 / 1024).toFixed(2);
      console.log(`   ${ext.padEnd(6)} - ${data.count} files, ${sizeMB}MB`);
    });
  
  console.log('\n');
  
  // Рекомендации
  console.log('💡 Recommendations:\n');
  
  const largeImages = images.filter(img => img.size > 100 * 1024);
  const gifs = images.filter(img => img.ext === '.gif');
  const pngs = images.filter(img => img.ext === '.png' && img.size > 50 * 1024);
  const jpgs = images.filter(img => ['.jpg', '.jpeg'].includes(img.ext));
  
  if (largeImages.length > 0) {
    console.log(`⚠️  ${largeImages.length} images > 100KB`);
    console.log('   Consider converting to WebP/AVIF format\n');
  }
  
  if (gifs.length > 0) {
    console.log(`🎬 ${gifs.length} GIF animations found`);
    console.log('   GIFs are very large. Consider:');
    console.log('   1. Convert to WebP animation (80% smaller)');
    console.log('   2. Convert to MP4 video (90% smaller)');
    console.log('   3. Use CSS animations instead\n');
    
    gifs.forEach(gif => {
      console.log(`   📄 ${gif.relativePath} (${gif.sizeKB}KB)`);
      console.log(`      → WebP: ~${(gif.size * 0.2 / 1024).toFixed(0)}KB (estimated)`);
      console.log(`      → MP4:  ~${(gif.size * 0.1 / 1024).toFixed(0)}KB (estimated)\n`);
    });
  }
  
  if (pngs.length > 0) {
    console.log(`🖼️  ${pngs.length} large PNG files`);
    console.log('   PNGs are good for logos/icons, but large for photos');
    console.log('   Consider converting photos to WebP/AVIF\n');
  }
  
  if (jpgs.length > 0) {
    console.log(`📷 ${jpgs.length} JPEG files`);
    console.log('   Consider converting to WebP (30% smaller, better quality)\n');
  }
  
  // Потенциальная экономия
  const potentialSavings = {
    gif: gifs.reduce((sum, img) => sum + img.size * 0.8, 0),
    png: pngs.reduce((sum, img) => sum + img.size * 0.3, 0),
    jpg: jpgs.reduce((sum, img) => sum + img.size * 0.3, 0)
  };
  
  const totalSavings = Object.values(potentialSavings).reduce((sum, val) => sum + val, 0);
  
  if (totalSavings > 0) {
    console.log('💰 Potential savings:');
    if (potentialSavings.gif > 0) {
      console.log(`   GIF → WebP: ${(potentialSavings.gif / 1024 / 1024).toFixed(2)}MB`);
    }
    if (potentialSavings.png > 0) {
      console.log(`   PNG → WebP: ${(potentialSavings.png / 1024 / 1024).toFixed(2)}MB`);
    }
    if (potentialSavings.jpg > 0) {
      console.log(`   JPG → WebP: ${(potentialSavings.jpg / 1024 / 1024).toFixed(2)}MB`);
    }
    console.log(`   Total: ${(totalSavings / 1024 / 1024).toFixed(2)}MB (-${((totalSavings / totalSize) * 100).toFixed(0)}%)\n`);
  }
}

/**
 * Генерация HTML с picture элементами
 */
function generatePictureElements(images) {
  console.log('📝 HTML Examples:\n');
  
  const largeImages = images.filter(img => img.size > 100 * 1024).slice(0, 3);
  
  if (largeImages.length > 0) {
    console.log('Replace <img> tags with <picture> for better performance:\n');
    
    largeImages.forEach(img => {
      const baseName = path.basename(img.name, path.extname(img.name));
      const relativePath = img.relativePath.replace(/\\/g, '/');
      const dir = path.dirname(relativePath);
      
      console.log(`<!-- ${img.name} (${img.sizeKB}KB) -->`);
      console.log('<picture>');
      console.log(`  <source srcset="${dir}/${baseName}.avif" type="image/avif">`);
      console.log(`  <source srcset="${dir}/${baseName}.webp" type="image/webp">`);
      console.log(`  <img src="${relativePath}" alt="${baseName}" loading="lazy" decoding="async">`);
      console.log('</picture>\n');
    });
  }
}

/**
 * Инструкции по установке инструментов
 */
function printInstallInstructions() {
  console.log('🔧 Installation Instructions:\n');
  
  console.log('1. Install imagemin and plugins:');
  console.log('   npm install --save-dev imagemin imagemin-webp imagemin-avif imagemin-gifsicle imagemin-mozjpeg imagemin-pngquant\n');
  
  console.log('2. Create conversion script (scripts/convert-images.js):\n');
  
  const scriptContent = `const imagemin = require('imagemin');
const imageminWebp = require('imagemin-webp');
const imageminAvif = require('imagemin-avif');
const imageminGifsicle = require('imagemin-gifsicle');
const imageminMozjpeg = require('imagemin-mozjpeg');
const imageminPngquant = require('imagemin-pngquant');

(async () => {
  // Convert to WebP
  await imagemin(['assets/**/*.{jpg,png,gif}'], {
    destination: 'dist/assets',
    plugins: [
      imageminWebp({ quality: 80 })
    ]
  });
  
  // Convert to AVIF (best compression)
  await imagemin(['assets/**/*.{jpg,png}'], {
    destination: 'dist/assets',
    plugins: [
      imageminAvif({ quality: 65 })
    ]
  });
  
  // Optimize GIFs
  await imagemin(['assets/**/*.gif'], {
    destination: 'dist/assets',
    plugins: [
      imageminGifsicle({ optimizationLevel: 3 })
    ]
  });
  
  // Optimize JPEGs
  await imagemin(['assets/**/*.{jpg,jpeg}'], {
    destination: 'dist/assets',
    plugins: [
      imageminMozjpeg({ quality: 80 })
    ]
  });
  
  // Optimize PNGs
  await imagemin(['assets/**/*.png'], {
    destination: 'dist/assets',
    plugins: [
      imageminPngquant({ quality: [0.6, 0.8] })
    ]
  });
  
  console.log('✅ Images optimized!');
})();`;
  
  console.log('```javascript');
  console.log(scriptContent);
  console.log('```\n');
  
  console.log('3. Add to package.json:');
  console.log('   "scripts": {');
  console.log('     "optimize:images": "node scripts/convert-images.js"');
  console.log('   }\n');
  
  console.log('4. Run optimization:');
  console.log('   npm run optimize:images\n');
}

/**
 * Генерация CSS для lazy loading
 */
function generateLazyLoadCSS() {
  console.log('🎨 CSS for lazy loading:\n');
  
  console.log('```css');
  console.log(`/* Blur placeholder while image loads */
img[loading="lazy"] {
  filter: blur(10px);
  transition: filter 0.3s;
}

img[loading="lazy"].loaded {
  filter: blur(0);
}

/* Low quality placeholder */
.img-wrapper {
  position: relative;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.img-wrapper::before {
  content: '';
  position: absolute;
  inset: 0;
  background: inherit;
  filter: blur(20px);
  opacity: 0.5;
}

.img-wrapper img {
  position: relative;
  z-index: 1;
}`);
  console.log('```\n');
}

/**
 * Main execution
 */
function main() {
  const images = analyzeImages();
  
  if (images.length === 0) {
    console.log('No images found in assets/\n');
    return;
  }
  
  generateRecommendations(images);
  generatePictureElements(images);
  printInstallInstructions();
  generateLazyLoadCSS();
  
  console.log('✅ Analysis complete!\n');
  console.log('📖 For more details, see PERFORMANCE_OPTIMIZATION.md\n');
}

main();
