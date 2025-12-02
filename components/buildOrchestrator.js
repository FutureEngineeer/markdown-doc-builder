// buildOrchestrator.js - Главный оркестратор процесса сборки
const fs = require('fs');
const path = require('path');
const { PathResolver } = require('./pathResolver');
const { LinkProcessor } = require('./linkProcessor');
const { globalLinkManager } = require('./linkManager');
const { ContentProcessor } = require('./contentProcessor');
const { HtmlGenerator } = require('./htmlGenerator');
const { globalConfigManager } = require('./configManager');

/**
 * Оркестратор сборки - координирует весь процесс генерации
 */
class BuildOrchestrator {
  constructor(options = {}) {
    this.projectRoot = options.projectRoot || process.cwd();
    this.distDir = options.distDir || 'dist';
    this.configPath = options.configPath || 'config.yaml';
    
    // Инициализируем компоненты
    this.pathResolver = new PathResolver(this.projectRoot, this.distDir);
    this.linkProcessor = new LinkProcessor(this.pathResolver, globalLinkManager);
    this.contentProcessor = new ContentProcessor();
    this.configManager = globalConfigManager;
    
    // Загружаем глобальную конфигурацию
    this.globalConfig = this.configManager.loadGlobalConfig(this.configPath);
    this.htmlGenerator = new HtmlGenerator(this.globalConfig);
    
    // Статистика сборки
    this.stats = {
      filesProcessed: 0,
      filesGenerated: 0,
      errors: [],
      warnings: [],
      startTime: null,
      endTime: null
    };
  }

  /**
   * Индексирует файл для обработки ссылок
   */
  indexFile(sourcePath, outputPath) {
    this.pathResolver.indexFile(sourcePath, outputPath);
  }

  /**
   * Регистрирует репозиторий
   */
  registerRepository(owner, repo, repoData) {
    this.linkProcessor.registerRepository(owner, repo, repoData);
  }

  /**
   * Обрабатывает один markdown файл
   */
  async processFile(sourcePath, outputPath, options = {}) {
    try {
      this.stats.filesProcessed++;
      
      // Читаем исходный файл
      let markdown = fs.readFileSync(sourcePath, 'utf-8');
      
      // Получаем конфигурацию для файла
      const fileConfig = this.configManager.getConfigForFile(sourcePath);
      
      // Вычисляем относительный путь к корню
      const relativeRoot = this.pathResolver.getRelativePathToRoot(outputPath);
      
      // Для GitHub репозиториев обрабатываем пути к изображениям
      const isGitHubRepo = sourcePath.includes(path.sep + 'temp' + path.sep);
      if (isGitHubRepo) {
        const { processGitHubMarkdownLinks } = require('./githubFetcher');
        // Извлекаем информацию о репозитории из пути
        const pathParts = sourcePath.split(path.sep);
        const tempIndex = pathParts.indexOf('temp');
        if (tempIndex >= 0 && tempIndex < pathParts.length - 1) {
          const repoName = pathParts[tempIndex + 1];
          // Ищем данные репозитория по всем ключам
          let repoData = null;
          for (const [key, data] of this.linkProcessor.repositoryIndex.entries()) {
            if (key.includes(repoName) || data.repo === repoName || `${data.owner}-${data.repo}` === repoName) {
              repoData = data;
              break;
            }
          }
          if (repoData) {
            // Вычисляем относительный путь файла в репозитории
            const fileRelativePath = pathParts.slice(tempIndex + 2).join('/');
            markdown = processGitHubMarkdownLinks(markdown, repoData, fileRelativePath, [], outputPath);
          }
        }
      }
      
      // Обрабатываем ссылки в markdown
      // Для GitHub репозиториев пропускаем обработку изображений (они уже обработаны)
      const processedMarkdown = this.linkProcessor.processMarkdownLinks(
        markdown,
        sourcePath,
        outputPath,
        { skipImageProcessing: isGitHubRepo }
      );
      
      // Обрабатываем контент
      const results = await this.contentProcessor.processMarkdown(processedMarkdown, {
        relativeRoot,
        sourceFile: sourcePath,
        outputFile: outputPath,
        skipImageProcessing: isGitHubRepo
      });
      
      // Рендерим карточки в секции
      let contentHtml = this.contentProcessor.renderCardsIntoSections(
        results.contentHtml,
        results
      );
      
      // Обрабатываем ссылки в HTML
      contentHtml = this.linkProcessor.processHtmlLinks(
        contentHtml,
        sourcePath,
        outputPath
      );
      
      // Определяем breadcrumb (используем outputPath вместо sourcePath)
      const fileName = path.basename(sourcePath, '.md');
      const breadcrumb = this.generateBreadcrumb(outputPath, results.pageData.title);
      
      // Генерируем полную HTML страницу
      const fullHtml = this.htmlGenerator.generateFullPage({
        title: results.pageData.title || fileName,
        pageData: results.pageData,
        contentHtml,
        outputFile: outputPath,
        relativeRoot,
        breadcrumb,
        currentPage: path.basename(outputPath)
      });
      
      // Создаем выходную директорию
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // Сохраняем файл
      fs.writeFileSync(outputPath, fullHtml, 'utf-8');
      
      this.stats.filesGenerated++;
      
      // Сбрасываем состояние процессора для следующего файла
      this.contentProcessor.reset();
      
      return {
        success: true,
        sourcePath,
        outputPath,
        pageData: results.pageData
      };
      
    } catch (error) {
      this.stats.errors.push({
        file: sourcePath,
        error: error.message,
        stack: error.stack
      });
      
      return {
        success: false,
        sourcePath,
        error: error.message
      };
    }
  }

