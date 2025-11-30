// imageOptimizer.js - модуль для оптимизации изображений
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Проверяет, установлен ли ImageMagick
 */
function isImageMagickInstalled() {
  try {
    execSync('magick -version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Оптимизирует изображение с помощью ImageMagick
 * @param {string} inputPath - Путь к исходному изображению
 * @param {string} outputPath - Путь для сохранения оптимизированного изображения
 * @param {Object} options - Опции оптимизации
 */
function optimizeWithImageMagick(inputPath, outputPath, options = {}) {
  const {
    quality = 85,
    maxWidth = 1920,
    maxHeight = 1080,
    stripMetadata = true
  } = options;

  try {
    const ext = path.extname(inputPath).toLowerCase();
    
    // Для SVG просто копируем без изменений
    if (ext === '.svg') {
      fs.copyFileSync(inputPath, outputPath);
      return { optimized: false, reason: 'SVG не требует оптимизации' };
    }

    // Для ICO файлов тоже просто копируем
    if (ext === '.ico') {
      fs.copyFileSync(inputPath, outputPath);
      return { optimized: false, reason: 'ICO не требует оптимизации' };
    }

    // Строим команду ImageMagick
    let command = `magick "${inputPath}"`;
    
    // Изменяем размер если изображение больше максимального
    command += ` -resize "${maxWidth}x${maxHeight}>"`;
    
    // Удаляем метаданные
    if (stripMetadata) {
      command += ' -strip';
    }
    
    // Устанавливаем качество
    command += ` -quality ${quality}`;
    
    // Для PNG используем дополнительную оптимизацию
    if (ext === '.png') {
      command += ' -define png:compression-level=9';
    }
    
    command += ` "${outputPath}"`;
    
    execSync(command, { stdio: 'ignore' });
    
    // Проверяем размеры файлов
    const originalSize = fs.statSync(inputPath).size;
    const optimizedSize = fs.statSync(outputPath).size;
    const savedBytes = originalSize - optimizedSize;
    const savedPercent = ((savedBytes / originalSize) * 100).toFixed(1);
    
    return {
      optimized: true,
      originalSize,
      optimizedSize,
      savedBytes,
      savedPercent: savedPercent > 0 ? savedPercent : 0
    };
    
  } catch (error) {
    // Если оптимизация не удалась, просто копируем файл
    fs.copyFileSync(inputPath, outputPath);
    return { optimized: false, error: error.message };
  }
}

/**
 * Простая оптимизация без внешних зависимостей
 * Просто копирует файл, но может применить базовые проверки
 */
function simpleOptimize(inputPath, outputPath) {
  try {
    const ext = path.extname(inputPath).toLowerCase();
    
    // Проверяем размер файла
    const stats = fs.statSync(inputPath);
    const fileSizeMB = stats.size / (1024 * 1024);
    
    // Если файл больше 5MB, выводим предупреждение
    if (fileSizeMB > 5) {
      console.warn(`   ⚠️  Большой файл: ${path.basename(inputPath)} (${fileSizeMB.toFixed(2)}MB)`);
    }
    
    // Просто копируем файл
    fs.copyFileSync(inputPath, outputPath);
    
    return {
      optimized: false,
      reason: 'ImageMagick не установлен',
      originalSize: stats.size
    };
    
  } catch (error) {
    throw new Error(`Ошибка копирования изображения: ${error.message}`);
  }
}

/**
 * Оптимизирует изображение (автоматически выбирает метод)
 * @param {string} inputPath - Путь к исходному изображению
 * @param {string} outputPath - Путь для сохранения оптимизированного изображения
 * @param {Object} options - Опции оптимизации
 */
function optimizeImage(inputPath, outputPath, options = {}) {
  // Создаем директорию если её нет
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Проверяем, установлен ли ImageMagick
  if (isImageMagickInstalled()) {
    return optimizeWithImageMagick(inputPath, outputPath, options);
  } else {
    return simpleOptimize(inputPath, outputPath);
  }
}

/**
 * Копирует и оптимизирует изображения из директории
 * @param {string} sourceDir - Исходная директория
 * @param {string} targetDir - Целевая директория
 * @param {Object} options - Опции оптимизации
 */
function optimizeImagesInDirectory(sourceDir, targetDir, options = {}) {
  const results = {
    total: 0,
    optimized: 0,
    copied: 0,
    totalSaved: 0,
    errors: []
  };

  function processDirectory(srcDir, destDir) {
    if (!fs.existsSync(srcDir)) {
      return;
    }

    const items = fs.readdirSync(srcDir, { withFileTypes: true });

    for (const item of items) {
      const srcPath = path.join(srcDir, item.name);
      const destPath = path.join(destDir, item.name);

      if (item.isDirectory()) {
        processDirectory(srcPath, destPath);
      } else {
        const ext = path.extname(item.name).toLowerCase();
        const isImage = /\.(png|jpg|jpeg|gif|svg|webp|bmp|ico)$/i.test(ext);

        if (isImage) {
          results.total++;
          
          try {
            const result = optimizeImage(srcPath, destPath, options);
            
            if (result.optimized) {
              results.optimized++;
              results.totalSaved += result.savedBytes || 0;
            } else {
              results.copied++;
            }
          } catch (error) {
            results.errors.push({
              file: srcPath,
              error: error.message
            });
          }
        }
      }
    }
  }

  processDirectory(sourceDir, targetDir);
  return results;
}

module.exports = {
  optimizeImage,
  optimizeImagesInDirectory,
  isImageMagickInstalled
};
