// linkProcessor.js - Обработка всех типов ссылок в markdown и HTML
const path = require('path');
const { PathResolver } = require('./pathResolver');
const { globalLinkManager } = require('./linkManager');

/**
 * Процессор ссылок - обрабатывает все типы ссылок
 */
class LinkProcessor {
  constructor(pathResolver = null, linkManager = null) {
    this.pathResolver = pathResolver || new PathResolver();
    this.linkManager = linkManager || globalLinkManager;
    this.repositoryIndex = new Map(); // owner/repo -> repoData
  }

  /**
   * Регистрирует репозиторий для обработки ссылок
   */
  registerRepository(owner, repo, repoData) {
    const key = `${owner}/${repo}`;
    this.repositoryIndex.set(key, repoData);
  }

  /**
   * Обрабатывает все ссылки в markdown перед рендерингом
   */
  processMarkdownLinks(markdown, sourceFile, outputFile, options = {}) {
    let processed = markdown;

    // 1. Обрабатываем изображения (если не пропущено)
    if (!options.skipImageProcessing) {
      processed = this.processImageLinks(processed, sourceFile, outputFile);
    }

    // 2. Обрабатываем ссылки на .md файлы
    processed = this.processMdLinks(processed, sourceFile, outputFile);

    // 3. Обрабатываем внешние ссылки
    processed = this.processExternalLinks(processed, sourceFile);

    return processed;
  }

  /**
   * Обрабатывает изображения в markdown
   */
  processImageLinks(markdown, sourceFile, outputFile) {
    return markdown.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, altText, imagePath) => {
      // Регистрируем ссылку
      this.linkManager.registerLink(sourceFile, imagePath, 'asset');

      // Пропускаем абсолютные URL
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return match;
      }
      
      // Пропускаем пути, которые уже обработаны (начинаются с assets/images/)
      if (imagePath.startsWith('assets/images/')) {
        // Преобразуем в относительный путь от outputFile
        const projectRoot = require('path').join(process.cwd(), 'dist');
        const outputDir = require('path').dirname(outputFile);
        const imageFullPath = require('path').join(projectRoot, imagePath);
        const relativePath = require('path').relative(outputDir, imageFullPath).replace(/\\/g, '/');
        return `![${altText}](${relativePath})`;
      }

      // Обрабатываем GitHub ссылки на изображения
      const githubMatch = imagePath.match(/https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/blob\/[^\/]+\/(.+)/);
      if (githubMatch) {
        const [, owner, repo, repoImagePath] = githubMatch;
        const repoKey = `${owner}/${repo}`;
        const repoData = this.repositoryIndex.get(repoKey);

        if (repoData && repoData.files) {
          const imageFile = repoData.files.find(f => 
            f.type === 'image' && f.originalPath === repoImagePath
          );

          if (imageFile) {
            const relativeRoot = this.pathResolver.getRelativePathToRoot(outputFile);
            const imageSrc = `${relativeRoot}assets/images/${imageFile.originalPath}`;
            return `![${altText}](${imageSrc})`;
          }
        }
      }

