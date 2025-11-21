const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { convertMarkdownToHTML } = require('./converter');
const { downloadGitHubRepoMarkdown, getCacheInfo, clearRepoCache } = require('./components/githubFetcher');
const { 
  createGitHubProjectPages, 
  createHtmlPagesForDirectory, 
  clearHtmlGenerationCache, 
  getHtmlCacheInfo 
} = require('./components/projectParser');
const { processAnalytics } = require('./components/analytics');

/**
 * Рекурсивно находит все .md файлы в директории
 */
function findMarkdownFiles(dir, baseDir = dir) {
  const files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory()) {
      // Рекурсивно обходим подпапки
      files.push(...findMarkdownFiles(fullPath, baseDir));
    } else if (item.name.endsWith('.md')) {
      // Вычисляем относительный путь от базовой директории
      const relativePath = path.relative(baseDir, fullPath);
      files.push({
        input: fullPath,
        relative: relativePath,
        output: path.join('dist', relativePath.replace('.md', '.html'))
      });
    }
  }
  
  return files;
}

/**
 * Создает необходимые директории
 */
function ensureDirectoryExists(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Рекурсивно копирует директорию
 */
function copyDirectoryRecursive(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
  
  const items = fs.readdirSync(source, { withFileTypes: true });
  
  for (const item of items) {
    const sourcePath = path.join(source, item.name);
    const targetPath = path.join(target, item.name);
    
    if (item.isDirectory()) {
      copyDirectoryRecursive(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

/**
 * Копирует папку assets и другие статические файлы в dist
 */
function copyAssets() {
  // Копируем папку assets целиком (включая подпапки)
  const sourceDir = 'assets';
  const targetDir = 'dist/assets';
  
  if (!fs.existsSync(sourceDir)) {
    console.log('⚠️  Assets folder not found, skipping...');
  } else {
    // Рекурсивно копируем всю папку assets
    copyDirectoryRecursive(sourceDir, targetDir);
    console.log(`📁 Copied: assets/ → dist/assets/ (including subdirectories)`);
    
    // Выводим информацию о скопированных файлах
    const items = fs.readdirSync(sourceDir, { withFileTypes: true });
    for (const item of items) {
      if (item.isDirectory()) {
        console.log(`📁   Subdirectory: ${item.name}/`);
      } else {
        console.log(`📄   File: ${item.name}`);
      }
    }
  }
  
  // Копируем manifest.webmanifest
  const manifestSource = 'manifest.webmanifest';
  const manifestTarget = 'dist/manifest.webmanifest';
  
  if (fs.existsSync(manifestSource)) {
    fs.copyFileSync(manifestSource, manifestTarget);
    console.log(`📁 Copied: manifest.webmanifest → dist/`);
  }
}

/**
 * Загружает конфигурацию из config.yaml
 */
function loadConfig() {
  try {
    const configPath = 'config.yaml';
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf8');
      const config = yaml.load(configContent);
      
      // Обрабатываем аналитику
      const analytics = processAnalytics(config);
      if (analytics.isEnabled) {
        console.log(`📊 Google Analytics включен: ${analytics.measurementId}`);
      }
      
      return config;
    }
  } catch (error) {
    console.warn('⚠️  Не удалось загрузить config.yaml:', error.message);
  }
  
  // Fallback на export-config.yaml для обратной совместимости
  try {
    const fallbackPath = 'export-config.yaml';
    if (fs.existsSync(fallbackPath)) {
      console.log('📄 Используем fallback конфигурацию из export-config.yaml');
      const configContent = fs.readFileSync(fallbackPath, 'utf8');
      return yaml.load(configContent);
    }
  } catch (error) {
    console.warn('⚠️  Не удалось загрузить fallback конфигурацию:', error.message);
  }
  
  return null;
}

/**
 * Обрабатывает GitHub репозитории из конфигурации
 */
async function processGitHubRepositories(config, tempDir = './temp') {
  // Поддерживаем как новый формат (config.yaml), так и старый (export-config.yaml)
  const repositories = config?.build?.input?.githubRepositories || 
                      config?.export?.input?.githubRepositories;
  
  if (!repositories) {
    return [];
  }

  console.log('🌐 Обрабатываем GitHub репозитории...\n');
  const allDownloadedRepos = [];
  
  // Показываем информацию о кеше в начале
  const cacheInfo = getCacheInfo();
  const htmlCacheInfo = getHtmlCacheInfo();
  
  if (cacheInfo.count > 0) {
    console.log(`📋 В кеше скачанных файлов: ${cacheInfo.count} репозиториев:`);
    cacheInfo.repositories.forEach(repo => console.log(`  - ${repo}`));
    console.log('');
  }
  
  if (htmlCacheInfo.count > 0) {
    console.log(`📋 В кеше HTML генерации: ${htmlCacheInfo.count} репозиториев:`);
    htmlCacheInfo.repositories.forEach(repo => console.log(`  - ${repo}`));
    console.log('');
  }
  
  // Сначала скачиваем все репозитории
  for (const repo of repositories) {
    try {
      console.log(`📥 Обрабатываем: ${repo.url}`);
      
      // Скачиваем файлы из репозитория (с кешированием)
      // Передаем псевдоним если он указан в конфигурации
      const projectData = await downloadGitHubRepoMarkdown(repo.url, tempDir, repo.alias);
      
      // Регистрируем псевдоним в глобальной карте
      if (repo.alias && projectData.owner && projectData.repo) {
        const { registerRepositoryAlias } = require('./components/config');
        registerRepositoryAlias(projectData.owner, projectData.repo, repo.alias);
      }
      
      if (projectData.files.length > 0) {
        allDownloadedRepos.push(projectData);
        const displayName = repo.alias ? `${repo.alias} (${repo.url})` : repo.url;
        console.log(`✅ Готов репозиторий: ${displayName}\n`);
      } else {
        console.log(`⚠️  Нет файлов для обработки в: ${repo.url}\n`);
      }
      
    } catch (error) {
      console.error(`❌ Ошибка обработки ${repo.url}:`, error.message);
    }
  }
  
  // Теперь создаем HTML страницы для всех репозиториев (с кешированием)
  console.log('📄 Создаем HTML страницы для репозиториев...\n');
  
  for (const projectData of allDownloadedRepos) {
    try {
      await createGitHubProjectPages(projectData, 'dist', convertMarkdownToHTML, allDownloadedRepos);
    } catch (error) {
      console.error(`❌ Ошибка создания HTML для ${projectData.owner}/${projectData.repo}:`, error.message);
    }
  }
  
  return allDownloadedRepos;
}

/**
 * Обрабатывает локальные директории из конфигурации
 */
async function processLocalDirectories(config) {
  // Поддерживаем как новый формат (config.yaml), так и старый (export-config.yaml)
  const directories = config?.build?.input?.directories || 
                     config?.export?.input?.directories;
  
  if (!directories) {
    return;
  }

  console.log('📁 Обрабатываем локальные директории...\n');
  
  for (const dir of directories) {
    try {
      if (fs.existsSync(dir)) {
        console.log(`📁 Обрабатываем директорию: ${dir}`);
        
        // Создаем HTML страницы для всех .md файлов в директории
        await createHtmlPagesForDirectory(dir, 'dist', convertMarkdownToHTML, true);
        console.log(`✅ Обработана директория: ${dir}\n`);
      } else {
        console.log(`⚠️  Директория не найдена: ${dir}\n`);
      }
      
    } catch (error) {
      console.error(`❌ Ошибка обработки директории ${dir}:`, error.message);
    }
  }
}

/**
 * Основная функция сборки
 */
async function buildAll(options = {}) {
  console.log('🚀 Building all HTML files...\n');
  
  // Опция для принудительной пересборки HTML
  if (options.forceRebuildHtml || options.forceRebuild || process.argv.includes('--force-rebuild')) {
    console.log('🔄 Принудительная очистка кеша HTML генерации...');
    clearHtmlGenerationCache();
    clearRepoCache();
    console.log('');
  }
  
  // Загружаем конфигурацию
  const config = loadConfig();
  
  // Очищаем и создаем директорию dist
  if (fs.existsSync('dist')) {
    // Удаляем старые HTML файлы, но сохраняем assets
    const distItems = fs.readdirSync('dist', { withFileTypes: true });
    for (const item of distItems) {
      if (item.name !== 'assets' && item.name !== '.gitkeep') {
        const fullPath = path.join('dist', item.name);
        if (item.isDirectory()) {
          fs.rmSync(fullPath, { recursive: true, force: true });
        } else if (item.name.endsWith('.html')) {
          fs.unlinkSync(fullPath);
        }
      }
    }
  } else {
    fs.mkdirSync('dist');
  }
  
  // Копируем assets
  console.log('📁 Copying assets...');
  copyAssets();
  console.log('');
  
  // Обрабатываем GitHub репозитории
  const allDownloadedRepos = await processGitHubRepositories(config);
  
  // Обрабатываем локальные директории
  await processLocalDirectories(config);
  
  // Находим все markdown файлы в test-files (основные файлы)
  const markdownFiles = findMarkdownFiles('test-files');
  
  // Фильтруем файлы - исключаем файлы проектов, которые будут созданы автоматически
  const filesToProcess = markdownFiles.filter(file => {
    // Исключаем файлы в папках проектов, кроме основных файлов проектов
    if (file.relative.includes('project-alpha') || file.relative.includes('project-beta')) {
      return false; // Эти файлы будут созданы автоматически при обработке root.md
    }
    return true;
  });
  
  // Обрабатываем root.md как главную страницу (index.html)
  const rootFileIndex = filesToProcess.findIndex(file => file.relative === 'root.md');
  if (rootFileIndex !== -1) {
    filesToProcess[rootFileIndex].output = 'dist/index.html';
  }
  
  console.log(`📄 Обрабатываем основные файлы: ${filesToProcess.length} файлов\n`);
  
  let successCount = 0;
  let errorCount = 0;
  
  // Конвертируем каждый файл
  for (const file of filesToProcess) {
    try {
      console.log(`📄 Converting: ${file.relative}`);
      
      // Создаем необходимые директории
      ensureDirectoryExists(file.output);
      
      // Конвертируем файл
      await convertMarkdownToHTML(file.input, file.output);
      
      console.log(`✅ Created: ${file.output}\n`);
      successCount++;
      
    } catch (error) {
      console.error(`❌ Error converting ${file.relative}:`, error.message);
      errorCount++;
    }
  }
  
  // Выводим итоги
  console.log('='.repeat(60));
  console.log('📊 Build Summary:');
  console.log(`✅ Successfully converted: ${successCount} files`);
  console.log(`📁 Project files auto-generated: ${markdownFiles.length - filesToProcess.length} files`);
  if (errorCount > 0) {
    console.log(`❌ Failed to convert: ${errorCount} files`);
  }
  
  // Показываем информацию о кеше
  const finalCacheInfo = getCacheInfo();
  const finalHtmlCacheInfo = getHtmlCacheInfo();
  
  if (finalCacheInfo.count > 0) {
    console.log(`📋 Кешировано файлов репозиториев: ${finalCacheInfo.count}`);
  }
  
  if (finalHtmlCacheInfo.count > 0) {
    console.log(`📋 Кешировано HTML генераций: ${finalHtmlCacheInfo.count}`);
  }
  
  console.log('='.repeat(60));
  
  if (errorCount === 0) {
    console.log('🎉 All files built successfully!');
    console.log('📁 Check the "dist" folder for generated HTML files.');
  } else {
    console.log('⚠️  Some files failed to convert. Check the errors above.');
  }
}

// Запускаем сборку, если скрипт вызван напрямую
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    forceRebuild: args.includes('--force-rebuild'),
    forceRebuildHtml: args.includes('--force-rebuild-html')
  };
  
  buildAll(options).catch(error => {
    console.error('❌ Build failed:', error);
    process.exit(1);
  });
}

module.exports = { 
  buildAll, 
  findMarkdownFiles, 
  clearRepoCache,
  clearHtmlCache: clearHtmlGenerationCache
};