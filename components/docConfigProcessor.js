// docConfigProcessor.js - Рекурсивная обработка doc-config.yaml файлов
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * Рекурсивно обрабатывает doc-config.yaml файлы и строит полную карту структуры
 * 
 * Новый формат:
 * hierarchy:
 *   - Home: home.md              # Файл
 *     description: "..."
 *   - CLN: "https://github.com/..." # Репозиторий
 *     section: true
 *   - Projects:                  # Секция с подразделами
 *     section: true
 *     sub:
 *       - Alpha: project-alpha/  # Папка
 */
class DocConfigProcessor {
  constructor(rootPath) {
    this.rootPath = rootPath;
    this.processedConfigs = new Map();
    this.allFiles = [];
    this.allFolders = [];
  }

  /**
   * Загружает doc-config.yaml из указанной папки
   */
  loadDocConfig(dirPath) {
    const configPath = path.join(dirPath, 'doc-config.yaml');
    
    if (!fs.existsSync(configPath)) {
      return null;
    }

    if (this.processedConfigs.has(configPath)) {
      return this.processedConfigs.get(configPath);
    }

    try {
      const configContent = fs.readFileSync(configPath, 'utf8');
      const config = yaml.load(configContent);
      
      config._path = configPath;
      config._dirPath = dirPath;
      config._relativePath = path.relative(this.rootPath, dirPath);
      
      this.processedConfigs.set(configPath, config);
      return config;
    } catch (error) {
      console.warn(`⚠️  Error loading doc-config at ${configPath}:`, error.message);
      return null;
    }
  }

  /**
   * Генерирует alias из названия
   */
  generateAlias(name) {
    // Простая транслитерация кириллицы
    const translitMap = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
      'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
      'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
      'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
      'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
    };
    
