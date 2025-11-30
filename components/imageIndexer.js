// imageIndexer.js - индексация и дедупликация изображений
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Класс для индексации изображений и предотвращения дублирования
 */
class ImageIndexer {
  constructor() {
    this.imageIndex = new Map(); // hash -> { path, usedBy: [] }
    this.pathIndex = new Map();  // originalPath -> { hash, finalPath }
    this.stats = {
      total: 0,
      unique: 0,
      duplicates: 0,
      savedSpace: 0
    };
  }

  /**
   * Вычисляет хеш файла
   */
  calculateFileHash(filePath) {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const hashSum = crypto.createHash('sha256');
      hashSum.update(fileBuffer);
      return hashSum.digest('hex');
    } catch (error) {
      console.warn(`Warning: Could not calculate hash for ${filePath}:`, error.message);
      return null;
    }
  }

  /**
   * Регистрирует изображение в индексе
   * @param {string} sourcePath - Исходный путь к изображению
   * @param {string} targetPath - Целевой путь в dist/assets/images/
   * @param {string} usedBy - Файл, который использует это изображение
   * @returns {Object} Информация о регистрации
   */
  registerImage(sourcePath, targetPath, usedBy) {
    this.stats.total++;

    // Проверяем, был ли уже зарегистрирован этот путь
    if (this.pathIndex.has(sourcePath)) {
      const existing = this.pathIndex.get(sourcePath);
      const imageInfo = this.imageIndex.get(existing.hash);
      
      if (imageInfo && !imageInfo.usedBy.includes(usedBy)) {
        imageInfo.usedBy.push(usedBy);
      }
      
      this.stats.duplicates++;
      return {
        isDuplicate: true,
        finalPath: existing.finalPath,
        hash: existing.hash
      };
    }

    // Вычисляем хеш файла
    const hash = this.calculateFileHash(sourcePath);
    if (!hash) {
      return {
        isDuplicate: false,
        finalPath: targetPath,
        hash: null,
        error: 'Could not calculate hash'
      };
    }

    // Проверяем, есть ли уже файл с таким хешем
    if (this.imageIndex.has(hash)) {
      const existing = this.imageIndex.get(hash);
      
      // Добавляем в список использующих файлов
      if (!existing.usedBy.includes(usedBy)) {
        existing.usedBy.push(usedBy);
      }
      
      // Регистрируем путь
      this.pathIndex.set(sourcePath, {
        hash,
        finalPath: existing.path
      });
      
      this.stats.duplicates++;
      
      // Вычисляем сэкономленное место
      try {
        const fileSize = fs.statSync(sourcePath).size;
        this.stats.savedSpace += fileSize;
      } catch (error) {
        // Игнорируем ошибки
      }
      
      return {
        isDuplicate: true,
        finalPath: existing.path,
        hash
      };
    }

    // Новое уникальное изображение
    this.imageIndex.set(hash, {
      path: targetPath,
      usedBy: [usedBy],
      sourcePath
    });

    this.pathIndex.set(sourcePath, {
      hash,
      finalPath: targetPath
    });

    this.stats.unique++;

    return {
      isDuplicate: false,
      finalPath: targetPath,
      hash
    };
  }

  /**
   * Получает финальный путь для изображения
   */
  getFinalPath(sourcePath) {
    const info = this.pathIndex.get(sourcePath);
    return info ? info.finalPath : null;
  }

  /**
   * Проверяет, зарегистрировано ли изображение
   */
  isRegistered(sourcePath) {
    return this.pathIndex.has(sourcePath);
  }

  /**
   * Получает статистику
   */
  getStats() {
    return {
      ...this.stats,
      savedSpaceMB: (this.stats.savedSpace / (1024 * 1024)).toFixed(2)
    };
  }

  /**
   * Экспортирует индекс в JSON
   */
  exportIndex(outputPath) {
    const indexData = {
      images: Array.from(this.imageIndex.entries()).map(([hash, info]) => ({
        hash,
        path: info.path,
        usedBy: info.usedBy,
        sourcePath: info.sourcePath
      })),
      paths: Array.from(this.pathIndex.entries()).map(([originalPath, info]) => ({
        originalPath,
        hash: info.hash,
        finalPath: info.finalPath
      })),
      stats: this.getStats()
    };

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(indexData, null, 2), 'utf-8');
    return indexData;
  }

  /**
   * Импортирует индекс из JSON
   */
  importIndex(inputPath) {
    if (!fs.existsSync(inputPath)) {
      return false;
    }

    try {
      const indexData = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

      // Восстанавливаем imageIndex
      this.imageIndex.clear();
      indexData.images.forEach(item => {
        this.imageIndex.set(item.hash, {
          path: item.path,
          usedBy: item.usedBy,
          sourcePath: item.sourcePath
        });
      });

      // Восстанавливаем pathIndex
      this.pathIndex.clear();
      indexData.paths.forEach(item => {
        this.pathIndex.set(item.originalPath, {
          hash: item.hash,
          finalPath: item.finalPath
        });
      });

      // Восстанавливаем статистику
      if (indexData.stats) {
        this.stats = { ...indexData.stats };
      }

      return true;
    } catch (error) {
      console.warn('Warning: Could not import image index:', error.message);
      return false;
    }
  }

  /**
   * Очищает индекс
   */
  clear() {
    this.imageIndex.clear();
    this.pathIndex.clear();
    this.stats = {
      total: 0,
      unique: 0,
      duplicates: 0,
      savedSpace: 0
    };
  }

  /**
   * Генерирует отчет о дубликатах
   */
  generateDuplicatesReport() {
    const duplicates = [];

    for (const [hash, info] of this.imageIndex.entries()) {
      if (info.usedBy.length > 1) {
        duplicates.push({
          hash,
          path: info.path,
          usedBy: info.usedBy,
          count: info.usedBy.length
        });
      }
    }

    return duplicates.sort((a, b) => b.count - a.count);
  }
}

// Глобальный экземпляр индексатора
const globalImageIndexer = new ImageIndexer();

module.exports = {
  ImageIndexer,
  globalImageIndexer
};