      // Нормализуем путь к изображению
      const normalizedPath = this.pathResolver.normalizeAssetPath(imagePath, outputFile);
      return `![${altText}](${normalizedPath})`;
    });
  }

  /**
   * Обрабатывает ссылки на .md файлы
   */
  processMdLinks(markdown, sourceFile, outputFile) {
    return markdown.replace(/\]\(([^)]+\.md(?:#[^)]*)?)\)/g, (match, url) => {
      // Регистрируем ссылку
      this.linkManager.registerLink(sourceFile, url, 'internal');

      // Пропускаем абсолютные URL
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return match;
      }

      const [filePart, anchor] = url.split('#');

      // Ищем файл в индексе
      const found = this.pathResolver.findInIndex(filePart);

      if (found) {
        // Файл найден - конвертируем в .html
        const htmlPath = this.pathResolver.convertMdToHtml(found.outputPath);
        const relativePath = this.pathResolver.getRelativePath(outputFile, htmlPath);
        
        this.linkManager.resolveInternalLink(url, sourceFile, htmlPath);
        
        return `](${relativePath}${anchor ? '#' + anchor : ''})`;
      }

      // Файл не найден - конвертируем путь как есть
      const htmlPath = this.pathResolver.convertMdToHtml(filePart);
      this.linkManager.markBroken(url, 'File not found in index');
      
      return `](${htmlPath}${anchor ? '#' + anchor : ''})`;
    });
  }

  /**
   * Обрабатывает внешние ссылки
   */
  processExternalLinks(markdown, sourceFile) {
    return markdown.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, (match, text, url) => {
      // Регистрируем внешнюю ссылку
      this.linkManager.registerLink(sourceFile, url, 'external');
      return match;
    });
  }

  /**
   * Обрабатывает ссылки в HTML после рендеринга
   */
  processHtmlLinks(html, sourceFile, outputFile) {
    let processed = html;

    // Обрабатываем href ссылки
    processed = processed.replace(/href="([^"]+\.md(?:#[^"]*)?)"/g, (match, url) => {
      const [filePart, anchor] = url.split('#');
      const found = this.pathResolver.findInIndex(filePart);

      if (found) {
        const htmlPath = this.pathResolver.convertMdToHtml(found.outputPath);
        const relativePath = this.pathResolver.getRelativePath(outputFile, htmlPath);
        return `href="${relativePath}${anchor ? '#' + anchor : ''}"`;
      }

      const htmlPath = this.pathResolver.convertMdToHtml(filePart);
      return `href="${htmlPath}${anchor ? '#' + anchor : ''}"`;
    });

    // Обрабатываем onclick ссылки
    processed = processed.replace(/onclick="window\.location\.href='([^']+\.md(?:#[^']*)?)'"/g, (match, url) => {
      const [filePart, anchor] = url.split('#');
      const found = this.pathResolver.findInIndex(filePart);

      if (found) {
        const htmlPath = this.pathResolver.convertMdToHtml(found.outputPath);
        const relativePath = this.pathResolver.getRelativePath(outputFile, htmlPath);
        return `onclick="window.location.href='${relativePath}${anchor ? '#' + anchor : ''}'"`;
      }

      const htmlPath = this.pathResolver.convertMdToHtml(filePart);
      return `onclick="window.location.href='${htmlPath}${anchor ? '#' + anchor : ''}'"`;
    });

    return processed;
  }

  /**
   * Обрабатывает ссылки в GitHub репозитории
   */
  processGitHubRepoLinks(markdown, repoData, currentFilePath, allRepos = []) {
    const { owner, repo, branch } = repoData;
    let processed = markdown;

    // 1. Обрабатываем изображения из репозитория
    processed = processed.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, altText, imagePath) => {
      // GitHub ссылки на изображения
      const githubMatch = imagePath.match(/https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/blob\/[^\/]+\/(.+)/);
      if (githubMatch) {
        const [, urlOwner, urlRepo, imagePathFromMatch] = githubMatch;
        
        if (urlOwner === owner && urlRepo === repo) {
          const imageFile = repoData.files.find(f => 
            f.type === 'image' && f.originalPath === imagePathFromMatch
          );

          if (imageFile) {
            const currentDir = path.dirname(currentFilePath);
            const levelsUp = currentDir.split('/').filter(part => part !== '').length;
            const relativePath = '../'.repeat(levelsUp) + `assets/images/${imageFile.originalPath}`;
            return `![${altText}](${relativePath})`;
          }
        }
      }

      // Пропускаем абсолютные URL
      if (imagePath.startsWith('http')) {
        return match;
      }

      // Относительные пути к изображениям
      let processedPath = imagePath;
      
      if (imagePath.startsWith('./') || imagePath.startsWith('../') || !imagePath.startsWith('/')) {
        const currentDir = path.dirname(currentFilePath);
        const resolvedPath = path.posix.join(currentDir, imagePath);
        processedPath = path.posix.normalize(resolvedPath);
        
        if (processedPath.startsWith('/')) {
          processedPath = processedPath.substring(1);
        }
      } else if (imagePath.startsWith('/')) {
        processedPath = imagePath.substring(1);
      }

      // Ищем изображение в файлах репозитория
      const imageFile = repoData.files.find(f => 
        f.type === 'image' && 
        (f.originalPath === processedPath || path.basename(f.originalPath) === path.basename(processedPath))
      );

      if (imageFile) {
        const currentDir = path.dirname(currentFilePath);
        const levelsUp = currentDir.split('/').filter(part => part !== '').length;
        const relativePath = '../'.repeat(levelsUp) + `assets/images/${imageFile.originalPath}`;
        return `![${altText}](${relativePath})`;
      }

      return `![${altText}](${processedPath})`;
    });

    // 2. Обрабатываем ссылки на .md файлы
    processed = processed.replace(/\]\(([^)]+\.md(?:#[^)]*)?)\)/g, (match, url) => {
      if (url.startsWith('http')) {
        return match;
      }

      const [filePart, anchor] = url.split('#');
      let targetPath = filePart;

      // Разрешаем относительный путь
      if (filePart.startsWith('./') || filePart.startsWith('../') || !filePart.startsWith('/')) {
        const currentDir = path.dirname(currentFilePath);
        const resolvedPath = path.posix.join(currentDir, filePart);
        targetPath = path.posix.normalize(resolvedPath);
        
        if (targetPath.startsWith('/')) {
          targetPath = targetPath.substring(1);
        }
      } else if (filePart.startsWith('/')) {
        targetPath = filePart.substring(1);
      }

      // Проверяем, есть ли файл в текущем репозитории
      const fileExists = repoData.files && repoData.files.some(f => f.originalPath === targetPath);

      if (fileExists) {
        // Конвертируем в .html с нижним регистром
        let htmlPath = targetPath.replace(/\.md$/i, '.html').toLowerCase();
        
        const fileName = path.basename(htmlPath);
        if (/^readme\.html$/i.test(fileName)) {
          const dirPath = path.dirname(htmlPath);
          htmlPath = path.posix.join(dirPath, 'index.html');
        }

        // Вычисляем относительный путь
        const currentDir = path.dirname(currentFilePath);
        const relativePath = path.posix.relative(currentDir, htmlPath);

        return `](${relativePath}${anchor ? '#' + anchor : ''})`;
      }

      // Проверяем другие репозитории
      for (const otherRepo of allRepos) {
        const fileInOtherRepo = otherRepo.files.find(f => f.originalPath === targetPath);
        if (fileInOtherRepo) {
          const alias = otherRepo.alias || `${otherRepo.owner}-${otherRepo.repo}`;
          let htmlPath = targetPath.replace(/\.md$/i, '.html').toLowerCase();
          
          const fileName = path.basename(htmlPath);
          if (/^readme\.html$/i.test(fileName)) {
            const dirPath = path.dirname(htmlPath);
            htmlPath = path.posix.join(dirPath, 'index.html');
          }

          return `](../${alias}/${htmlPath}${anchor ? '#' + anchor : ''})`;
        }
      }

      // Файл не найден - конвертируем как есть с нижним регистром
      let htmlPath = targetPath.replace(/\.md$/i, '.html').toLowerCase();
      
      const fileName = path.basename(htmlPath);
      if (/^readme\.html$/i.test(fileName)) {
        const dirPath = path.dirname(htmlPath);
        htmlPath = path.posix.join(dirPath, 'index.html');
      }

      return `](${htmlPath}${anchor ? '#' + anchor : ''})`;
    });

    // 3. Обрабатываем ссылки на файлы (не .md и не .html)
    processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
      // Пропускаем уже обработанные и абсолютные URL
      if (url.startsWith('http') || url.endsWith('.html') || url.startsWith('#')) {
        return match;
      }

      // Для всех ссылок на файлы внутри репозитория создаем GitHub URL
      let targetPath = url;

      if (url.startsWith('./') || url.startsWith('../')) {
        const currentDir = path.dirname(currentFilePath);
        const resolvedPath = path.posix.join(currentDir, url);
        targetPath = path.posix.normalize(resolvedPath);
        
        if (targetPath.startsWith('/')) {
          targetPath = targetPath.substring(1);
        }
      } else if (url.startsWith('/')) {
        targetPath = url.substring(1);
      } else if (!url.includes('/') && !url.includes('.')) {
        // Простое имя папки
        const githubUrl = `https://github.com/${owner}/${repo}/tree/${branch}/${url}`;
        return `[${linkText}](${githubUrl})`;
      }

      // Проверяем, является ли это изображением
      const isImage = /\.(png|jpg|jpeg|gif|svg|webp|bmp|ico)$/i.test(targetPath);

      if (isImage) {
        const imageFile = repoData.files.find(f => 
          f.type === 'image' && 
          (f.originalPath === targetPath || path.basename(f.originalPath) === path.basename(targetPath))
        );

        if (imageFile) {
          const currentDir = path.dirname(currentFilePath);
          const levelsUp = currentDir.split('/').filter(part => part !== '').length;
          const relativePath = '../'.repeat(levelsUp) + `assets/images/${imageFile.originalPath}`;
          return `[${linkText}](${relativePath})`;
        }
      }

      // Создаем GitHub ссылку
      const githubUrl = `https://github.com/${owner}/${repo}/blob/${branch}/${targetPath}`;
      return `[${linkText}](${githubUrl})`;
    });

    return processed;
  }

  /**
   * Очищает все данные
   */
  clear() {
    this.repositoryIndex.clear();
  }
}

module.exports = {
  LinkProcessor
};