    return name
      .toLowerCase()
      .split('')
      .map(char => translitMap[char] || char)
      .join('')
      .replace(/[^\w\s-]/g, '') // Убираем эмодзи и спец символы
      .replace(/\s+/g, '-')     // Пробелы в дефисы
      .replace(/-+/g, '-')      // Множественные дефисы в один
      .trim();
  }

  /**
   * Парсит элемент hierarchy в новом формате
   */
  parseHierarchyItem(item, dirPath, relativePath) {
    // Новый формат: ключ-значение с дополнительными свойствами
    // Пример: - Home: { path: "home.md", description: "..." }
    // Или: - Home: "home.md"
    // Или: - Projects: { section: true, sub: [...] }
    
    const key = Object.keys(item)[0];
    if (!key) return null;
    
    const value = item[key];
    
    // Если значение - объект
    if (typeof value === 'object' && value !== null) {
      const pathValue = value.path;
      const itemDescription = value.description;
      const itemSection = value.section === true;
      const itemSub = value.sub;
      const itemAlias = value.alias;
      
      // Если есть sub - это секция с дочерними элементами
      if (itemSection && itemSub && Array.isArray(itemSub)) {
        const alias = itemAlias || this.generateAlias(key);
        const children = itemSub.map(subItem => 
          this.parseHierarchyItem(subItem, dirPath, relativePath)
        ).filter(Boolean);
        
        return {
          type: 'section',
          title: key,
          alias,
          section: true,
          description: itemDescription,
          children
        };
      }
      
      // Если есть path - определяем тип по path
      if (pathValue) {
        // Проверяем тип по path
        if (pathValue.startsWith('http://') || pathValue.startsWith('https://')) {
          // Репозиторий
          const alias = itemAlias || this.generateAlias(key);
          return {
            type: 'repository',
            title: key,
            alias,
            url: pathValue,
            section: itemSection,
            description: itemDescription
          };
        } else if (pathValue.endsWith('/')) {
          // Папка
          const folderName = pathValue.slice(0, -1);
          const folderPath = path.join(dirPath, folderName);
          const folderRelativePath = relativePath ? path.join(relativePath, folderName) : folderName;
          const alias = itemAlias || this.generateAlias(key);
          
          return {
            type: 'folder',
            title: key,
            alias,
            folder: folderName,
            path: folderPath,
            relativePath: folderRelativePath,
            section: itemSection,
            description: itemDescription
          };
        } else {
          // Файл
          const filePath = path.join(dirPath, pathValue);
          const fileRelativePath = relativePath ? path.join(relativePath, pathValue) : pathValue;
          const alias = itemAlias || this.generateAlias(key);
          
          return {
            type: 'file',
            title: key,
            alias,
            file: pathValue,
            path: filePath,
            relativePath: fileRelativePath,
            baseName: path.basename(pathValue, '.md'),
            isReadme: /^readme$/i.test(path.basename(pathValue, '.md')),
            description: itemDescription
          };
        }
      }
    }
    
    // Если значение - строка
    if (typeof value === 'string') {
      const alias = this.generateAlias(key);
      
      // Проверяем, является ли это URL репозитория
      if (value.startsWith('http://') || value.startsWith('https://')) {
        return {
          type: 'repository',
          title: key,
          alias,
          url: value,
          section: false,
          description: undefined
        };
      }
      
      // Проверяем, является ли это папкой (заканчивается на /)
      if (value.endsWith('/')) {
        const folderName = value.slice(0, -1);
        const folderPath = path.join(dirPath, folderName);
        const folderRelativePath = relativePath ? path.join(relativePath, folderName) : folderName;
        
        return {
          type: 'folder',
          title: key,
          alias,
          folder: folderName,
          path: folderPath,
          relativePath: folderRelativePath,
          section: false,
          description: undefined
        };
      }
      
      // Иначе это файл
      const filePath = path.join(dirPath, value);
      const fileRelativePath = relativePath ? path.join(relativePath, value) : value;
      
      return {
        type: 'file',
        title: key,
        alias,
        file: value,
        path: filePath,
        relativePath: fileRelativePath,
        baseName: path.basename(value, '.md'),
        isReadme: /^readme$/i.test(path.basename(value, '.md')),
        description: undefined
      };
    }
    
    // Неизвестный формат
    console.warn(`⚠️  Unknown hierarchy item format:`, item);
    return null;
  }

  /**
   * Сканирует папку и возвращает все .md файлы и подпапки
   */
  scanDirectory(dirPath, relativePath = '') {
    const result = {
      files: [],
      folders: []
    };

    if (!fs.existsSync(dirPath)) {
      return result;
    }

    try {
      const items = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);
        const itemRelativePath = relativePath ? path.join(relativePath, item.name) : item.name;

        if (item.isDirectory()) {
          if (item.name.startsWith('.') || item.name === 'node_modules') {
            continue;
          }

          result.folders.push({
            name: item.name,
            path: fullPath,
            relativePath: itemRelativePath
          });

          this.allFolders.push({
            name: item.name,
            path: fullPath,
            relativePath: itemRelativePath
          });
        } else if (item.name.endsWith('.md')) {
          const fileInfo = {
            name: item.name,
            path: fullPath,
            relativePath: itemRelativePath,
            baseName: path.basename(item.name, '.md'),
            isReadme: /^readme$/i.test(path.basename(item.name, '.md'))
          };

          result.files.push(fileInfo);
          this.allFiles.push(fileInfo);
        }
      }
    } catch (error) {
      console.warn(`⚠️  Error scanning directory ${dirPath}:`, error.message);
    }

    return result;
  }

  /**
   * Рекурсивно строит дерево структуры для папки
   */
  buildTreeForDirectory(dirPath, relativePath = '', parentConfig = null) {
    const docConfig = this.loadDocConfig(dirPath);

    if (docConfig && docConfig.hierarchy) {
      return this.buildTreeFromHierarchy(docConfig.hierarchy, dirPath, relativePath, docConfig);
    } else {
      return this.buildTreeFromFileSystem(dirPath, relativePath, parentConfig);
    }
  }

  /**
   * Строит дерево на основе hierarchy из doc-config.yaml
   */
  buildTreeFromHierarchy(hierarchy, dirPath, relativePath, config) {
    const tree = {
      type: 'hierarchy',
      config: config,
      children: []
    };

    for (const item of hierarchy) {
      const parsed = this.parseHierarchyItem(item, dirPath, relativePath);
      
      if (!parsed) continue;
      
      // Для папок рекурсивно обрабатываем содержимое
      if (parsed.type === 'folder' && fs.existsSync(parsed.path)) {
        const folderTree = this.buildTreeForDirectory(parsed.path, parsed.relativePath, config);
        parsed.children = folderTree.children;
        parsed.config = folderTree.config;
      }
      
      // Для секций рекурсивно обрабатываем children
      if (parsed.type === 'section' && parsed.children) {
        parsed.children = parsed.children.map(child => {
          if (child.type === 'folder' && fs.existsSync(child.path)) {
            const folderTree = this.buildTreeForDirectory(child.path, child.relativePath, config);
            child.children = folderTree.children;
            child.config = folderTree.config;
          }
          return child;
        }).filter(Boolean);
      }
      
      tree.children.push(parsed);
    }

    return tree;
  }

  /**
   * Строит дерево на основе файловой системы (когда нет doc-config)
   */
  buildTreeFromFileSystem(dirPath, relativePath, parentConfig) {
    const tree = {
      type: 'filesystem',
      config: parentConfig,
      children: []
    };

    const scanned = this.scanDirectory(dirPath, relativePath);

    for (const file of scanned.files) {
      tree.children.push({
        type: 'file',
        file: file.name,
        path: file.path,
        relativePath: file.relativePath,
        baseName: file.baseName,
        isReadme: file.isReadme,
        title: this.formatFileName(file.baseName),
        alias: this.generateAlias(file.baseName),
        inHierarchy: false
      });
    }

    for (const folder of scanned.folders) {
      const folderTree = this.buildTreeForDirectory(folder.path, folder.relativePath, parentConfig);

      tree.children.push({
        type: 'folder',
        folder: folder.name,
        path: folder.path,
        relativePath: folder.relativePath,
        title: this.formatFolderName(folder.name),
        alias: this.generateAlias(folder.name),
        children: folderTree.children,
        config: folderTree.config
      });
    }

    return tree;
  }

  /**
   * Форматирует имя файла для отображения
   */
  formatFileName(baseName) {
    if (/^(readme|index|home|root)$/i.test(baseName)) {
      return 'Overview';
    }

    return baseName
      .replace(/_/g, ' ')
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Форматирует имя папки для отображения
   */
  formatFolderName(folderName) {
    return folderName
      .replace(/_/g, ' ')
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Собирает все репозитории из дерева
   */
  collectRepositories(tree) {
    const repositories = [];

    const traverse = (node) => {
      if (node.type === 'repository') {
        repositories.push({
          url: node.url,
          alias: node.alias,
          title: node.title,
          section: node.section,
          description: node.description
        });
      }

      if (node.children) {
        for (const child of node.children) {
          traverse(child);
        }
      }
    };

    traverse(tree);
    return repositories;
  }

  /**
   * Собирает все файлы из дерева (для индексации)
   */
  collectFiles(tree) {
    const files = [];

    const traverse = (node) => {
      if (node.type === 'file') {
        files.push({
          name: node.file,
          path: node.path,
          relativePath: node.relativePath,
          baseName: node.baseName,
          isReadme: node.isReadme,
          title: node.title,
          alias: node.alias,
          inHierarchy: node.inHierarchy !== false
        });
      }

      if (node.children) {
        for (const child of node.children) {
          traverse(child);
        }
      }
    };

    traverse(tree);
    return files;
  }

  /**
   * Собирает статистику по дереву
   */
  getTreeStats(tree) {
    const stats = {
      totalFiles: 0,
      hierarchyFiles: 0,
      autoFiles: 0,
      folders: 0,
      configFolders: 0,
      autoFolders: 0,
      repositories: 0,
      sections: 0
    };

    const traverse = (node) => {
      if (node.type === 'file') {
        stats.totalFiles++;
        if (node.inHierarchy !== false) {
          stats.hierarchyFiles++;
        } else {
          stats.autoFiles++;
        }
      } else if (node.type === 'folder') {
        stats.folders++;
        if (node.config && node.config.hierarchy) {
          stats.configFolders++;
        } else {
          stats.autoFolders++;
        }
      } else if (node.type === 'repository') {
        stats.repositories++;
      } else if (node.type === 'section') {
        stats.sections++;
      }

      if (node.children) {
        for (const child of node.children) {
          traverse(child);
        }
      }
    };

    traverse(tree);
    return stats;
  }

  /**
   * Визуализирует дерево в консоль
   */
  visualizeTree(tree, indent = '', isLast = true) {
    const lines = [];
    
    const renderNode = (node, prefix, isLastNode) => {
      const connector = isLastNode ? '└─ ' : '├─ ';
      const childPrefix = prefix + (isLastNode ? '   ' : '│  ');
      
      if (node.type === 'file') {
        const icon = node.isReadme ? '📋' : '📄';
        const badge = node.inHierarchy !== false ? 'hierarchy' : 'auto-scanned';
        const color = node.inHierarchy !== false ? '\x1b[32m' : '\x1b[36m';
        const reset = '\x1b[0m';
        lines.push(`${prefix}${connector}${color}${icon} ${node.title} [${badge}]${reset}`);
        
      } else if (node.type === 'folder') {
        const hasConfig = node.config && node.config.hierarchy;
        const icon = hasConfig ? '📁' : '📂';
        const badge = hasConfig ? 'doc-config' : 'auto-scanned';
        const color = hasConfig ? '\x1b[33m' : '\x1b[36m';
        const reset = '\x1b[0m';
        lines.push(`${prefix}${connector}${color}${icon} ${node.title} [${badge}]${reset}`);
        
        if (node.children && node.children.length > 0) {
          node.children.forEach((child, index) => {
            const isLastChild = index === node.children.length - 1;
            renderNode(child, childPrefix, isLastChild);
          });
        }
        
      } else if (node.type === 'repository') {
        const color = '\x1b[35m';
        const reset = '\x1b[0m';
        lines.push(`${prefix}${connector}${color}📦 ${node.title} (${node.alias}) [REPOSITORY]${reset}`);
        
      } else if (node.type === 'section') {
        const color = '\x1b[34m';
        const reset = '\x1b[0m';
        lines.push(`${prefix}${connector}${color}📑 ${node.title} [SECTION]${reset}`);
        
        if (node.children && node.children.length > 0) {
          node.children.forEach((child, index) => {
            const isLastChild = index === node.children.length - 1;
            renderNode(child, childPrefix, isLastChild);
          });
        }
      }
    };
    
    if (tree.children && tree.children.length > 0) {
      tree.children.forEach((child, index) => {
        const isLastChild = index === tree.children.length - 1;
        renderNode(child, indent, isLastChild);
      });
    } else {
      lines.push('(empty tree)');
    }
    
    return lines.join('\n');
  }

  /**
   * Главный метод - обрабатывает всю структуру начиная с root
   */
  process() {
    console.log('📋 Processing doc-config structure...\n');

    const rootTree = this.buildTreeForDirectory(this.rootPath, '');
    const repositories = this.collectRepositories(rootTree);
    const treeFiles = this.collectFiles(rootTree);

    console.log(`   ✓ Processed ${this.processedConfigs.size} doc-config files`);
    console.log(`   ✓ Found ${treeFiles.length} files in hierarchy`);
    console.log(`   ✓ Found ${repositories.length} repositories`);
    console.log(`   ✓ Total scanned: ${this.allFiles.length} files, ${this.allFolders.length} folders\n`);

    return {
      tree: rootTree,
      repositories: repositories,
      files: treeFiles,
      allFiles: this.allFiles,
      allFolders: this.allFolders,
      configs: Array.from(this.processedConfigs.values())
    };
  }

  /**
   * Экспортирует результат в hierarchy-info.json формат
   */
  exportToHierarchyInfo(result, additionalData = {}) {
    const rootConfig = this.loadDocConfig(this.rootPath);
    const stats = this.getTreeStats(result.tree);

    return {
      root: rootConfig,
      tree: result.tree,
      sections: this.extractSections(result.tree),
      allFiles: result.allFiles.map(f => ({
        name: f.name,
        relativePath: f.relativePath,
        baseName: f.baseName,
        isReadme: f.isReadme
      })),
      allRepositories: result.repositories.map(r => ({
        alias: r.alias,
        url: r.url,
        title: r.title,
        ...additionalData.repositoryData?.[r.alias]
      })),
      configs: result.configs.map(c => ({
        path: c._relativePath,
        hasHierarchy: !!c.hierarchy
      })),
      stats: stats
    };
  }

  /**
   * Извлекает секции из дерева для обратной совместимости
   */
  extractSections(tree) {
    const sections = {};

    const traverse = (node) => {
      if (node.type === 'folder' && node.config && node.config.hierarchy) {
        const sectionName = path.basename(node.relativePath);
        sections[sectionName] = node.config;
      }

      if (node.children) {
        for (const child of node.children) {
          traverse(child);
        }
      }
    };

    traverse(tree);
    return sections;
  }
}

module.exports = {
  DocConfigProcessor
};
