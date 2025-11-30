// test-image-optimization.js - тестирование оптимизации изображений
const fs = require('fs');
const path = require('path');
const { optimizeImage, isImageMagickInstalled } = require('../components/imageOptimizer');
const { processMarkdownImages } = require('../components/imageProcessor');

console.log('🧪 Тестирование оптимизации изображений\n');

// Проверяем наличие ImageMagick
console.log('1️⃣ Проверка ImageMagick...');
const hasImageMagick = isImageMagickInstalled();
if (hasImageMagick) {
  console.log('   ✅ ImageMagick установлен');
} else {
  console.log('   ⚠️  ImageMagick не установлен (изображения будут скопированы без оптимизации)');
  console.log('   💡 Установите ImageMagick для полной оптимизации:');
  console.log('      Windows: https://imagemagick.org/script/download.php#windows');
  console.log('      macOS: brew install imagemagick');
  console.log('      Linux: sudo apt-get install imagemagick');
}

// Ищем тестовые изображения
console.log('\n2️⃣ Поиск изображений для тестирования...');
const testDirs = ['assets', 'website', 'docs'];
let foundImages = [];

for (const dir of testDirs) {
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir, { recursive: true });
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (/\.(png|jpg|jpeg|gif|svg|webp|bmp|ico)$/i.test(ext)) {
        foundImages.push(path.join(dir, file));
      }
    }
  }
}

if (foundImages.length === 0) {
  console.log('   ⚠️  Изображения не найдены');
  console.log('   💡 Добавьте изображения в папки assets/, website/ или docs/');
  process.exit(0);
}

console.log(`   ✅ Найдено изображений: ${foundImages.length}`);

// Тестируем оптимизацию первого изображения
console.log('\n3️⃣ Тестирование оптимизации...');
const testImage = foundImages[0];
console.log(`   Тестовое изображение: ${testImage}`);

const testOutputDir = path.join('.temp', 'test-optimization');
if (!fs.existsSync(testOutputDir)) {
  fs.mkdirSync(testOutputDir, { recursive: true });
}

const outputPath = path.join(testOutputDir, path.basename(testImage));

try {
  const result = optimizeImage(testImage, outputPath, {
    quality: 85,
    maxWidth: 1920,
    maxHeight: 1080,
    stripMetadata: true
  });
  
  if (result.optimized) {
    console.log('   ✅ Оптимизация успешна!');
    console.log(`      Исходный размер: ${(result.originalSize / 1024).toFixed(2)} KB`);
    console.log(`      Оптимизированный: ${(result.optimizedSize / 1024).toFixed(2)} KB`);
    console.log(`      Сэкономлено: ${(result.savedBytes / 1024).toFixed(2)} KB (${result.savedPercent}%)`);
  } else {
    console.log('   ℹ️  Изображение скопировано без оптимизации');
    if (result.reason) {
      console.log(`      Причина: ${result.reason}`);
    }
  }
} catch (error) {
  console.log('   ❌ Ошибка оптимизации:', error.message);
}

// Тестируем обработку markdown файлов
console.log('\n4️⃣ Тестирование обработки markdown файлов...');
const testMarkdownDirs = ['website', 'docs'];
let foundMarkdown = [];

for (const dir of testMarkdownDirs) {
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir, { recursive: true });
    for (const file of files) {
      if (file.endsWith('.md')) {
        foundMarkdown.push(path.join(dir, file));
      }
    }
  }
}

if (foundMarkdown.length === 0) {
  console.log('   ⚠️  Markdown файлы не найдены');
} else {
  console.log(`   ✅ Найдено markdown файлов: ${foundMarkdown.length}`);
  
  // Проверяем первый markdown файл на наличие изображений
  const testMd = foundMarkdown[0];
  const mdContent = fs.readFileSync(testMd, 'utf-8');
  const imageMatches = mdContent.match(/!\[([^\]]*)\]\(([^)]+)\)/g);
  
  if (imageMatches) {
    console.log(`   ✅ В ${path.basename(testMd)} найдено изображений: ${imageMatches.length}`);
    console.log('   Примеры:');
    imageMatches.slice(0, 3).forEach(match => {
      console.log(`      ${match}`);
    });
  } else {
    console.log(`   ℹ️  В ${path.basename(testMd)} изображения не найдены`);
  }
}

// Тестируем индексацию
console.log('\n5️⃣ Тестирование индексации и дедупликации...');
const { ImageIndexer } = require('../components/imageIndexer');
const testIndexer = new ImageIndexer();

if (foundImages.length >= 2) {
  // Регистрируем первое изображение дважды
  const testImg = foundImages[0];
  console.log(`   Тестовое изображение: ${path.basename(testImg)}`);
  
  const reg1 = testIndexer.registerImage(testImg, 'dist/assets/images/test1.png', 'file1.md');
  console.log(`   Первая регистрация: ${reg1.isDuplicate ? 'дубликат' : 'уникальное'}`);
  
  const reg2 = testIndexer.registerImage(testImg, 'dist/assets/images/test2.png', 'file2.md');
  console.log(`   Вторая регистрация: ${reg2.isDuplicate ? 'дубликат ✓' : 'уникальное'}`);
  
  const stats = testIndexer.getStats();
  console.log(`   Статистика:`);
  console.log(`      Всего: ${stats.total}`);
  console.log(`      Уникальных: ${stats.unique}`);
  console.log(`      Дубликатов: ${stats.duplicates}`);
  
  if (stats.duplicates > 0) {
    console.log(`   ✅ Дедупликация работает!`);
  }
} else {
  console.log('   ℹ️  Недостаточно изображений для тестирования дедупликации');
}

console.log('\n✅ Тестирование завершено!');
console.log('\n💡 Для полной сборки с оптимизацией изображений запустите:');
console.log('   npm run build');
