// docConfigProcessor.js - Рекурсивная обработка doc-config.yaml файлов
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * Рекурсивно обрабатывает doc-config.yaml файлы и строит полную карту структуры
 * 
 * Логика:
 * - Если в папке есть doc-config.yaml, он переопределяет структуру этой папки
 * - Если doc-config.yaml нет, показываются все файлы и папки рекурсивно
 * - Вложенные doc-config.yaml обрабатываются рекурсивно
 */
class DocConfigProcessor {
  constructor(rootPath) {
    this.rootPath = rootPath;
    this.processedConfigs = new Map(); // Кеш обработанных конфигов
    this.allFiles = []; // Все найденные .md файлы
    this.allFolders = []; // Все найденные папки
  }

  /**
   * Загружает doc-config.yaml из указанной папки
   */
  loadDocConfig(dirPath) {
    const configPath = path.join(dirPath, 'doc-config.yaml');
    
    if (!fs.existsSync(configPath)) {
      return null;
    }

    // Проверяем кеш
    if (this.processedConfigs.has(configPath)) {
      return this.processedConfigs.get(configPath);
    }

    try {
      const configContent = fs.readFileSync(configPath, 'utf8');
      const config = yaml.load(configContent);
      
      // Добавляем метаданные
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
          // Пропускаем служебные папки
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
   * 
   * @param {string} dirPath - Путь к папке
   * @param {string} relativePath - Относительный путь от root
   * @param {object} parentConfig - Конфигурация родительской папки
   * @returns {object} Дерево структуры
   */
  buildTreeForDirectory(dirPath, relativePath = '', parentConfig = null) {
    // Проверяем наличие doc-config.yaml в текущей папке
    const docConfig = this.loadDocConfig(dirPath);

    if (docConfig && docConfig.hierarchy) {
      // Если есть doc-config с hierarchy, используем его для определения структуры
      return this.buildTreeFromHierarchy(docConfig.hierarchy, dirPath, relativePath, docConfig);
    } else {
      // Если нет doc-config, показываем все файлы и папки рекурсивно
      return this.buildTreeFromFileSystem(dirPath, relativePath, parentConfig);
    }
  }

  /**
   * Проверяет, игнорируется ли файл
   */
  isFileIgnored(fileName, config) {
    if (!config || !config.ignored) {
      return false;
    }
    
    const ignored = Array.isArray(config.ignored) ? config.ignored : [config.ignored];
    return ignored.some(pattern => {
      if (typeof pattern === 'string') {
        // Простое сравнение или wildcard
        if (pattern.includes('*')) {
          const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
          return regex.test(fileName);
        }
        return fileName === pattern || fileName === pattern + '.md';
      }
      return false;
    });
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
      if (item.file) {
        // Файл из hierarchy
        const filePath = path.join(dirPath, item.file);
        
        if (fs.existsSync(filePath)) {
          tree.children.push({
            type: 'file',
            file: item.file,
            title: item.title,
            alias: item.alias,
            description: item.description,
            path: filePath,
            relativePath: relativePath ? path.join(relativePath, item.file) : item.file,
            baseName: path.basename(item.file, '.md'),
            isReadme: /^readme$/i.test(path.basename(item.file, '.md')),
            inHierarchy: true
          });
        } else {
          console.warn(`⚠️  File not found in hierarchy: ${filePath}`);
        }
      } else if (item.repository) {
        // GitHub репозиторий
        tree.children.push({
          type: 'repository',
          repository: item.repository,
          alias: item.alias,
          title: item.title,
          section: item.section,
          description: item.description
        });
      } else if (item.folder) {
        // Вложенная папка
        const folderPath = path.join(dirPath, item.folder);
        const folderRelativePath = relativePath ? path.join(relativePath, item.folder) : item.folder;

        if (fs.existsSync(folderPath)) {
          // Рекурсивно обрабатываем вложенную папку
          const folderTree = this.buildTreeForDirectory(folderPath, folderRelativePath, config);

          tree.children.push({
            type: 'folder',
            folder: item.folder,
            title: item.title,
            alias: item.alias,
            section: item.section,
            description: item.description,
            path: folderPath,
            relativePath: folderRelativePath,
            children: folderTree.children,
            config: folderTree.config
          });
        } else {
          console.warn(`⚠️  Folder not found in hierarchy: ${folderPath}`);
        }
      } else if (item.section && item.children) {
        // Секция с дочерними элементами
        const sectionChildren = [];

        for (const child of item.children) {
          if (child.folder) {
            const childFolderPath = path.join(dirPath, child.folder);
            const childRelativePath = relativePath ? path.join(relativePath, child.folder) : child.folder;

            if (fs.existsSync(childFolderPath)) {
              const childTree = this.buildTreeForDirectory(childFolderPath, childRelativePath, config);

              sectionChildren.push({
                type: 'folder',
                folder: child.folder,
                title: child.title,
                alias: child.alias,
                description: child.description,
                path: childFolderPath,
                relativePath: childRelativePath,
                children: childTree.children,
                config: childTree.config
              });
            }
          } else if (child.repository) {
            sectionChildren.push({
              type: 'repository',
              repository: child.repository,
              alias: child.alias,
              title: child.title,
              description: child.description
            });
          }
        }

        tree.children.push({
          type: 'section',
          title: item.title,
          alias: item.alias,
          description: item.description,
          children: sectionChildren
        });
      }
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

    // Добавляем все файлы
    for (const file of scanned.files) {
      const isIgnored = this.isFileIgnored(file.name, parentConfig);
      
      tree.children.push({
        type: 'file',
        file: file.name,
        path: file.path,
        relativePath: file.relativePath,
        baseName: file.baseName,
        isReadme: file.isReadme,
        title: this.formatFileName(file.baseName),
        inHierarchy: false,
        ignored: isIgnored
      });
    }

    // Рекурсивно обрабатываем подпапки
    for (const folder of scanned.folders) {
      const folderTree = this.buildTreeForDirectory(folder.path, folder.relativePath, parentConfig);

      tree.children.push({
        type: 'folder',
        folder: folder.name,
        path: folder.path,
        relativePath: folder.relativePath,
        title: this.formatFolderName(folder.name),
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
          url: node.repository,
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
      if (node.type === 'file' && !node.ignored) {
        files.push({
          name: node.file,
          path: node.path,
          relativePath: node.relativePath,
          baseName: node.baseName,
          isReadme: node.isReadme,
          title: node.title,
          alias: node.alias,
          inHierarchy: node.inHierarchy
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
      ignoredFiles: 0,
      folders: 0,
      configFolders: 0,
      autoFolders: 0,
      repositories: 0,
      sections: 0
    };

    const traverse = (node) => {
      if (node.type === 'file') {
        stats.totalFiles++;
        if (node.ignored) {
          stats.ignoredFiles++;
        } else if (node.inHierarchy) {
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
  visualizeTree(tree, indent = '', isLast = true, showAll = false) {
    const lines = [];
    
    const renderNode = (node, prefix, isLastNode) => {
      const connector = isLastNode ? '└─ ' : '├─ ';
      const childPrefix = prefix + (isLastNode ? '   ' : '│  ');
      
      if (node.type === 'file') {
        let icon = '📄';
        let badges = [];
        let color = '';
        
        // Определяем иконку
        if (node.isReadme) {
          icon = '📋';
        }
        
        // Определяем статус и цвет
        if (node.ignored) {
          icon = '🚫';
          badges.push('IGNORED');
          color = '\x1b[90m'; // gray
        } else if (node.inHierarchy) {
          badges.push('hierarchy');
          color = '\x1b[32m'; // green
        } else {
          badges.push('auto-scanned');
          color = '\x1b[36m'; // cyan
        }
        
        const reset = '\x1b[0m';
        const title = node.title || node.file;
        const badgeStr = badges.length > 0 ? ` [${badges.join(', ')}]` : '';
        lines.push(`${prefix}${connector}${color}${icon} ${title}${badgeStr}${reset}`);
        
      } else if (node.type === 'folder') {
        const hasConfig = node.config && node.config.hierarchy;
        const icon = hasConfig ? '📁' : '📂';
        const badges = [];
        const color = hasConfig ? '\x1b[33m' : '\x1b[36m'; // yellow : cyan
        const reset = '\x1b[0m';
        
        if (hasConfig) {
          badges.push('doc-config');
        } else {
          badges.push('auto-scanned');
        }
        
        const badgeStr = badges.length > 0 ? ` [${badges.join(', ')}]` : '';
        lines.push(`${prefix}${connector}${color}${icon} ${node.title || node.folder}${badgeStr}${reset}`);
        
        if (node.children && node.children.length > 0) {
          node.children.forEach((child, index) => {
            const isLastChild = index === node.children.length - 1;
            renderNode(child, childPrefix, isLastChild);
          });
        }
        
      } else if (node.type === 'repository') {
        const color = '\x1b[35m'; // magenta
        const reset = '\x1b[0m';
        const title = node.title || node.alias;
        const alias = node.alias ? ` (${node.alias})` : '';
        lines.push(`${prefix}${connector}${color}📦 ${title}${alias} [REPOSITORY]${reset}`);
        
      } else if (node.type === 'section') {
        const color = '\x1b[34m'; // blue
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

    // Строим дерево начиная с root
    const rootTree = this.buildTreeForDirectory(this.rootPath, '');

    // Собираем все репозитории
    const repositories = this.collectRepositories(rootTree);

    // Собираем все файлы из дерева
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
        hasHierarchy: !!c.hierarchy,
        hasIgnored: !!c.ignored
      })),
      stats: stats
    };
  }

  /**
   * Извлекает секции из дерева для обратной совместимости
   */
  extractSections(tree) {
    const sections = {};

    const traverse = (node, currentPath = '') => {
      if (node.type === 'folder' && node.config && node.config.hierarchy) {
        const sectionName = path.basename(node.relativePath);
        sections[sectionName] = node.config;
      }

      if (node.children) {
        for (const child of node.children) {
          traverse(child, currentPath);
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
