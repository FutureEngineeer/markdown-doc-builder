// hamburgerMenu.js - Генерация hamburger menu (полная структура сайта)
const fs = require('fs');
const path = require('path');

/**
 * Загружает конфигурацию из config.yaml
 */
function loadConfig() {
  try {
    const yaml = require('js-yaml');
    const configPath = path.join(process.cwd(), 'config.yaml');
    
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf8');
      return yaml.load(configContent);
    }
  } catch (error) {
    console.warn('⚠️  Не удалось загрузить config.yaml:', error.message);
  }
  
  return null;
}

/**
 * Вычисляет относительный путь к корню
 */
function getRelativePathToRoot(outputFile) {
  if (!outputFile) return './';
  
  const normalizedPath = path.normalize(outputFile).replace(/\\/g, '/');
  const pathParts = normalizedPath.split('/');
  
  const distIndex = pathParts.findIndex(part => part === 'dist');
  
  if (distIndex === -1) {
    const folderDepth = pathParts.length - 1;
    return folderDepth <= 0 ? './' : '../'.repeat(folderDepth);
  }
  
  const levelsAfterDist = pathParts.length - distIndex - 2;
  
  if (levelsAfterDist <= 0) {
    return './';
  }
  
  return '../'.repeat(levelsAfterDist);
}

/**
 * Форматирует название раздела
 */
