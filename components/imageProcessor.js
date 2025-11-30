// imageProcessor.js - модуль для обработки изображений в markdown файлах
const fs = require('fs');
const path = require('path');
const { optimizeImage } = require('./imageOptimizer');
const { globalImageIndexer } = require('./imageIndexer');

/**
 * Извлекает все ссылки на изображения из markdown
 * @param {string} markdown - Содержимое markdown файла
 * @returns {Array} Массив объектов с информацией об изображениях
 */
function extractImageLinks(markdown) {
  const images = [];
  
  // Регулярное выражение для поиска изображений: ![alt](path)
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  
  while ((match = imageRegex.exec(markdown)) !== null) {
    const [fullMatch, altText, imagePath] = match;
    
    // Пропускаем абсолютные URL (http/https)
    if (!imagePath.startsWith('http://') && !imagePath.startsWith('https://')) {
      images.push({
        fullMatch,
        altText,
        imagePath,
        isRelative: imagePath.startsWith('./') || imagePath.startsWith('../') || !imagePath.startsWith('/')
      });
    }
  }
  
  return images;
}

/**
 * Копирует и оптимизирует изображения из markdown файла
 * @param {string} markdownPath - Путь к markdown файлу
 * @param {string} markdown - Содержимое markdown файла
 * @param {string} distDir - Директория dist
 * @param {string} sectionPath - Путь секции для создания структуры (например, 'project-name/docs')
 * @returns {Object} Результат обработки
 */
