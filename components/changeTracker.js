const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Класс для отслеживания изменений файлов
 */
class ChangeTracker {
  constructor(cacheFile = '.temp/file-hashes.json') {
    this.cacheFile = cacheFile;
    this.cache = this.loadCache();
  }

  /**
   * Загружает кеш хешей файлов
   */
  loadCache() {
    try {
      if (fs.existsSync(this.cacheFile)) {
        return JSON.parse(fs.readFileSync(this.cacheFile, 'utf8'));
      }
    } catch (error) {
      console.warn('Не удалось загрузить кеш файлов:', error.message);
    }
    return {};
  }

  /**
   * Сохраняет кеш хешей файлов
   */
  saveCache() {
    try {
      const dir = path.dirname(this.cacheFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.cacheFile, JSON.stringify(this.cache, null, 2));
    } catch (error) {
      console.warn('Не удалось сохранить кеш файлов:', error.message);
    }
  }

  /**
   * Вычисляет хеш файла
   */
  getFileHash(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }
      
      const content = fs.readFileSync(filePath);
      return crypto.createHash('md5').update(content).digest('hex');
    } catch (error) {
      console.warn(`Не удалось вычислить хеш для ${filePath}:`, error.message);
      return null;
    }
  }

  /**
   * Проверяет, изменился ли файл
   */
  hasFileChanged(filePath) {
    const currentHash = this.getFileHash(filePath);
    const cachedHash = this.cache[filePath];
    
    if (currentHash === null) {
      return false; // Файл не существует
    }
    
    if (cachedHash === undefined) {
      return true; // Файл новый
    }
    
    return currentHash !== cachedHash;
  }

  /**
   * Обновляет хеш файла в кеше
   */
  updateFileHash(filePath) {
    const hash = this.getFileHash(filePath);
    if (hash !== null) {
      this.cache[filePath] = hash;
    }
  }

  /**
   * Проверяет изменения в списке файлов
   */
  getChangedFiles(filePaths) {
    const changedFiles = [];
    
    for (const filePath of filePaths) {
      if (this.hasFileChanged(filePath)) {
        changedFiles.push(filePath);
      }
    }
    
    return changedFiles;
  }

  /**
   * Обновляет хеши для списка файлов
   */
  updateFiles(filePaths) {
    for (const filePath of filePaths) {
      this.updateFileHash(filePath);
    }
    this.saveCache();
  }

  /**
   * Очищает кеш
   */
  clearCache() {
    this.cache = {};
    this.saveCache();
  }

  /**
   * Получает статистику кеша
   */
  getCacheStats() {
    const files = Object.keys(this.cache);
    return {
      totalFiles: files.length,
      files: files
    };
  }
}

module.exports = { ChangeTracker };