function formatSectionTitle(dirName) {
  return dirName
    .replace(/_/g, ' ')
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Форматирует имя файла
 */
function formatFileName(fileName) {
  const name = fileName.replace('.md', '');
  
  if (name.toLowerCase() === 'readme' || name.toLowerCase() === 'index') {
    return 'Overview';
  }
  
  return name
    .replace(/_/g, ' ')
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Извлекает H1 заголовок из HTML файла
 */
function extractH1FromHtml(htmlPath) {
  try {
    if (!fs.existsSync(htmlPath)) {
      return null;
    }
    
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    const h1Match = htmlContent.match(/<h1[^>]*>(.*?)<\/h1>/i);
    
    if (h1Match && h1Match[1]) {
      return h1Match[1].replace(/<[^>]*>/g, '').trim();
    }
  } catch (error) {
    // Игнорируем ошибки
  }
  
  return null;
}

/**
 * Проверяет, содержит ли узел HTML файлы (рекурсивно)
 */
function hasHtmlFiles(node) {
  if (node.files && node.files.length > 0) {
    return true;
  }
  
  if (node.children) {
    return Object.values(node.children).some(child => hasHtmlFiles(child));
  }
  
  return false;
}

/**
 * Строит дерево из markdown файлов в temp папке (для репозиториев)
 */
function buildFileTreeFromSource(tempDir, relativePath, ignoredFiles = []) {
  const tree = { children: {}, files: [] };
  
  if (!fs.existsSync(tempDir)) {
    return tree;
  }
  
  const items = fs.readdirSync(tempDir, { withFileTypes: true });
  
  items.forEach(item => {
    const fullPath = path.join(tempDir, item.name);
    const itemRelativePath = relativePath ? path.join(relativePath, item.name) : item.name;
    
    if (item.isDirectory()) {
      const subTree = buildFileTreeFromSource(fullPath, itemRelativePath, ignoredFiles);
      
      if (hasHtmlFiles(subTree)) {
        tree.children[item.name] = {
          name: item.name,
          title: formatSectionTitle(item.name),
          path: itemRelativePath,
          children: subTree.children,
          files: subTree.files
        };
      }
    } else if (/\.md$/i.test(item.name)) {
      let htmlPath = itemRelativePath.replace(/\.md$/i, '.html').toLowerCase().replace(/\\/g, '/');
      
      // Корневой README репозитория уже конвертируется в index.html в projectParser.js
      // Здесь мы просто сохраняем оригинальное имя файла
      // Но нужно учесть, что корневой README.md становится index.html
      const fileName = path.basename(item.name, path.extname(item.name));
      const fileNameLower = fileName.toLowerCase();
      const pathParts = itemRelativePath.split('/');
      const isInRepoRoot = pathParts.length === 1 || pathParts.length === 2;
      const isRootReadme = ['readme', 'index', 'main', 'root'].includes(fileNameLower) && isInRepoRoot;
      
      if (isRootReadme) {
        // Корневой README становится index.html
        const parts = htmlPath.split('/');
        parts[parts.length - 1] = 'index.html';
        htmlPath = parts.join('/');
      }
      
      if (ignoredFiles.some(ignored => htmlPath.includes(ignored))) {
        return;
      }
      
      tree.files.push({
        name: formatFileName(fileName),
        path: htmlPath,
        htmlPath: htmlPath
      });
    }
  });
  
  return tree;
}

/**
 * Собирает все файлы из дерева рекурсивно
 */
function collectAllFiles(tree, parentPath = '') {
  let files = [];
  
  tree.files.forEach(file => {
    const filePath = file.path || file.htmlPath;
    const isFullPath = filePath.includes('/');
    
    files.push({
      ...file,
      path: (parentPath && !isFullPath) ? path.join(parentPath, filePath).replace(/\\/g, '/') : filePath
    });
  });
  
  Object.entries(tree.children).forEach(([name, child]) => {
    files = files.concat(collectAllFiles(child, ''));
  });
  
  return files;
}

/**
 * Перестраивает дерево из иерархии с уровнями
 */
function rebuildTreeFromHierarchy(files) {
  const tree = { children: {}, files: [] };
  const stack = [tree];
  let currentLevel = 0;
  
  files.forEach(file => {
    const level = file.level || 0;
    
    while (currentLevel > level) {
      stack.pop();
      currentLevel--;
    }
    
    const currentNode = stack[stack.length - 1];
    
    if (file.hasChildren) {
      const dirName = path.basename(file.path, '.html');
      const newNode = {
        name: dirName,
        title: file.title || formatSectionTitle(dirName),
        path: file.path,
        children: {},
        files: [file]
      };
      
      currentNode.children[dirName] = newNode;
      stack.push(newNode);
      currentLevel++;
    } else {
      currentNode.files.push(file);
    }
  });
  
  return tree;
}

/**
 * Проверяет, является ли папка "одиночной" (содержит только один файл и нет подпапок)
 */
function isSingleFileFolder(dirTree) {
  const hasNoChildren = Object.keys(dirTree.children).length === 0;
  const hasSingleFile = dirTree.files.length === 1;
  
  return hasNoChildren && hasSingleFile;
}

/**
 * Строит дерево из hierarchy
 */
function buildTreeFromHierarchy(hierarchy, baseDir, hierarchyInfo) {
  const tree = { children: {}, files: [], order: [] };
  const distDir = path.join(baseDir, 'dist');
  
  hierarchy.forEach((item, index) => {
    if (item.file) {
      // Это файл
      const fileName = path.basename(item.file, '.md');
      let htmlFile = item.file.replace('.md', '.html').toLowerCase();
      
      // Специальная обработка для home.md → index.html
      if (fileName.toLowerCase() === 'home') {
        htmlFile = 'index.html';
      }
      
      const htmlPath = path.join(distDir, htmlFile);
      
      if (fs.existsSync(htmlPath)) {
        tree.files.push({
          name: item.title || formatFileName(fileName),
          path: htmlFile,
          htmlPath: htmlFile,
          order: index,
          alias: item.alias
        });
      }
      
      // Обрабатываем children
      if (item.children && Array.isArray(item.children)) {
        // Создаем подраздел для children
        const childTree = buildTreeFromHierarchy(item.children, baseDir, hierarchyInfo);
        if (childTree.files.length > 0 || Object.keys(childTree.children).length > 0) {
          const childKey = item.alias || fileName;
          tree.children[childKey] = {
            name: childKey,
            title: item.title || formatFileName(fileName),
            path: htmlFile,
            children: childTree.children,
            files: childTree.files,
            order: index
          };
        }
      }
    } else if (item.folder) {
      // Это ссылка на папку
      const folderPath = path.join(distDir, item.folder);
      if (fs.existsSync(folderPath)) {
        // Проверяем, есть ли hierarchy для этой папки
        const folderHierarchy = hierarchyInfo?.sections?.[item.folder];
        const folderTree = buildFileTree(folderPath, distDir, item.folder, [], folderHierarchy);
        tree.children[item.folder] = {
          name: item.folder,
          title: item.title || formatSectionTitle(item.folder),
          path: item.folder,
          children: folderTree.children,
          files: folderTree.files,
          order: index,
          alias: item.alias
        };
      }
    } else if (item.repository) {
      // Это репозиторий GitHub
      const alias = item.alias || item.repository.split('/').pop();
      const repoDir = path.join(distDir, alias);
      
      if (fs.existsSync(repoDir)) {
        const repoTree = buildFileTree(repoDir, distDir, alias, []);
        tree.children[alias] = {
          name: alias,
          title: item.title || formatSectionTitle(alias),
          path: alias,
          children: repoTree.children,
          files: repoTree.files,
          order: index,
          alias: item.alias
        };
      }
    } else if (item.section && item.children) {
      // Это секция-контейнер
      const childTree = buildTreeFromHierarchy(item.children, baseDir, hierarchyInfo);
      if (childTree.files.length > 0 || Object.keys(childTree.children).length > 0) {
        const sectionKey = item.alias || item.title;
        tree.children[sectionKey] = {
          name: sectionKey,
          title: item.title,
          path: null,
          children: childTree.children,
          files: childTree.files,
          order: index,
          alias: item.alias,
          isSection: true
        };
      }
    }
  });
  
  return tree;
}

/**
 * Строит дерево из fileStructure (самая новая система)
 */
function buildTreeFromFileStructure(fileStructure, baseDir) {
  const tree = { children: {}, files: [] };
  
  if (!fileStructure.root || !Array.isArray(fileStructure.root)) {
    return tree;
  }
  
  function processStructureItem(item) {
    if (item.type === 'file') {
      const htmlPath = item.output || item.path || '';
      return {
        name: item.title || formatFileName(path.basename(htmlPath, '.html')),
        path: htmlPath,
        htmlPath: htmlPath,
        alias: item.alias,
        isFile: true
      };
    } else if (item.type === 'folder' || item.type === 'section') {
      // Если это репозиторий (section с isRepository: true), строим дерево из dist
      if (item.isRepository && item.type === 'section') {
        const repoDir = path.join(baseDir, 'dist', item.output);
        if (fs.existsSync(repoDir)) {
          const repoTree = buildFileTree(repoDir, path.join(baseDir, 'dist'), item.output, []);
          return {
            name: item.alias || path.basename(item.output || ''),
            title: item.title,
            path: item.output,
            children: repoTree.children,
            files: repoTree.files
          };
        }
      }
      
      const node = {
        name: item.alias || path.basename(item.output || ''),
        title: item.title,
        path: item.output,
        children: {},
        files: []
      };
      
      const items = item.type === 'folder' ? item.files : item.children;
      if (items && Array.isArray(items)) {
        items.forEach(child => {
          const processed = processStructureItem(child);
          if (processed) {
            if (processed.isFile) {
              // Это файл
              delete processed.isFile;
              node.files.push(processed);
            } else {
              // Это папка/секция
              node.children[processed.name] = processed;
            }
          }
        });
      }
      
      return node;
    } else if (item.type === 'repository') {
      // Репозиторий - строим дерево из dist
      const repoDir = path.join(baseDir, 'dist', item.output);
      if (fs.existsSync(repoDir)) {
        const repoTree = buildFileTree(repoDir, path.join(baseDir, 'dist'), item.output, []);
        return {
          name: item.alias || path.basename(item.output || ''),
          title: item.title,
          path: item.output,
          children: repoTree.children,
          files: repoTree.files
        };
      }
    }
    
    return null;
  }
  
  fileStructure.root.forEach(item => {
    const processed = processStructureItem(item);
    if (processed) {
      if (processed.path && !processed.children) {
        // Это файл
        tree.files.push(processed);
      } else if (processed.children) {
        // Это папка/секция
        tree.children[processed.name] = processed;
      }
    }
  });
  
  return tree;
}

/**
 * Строит дерево из hierarchy-info.json (новая система)
 */
function buildTreeFromHierarchyInfo(hierarchyInfo, baseDir) {
  const tree = { children: {}, files: [], order: [] };
  
  // Используем fileStructure если доступен (новая система)
  if (hierarchyInfo.fileStructure && hierarchyInfo.fileStructure.root) {
    return buildTreeFromFileStructure(hierarchyInfo.fileStructure, baseDir);
  }
  
  if (!hierarchyInfo.root || !hierarchyInfo.root.hierarchy) {
    return tree;
  }
  
  // Create a map of all files for quick lookup
  const allFilesMap = new Map();
  if (hierarchyInfo.allFiles) {
    hierarchyInfo.allFiles.forEach(file => {
      const normalizedPath = file.relativePath.replace(/\\/g, '/');
      allFilesMap.set(normalizedPath, file);
    });
  }
  
  function getFilesInFolder(folderPath) {
    const files = [];
    const normalizedFolder = folderPath.replace(/\\/g, '/');
    
    allFilesMap.forEach((file, filePath) => {
      if (filePath.startsWith(normalizedFolder + '/') || filePath.startsWith(normalizedFolder + '\\')) {
        // Get relative path within folder
        const relativePath = filePath.substring(normalizedFolder.length + 1);
        // Only include files directly in this folder (not in subfolders)
        if (!relativePath.includes('/') && !relativePath.includes('\\')) {
          const htmlFile = file.isReadme ? 'index.html' : file.baseName.toLowerCase() + '.html';
          files.push({
            name: formatFileName(file.baseName),
            path: path.join(folderPath, htmlFile).replace(/\\/g, '/'),
            htmlPath: path.join(folderPath, htmlFile).replace(/\\/g, '/'),
            baseName: file.baseName
          });
        }
      }
    });
    
    return files;
  }
  
  function processHierarchyItem(item, index) {
    if (item.file) {
      // Это файл
      const fileName = path.basename(item.file, '.md');
      const isHome = fileName.toLowerCase() === 'home';
      const htmlFile = isHome ? 'index.html' : item.file.replace('.md', '.html').toLowerCase();
      
      return {
        name: item.title || formatFileName(fileName),
        path: htmlFile,
        htmlPath: htmlFile,
        order: index,
        alias: item.alias
      };
    } else if (item.folder) {
      // Это папка - проверяем есть ли у неё свой doc-config
      const folderConfig = hierarchyInfo.sections?.[item.folder];
      
      if (folderConfig && folderConfig.hierarchy) {
        // У папки есть свой doc-config - используем его hierarchy
        const folderTree = {
          name: item.folder,
          title: item.title || formatSectionTitle(item.folder),
          path: item.folder,
          children: {},
          files: [],
          order: index,
          alias: item.alias
        };
        
        // Обрабатываем hierarchy папки
        folderConfig.hierarchy.forEach((folderItem, folderIndex) => {
          if (folderItem.file) {
            const fileName = path.basename(folderItem.file, '.md');
            const htmlFile = folderItem.file.replace('.md', '.html').toLowerCase();
            const filePath = path.join(item.folder, htmlFile).replace(/\\/g, '/');
            
            folderTree.files.push({
              name: folderItem.title || formatFileName(fileName),
              path: filePath,
              htmlPath: filePath,
              order: folderIndex,
              alias: folderItem.alias
            });
          } else if (folderItem.repository) {
            // Репозиторий внутри папки - строим полное дерево
            const repoAlias = folderItem.alias || folderItem.repository.split('/').pop();
            const repoPath = path.join(item.folder, repoAlias);
            const repoDir = path.join(baseDir, 'dist', repoPath);
            
            if (fs.existsSync(repoDir)) {
              // Строим полное дерево файлов репозитория
              const repoTree = buildFileTree(repoDir, path.join(baseDir, 'dist'), repoPath, []);
              
              folderTree.children[repoAlias] = {
                name: repoAlias,
                title: folderItem.title || formatSectionTitle(repoAlias),
                path: repoPath.replace(/\\/g, '/'),
                children: repoTree.children,
                files: repoTree.files,
                order: folderIndex,
                alias: folderItem.alias,
                isRepository: true
              };
            }
          }
        });
        
        return folderTree;
      } else {
        // У папки нет doc-config - показываем все файлы
        const folderFiles = getFilesInFolder(item.folder);
        
        return {
          name: item.folder,
          title: item.title || formatSectionTitle(item.folder),
          path: item.folder,
          children: {},
          files: folderFiles,
          order: index,
          alias: item.alias
        };
      }
    } else if (item.repository) {
      // Это репозиторий - строим полное дерево из dist
      const repoAlias = item.alias || item.repository.split('/').pop();
      const repoDir = path.join(baseDir, 'dist', repoAlias);
      
      if (!fs.existsSync(repoDir)) {
        return null;
      }
      
      // Строим полное дерево файлов репозитория
      const repoTree = buildFileTree(repoDir, path.join(baseDir, 'dist'), repoAlias, []);
      
      return {
        name: repoAlias,
        title: item.title || formatSectionTitle(repoAlias),
        path: repoAlias,
        children: repoTree.children,
        files: repoTree.files,
        order: index,
        alias: item.alias,
        isRepository: true
      };
    } else if (item.section && item.children) {
      // Это секция-контейнер
      const sectionTree = {
        name: item.alias || item.title,
        title: item.title,
        path: null,
        children: {},
        files: [],
        order: index,
        alias: item.alias,
        isSection: true
      };
      
      item.children.forEach((child, childIndex) => {
        const processed = processHierarchyItem(child, childIndex);
        if (processed) {
          if (child.file) {
            sectionTree.files.push(processed);
          } else {
            // Для репозиториев используем alias из child, для папок - folder
            const key = child.repository ? (child.alias || child.repository.split('/').pop()) : 
                        (child.folder || child.alias || child.title);
            sectionTree.children[key] = processed;
          }
        }
      });
      
      return sectionTree;
    }
    
    return null;
  }
  
  hierarchyInfo.root.hierarchy.forEach((item, index) => {
    const processed = processHierarchyItem(item, index);
    if (processed) {
      if (item.file) {
        tree.files.push(processed);
      } else {
        // Для репозиториев используем alias из item, для папок - folder
        const key = item.repository ? (item.alias || item.repository.split('/').pop()) : 
                    (item.folder || item.alias || item.title);
        tree.children[key] = processed;
      }
    }
  });
  
  return tree;
}

/**
 * Собирает полную структуру сайта на основе scope из конфигурации
 */
function collectFullSiteStructure(config, baseDir) {
  const tree = { children: {}, files: [], order: [] };
  
  // Загружаем hierarchy info если есть
  const hierarchyPath = path.join(baseDir, '.temp', 'hierarchy-info.json');
  let hierarchyInfo = null;
  if (fs.existsSync(hierarchyPath)) {
    try {
      hierarchyInfo = JSON.parse(fs.readFileSync(hierarchyPath, 'utf8'));
    } catch (error) {
      console.warn('⚠️  Не удалось загрузить hierarchy-info.json:', error.message);
    }
  }
  
  // Если есть hierarchy из root, используем его
  if (hierarchyInfo && hierarchyInfo.root && hierarchyInfo.root.hierarchy) {
    return buildTreeFromHierarchy(hierarchyInfo.root.hierarchy, baseDir, hierarchyInfo);
  }
  
  const scopeItems = config?.build?.scope || [];
  const ignoredFiles = config?.build?.ignoredScope || [];
  
  if (scopeItems.length === 0) {
    return tree;
  }
  
  const distDir = path.join(baseDir, 'dist');
  
  scopeItems.forEach((item, index) => {
    let itemType = item.type;
    let itemPath = item.url || item.path || item;
    
    if (typeof item === 'string') {
      itemPath = item;
      itemType = detectScopeItemType(itemPath);
      item = { path: itemPath, type: itemType };
    } else if (!itemType) {
      itemType = detectScopeItemType(itemPath);
    }
    
    if (itemType === 'file') {
      const relativePath = path.relative(baseDir, itemPath);
      const htmlPath = relativePath.replace('.md', '.html').toLowerCase();
      const fileName = path.basename(htmlPath, '.html');
      
      if (ignoredFiles.some(ignored => htmlPath.includes(ignored))) {
        return;
      }
      
      tree.files.push({
        name: item.title || formatFileName(fileName),
        path: htmlPath,
        htmlPath: htmlPath,
        order: index
      });
      
    } else if (itemType === 'directory') {
      const dirName = path.basename(itemPath);
      const relativePath = path.relative(baseDir, itemPath);
      const htmlDir = path.join(distDir, relativePath);
      
      if (fs.existsSync(htmlDir)) {
        const dirTree = buildFileTree(htmlDir, distDir, relativePath, ignoredFiles);
        
        if (isSingleFileFolder(dirTree)) {
          const file = dirTree.files[0];
          const fileName = path.basename(file.path, '.html').toLowerCase();
          
          let displayName;
          if (['readme', 'index', 'root', 'main'].includes(fileName)) {
            const htmlPath = path.join(htmlDir, path.basename(file.htmlPath));
            displayName = extractH1FromHtml(htmlPath) || item.title || formatSectionTitle(dirName);
          } else {
            displayName = item.title || `${formatSectionTitle(dirName)} - ${formatFileName(fileName)}`;
          }
          
          tree.files.push({
            name: displayName,
            path: file.path,
            htmlPath: file.htmlPath,
            order: index
          });
        } else if (hasHtmlFiles(dirTree)) {
          tree.children[dirName] = {
            name: dirName,
            title: item.title || formatSectionTitle(dirName),
            path: relativePath,
            children: dirTree.children,
            files: dirTree.files,
            order: index
          };
        }
      }
      
    } else if (itemType === 'repository') {
      const alias = item.alias || itemPath.split('/').pop();
      const repoDir = path.join(distDir, alias);
      const tempRepoDir = path.join(baseDir, 'temp', alias);
      
      let dirTree;
      if (fs.existsSync(tempRepoDir)) {
        dirTree = buildFileTreeFromSource(tempRepoDir, alias, ignoredFiles);
        
        if (dirTree.files) {
          dirTree.files.forEach(file => {
            const fileName = path.basename(file.htmlPath, '.html').toLowerCase();
            const filePath = file.htmlPath.replace(/\\/g, '/');
            // Заменяем все readme.html на index.html, не только корневой
            if (fileName === 'readme') {
              const dirPath = path.dirname(filePath);
              const newPath = path.posix.join(dirPath, 'index.html');
              file.path = newPath;
              file.htmlPath = newPath;
            }
          });
        }
      } else if (fs.existsSync(repoDir)) {
        dirTree = buildFileTree(repoDir, distDir, alias, ignoredFiles);
      } else {
        return;
      }
      
      // Doc config processing removed - now handled by doc-config.yaml hierarchy
      
      if (isSingleFileFolder(dirTree)) {
        const file = dirTree.files[0];
        const fileName = path.basename(file.path, '.html').toLowerCase();
        
        let displayName;
        if (['readme', 'index', 'root', 'main'].includes(fileName)) {
          const htmlPath = path.join(repoDir, path.basename(file.htmlPath));
          displayName = extractH1FromHtml(htmlPath) || item.title || formatSectionTitle(alias);
        } else {
          displayName = item.title || `${formatSectionTitle(alias)} - ${formatFileName(fileName)}`;
        }
        
        tree.files.push({
          name: displayName,
          path: file.path,
          htmlPath: file.htmlPath,
          order: index
        });
      } else if (hasHtmlFiles(dirTree)) {
        tree.children[alias] = {
          name: alias,
          title: item.title || formatSectionTitle(alias),
          path: alias,
          children: dirTree.children,
          files: dirTree.files,
          order: index
        };
      }
    }
  });
  
  return tree;
}

/**
 * Строит дерево из HTML файлов в dist папке
 */
function buildFileTree(dir, baseDir, relativePath = '', ignoredFiles = [], hierarchyConfig = null) {
  const tree = { children: {}, files: [] };
  
  if (!fs.existsSync(dir)) {
    return tree;
  }
  
  // Создаем Set из файлов в hierarchy для быстрой проверки
  let allowedFiles = null;
  if (hierarchyConfig && hierarchyConfig.hierarchy) {
    allowedFiles = new Set();
    const extractFiles = (items) => {
      items.forEach(item => {
        if (item.file) {
          // Конвертируем .md в .html и берем только имя файла (без пути) в нижнем регистре
          const htmlFile = path.basename(item.file.replace('.md', '.html').toLowerCase());
          allowedFiles.add(htmlFile);
        }
        if (item.children) {
          extractFiles(item.children);
        }
      });
    };
    extractFiles(hierarchyConfig.hierarchy);
  }
  
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  items.forEach(item => {
    const fullPath = path.join(dir, item.name);
    const itemRelativePath = relativePath ? path.join(relativePath, item.name) : item.name;
    
    if (item.isDirectory()) {
      const subTree = buildFileTree(fullPath, baseDir, itemRelativePath, ignoredFiles, hierarchyConfig);
      
      if (hasHtmlFiles(subTree)) {
        tree.children[item.name] = {
          name: item.name,
          title: formatSectionTitle(item.name),
          path: itemRelativePath,
          children: subTree.children,
          files: subTree.files
        };
      }
    } else if (item.name.endsWith('.html')) {
      const htmlPath = itemRelativePath.replace(/\\/g, '/');
      
      if (ignoredFiles.some(ignored => htmlPath.includes(ignored))) {
        return;
      }
      
      // Если есть hierarchy, проверяем что файл в нем
      if (allowedFiles && !allowedFiles.has(item.name)) {
        return; // Пропускаем файлы не из hierarchy
      }
      
      tree.files.push({
        name: formatFileName(path.basename(item.name, '.html')),
        path: htmlPath,
        htmlPath: htmlPath
      });
    }
  });
  
  return tree;
}

/**
 * Определяет тип элемента scope автоматически
 */
function detectScopeItemType(itemPath) {
  if (itemPath.startsWith('https://github.com/')) {
    return 'repository';
  }
  
  if (fs.existsSync(itemPath)) {
    const stats = fs.statSync(itemPath);
    if (stats.isDirectory()) {
      return 'directory';
    } else if (stats.isFile() && /\.md$/i.test(itemPath)) {
      return 'file';
    }
  }
  
  if (/\.md$/i.test(itemPath)) {
    return 'file';
  }
  
  return 'directory';
}

/**
 * Проверяет, содержит ли узел активную страницу (рекурсивно)
 */
function containsActivePage(node, normalizedCurrentFile) {
  if (!node.files || !Array.isArray(node.files)) {
    return Object.values(node.children || {}).some(child => containsActivePage(child, normalizedCurrentFile));
  }
  
  const hasActiveFile = node.files.some(file => {
    if (!file || !file.htmlPath) return false;
    let fileHtmlPath = file.htmlPath.replace(/\\/g, '/').toLowerCase();
    // Заменяем readme.html на index.html для сравнения
    fileHtmlPath = fileHtmlPath.replace(/\/readme\.html$/i, '/index.html');
    return normalizedCurrentFile === fileHtmlPath;
  });
  
  if (hasActiveFile) return true;
  
  return Object.values(node.children || {}).some(child => containsActivePage(child, normalizedCurrentFile));
}

/**
 * Проверяет, нужно ли раскрывать узел
 */
function shouldExpandNode(node, normalizedCurrentFile) {
  return containsActivePage(node, normalizedCurrentFile);
}

/**
 * Рекурсивно генерирует HTML для узла дерева
 */
function generateNodeHtml(node, level, normalizedCurrentFile, relativeRoot) {
  let html = '';
  
  const shouldExpand = shouldExpandNode(node, normalizedCurrentFile);
  const hasChildFolders = Object.keys(node.children || {}).length > 0;
  const expandedClass = shouldExpand ? ' expanded' : '';
  const indent = '  '.repeat(level);
  
  if (node.name) {
    const sectionTitle = node.title || formatSectionTitle(node.name);
    
    // Определяем файлы без README
    const filesWithoutReadme = node.files ? node.files.filter(f => {
      if (!f || !f.htmlPath) return false;
      const fileName = path.basename(f.htmlPath, '.html').toLowerCase();
      return !['readme', 'index', 'main', 'root'].includes(fileName);
    }) : [];
    
    // Проверяем, есть ли README/index файл
    const readmeFile = node.files && node.files.find(f => {
      if (!f || !f.htmlPath) return false;
      const fileName = path.basename(f.htmlPath, '.html').toLowerCase();
      return ['readme', 'index', 'main', 'root'].includes(fileName);
    });
    
    // Предварительно определяем будут ли children (для класса has-children)
    const isSingleFileFolderPrecheck = !hasChildFolders && !readmeFile && filesWithoutReadme.length === 1;
    const hasFilesToShowPrecheck = filesWithoutReadme.length > 0 || hasChildFolders;
    const willHaveChildren = hasFilesToShowPrecheck && !isSingleFileFolderPrecheck;
    
    html += `${indent}<li class="${willHaveChildren ? 'has-children' : ''}${expandedClass}">\n`;
    html += `${indent}  <div class="item-content">\n`;
    
    if (willHaveChildren) {
      html += `${indent}    <span class="triangle"></span>\n`;
    }
    
    if (readmeFile) {
      let cleanPath = readmeFile.htmlPath.replace(/\\/g, '/');
      // Заменяем readme.html на index.html
      cleanPath = cleanPath.replace(/\/readme\.html$/i, '/index.html');
      const href = relativeRoot + cleanPath;
      
      // Проверяем, является ли README файл активным
      let fileHtmlPath = readmeFile.htmlPath.replace(/\\/g, '/').toLowerCase();
      // Заменяем readme.html на index.html для сравнения
      fileHtmlPath = fileHtmlPath.replace(/\/readme\.html$/i, '/index.html');
      const isFileActive = normalizedCurrentFile === fileHtmlPath;
      
      const divReplacement = isFileActive 
        ? `<div class="item-content active" onclick="if(!event.target.classList.contains('triangle')){window.location.href='${href}'}">`
        : `<div class="item-content" onclick="if(!event.target.classList.contains('triangle')){window.location.href='${href}'}">`
      
      html = html.replace(`<div class="item-content">`, divReplacement);
      html += `${indent}    <span class="link">${sectionTitle}</span>\n`;
    } else if (!hasChildFolders && filesWithoutReadme.length === 1) {
      const singleFile = filesWithoutReadme[0];
      let cleanPath = singleFile.htmlPath.replace(/\\/g, '/');
      // Заменяем readme.html на index.html
      cleanPath = cleanPath.replace(/\/readme\.html$/i, '/index.html');
      const href = relativeRoot + cleanPath;
      const fileName = path.basename(singleFile.path, '.html').toLowerCase();
      
      let displayName;
      if (['readme', 'index', 'root', 'main'].includes(fileName)) {
        displayName = `${sectionTitle} - ${extractH1FromHtml(path.join(process.cwd(), 'dist', singleFile.htmlPath)) || singleFile.name}`;
      } else {
        displayName = `${sectionTitle} - ${singleFile.name}`;
      }
      
      // Проверяем, является ли этот файл активным
      let fileHtmlPath = singleFile.htmlPath.replace(/\\/g, '/').toLowerCase();
      // Заменяем readme.html на index.html для сравнения
      fileHtmlPath = fileHtmlPath.replace(/\/readme\.html$/i, '/index.html');
      const isFileActive = normalizedCurrentFile === fileHtmlPath;
      
      const divReplacement = isFileActive 
        ? `<div class="item-content active" onclick="if(!event.target.classList.contains('triangle')){window.location.href='${href}'}">`
        : `<div class="item-content" onclick="if(!event.target.classList.contains('triangle')){window.location.href='${href}'}">`
      
      html = html.replace(`<div class="item-content">`, divReplacement);
      html += `${indent}    <span class="link">${displayName}</span>\n`;
    } else {
      html += `${indent}    <span class="folder-only">${sectionTitle}</span>\n`;
    }
    
    html += `${indent}  </div>\n`;
    
    // Генерируем дочерние элементы
    // Показываем children если:
    // 1. Есть дочерние папки (hasChildFolders)
    // 2. Есть файлы кроме README (filesWithoutReadme) И есть README (readmeFile)
    // 3. Есть несколько файлов без README
    // Исключение: если нет дочерних папок, нет README и только один файл, не показываем children
    const isSingleFileFolder = !hasChildFolders && !readmeFile && filesWithoutReadme.length === 1;
    const hasFilesToShow = filesWithoutReadme.length > 0 || hasChildFolders;
    const showChildren = hasFilesToShow && !isSingleFileFolder;
    
    if (showChildren) {
      html += `${indent}  <ul class="children">\n`;
      
      const filesToRender = node.files || [];
      const readmeFile = filesToRender.find(f => {
        const fileName = path.basename(f.htmlPath, '.html').toLowerCase();
        return ['readme', 'index', 'main', 'root'].includes(fileName);
      });
      
      const filesToShow = readmeFile 
        ? filesToRender.filter(f => f !== readmeFile)
        : filesToRender;
      
      const uniqueFiles = [];
      const seenPaths = new Set();
      filesToShow.forEach(f => {
        const filePath = (f.path || f.htmlPath).replace(/\\/g, '/');
        if (!seenPaths.has(filePath)) {
          seenPaths.add(filePath);
          uniqueFiles.push(f);
        }
      });
      
      const sortedFiles = uniqueFiles.slice().sort((a, b) => {
        return a.name.localeCompare(b.name);
      });
      
      sortedFiles.forEach(file => {
        let fileHtmlPath = file.htmlPath.replace(/\\/g, '/').toLowerCase();
        // Заменяем readme.html на index.html для сравнения
        fileHtmlPath = fileHtmlPath.replace(/\/readme\.html$/i, '/index.html');
        // Точное сравнение путей
        const isFileActive = normalizedCurrentFile === fileHtmlPath;
        
        let cleanPath = file.htmlPath.replace(/\\/g, '/');
        // Заменяем readme.html на index.html
        cleanPath = cleanPath.replace(/\/readme\.html$/i, '/index.html');
        const href = relativeRoot + cleanPath;
        
        html += `${indent}    <li>\n`;
        html += `${indent}      <div class="item-content${isFileActive ? ' active' : ''}" onclick="window.location.href='${href}'">\n`;
        html += `${indent}        <span class="link">${file.name}</span>\n`;
        html += `${indent}      </div>\n`;
        html += `${indent}    </li>\n`;
      });
      
      const uniqueChildren = [];
      const seenNames = new Set();
      Object.values(node.children || {}).forEach(child => {
        if (!seenNames.has(child.name)) {
          seenNames.add(child.name);
          uniqueChildren.push(child);
        }
      });
      
      if (uniqueChildren.length > 0 && uniqueChildren[0].order !== undefined) {
        uniqueChildren.sort((a, b) => a.order - b.order);
      }
      
      uniqueChildren.forEach(child => {
        html += generateNodeHtml(child, level + 2, normalizedCurrentFile, relativeRoot);
      });
      
      html += `${indent}  </ul>\n`;
    }
    
    html += `${indent}</li>\n`;
  }
  
  return html;
}

/**
 * Генерирует HTML для hamburger menu (полная структура сайта)
 */
function generateHamburgerMenu(currentFile = '', outputFile = '') {
  const baseDir = process.cwd();
  const config = loadConfig();
  
  // Try to use hierarchy-info.json first (new system)
  const hierarchyPath = path.join(baseDir, '.temp', 'hierarchy-info.json');
  let fullTree;
  
  if (fs.existsSync(hierarchyPath)) {
    // Use new indexing system
    try {
      const hierarchyInfo = JSON.parse(fs.readFileSync(hierarchyPath, 'utf8'));
      fullTree = buildTreeFromHierarchyInfo(hierarchyInfo, baseDir);
    } catch (error) {
      console.warn('⚠️  Error loading hierarchy-info.json, falling back to old system');
      fullTree = collectFullSiteStructure(config, baseDir);
    }
  } else {
    // Fallback to old system
    fullTree = collectFullSiteStructure(config, baseDir);
  }
  
  if (Object.keys(fullTree.children).length === 0 && fullTree.files.length === 0) {
    return '';
  }
  
  // Нормализуем путь текущего файла - извлекаем путь относительно dist
  let normalizedCurrentFile = outputFile.replace(/\\/g, '/').toLowerCase();
  const distIndex = normalizedCurrentFile.indexOf('dist/');
  if (distIndex >= 0) {
    normalizedCurrentFile = normalizedCurrentFile.substring(distIndex + 5); // Убираем "dist/"
  }
  
  const relativeRoot = getRelativePathToRoot(outputFile);
  
  let html = '<aside class="hamburger-menu">\n';
  html += '  <div class="hamburger-menu-header">Site Map</div>\n';
  html += '  <nav class="hamburger-menu-nav">\n';
  html += '    <ul>\n';
  
  const rootFiles = fullTree.files.slice();
  
  // Сортируем: index.html всегда первый, затем по order или алфавиту
  rootFiles.sort((a, b) => {
    const aPath = (a.htmlPath || a.path).toLowerCase();
    const bPath = (b.htmlPath || b.path).toLowerCase();
    const aBasename = path.basename(aPath, '.html');
    const bBasename = path.basename(bPath, '.html');
    
    // index.html всегда первый
    if (aBasename === 'index') return -1;
    if (bBasename === 'index') return 1;
    
    // Затем сортируем по order если есть
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }
    
    // Иначе по алфавиту
    return a.name.localeCompare(b.name);
  });
  
  rootFiles.forEach(file => {
    let fileHtmlPath = file.htmlPath.replace(/\\/g, '/').toLowerCase();
    // Заменяем readme.html на index.html для сравнения
    fileHtmlPath = fileHtmlPath.replace(/\/readme\.html$/i, '/index.html');
    // Точное сравнение путей
    const isActive = normalizedCurrentFile === fileHtmlPath;
    
    let cleanPath = file.htmlPath.replace(/\\/g, '/');
    // Заменяем readme.html на index.html
    cleanPath = cleanPath.replace(/\/readme\.html$/i, '/index.html');
    const href = relativeRoot + cleanPath;
    
    html += `      <li>\n`;
    html += `        <div class="item-content${isActive ? ' active' : ''}" onclick="window.location.href='${href}'">\n`;
    html += `          <span class="link">${file.name}</span>\n`;
    html += `        </div>\n`;
    html += `      </li>\n`;
  });
  
  const childrenArray = Object.values(fullTree.children);
  if (childrenArray.length > 0 && childrenArray[0].order !== undefined) {
    childrenArray.sort((a, b) => a.order - b.order);
  }
  
  childrenArray.forEach(child => {
    html += generateNodeHtml(child, 3, normalizedCurrentFile, relativeRoot);
  });
  
  html += '    </ul>\n';
  html += '  </nav>\n';
  html += '</aside>\n';
  
  return html;
}

module.exports = {
  generateHamburgerMenu
};
