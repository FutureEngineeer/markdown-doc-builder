// newSectionMap.js - Генерация section map (структура текущего раздела/репозитория)
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
 * Определяет корневую папку текущей страницы (раздел)
 * Для вложенных репозиториев возвращает путь к репозиторию
 */
function getRootFolder(filePath) {
  if (!filePath) return '';
  
  // Нормализуем путь - заменяем обратные слеши на прямые
  const normalizedPath = filePath.replace(/\\/g, '/');
  const parts = normalizedPath.split('/');
  const distIndex = parts.indexOf('dist');
  
  if (distIndex < 0 || distIndex >= parts.length - 1) {
    return '';
  }
  
  // Получаем путь относительно dist (без имени файла)
  const pathAfterDist = parts.slice(distIndex + 1, -1).join('/');
  
  // Проверяем hierarchy-info.json для определения правильного раздела
  const hierarchyPath = path.join(process.cwd(), '.temp', 'hierarchy-info.json');
  if (fs.existsSync(hierarchyPath)) {
    try {
      const hierarchyInfo = JSON.parse(fs.readFileSync(hierarchyPath, 'utf8'));
      
      // Проверяем все уровни вложенности, начиная с самого глубокого
      // Это позволяет найти самый глубокий репозиторий/секцию
      for (let i = parts.length - 2; i > distIndex; i--) {
        const currentPath = parts.slice(distIndex + 1, i + 1).join('/');
        const folderName = parts[i];
        
        // Проверяем, является ли это репозиторием
        if (hierarchyInfo.allRepositories) {
          const isRepo = hierarchyInfo.allRepositories.some(r => r.alias === folderName);
          if (isRepo) {
            return currentPath;
          }
        }
        
        // Проверяем, является ли это секцией в tree структуре (section: true в конфиге)
        if (hierarchyInfo.tree && hierarchyInfo.tree.children) {
          const findSection = (children, targetAlias) => {
            for (const child of children) {
              if (child.section && (child.alias === targetAlias || child.folder === targetAlias)) {
                return true;
              }
              if (child.children) {
                if (findSection(child.children, targetAlias)) {
                  return true;
                }
              }
            }
            return false;
          };
          
          if (findSection(hierarchyInfo.tree.children, folderName)) {
            return currentPath;
          }
        }
      }
      
      // Если не нашли репозиторий/секцию, проверяем является ли папка дочерней папкой секции
      const firstFolder = parts[distIndex + 1];
      const secondFolder = parts.length > distIndex + 2 ? parts[distIndex + 2] : null;
      
      // Проверяем в tree структуре
      if (hierarchyInfo.tree && hierarchyInfo.tree.children) {
        // Проверяем, является ли первая папка секцией
        const firstFolderSection = hierarchyInfo.tree.children.find(child => 
          child.type === 'section' && (child.alias === firstFolder || child.title.toLowerCase().replace(/\s+/g, '-') === firstFolder)
        );
        
        // Если первая папка - это секция, и есть вторая папка
        if (firstFolderSection && secondFolder) {
          // Проверяем, является ли вторая папка дочерней папкой этой секции
          if (firstFolderSection.children) {
            const isChildOfSection = firstFolderSection.children.some(subChild => 
              (subChild.type === 'folder' && (subChild.folder === secondFolder || subChild.alias === secondFolder)) ||
              (subChild.type === 'repository' && subChild.alias === secondFolder)
            );
            
            if (isChildOfSection) {
              // Возвращаем alias родительской секции
              return firstFolderSection.alias || firstFolderSection.title.toLowerCase().replace(/\s+/g, '-');
            }
          }
        }
      }
    } catch (error) {
      // Игнорируем ошибки, используем fallback
    }
  }
  
  // Fallback: возвращаем первую папку после dist
  return parts[distIndex + 1];
}

/**
 * Проверяет, является ли страница корневой
 */