  /**
   * Генерирует breadcrumb для файла на основе outputPath
   */
  generateBreadcrumb(outputPath, pageTitle) {
    const MAX_LENGTH = 35; // Максимальная длина breadcrumb
    
    // Используем outputPath (dist/...) вместо sourcePath
    const relativePath = path.relative(path.join(this.projectRoot, this.distDir), outputPath);
    const pathParts = relativePath.split(path.sep);
    
    // Убираем расширение файла
    const fileName = path.basename(outputPath, '.html');
    
    // Для корневых файлов в корне проекта
    if (pathParts.length === 1) {
      if (['index', 'root', 'home'].includes(fileName.toLowerCase())) {
        return 'HOME';
      }
      // Для обычных файлов в корне - сначала загружаем titles
      const hierarchyPath = path.join(this.projectRoot, '.temp', 'hierarchy-info.json');
      let fileTitle = fileName;
      
      if (fs.existsSync(hierarchyPath)) {
        try {
          const hierarchyInfo = JSON.parse(fs.readFileSync(hierarchyPath, 'utf8'));
          if (hierarchyInfo.root && hierarchyInfo.root.hierarchy) {
            const item = hierarchyInfo.root.hierarchy.find(h => {
              if (h.file) {
                const baseName = path.basename(h.file, '.md').toLowerCase();
                return baseName === fileName.toLowerCase() || h.alias?.toLowerCase() === fileName.toLowerCase();
              }
              return false;
            });
            if (item && item.title) {
              fileTitle = item.title;
            }
          }
        } catch (error) {
          // Игнорируем ошибки
        }
      }
      
      return fileTitle.toUpperCase();
    }
    
    // Получаем titles из hierarchy-info.json
    const hierarchyPath = path.join(this.projectRoot, '.temp', 'hierarchy-info.json');
    let folderTitles = {};
    let sectionFolders = new Set(); // Папки которые являются секциями
    
    // Загружаем titles из hierarchy-info.json
    if (fs.existsSync(hierarchyPath)) {
      try {
        const hierarchyInfo = JSON.parse(fs.readFileSync(hierarchyPath, 'utf8'));
        
        // Собираем titles из root.hierarchy
        if (hierarchyInfo.root && hierarchyInfo.root.hierarchy) {
          hierarchyInfo.root.hierarchy.forEach(item => {
            // Для файлов
            if (item.file && item.alias && item.title) {
              const baseName = path.basename(item.file, '.md').toLowerCase();
              folderTitles[baseName] = item.title;
              folderTitles[item.alias.toLowerCase()] = item.title;
            }
            // Для репозиториев
            if (item.repository && item.alias && item.title) {
              folderTitles[item.alias.toLowerCase()] = item.title;
              if (item.section) {
                sectionFolders.add(item.alias.toLowerCase());
              }
            }
            // Для секций с children
            if (item.section && item.children) {
              if (item.alias) {
                sectionFolders.add(item.alias.toLowerCase());
              }
              item.children.forEach(child => {
                if (child.folder && child.title) {
                  folderTitles[child.folder.toLowerCase()] = child.title;
                  folderTitles[child.alias?.toLowerCase()] = child.title;
                }
              });
            }
          });
        }
        
        // Собираем titles из sections
        if (hierarchyInfo.sections) {
          Object.keys(hierarchyInfo.sections).forEach(sectionName => {
            const section = hierarchyInfo.sections[sectionName];
            if (section.hierarchy) {
              section.hierarchy.forEach(item => {
                if (item.file && item.title) {
                  const baseName = path.basename(item.file, '.md').toLowerCase();
                  folderTitles[baseName] = item.title;
                  if (item.alias) folderTitles[item.alias.toLowerCase()] = item.title;
                }
                if (item.repository && item.alias && item.title) {
                  folderTitles[item.alias.toLowerCase()] = item.title;
                }
              });
            }
          });
        }
        
        // Собираем titles из allRepositories
        if (hierarchyInfo.allRepositories) {
          hierarchyInfo.allRepositories.forEach(repo => {
            if (repo.alias && repo.title) {
              folderTitles[repo.alias.toLowerCase()] = repo.title;
            }
          });
        }
      } catch (error) {
        // Игнорируем ошибки
      }
    }
    
    // Для файлов в подпапках
    const folders = pathParts.slice(0, -1);
    const isIndexFile = ['index', 'readme', 'root', 'home'].includes(fileName.toLowerCase());
    
    // Строим breadcrumb с приоритетом секций
    const breadcrumbParts = [];
    
    // Всегда добавляем корневую секцию (первую папку)
    if (folders.length > 0) {
      const rootFolder = folders[0].toLowerCase();
      const rootTitle = folderTitles[rootFolder] || folders[0];
      breadcrumbParts.push(rootTitle.toUpperCase());
    }
    
    // Добавляем промежуточные секции и папки
    for (let i = 1; i < folders.length; i++) {
      const folder = folders[i].toLowerCase();
      const folderTitle = folderTitles[folder] || folders[i];
      const isSection = sectionFolders.has(folder);
      
      // Проверяем, поместится ли эта часть
      const testBreadcrumb = breadcrumbParts.join(' / ') + ' / ' + folderTitle.toUpperCase();
      
      if (testBreadcrumb.length <= MAX_LENGTH) {
        breadcrumbParts.push(folderTitle.toUpperCase());
      } else {
        // Не помещается - останавливаемся
        break;
      }
    }
    
    // Добавляем имя файла если это не index и если помещается
    if (!isIndexFile) {
      const fileTitle = folderTitles[fileName.toLowerCase()] || fileName;
      const testBreadcrumb = breadcrumbParts.join(' / ') + ' / ' + fileTitle.toUpperCase();
      
      if (testBreadcrumb.length <= MAX_LENGTH) {
        breadcrumbParts.push(fileTitle.toUpperCase());
      }
      // Если не помещается - не добавляем имя файла
    }
    
    return breadcrumbParts.join(' / ');
  }

