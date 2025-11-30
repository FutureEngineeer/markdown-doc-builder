// pathResolver.js - Модуль для разрешения путей и ссылок
const path = require('path');
const fs = require('fs');

/**
 * Класс для разрешения путей относительно корня проекта
 */
class PathResolver {
  constructor(projectRoot = process.cwd(), distDir = 'dist') {
    this.projectRoot = projectRoot;
    this.distDir = distDir;
    this.fileIndex = new Map(); // relativePath -> absolutePath
    this.outputIndex = new Map(); // sourcePath -> outputPath
  }

  /**
   * Индексирует файл для быстрого поиска
   */
  indexFile(sourcePath, outputPath) {
    const relativeSource = path.relative(this.projectRoot, sourcePath).replace(/\\/g, '/');
    const relativeOutput = path.relative(path.join(this.projectRoot, this.distDir), outputPath).replace(/\\/g, '/');
    
    this.fileIndex.set(relativeSource, sourcePath);
    this.outputIndex.set(relativeSource, relativeOutput);
  }

  /**
   * Вычисляет относительный путь к корню dist от файла
   */
  getRelativePathToRoot(outputFile) {
    if (!outputFile) return './';
    
    // Заменяем обратные слеши на прямые для кросс-платформенности
    let normalizedPath = outputFile.replace(/\\/g, '/');
    
    // Если путь абсолютный, делаем его относительным
    if (path.isAbsolute(outputFile)) {
      const distPath = path.join(this.projectRoot, this.distDir).replace(/\\/g, '/');
      if (normalizedPath.startsWith(distPath)) {
        normalizedPath = normalizedPath.substring(distPath.length + 1);
      }
    }
    
    const pathParts = normalizedPath.split('/');
    const distIndex = pathParts.findIndex(part => part === this.distDir);
    
    if (distIndex === -1) {
      const folderDepth = pathParts.length - 1;
      return folderDepth <= 0 ? './' : '../'.repeat(folderDepth);
    }
    
    const levelsAfterDist = pathParts.length - distIndex - 2;
    return levelsAfterDist <= 0 ? './' : '../'.repeat(levelsAfterDist);
  }

  /**
   * Разрешает относительную ссылку от текущего файла
   */
  resolveRelativeLink(currentFile, targetLink) {
    const currentDir = path.dirname(currentFile);
    const resolved = path.join(currentDir, targetLink);
    return path.normalize(resolved).replace(/\\/g, '/');
  }

  /**
   * Конвертирует .md путь в .html путь
   */
  convertMdToHtml(mdPath) {
    const fileName = path.basename(mdPath);
    const isReadme = /^readme\.md$/i.test(fileName);
    
    if (isReadme) {
      return mdPath.replace(/readme\.md$/i, 'index.html');
    }
    
    return mdPath.replace(/\.md$/i, '.html');
  }

  /**
   * Находит файл в индексе по частичному пути
   */
  findInIndex(targetPath) {
    const normalized = targetPath.replace(/\\/g, '/').replace(/^\.\//, '');
    
    // Точное совпадение
    if (this.fileIndex.has(normalized)) {
      return {
        sourcePath: this.fileIndex.get(normalized),
        outputPath: this.outputIndex.get(normalized)
      };
    }
    
    // Поиск по имени файла
    const fileName = path.basename(normalized);
    for (const [indexPath, sourcePath] of this.fileIndex.entries()) {
      if (indexPath.endsWith('/' + fileName) || indexPath === fileName) {
        // Проверяем совпадение всех частей пути
        const targetParts = normalized.split('/');
        const indexParts = indexPath.split('/');
        
        let match = true;
        for (let i = targetParts.length - 1, j = indexParts.length - 1; i >= 0 && j >= 0; i--, j--) {
          if (targetParts[i].toLowerCase() !== indexParts[j].toLowerCase()) {
            match = false;
            break;
          }
        }
        
        if (match) {
          return {
            sourcePath,
            outputPath: this.outputIndex.get(indexPath)
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Вычисляет относительный путь между двумя файлами в dist
   */
  getRelativePath(fromFile, toFile) {
    const fromDir = path.dirname(fromFile);
    const relativePath = path.relative(fromDir, toFile);
    return relativePath.replace(/\\/g, '/');
  }

  /**
   * Нормализует путь к ассету относительно корня dist
   */
  normalizeAssetPath(assetPath, currentFile) {
    const relativeRoot = this.getRelativePathToRoot(currentFile);
    
    // Если путь уже абсолютный URL, возвращаем как есть
    if (assetPath.startsWith('http://') || assetPath.startsWith('https://')) {
      return assetPath;
    }
    
    // Убираем начальные ./
    let normalized = assetPath.startsWith('./') ? assetPath.substring(2) : assetPath;
    
    // Если путь начинается с assets/, добавляем relativeRoot
    if (normalized.startsWith('assets/')) {
      return relativeRoot + normalized;
    }
    
    // Если путь относительный, разрешаем его
    if (normalized.startsWith('../')) {
      const currentDir = path.dirname(currentFile);
      const resolved = path.join(currentDir, normalized);
      return path.normalize(resolved).replace(/\\/g, '/');
    }
    
    return normalized;
  }

  /**
   * Очищает индексы
   */
  clear() {
    this.fileIndex.clear();
    this.outputIndex.clear();
  }
}

module.exports = {
  PathResolver
};