function isRootPage(filePath) {
  if (!filePath) return true;
  
  const parts = filePath.split(path.sep);
  const distIndex = parts.indexOf('dist');
  
  return distIndex >= 0 && distIndex === parts.length - 2;
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
 * Строит дерево из HTML файлов в dist папке
 */
function buildFileTree(dir, baseDir, relativePath = '', ignoredFiles = [], hierarchyConfig = null) {
  const tree = { children: {}, files: [] };
  
  if (!fs.existsSync(dir)) {
    return tree;
  }
  
  // Создаем Set из файлов и директорий в hierarchy для быстрой проверки
  let allowedFiles = null;
  let allowedDirs = null;
  if (hierarchyConfig && hierarchyConfig.hierarchy) {
    allowedFiles = new Set();
    allowedDirs = new Set();
    const extractItems = (items) => {
      items.forEach(item => {
        if (item.file) {
          // Конвертируем .md в .html и берем только имя файла (без пути) в нижнем регистре
          const htmlFile = path.basename(item.file.replace('.md', '.html').toLowerCase());
          allowedFiles.add(htmlFile);
        }
        if (item.repository) {
          // Добавляем alias репозитория как разрешенную директорию
          const alias = item.alias || item.repository.split('/').pop();
          allowedDirs.add(alias);
        }
        if (item.folder) {
          // Добавляем folder как разрешенную директорию
          allowedDirs.add(item.folder);
        }
        if (item.children) {
          extractItems(item.children);
        }
      });
    };
    extractItems(hierarchyConfig.hierarchy);
  }
  
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  items.forEach(item => {
    const fullPath = path.join(dir, item.name);
    const itemRelativePath = relativePath ? path.join(relativePath, item.name) : item.name;
    
    if (item.isDirectory()) {
      // Если есть hierarchy, проверяем что директория в нем
      if (allowedDirs && !allowedDirs.has(item.name)) {
        return; // Пропускаем директории не из hierarchy
      }
      
      // Для репозиториев не передаем hierarchyConfig, чтобы показать все файлы внутри
      const isRepository = allowedDirs && allowedDirs.has(item.name);
      const subTree = buildFileTree(fullPath, baseDir, itemRelativePath, ignoredFiles, isRepository ? null : hierarchyConfig);
      
      if (hasHtmlFiles(subTree)) {
        // Ищем title для этой директории в hierarchy
        let dirTitle = formatSectionTitle(item.name);
        if (hierarchyConfig && hierarchyConfig.hierarchy) {
          const hierarchyItem = hierarchyConfig.hierarchy.find(h => 
            (h.repository && (h.alias || h.repository.split('/').pop()) === item.name) ||
            (h.folder && h.folder === item.name)
          );
          if (hierarchyItem && hierarchyItem.title) {
            dirTitle = hierarchyItem.title;
          }
        }
        
        tree.children[item.name] = {
          name: item.name,
          title: dirTitle,
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
 * Находит секцию в fileStructure
 */
function findSectionInFileStructure(fileStructure, sectionName, baseDir) {
  if (!fileStructure.root || !Array.isArray(fileStructure.root)) {
    return null;
  }
  
  // Нормализуем sectionName
  const normalizedSectionName = sectionName.replace(/\\/g, '/');
  
  function buildNodeFromItem(item) {
    const itemPath = item.output || '';
    
    // Если это репозиторий, строим дерево из dist
    if (item.type === 'repository' || (item.isRepository && item.type === 'section')) {
      const repoDir = path.join(baseDir, 'dist', itemPath);
      if (fs.existsSync(repoDir)) {
        const repoTree = buildFileTree(repoDir, path.join(baseDir, 'dist'), itemPath, []);
        return {
          name: item.alias || path.basename(itemPath),
          title: item.title,
          path: itemPath,
          children: repoTree.children,
          files: repoTree.files
        };
      }
    }
    
    const node = {
      name: item.alias || path.basename(itemPath),
      title: item.title,
      path: itemPath,
      children: {},
      files: []
    };
    
    const childItems = item.type === 'folder' ? item.files : item.children;
    if (childItems && Array.isArray(childItems)) {
      childItems.forEach(child => {
        if (child.type === 'file') {
          node.files.push({
            name: child.title || formatFileName(path.basename(child.output, '.html')),
            path: child.output,
            htmlPath: child.output,
            alias: child.alias
          });
        } else if (child.type === 'folder' || child.type === 'section') {
          const childNode = buildNodeFromItem(child);
          if (childNode) {
            node.children[childNode.name] = childNode;
          }
        } else if (child.type === 'repository') {
          // Репозиторий - строим дерево из dist
          const repoDir = path.join(baseDir, 'dist', child.output);
          if (fs.existsSync(repoDir)) {
            const repoTree = buildFileTree(repoDir, path.join(baseDir, 'dist'), child.output, []);
            node.children[child.alias || path.basename(child.output)] = {
              name: child.alias || path.basename(child.output),
              title: child.title,
              path: child.output,
              children: repoTree.children,
              files: repoTree.files
            };
          }
        }
      });
    }
    
    return node;
  }
  
  function searchInItems(items) {
    for (const item of items) {
      const itemPath = item.output || '';
      
      // Проверяем совпадение пути (полное совпадение или basename)
      if (itemPath === normalizedSectionName || path.basename(itemPath) === normalizedSectionName) {
        // Строим дерево для этого элемента
        if (item.type === 'section' || item.type === 'folder' || item.type === 'repository') {
          return buildNodeFromItem(item);
        }
      }
      
      // Рекурсивно ищем в дочерних элементах
      if (item.type === 'section' || item.type === 'folder') {
        const childItems = item.type === 'folder' ? item.files : item.children;
        if (childItems && Array.isArray(childItems)) {
          const found = searchInItems(childItems);
          if (found) return found;
        }
      }
    }
    
    return null;
  }
  
  return searchInItems(fileStructure.root);
}

/**
 * Находит узел раздела в полной структуре
 */
function findSectionNode(config, baseDir, sectionName) {
  if (!sectionName) return null;
  
  // Проверяем, является ли sectionName путем (например, project-beta/radix или projects/project-alpha)
  const isNestedPath = sectionName.includes('/') || sectionName.includes('\\');
  let actualSectionName = sectionName;
  let parentSection = null;
  
  if (isNestedPath) {
    const parts = sectionName.split(/[\/\\]/);
    parentSection = parts[0];
    actualSectionName = parts[parts.length - 1];
  }
  
  // Проверяем hierarchy-info.json
  const hierarchyPath = path.join(baseDir, '.temp', 'hierarchy-info.json');
  if (!fs.existsSync(hierarchyPath)) {
    console.warn('⚠️  hierarchy-info.json не найден');
    return null;
  }
  
  try {
    const hierarchyInfo = JSON.parse(fs.readFileSync(hierarchyPath, 'utf8'));
    
    // Используем fileStructure если доступен (новая система)
    if (hierarchyInfo.fileStructure && hierarchyInfo.fileStructure.root) {
      return findSectionInFileStructure(hierarchyInfo.fileStructure, sectionName, baseDir);
    }
  } catch (error) {
    console.warn('⚠️  Ошибка чтения hierarchy-info.json:', error.message);
  }
  
  try {
    const hierarchyInfo = JSON.parse(fs.readFileSync(hierarchyPath, 'utf8'));
    
    // Проверяем секции из hierarchy
    if (hierarchyInfo.sections && hierarchyInfo.sections[sectionName]) {
      const sectionConfig = hierarchyInfo.sections[sectionName];
      const sectionDir = path.join(baseDir, 'dist', sectionName);
      
      if (fs.existsSync(sectionDir)) {
        const sectionTree = buildFileTree(sectionDir, path.join(baseDir, 'dist'), sectionName, [], sectionConfig);
        return {
          name: sectionName,
          title: formatSectionTitle(sectionName),
          path: sectionName,
          children: sectionTree.children,
          files: sectionTree.files
        };
      }
    }
    
    // Проверяем вложенные репозитории в секциях (например, project-beta/radix)
    if (isNestedPath && parentSection && hierarchyInfo.sections && hierarchyInfo.sections[parentSection]) {
      const sectionConfig = hierarchyInfo.sections[parentSection];
      if (sectionConfig.hierarchy) {
        for (const item of sectionConfig.hierarchy) {
          if (item.repository) {
            const alias = item.alias || item.repository.split('/').pop();
            if (alias === actualSectionName) {
              const repoDir = path.join(baseDir, 'dist', parentSection, alias);
              
              // Находим реальное имя директории репозитория в temp/
              let tempRepoDir = null;
              if (hierarchyInfo.allRepositories) {
                const repoInfo = hierarchyInfo.allRepositories.find(r => r.alias === alias);
                if (repoInfo) {
                  tempRepoDir = path.join(baseDir, 'temp', `${repoInfo.owner}-${repoInfo.repo}`);
                }
              }
              
              if (!tempRepoDir || !fs.existsSync(tempRepoDir)) {
                tempRepoDir = path.join(baseDir, 'temp', alias);
              }
              
              let dirTree;
              const fullPath = path.join(parentSection, alias);
              if (fs.existsSync(tempRepoDir)) {
                dirTree = buildFileTreeFromSource(tempRepoDir, fullPath, []);
                
                if (dirTree.files) {
                  dirTree.files.forEach(file => {
                    const fileName = path.basename(file.htmlPath, '.html').toLowerCase();
                    if (fileName === 'readme') {
                      const dirPath = path.dirname(file.htmlPath);
                      const newPath = path.posix.join(dirPath, 'index.html');
                      file.path = newPath;
                      file.htmlPath = newPath;
                    }
                  });
                }
              } else if (fs.existsSync(repoDir)) {
                dirTree = buildFileTree(repoDir, path.join(baseDir, 'dist'), fullPath, []);
              } else {
                return null;
              }
              
              return {
                name: alias,
                title: item.title || formatSectionTitle(alias),
                path: fullPath,
                children: dirTree.children,
                files: dirTree.files
              };
            }
          }
        }
      }
    }
    
    // Проверяем репозитории из root hierarchy
    if (hierarchyInfo.root && hierarchyInfo.root.hierarchy) {
      for (const item of hierarchyInfo.root.hierarchy) {
        if (item.repository) {
          const alias = item.alias || item.repository.split('/').pop();
          if (alias === sectionName) {
            const repoDir = path.join(baseDir, 'dist', alias);
            
            // Находим реальное имя директории репозитория в temp/
            let tempRepoDir = null;
            if (hierarchyInfo.allRepositories) {
              const repoInfo = hierarchyInfo.allRepositories.find(r => r.alias === alias);
              if (repoInfo) {
                // Используем owner-repo формат
                tempRepoDir = path.join(baseDir, 'temp', `${repoInfo.owner}-${repoInfo.repo}`);
              }
            }
            
            // Fallback к старому формату
            if (!tempRepoDir || !fs.existsSync(tempRepoDir)) {
              tempRepoDir = path.join(baseDir, 'temp', alias);
            }
            
            let dirTree;
            if (fs.existsSync(tempRepoDir)) {
              dirTree = buildFileTreeFromSource(tempRepoDir, alias, []);
              
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
              dirTree = buildFileTree(repoDir, path.join(baseDir, 'dist'), alias, []);
            } else {
              return null;
            }
            
            return {
              name: alias,
              title: item.title || formatSectionTitle(alias),
              path: alias,
              children: dirTree.children,
              files: dirTree.files
            };
          }
        }
      }
    }
  } catch (error) {
    console.warn('⚠️  Ошибка чтения hierarchy-info.json:', error.message);
  }
  
  return null;
}



/**
 * Проверяет, содержит ли узел активную страницу (рекурсивно)
 */
function containsActivePage(node, normalizedCurrentFile) {
  const hasActiveFile = node.files.some(file => {
    let fileHtmlPath = file.htmlPath.replace(/\\/g, '/').toLowerCase();
    // Заменяем readme.html на index.html для сравнения
    fileHtmlPath = fileHtmlPath.replace(/\/readme\.html$/i, '/index.html');
    return normalizedCurrentFile === fileHtmlPath;
  });
  
  if (hasActiveFile) return true;
  
  return Object.values(node.children || {}).some(child => containsActivePage(child, normalizedCurrentFile));
}

/**
 * Проверяет, является ли узел прямым родителем активной страницы
 */
function isDirectParentOfActive(node, normalizedCurrentFile) {
  return node.files.some(file => {
    let fileHtmlPath = file.htmlPath.replace(/\\/g, '/').toLowerCase();
    // Заменяем readme.html на index.html для сравнения
    fileHtmlPath = fileHtmlPath.replace(/\/readme\.html$/i, '/index.html');
    return normalizedCurrentFile === fileHtmlPath;
  });
}

/**
 * Проверяет, нужно ли раскрывать узел
 * Раскрываем если:
 * 1. Узел содержит активную страницу в своих файлах (прямой родитель)
 * 2. Узел является секцией (корневой папкой раздела) - раскрываем на один уровень
 */
function shouldExpandNode(node, normalizedCurrentFile, isSection = false) {
  if (isDirectParentOfActive(node, normalizedCurrentFile)) {
    return true;
  }
  
  // Если это секция, раскрываем дочерние элементы на один уровень
  if (isSection) {
    return true;
  }
  
  return Object.values(node.children || {}).some(child => containsActivePage(child, normalizedCurrentFile));
}

/**
 * Вычисляет относительный путь от текущей страницы до целевого файла
 */
function getRelativeHref(targetPath, currentFile) {
  const currentDir = path.dirname(currentFile);
  const relativePath = path.posix.relative(currentDir, targetPath);
  return relativePath || targetPath;
}

/**
 * Рекурсивно генерирует HTML для узла дерева
 */
function generateNodeHtml(node, level, normalizedCurrentFile, relativeRoot, isSection = false) {
  let html = '';
  
  const shouldExpand = shouldExpandNode(node, normalizedCurrentFile, isSection);
  const hasChildFolders = Object.keys(node.children || {}).length > 0;
  const expandedClass = shouldExpand ? ' expanded' : '';
  const indent = '  '.repeat(level);
  
  if (node.name) {
    const sectionTitle = node.title || formatSectionTitle(node.name);
    
    // Определяем файлы без README
    const filesWithoutReadme = node.files ? node.files.filter(f => {
      const fileName = path.basename(f.htmlPath, '.html').toLowerCase();
      return !['readme', 'index', 'main', 'root'].includes(fileName);
    }) : [];
    
    // Проверяем, есть ли README/index файл
    const readmeFile = node.files && node.files.find(f => {
      const fileName = path.basename(f.htmlPath, '.html').toLowerCase();
      return ['readme', 'index', 'main', 'root'].includes(fileName);
    });
    
    // Определяем, будут ли children (для класса has-children и треугольника)
    const isSingleFileFolder = !hasChildFolders && !readmeFile && filesWithoutReadme.length === 1;
    const willHaveChildren = (hasChildFolders || (filesWithoutReadme.length > 0 && !isSingleFileFolder));
    
    html += `${indent}<li class="${willHaveChildren ? 'has-children' : ''}${expandedClass}">\n`;
    html += `${indent}  <div class="item-content">\n`;
    
    if (willHaveChildren) {
      html += `${indent}    <span class="triangle"></span>\n`;
    }
    
    if (readmeFile) {
      let cleanPath = readmeFile.htmlPath.replace(/\\/g, '/');
      // Заменяем readme.html на index.html
      cleanPath = cleanPath.replace(/\/readme\.html$/i, '/index.html');
      const href = getRelativeHref(cleanPath, normalizedCurrentFile);
      
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
      const href = getRelativeHref(cleanPath, normalizedCurrentFile);
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
      // Если нет README, но есть файлы, делаем папку кликабельной на первый файл
      if (filesWithoutReadme.length > 0) {
        const firstFile = filesWithoutReadme[0];
        let cleanPath = firstFile.htmlPath.replace(/\\/g, '/');
        cleanPath = cleanPath.replace(/\/readme\.html$/i, '/index.html');
        const href = getRelativeHref(cleanPath, normalizedCurrentFile);
        
        const divReplacement = `<div class="item-content" onclick="if(!event.target.classList.contains('triangle')){window.location.href='${href}'}">`;
        html = html.replace(`<div class="item-content">`, divReplacement);
        html += `${indent}    <span class="link">${sectionTitle}</span>\n`;
      } else {
        html += `${indent}    <span class="folder-only">${sectionTitle}</span>\n`;
      }
    }
    
    html += `${indent}  </div>\n`;
    
    // Генерируем дочерние элементы
    // Если нет дочерних папок и только один файл (не README), не показываем children
    // так как файл уже используется как ссылка папки
    const showChildren = willHaveChildren;
    
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
        const href = getRelativeHref(cleanPath, normalizedCurrentFile);
        
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
        html += generateNodeHtml(child, level + 2, normalizedCurrentFile, relativeRoot, false);
      });
      
      html += `${indent}  </ul>\n`;
    }
    
    html += `${indent}</li>\n`;
  }
  
  return html;
}

/**
 * Проверяет, является ли раздел секцией (section = true) и возвращает информацию о секции
 */
function isSectionContainer(rootFolder) {
  const hierarchyPath = path.join(process.cwd(), '.temp', 'hierarchy-info.json');
  if (!fs.existsSync(hierarchyPath)) {
    return false;
  }
  
  try {
    const hierarchyInfo = JSON.parse(fs.readFileSync(hierarchyPath, 'utf8'));
    
    // Проверяем в tree структуре
    if (hierarchyInfo.tree && hierarchyInfo.tree.children) {
      for (const child of hierarchyInfo.tree.children) {
        // Если это секция и её alias совпадает с rootFolder
        if (child.type === 'section' && (child.alias === rootFolder || child.title.toLowerCase().replace(/\s+/g, '-') === rootFolder)) {
          return { 
            isSection: true, 
            parentSection: child,
            sectionChildren: child.children // Все дочерние элементы секции
          };
        }
      }
    }
    
    // Fallback: проверяем root hierarchy (старый формат)
    if (hierarchyInfo.root && hierarchyInfo.root.hierarchy) {
      for (const item of hierarchyInfo.root.hierarchy) {
        if (item.section && item.children) {
          // Проверяем дочерние элементы секции
          for (const child of item.children) {
            if (child.folder === rootFolder || child.alias === rootFolder) {
              return { 
                isSection: true, 
                parentSection: item,
                sectionChildren: item.children // Все дочерние элементы секции
              };
            }
          }
        }
      }
    }
  } catch (error) {
    // Игнорируем ошибки
  }
  
  return false;
}

/**
 * Строит дерево для всей секции (включая все дочерние папки)
 */
function buildSectionTree(sectionInfo, config, baseDir) {
  const tree = { children: {}, files: [] };
  const distDir = path.join(baseDir, 'dist');
  
  if (!sectionInfo || !sectionInfo.sectionChildren) {
    return tree;
  }
  
  // Обрабатываем все дочерние элементы секции
  sectionInfo.sectionChildren.forEach((child, index) => {
    if (child.type === 'folder' && child.folder) {
      // Путь к папке в dist должен включать родительскую секцию
      const parentAlias = sectionInfo.parentSection.alias || sectionInfo.parentSection.title.toLowerCase().replace(/\s+/g, '-');
      const folderPath = path.join(distDir, parentAlias, child.folder);
      
      if (fs.existsSync(folderPath)) {
        // Загружаем hierarchy для этой папки
        const hierarchyPath = path.join(baseDir, '.temp', 'hierarchy-info.json');
        let folderHierarchy = null;
        if (fs.existsSync(hierarchyPath)) {
          try {
            const hierarchyInfo = JSON.parse(fs.readFileSync(hierarchyPath, 'utf8'));
            folderHierarchy = hierarchyInfo.sections?.[child.folder];
          } catch (error) {
            // Игнорируем ошибки
          }
        }
        
        const relativePath = path.join(parentAlias, child.folder);
        // Не передаём folderHierarchy, чтобы показать все файлы в папке
        const folderTree = buildFileTree(folderPath, distDir, relativePath, [], null);
        
        // Только добавляем папку если в ней есть файлы или подпапки
        if (Object.keys(folderTree.children).length > 0 || folderTree.files.length > 0) {
          tree.children[child.folder] = {
            name: child.folder,
            title: child.title || formatSectionTitle(child.folder),
            path: relativePath,
            children: folderTree.children,
            files: folderTree.files,
            order: index,
            alias: child.alias
          };
        }
      }
    }
  });
  
  return tree;
}

/**
 * Генерирует HTML для section map (структура текущего раздела)
 */
function generateNewSectionMap(currentFile = '', outputFile = '') {
  const baseDir = process.cwd();
  const config = loadConfig();
  
  // Проверяем, является ли страница корневой
  if (isRootPage(outputFile)) {
    return ''; // Не показываем section-map для корневых страниц
  }
  
  // Определяем корневую папку текущей страницы
  const rootFolder = getRootFolder(outputFile);
  
  if (!rootFolder) {
    return ''; // Не показываем section-map если не можем определить папку
  }
  
  // Проверяем, является ли раздел частью секции (section = true)
  const sectionInfo = isSectionContainer(rootFolder);
  
  // Нормализуем путь текущего файла - извлекаем путь относительно dist
  let normalizedCurrentFile = outputFile.replace(/\\/g, '/').toLowerCase();
  const distIndex = normalizedCurrentFile.indexOf('dist/');
  if (distIndex >= 0) {
    normalizedCurrentFile = normalizedCurrentFile.substring(distIndex + 5); // Убираем "dist/"
  }
  
  const relativeRoot = getRelativePathToRoot(outputFile);
  
  let sectionNode;
  let sectionTitle;
  
  // Если раздел является частью секции, показываем ВСЮ секцию (все дочерние папки)
  if (sectionInfo && sectionInfo.isSection) {
    const parentTitle = sectionInfo.parentSection.title || 'Section';
    sectionTitle = parentTitle;
    
    // Строим дерево для всей секции
    sectionNode = buildSectionTree(sectionInfo, config, baseDir);
  } else {
    // Always use the existing system (findSectionNode)
    sectionNode = findSectionNode(config, baseDir, rootFolder);
    sectionTitle = sectionNode?.title || formatSectionTitle(rootFolder);
  }
  
  if (!sectionNode || (Object.keys(sectionNode.children || {}).length === 0 && (sectionNode.files || []).length === 0)) {
    return ''; // Не показываем section-map если нет структуры
  }
  
  let html = '<aside class="section-map">\n';
  html += `  <div class="section-map-header">${sectionTitle}</div>\n`;
  html += '  <div class="section-map-content">\n';
  html += '    <nav class="section-map-nav">\n';
  html += '      <ul>\n';
  
  // Если это секция, показываем все дочерние папки секции
  if (sectionInfo && sectionInfo.isSection) {
    // Генерируем все дочерние папки секции (раскрываем на один уровень)
    const childrenArray = Object.values(sectionNode.children || {});
    if (childrenArray.length > 0 && childrenArray[0].order !== undefined) {
      childrenArray.sort((a, b) => a.order - b.order);
    }
    
    childrenArray.forEach(child => {
      html += generateNodeHtml(child, 4, normalizedCurrentFile, relativeRoot, true);
    });
  } else {
    // Обычная логика для не-секций
    // Генерируем корневые файлы раздела
    const rootFiles = (sectionNode.files || []).slice();
    
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
      // Точное сравнение путей (с учетом того, что normalizedCurrentFile уже без "dist/")
      const isActive = normalizedCurrentFile === fileHtmlPath;
      
      let cleanPath = file.htmlPath.replace(/\\/g, '/');
      // Заменяем readme.html на index.html
      cleanPath = cleanPath.replace(/\/readme\.html$/i, '/index.html');
      // Вычисляем относительный путь от текущей страницы до целевого файла
      const currentDir = path.dirname(normalizedCurrentFile);
      const relativePath = path.posix.relative(currentDir, cleanPath);
      const href = relativePath || cleanPath;
      
      html += `        <li>\n`;
      html += `          <div class="item-content${isActive ? ' active' : ''}" onclick="window.location.href='${href}'">\n`;
      html += `            <span class="link">${file.name}</span>\n`;
      html += `          </div>\n`;
      html += `        </li>\n`;
    });
    
    // Генерируем подпапки раздела (раскрываем на один уровень если это секция)
    const childrenArray = Object.values(sectionNode.children || {});
    if (childrenArray.length > 0 && childrenArray[0].order !== undefined) {
      childrenArray.sort((a, b) => a.order - b.order);
    }
    
    childrenArray.forEach(child => {
      html += generateNodeHtml(child, 4, normalizedCurrentFile, relativeRoot, true);
    });
  }
  
  html += '      </ul>\n';
  html += '    </nav>\n';
  html += '  </div>\n';
  html += '</aside>\n';
  
  return html;
}

module.exports = {
  generateNewSectionMap
};