  /**
   * Обрабатывает несколько файлов
   */
  async processFiles(files) {
    const results = [];
    
    for (const { sourcePath, outputPath } of files) {
      const result = await this.processFile(sourcePath, outputPath);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Копирует ассеты с оптимизацией изображений
   */
  copyAssets(sourceDir = 'assets', targetDir = null) {
    const target = targetDir || path.join(this.projectRoot, this.distDir, 'assets');
    
    if (!fs.existsSync(sourceDir)) {
      this.stats.warnings.push(`Assets directory not found: ${sourceDir}`);
      return;
    }
    
    const { optimizeImage } = require('./imageOptimizer');
    const { globalImageIndexer } = require('./imageIndexer');
    let imagesOptimized = 0;
    let imagesCopied = 0;
    
    const copyRecursive = (src, dest, relativePath = '') => {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      
      const items = fs.readdirSync(src, { withFileTypes: true });
      
      for (const item of items) {
        const srcPath = path.join(src, item.name);
        const destPath = path.join(dest, item.name);
        const itemRelativePath = path.join(relativePath, item.name);
        
        if (item.isDirectory()) {
          copyRecursive(srcPath, destPath, itemRelativePath);
        } else {
          // Проверяем, является ли файл изображением
          const ext = path.extname(item.name).toLowerCase();
          const isImage = /\.(png|jpg|jpeg|gif|svg|webp|bmp|ico)$/i.test(ext);
          
          if (isImage) {
            // Копируем изображения в assets/images/root/ для индексации
            const imagesDir = path.join(this.projectRoot, this.distDir, 'assets', 'images', 'root');
            const imageDestPath = path.join(imagesDir, item.name);
            
            // Регистрируем в индексаторе
            const registration = globalImageIndexer.registerImage(
              srcPath,
              imageDestPath,
              'assets/' + itemRelativePath
            );
            
            // Создаем директорию если нужно
            if (!fs.existsSync(imagesDir)) {
              fs.mkdirSync(imagesDir, { recursive: true });
            }
            
            if (!registration.isDuplicate) {
              try {
                const result = optimizeImage(srcPath, imageDestPath, {
                  quality: 85,
                  maxWidth: 1920,
                  maxHeight: 1080,
                  stripMetadata: true
                });
                
                if (result.optimized) {
                  imagesOptimized++;
                } else {
                  imagesCopied++;
                }
              } catch (error) {
                this.stats.warnings.push(`Failed to optimize image ${srcPath}: ${error.message}`);
                fs.copyFileSync(srcPath, imageDestPath);
                imagesCopied++;
              }
            } else {
              // Если дубликат, все равно копируем в assets/images/root/ если файла там нет
              if (!fs.existsSync(imageDestPath)) {
                fs.copyFileSync(srcPath, imageDestPath);
                imagesCopied++;
              }
            }
            
            // Также копируем в обычное место для обратной совместимости
            if (!fs.existsSync(destPath)) {
              fs.copyFileSync(srcPath, destPath);
            }
          } else {
            fs.copyFileSync(srcPath, destPath);
          }
        }
      }
    };
    
    copyRecursive(sourceDir, target);
    
    if (imagesOptimized > 0 || imagesCopied > 0) {
      console.log(`   📸 Images: ${imagesOptimized} optimized, ${imagesCopied} copied`);
    }
  }

  /**
   * Экспортирует карту ссылок
   */
  exportLinkMap(outputPath = null) {
    const linkMapPath = outputPath || path.join(this.projectRoot, '.temp', 'link-map.json');
    return globalLinkManager.exportLinkMap(linkMapPath);
  }

  /**
   * Генерирует отчет о сборке
   */
  generateBuildReport() {
    const duration = this.stats.endTime - this.stats.startTime;
    const linkStats = globalLinkManager.getStats();
    
    const report = {
      summary: {
        filesProcessed: this.stats.filesProcessed,
        filesGenerated: this.stats.filesGenerated,
        errors: this.stats.errors.length,
        warnings: this.stats.warnings.length,
        duration: `${(duration / 1000).toFixed(2)}s`
      },
      links: linkStats,
      errors: this.stats.errors,
      warnings: this.stats.warnings,
      brokenLinks: globalLinkManager.generateBrokenLinksReport()
    };
    
    return report;
  }

  /**
   * Сохраняет отчет о сборке
   */
  saveBuildReport(outputPath = null) {
    const reportPath = outputPath || path.join(this.projectRoot, '.temp', 'build-report.json');
    const report = this.generateBuildReport();
    
    const dir = path.dirname(reportPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    return report;
  }

  /**
   * Обрабатывает изображения из markdown файлов
   */
  processMarkdownImages(sourceDir) {
    const { processImagesInDirectory } = require('./imageProcessor');
    const { globalImageIndexer } = require('./imageIndexer');
    
    console.log('📸 Processing images from markdown files...');
    const results = processImagesInDirectory(sourceDir, this.distDir);
    
    if (results.totalImages > 0) {
      console.log(`   Files processed: ${results.filesProcessed}`);
      console.log(`   Images found: ${results.totalImages}`);
      console.log(`   Optimized: ${results.optimized}`);
      console.log(`   Copied: ${results.copied}`);
      
      if (results.duplicates > 0) {
        console.log(`   ♻️  Duplicates skipped: ${results.duplicates}`);
      }
      
      if (results.failed > 0) {
        console.log(`   ⚠️  Failed: ${results.failed}`);
        results.errors.forEach(err => {
          this.stats.warnings.push(`Image processing error: ${err.image || err.file} - ${err.error}`);
        });
      }
      
      // Выводим статистику индексатора
      const indexStats = globalImageIndexer.getStats();
      if (indexStats.duplicates > 0) {
        console.log(`   💾 Space saved: ${indexStats.savedSpaceMB} MB`);
      }
    }
    
    return results;
  }

  /**
   * Экспортирует индекс изображений
   */
  exportImageIndex(outputPath = null) {
    const { globalImageIndexer } = require('./imageIndexer');
    const indexPath = outputPath || path.join(this.projectRoot, '.temp', 'image-index.json');
    return globalImageIndexer.exportIndex(indexPath);
  }

  /**
   * Начинает сборку
   */
  startBuild() {
    this.stats.startTime = Date.now();
    console.log('🚀 Starting build...\n');
  }

  /**
   * Завершает сборку
   */
  finishBuild() {
    this.stats.endTime = Date.now();
    const duration = ((this.stats.endTime - this.stats.startTime) / 1000).toFixed(2);
    
    console.log('\n✅ Build completed!');
    console.log(`   Files processed: ${this.stats.filesProcessed}`);
    console.log(`   Files generated: ${this.stats.filesGenerated}`);
    console.log(`   Duration: ${duration}s`);
    
    if (this.stats.errors.length > 0) {
      console.log(`   ❌ Errors: ${this.stats.errors.length}`);
    }
    
    if (this.stats.warnings.length > 0) {
      console.log(`   ⚠️  Warnings: ${this.stats.warnings.length}`);
    }
    
    // Экспортируем карту ссылок
    this.exportLinkMap();
    
    // Экспортируем индекс изображений
    this.exportImageIndex();
    
    // Копируем hierarchy-info.json в dist/
    this.copyHierarchyInfo();
    
    // Сохраняем отчет
    this.saveBuildReport();
  }

  /**
   * Копирует hierarchy-info.json в корень dist/
   */
  copyHierarchyInfo() {
    const sourcePath = path.join(this.projectRoot, '.temp', 'hierarchy-info.json');
    const targetPath = path.join(this.projectRoot, this.distDir, 'hierarchy-info.json');
    
    if (fs.existsSync(sourcePath)) {
      try {
        fs.copyFileSync(sourcePath, targetPath);
        console.log('   📋 Copied hierarchy-info.json to dist/');
      } catch (error) {
        this.stats.warnings.push(`Failed to copy hierarchy-info.json: ${error.message}`);
      }
    }
  }

  /**
   * Очищает все данные
   */
  clear() {
    this.pathResolver.clear();
    this.linkProcessor.clear();
    this.contentProcessor.reset();
    globalLinkManager.clear();
    this.configManager.clearCache();
    
    this.stats = {
      filesProcessed: 0,
      filesGenerated: 0,
      errors: [],
      warnings: [],
      startTime: null,
      endTime: null
    };
  }
}

module.exports = {
  BuildOrchestrator
};