function processMarkdownImages(markdownPath, markdown, distDir = 'dist', sectionPath = '') {
  const images = extractImageLinks(markdown);
  const results = {
    total: images.length,
    copied: 0,
    optimized: 0,
    duplicates: 0,
    failed: 0,
    errors: []
  };
  
  if (images.length === 0) {
    return results;
  }
  
  const markdownDir = path.dirname(markdownPath);
  const assetsImagesDir = path.join(distDir, 'assets', 'images');
  
  // Создаем директорию для изображений если её нет
  if (!fs.existsSync(assetsImagesDir)) {
    fs.mkdirSync(assetsImagesDir, { recursive: true });
  }
  
  // Определяем базовую структуру для этого markdown файла
  // Если sectionPath не указан, используем относительный путь от корня проекта
  let baseStructurePath = sectionPath;
  if (!baseStructurePath) {
    const projectRoot = process.cwd();
    const relativeMarkdownPath = path.relative(projectRoot, markdownPath);
    baseStructurePath = path.dirname(relativeMarkdownPath);
  }
  
  for (const image of images) {
    try {
      let sourcePath;
      
      // Разрешаем путь к изображению
      if (image.isRelative) {
        sourcePath = path.resolve(markdownDir, image.imagePath);
      } else {
        // Абсолютный путь в репозитории
        const repoRoot = findRepositoryRoot(markdownPath);
        sourcePath = path.join(repoRoot, image.imagePath.replace(/^\//, ''));
      }
      
      // Проверяем, существует ли файл
      if (!fs.existsSync(sourcePath)) {
        results.failed++;
        results.errors.push({
          image: image.imagePath,
          error: 'File not found'
        });
        continue;
      }
      
      // Создаем полную структуру: assets/images/{sectionPath}/{relativePath}
      const imageFileName = path.basename(image.imagePath);
      const imageRelativeDir = path.dirname(image.imagePath);
      
      // Нормализуем путь (убираем ./ и ../)
      const normalizedRelativeDir = imageRelativeDir === '.' ? '' : imageRelativeDir.replace(/^\.\//, '').replace(/\.\.\//g, '');
      
      // Создаем полный путь с учетом структуры секции
      const fullStructurePath = path.join(baseStructurePath, normalizedRelativeDir);
      const targetPath = path.join(assetsImagesDir, fullStructurePath, imageFileName);
      
      // Регистрируем изображение в индексаторе
      const registration = globalImageIndexer.registerImage(
        sourcePath,
        targetPath,
        markdownPath
      );
      
      if (registration.isDuplicate) {
        // Изображение уже существует, используем существующий путь
        results.duplicates++;
        continue;
      }
      
      // Создаем директорию для целевого файла
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      // Оптимизируем и копируем изображение
      const result = optimizeImage(sourcePath, targetPath, {
        quality: 85,
        maxWidth: 1920,
        maxHeight: 1080,
        stripMetadata: true
      });
      
      if (result.optimized) {
        results.optimized++;
      } else {
        results.copied++;
      }
      
    } catch (error) {
      results.failed++;
      results.errors.push({
        image: image.imagePath,
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * Находит корень репозитория (директорию, содержащую .git или первую родительскую директорию)
 * @param {string} filePath - Путь к файлу
 * @returns {string} Путь к корню репозитория
 */
function findRepositoryRoot(filePath) {
  let currentDir = path.dirname(filePath);
  
  // Ищем .git директорию
  while (currentDir !== path.dirname(currentDir)) {
    if (fs.existsSync(path.join(currentDir, '.git'))) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  
  // Если .git не найден, возвращаем директорию файла
  return path.dirname(filePath);
}

/**
 * Обрабатывает изображения в директории с markdown файлами
 * @param {string} sourceDir - Исходная директория
 * @param {string} distDir - Директория dist
 * @returns {Object} Результат обработки
 */
function processImagesInDirectory(sourceDir, distDir = 'dist') {
  const results = {
    filesProcessed: 0,
    totalImages: 0,
    copied: 0,
    optimized: 0,
    duplicates: 0,
    failed: 0,
    errors: []
  };
  
  function processDirectory(dir) {
    if (!fs.existsSync(dir)) {
      return;
    }
    
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const itemPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
        // Пропускаем node_modules, .git и другие служебные директории
        if (!['node_modules', '.git', '.temp', 'dist'].includes(item.name)) {
          processDirectory(itemPath);
        }
      } else if (item.name.endsWith('.md')) {
        // Обрабатываем markdown файл
        try {
          const markdown = fs.readFileSync(itemPath, 'utf-8');
          
          // Определяем sectionPath для этого файла
          const projectRoot = process.cwd();
          const relativeToProject = path.relative(projectRoot, itemPath);
          const pathParts = relativeToProject.split(path.sep);
          
          let sectionPath = '';
          if (pathParts[0] === 'website') {
            sectionPath = pathParts.slice(0, 2).join('/'); // website/project-name
          } else {
            sectionPath = pathParts[0]; // Первая папка
          }
          
          const fileResults = processMarkdownImages(itemPath, markdown, distDir, sectionPath);
          
          results.filesProcessed++;
          results.totalImages += fileResults.total;
          results.copied += fileResults.copied;
          results.optimized += fileResults.optimized;
          results.duplicates += fileResults.duplicates || 0;
          results.failed += fileResults.failed;
          results.errors.push(...fileResults.errors);
          
        } catch (error) {
          results.errors.push({
            file: itemPath,
            error: error.message
          });
        }
      }
    }
  }
  
  processDirectory(sourceDir);
  return results;
}

/**
 * Обновляет ссылки на изображения в markdown
 * @param {string} markdown - Содержимое markdown
 * @param {string} markdownPath - Путь к markdown файлу
 * @param {string} outputHtmlPath - Путь к выходному HTML файлу
 * @returns {string} Обновленный markdown
 */
function updateImageLinksInMarkdown(markdown, markdownPath, outputHtmlPath) {
  const markdownDir = path.dirname(markdownPath);
  const outputDir = path.dirname(outputHtmlPath);
  const projectRoot = process.cwd();
  
  return markdown.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, altText, imagePath) => {
    // Пропускаем абсолютные URL
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return match;
    }
    
    try {
      let sourcePath;
      
      // Разрешаем путь к изображению
      if (imagePath.startsWith('./') || imagePath.startsWith('../') || !imagePath.startsWith('/')) {
        sourcePath = path.resolve(markdownDir, imagePath);
      } else {
        const repoRoot = findRepositoryRoot(markdownPath);
        sourcePath = path.join(repoRoot, imagePath.replace(/^\//, ''));
      }
      
      // Проверяем, существует ли файл
      if (!fs.existsSync(sourcePath)) {
        console.warn(`Warning: Image not found: ${imagePath} (resolved to ${sourcePath})`);
        return match;
      }
      
      // Получаем финальный путь из индексатора
      const finalPath = globalImageIndexer.getFinalPath(sourcePath);
      
      if (finalPath) {
        // Вычисляем относительный путь от HTML файла к изображению
        const relativePath = path.relative(outputDir, finalPath).replace(/\\/g, '/');
        return `![${altText}](${relativePath})`;
      }
      
      // Если изображение не найдено в индексе, создаем путь вручную
      // Определяем sectionPath для этого markdown файла
      const relativeToProject = path.relative(projectRoot, markdownPath);
      const pathParts = relativeToProject.split(path.sep);
      
      let sectionPath = '';
      if (pathParts[0] === 'website') {
        sectionPath = pathParts.slice(0, 2).join('/'); // website/project-name
      } else if (pathParts[0] === 'temp') {
        // Для GitHub репозиториев в temp - используем имя репозитория
        sectionPath = pathParts[1]; // temp/creapunk-CLN-ClosedLoopNemaDriver -> creapunk-CLN-ClosedLoopNemaDriver
      } else {
        sectionPath = pathParts[0]; // Первая папка
      }
      
      // Определяем относительный путь изображения
      const imageFileName = path.basename(imagePath);
      const imageRelativeDir = path.dirname(imagePath);
      const normalizedRelativeDir = imageRelativeDir === '.' ? '' : imageRelativeDir.replace(/^\.\//, '').replace(/\.\.\//g, '');
      
      // Создаем полный путь в dist/assets/images/
      const targetImagePath = path.join('assets', 'images', sectionPath, normalizedRelativeDir, imageFileName);
      const targetImageFullPath = path.join(projectRoot, 'dist', targetImagePath);
      
      // Вычисляем относительный путь от HTML файла к изображению
      const relativePathToImage = path.relative(outputDir, targetImageFullPath).replace(/\\/g, '/');
      
      return `![${altText}](${relativePathToImage})`;
      
    } catch (error) {
      console.warn(`Warning: Could not update image link ${imagePath}:`, error.message);
      return match;
    }
  });
}

/**
 * Получает путь к изображению в assets
 * @param {string} sourcePath - Исходный путь к изображению
 * @param {string} outputHtmlPath - Путь к выходному HTML файлу
 * @returns {string|null} Относительный путь к изображению или null
 */
function getImageAssetPath(sourcePath, outputHtmlPath) {
  const finalPath = globalImageIndexer.getFinalPath(sourcePath);
  
  if (!finalPath) {
    return null;
  }
  
  const outputDir = path.dirname(outputHtmlPath);
  return path.relative(outputDir, finalPath).replace(/\\/g, '/');
}

module.exports = {
  extractImageLinks,
  processMarkdownImages,
  processImagesInDirectory,
  findRepositoryRoot,
  updateImageLinksInMarkdown,
  getImageAssetPath
};
