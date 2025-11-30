// configManager.js - Централизованное управление конфигурацией
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * Менеджер конфигурации - загружает и объединяет конфигурации
 */
class ConfigManager {
  constructor() {
    this.globalConfig = null;
    this.sectionConfigs = new Map(); // sectionPath -> config
    this.configCache = new Map(); // filePath -> config
  }

  /**
   * Загружает глобальную конфигурацию
   */
  loadGlobalConfig(configPath = 'config.yaml') {
    if (this.globalConfig) {
      return this.globalConfig;
    }

    try {
      if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, 'utf-8');
        this.globalConfig = yaml.load(configContent);
        return this.globalConfig;
      }
    } catch (error) {
      console.warn(`⚠️  Error loading global config: ${error.message}`);
    }

    // Возвращаем конфигурацию по умолчанию
    this.globalConfig = this.getDefaultConfig();
    return this.globalConfig;
  }

  /**
   * Загружает конфигурацию секции
   */
  loadSectionConfig(sectionPath) {
    if (this.sectionConfigs.has(sectionPath)) {
      return this.sectionConfigs.get(sectionPath);
    }

    const configPath = path.join(sectionPath, 'doc-config.yaml');
    
    try {
      if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, 'utf-8');
        const config = yaml.load(configContent);
        this.sectionConfigs.set(sectionPath, config);
        return config;
      }
    } catch (error) {
      console.warn(`⚠️  Error loading section config from ${sectionPath}: ${error.message}`);
    }

    return null;
  }

  /**
   * Получает конфигурацию для конкретного файла
   * Объединяет глобальную конфигурацию с конфигурацией секции
   */
  getConfigForFile(filePath) {
    if (this.configCache.has(filePath)) {
      return this.configCache.get(filePath);
    }

    const globalConfig = this.loadGlobalConfig();
    
    // Ищем ближайшую секцию с doc-config.yaml
    let currentDir = path.dirname(filePath);
    let sectionConfig = null;

    while (currentDir !== path.dirname(currentDir)) {
      const configPath = path.join(currentDir, 'doc-config.yaml');
      if (fs.existsSync(configPath)) {
        sectionConfig = this.loadSectionConfig(currentDir);
        break;
      }
      currentDir = path.dirname(currentDir);
    }

    // Объединяем конфигурации
    const mergedConfig = this.mergeConfigs(globalConfig, sectionConfig);
    this.configCache.set(filePath, mergedConfig);
    
    return mergedConfig;
  }

  /**
   * Объединяет конфигурации (приоритет у sectionConfig)
   */
  mergeConfigs(globalConfig, sectionConfig) {
    if (!sectionConfig) {
      return { ...globalConfig };
    }

    const merged = { ...globalConfig };

    for (const key in sectionConfig) {
      if (sectionConfig[key] && typeof sectionConfig[key] === 'object' && !Array.isArray(sectionConfig[key])) {
        merged[key] = this.mergeConfigs(merged[key] || {}, sectionConfig[key]);
      } else {
        merged[key] = sectionConfig[key];
      }
    }

    return merged;
  }

  /**
   * Конфигурация по умолчанию
   */
  getDefaultConfig() {
    return {
      site: {
        name: 'Documentation',
        title: 'Documentation Builder',
        logoClickUrl: '/'
      },
      navigation: [],
      socials: {},
      icons: {
        site: {
          logo: './assets/logo.svg',
          favicon: {
            ico: './assets/favicon.ico',
            svg: './assets/favicon.svg',
            appleTouchIcon: './assets/apple-touch-icon.png',
            manifest: '/manifest.webmanifest'
          }
        }
      },
      external: {
        stylesheets: [
          { href: './assets/styles.css', type: 'local' }
        ],
        scripts: []
      },
      sections: {
        keywords: {
          overview: ['project overview', 'product overview'],
          features: ['features'],
          specifications: ['specifications', 'specs'],
          applications: ['applications', 'usage', 'use cases'],
          resources: ['resources'],
          examples: ['examples'],
          guide: ['guide']
        }
      },
      build: {
        allowedRepositories: [],
        input: {
          files: [],
          directories: [],
          githubRepositories: []
        }
      },
      linkProcessing: {
        preserveExternalLinks: true,
        convertMdToHtml: true,
        basePath: './'
      }
    };
  }

  /**
   * Сохраняет конфигурацию в файл
   */
  saveConfig(config, outputPath) {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const yamlContent = yaml.dump(config, {
      indent: 2,
      lineWidth: 120,
      noRefs: true
    });

    fs.writeFileSync(outputPath, yamlContent, 'utf-8');
  }

  /**
   * Валидирует конфигурацию
   */
  validateConfig(config) {
    const errors = [];

    // Проверяем обязательные поля
    if (!config.site || !config.site.name) {
      errors.push('Missing required field: site.name');
    }

    // Проверяем структуру navigation
    if (config.navigation && !Array.isArray(config.navigation)) {
      errors.push('navigation must be an array');
    }

    // Проверяем структуру external assets
    if (config.external) {
      if (config.external.stylesheets && !Array.isArray(config.external.stylesheets)) {
        errors.push('external.stylesheets must be an array');
      }
      if (config.external.scripts && !Array.isArray(config.external.scripts)) {
        errors.push('external.scripts must be an array');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Очищает кеш конфигураций
   */
  clearCache() {
    this.globalConfig = null;
    this.sectionConfigs.clear();
    this.configCache.clear();
  }
}

// Глобальный экземпляр менеджера конфигурации
const globalConfigManager = new ConfigManager();

module.exports = {
  ConfigManager,
  globalConfigManager
};
