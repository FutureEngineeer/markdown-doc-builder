// linkManager.js - Централизованное управление всеми ссылками
const fs = require('fs');
const path = require('path');

/**
 * Менеджер ссылок - отслеживает все ссылки в проекте
 */
class LinkManager {
  constructor() {
    this.links = new Map(); // url -> LinkInfo
    this.fileLinks = new Map(); // filePath -> Set<url>
    this.brokenLinks = new Set();
    this.externalLinks = new Set();
    this.internalLinks = new Set();
    this.assetLinks = new Map(); // assetPath -> Set<usedInFiles>
  }

  /**
   * Регистрирует ссылку из файла
   */
  registerLink(sourceFile, url, type = 'unknown') {
    const linkInfo = {
      url,
      type, // 'internal', 'external', 'asset', 'anchor'
      sourceFiles: new Set([sourceFile]),
      resolved: false,
      targetPath: null,
      isValid: null
    };

    if (this.links.has(url)) {
      const existing = this.links.get(url);
      existing.sourceFiles.add(sourceFile);
    } else {
      this.links.set(url, linkInfo);
    }

    // Добавляем в карту файлов
    if (!this.fileLinks.has(sourceFile)) {
      this.fileLinks.set(sourceFile, new Set());
    }
    this.fileLinks.get(sourceFile).add(url);

    // Классифицируем ссылку
    if (type === 'external' || url.startsWith('http://') || url.startsWith('https://')) {
      this.externalLinks.add(url);
    } else if (type === 'asset' || this.isAssetUrl(url)) {
      if (!this.assetLinks.has(url)) {
        this.assetLinks.set(url, new Set());
      }
      this.assetLinks.get(url).add(sourceFile);
    } else {
      this.internalLinks.add(url);
    }

    return linkInfo;
  }

  /**
   * Проверяет, является ли URL ссылкой на ассет
   */
  isAssetUrl(url) {
    const assetExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico', 
                            '.css', '.js', '.woff', '.woff2', '.ttf', '.eot'];
    return assetExtensions.some(ext => url.toLowerCase().endsWith(ext));
  }

  /**
   * Разрешает внутреннюю ссылку
   */
  resolveInternalLink(url, sourceFile, targetFile) {
    if (this.links.has(url)) {
      const linkInfo = this.links.get(url);
      linkInfo.resolved = true;
      linkInfo.targetPath = targetFile;
      linkInfo.isValid = true;
    }
  }

  /**
   * Помечает ссылку как битую
   */
  markBroken(url, reason = '') {
    this.brokenLinks.add({ url, reason });
    if (this.links.has(url)) {
      this.links.get(url).isValid = false;
    }
  }

  /**
   * Получает все ссылки из файла
   */
  getLinksFromFile(filePath) {
    return Array.from(this.fileLinks.get(filePath) || []);
  }

  /**
   * Получает статистику по ссылкам
   */
  getStats() {
    return {
      total: this.links.size,
      internal: this.internalLinks.size,
      external: this.externalLinks.size,
      assets: this.assetLinks.size,
      broken: this.brokenLinks.size,
      resolved: Array.from(this.links.values()).filter(l => l.resolved).length
    };
  }

  /**
   * Экспортирует карту ссылок в JSON
   */
  exportLinkMap(outputPath) {
    const linkMap = {
      metadata: {
        generatedAt: new Date().toISOString(),
        stats: this.getStats()
      },
      links: Array.from(this.links.entries()).map(([url, info]) => ({
        url,
        type: info.type,
        sourceFiles: Array.from(info.sourceFiles),
        resolved: info.resolved,
        targetPath: info.targetPath,
        isValid: info.isValid
      })),
      brokenLinks: Array.from(this.brokenLinks),
      assetUsage: Array.from(this.assetLinks.entries()).map(([asset, files]) => ({
        asset,
        usedIn: Array.from(files)
      }))
    };

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(linkMap, null, 2), 'utf-8');
    return linkMap;
  }

  /**
   * Генерирует отчет о битых ссылках
   */
  generateBrokenLinksReport() {
    if (this.brokenLinks.size === 0) {
      return '✓ No broken links found';
    }

    let report = `⚠️  Found ${this.brokenLinks.size} broken links:\n\n`;
    
    for (const { url, reason } of this.brokenLinks) {
      const linkInfo = this.links.get(url);
      report += `- ${url}\n`;
      if (reason) report += `  Reason: ${reason}\n`;
      if (linkInfo) {
        report += `  Used in: ${Array.from(linkInfo.sourceFiles).join(', ')}\n`;
      }
      report += '\n';
    }

    return report;
  }

  /**
   * Очищает все данные
   */
  clear() {
    this.links.clear();
    this.fileLinks.clear();
    this.brokenLinks.clear();
    this.externalLinks.clear();
    this.internalLinks.clear();
    this.assetLinks.clear();
  }
}

// Глобальный экземпляр менеджера ссылок
const globalLinkManager = new LinkManager();

module.exports = {
  LinkManager,
  globalLinkManager
};
