// githubFetcher.js - модуль для скачивания файлов из GitHub репозиториев
const fs = require('fs');
const path = require('path');
const https = require('https');

// Кеш скачанных репозиториев
const downloadedReposCache = new Map();

// Путь к файлу кеша
const CACHE_FILE = path.join('.temp', 'repos-cache.json');

/**
 * Загружает кеш из файла
 */
function loadCacheFromFile() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const cacheData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      
      // Проверяем каждый репозиторий в кеше
      for (const [key, repoData] of Object.entries(cacheData)) {
        // Добавляем проверку времени кеша (12 часов)
        const cacheAge = Date.now() - new Date(repoData.timestamp || 0).getTime();
        const maxCacheAge = 12 * 60 * 60 * 1000; // 12 часов в миллисекундах
        
        if (cacheAge > maxCacheAge) {
          continue;
        }
        
        // Проверяем, что папка репозитория существует
        if (fs.existsSync(repoData.projectDir)) {
          // Проверяем, что все файлы существуют
          const allFilesExist = repoData.files.every(file => fs.existsSync(file.localPath));
          
          if (allFilesExist) {
            downloadedReposCache.set(key, repoData);
          }
        }
      }
    }
  } catch (error) {
    console.warn('⚠️  Ошибка загрузки кеша:', error.message);
  }
}

/**
 * Сохраняет кеш в файл
 */
function saveCacheToFile() {
  try {
    // Создаем папку .temp если её нет
    const cacheDir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    
    // Конвертируем Map в объект для сериализации
    const cacheData = Object.fromEntries(downloadedReposCache);
    
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2), 'utf8');
  } catch (error) {
    console.warn('⚠️  Ошибка сохранения кеша:', error.message);
  }
}

// Загружаем кеш при инициализации модуля
loadCacheFromFile();

/**
 * Скачивает файл по URL
 */
function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Documentation-Builder/1.0'
      }
    };
    
    https.get(url, options, (response) => {
      if (response.statusCode === 200) {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => resolve(data));
      } else if (response.statusCode === 302 || response.statusCode === 301) {
        // Следуем редиректу
        downloadFile(response.headers.location).then(resolve).catch(reject);
      } else {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
      }
    }).on('error', reject);
  });
}

/**
 * Скачивает бинарный файл (изображения)
 */
function downloadBinaryFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Documentation-Builder/1.0'
      }
    };
    
    https.get(url, options, (response) => {
      if (response.statusCode === 200) {
        const fileStream = fs.createWriteStream(outputPath);
        response.pipe(fileStream);
        
        fileStream.on('finish', () => {
          fileStream.close();
          resolve(outputPath);
        });
        
        fileStream.on('error', reject);
      } else if (response.statusCode === 302 || response.statusCode === 301) {
        // Следуем редиректу
        downloadBinaryFile(response.headers.location, outputPath).then(resolve).catch(reject);
      } else {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
      }
    }).on('error', reject);
  });
}

/**
 * Получает список файлов из GitHub репозитория через API
 */
async function getGitHubRepoFiles(owner, repo, branch = 'main') {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
  
  try {
    const response = await downloadFile(apiUrl);
    const data = JSON.parse(response);
    
    if (data.tree) {
      // Фильтруем .md файлы и изображения (игнорируем регистр для .md)
      const files = data.tree
        .filter(item => {
          if (item.type !== 'blob') return false;
          
          const isMarkdown = /\.md$/i.test(item.path);
          const isImage = /\.(png|jpg|jpeg|gif|svg|webp|bmp|ico)$/i.test(item.path);
          
          return isMarkdown || isImage;
        })
        .map(item => ({
          path: item.path,
          url: `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${item.path}`,
          sha: item.sha,
          type: /\.md$/i.test(item.path) ? 'markdown' : 'image'
        }));
      
      return files;
    }
    
    return [];
  } catch (error) {
    console.warn(`Ошибка получения файлов из ${owner}/${repo}:`, error.message);
    
    // Пробуем с веткой master если main не работает
    if (branch === 'main') {
      return getGitHubRepoFiles(owner, repo, 'master');
    }
    
    // Если API недоступен, пробуем загрузить только README
    return tryDownloadReadmeOnly(owner, repo, branch);
  }
}

/**
 * Пытается загрузить только README файл если API недоступен
 */
async function tryDownloadReadmeOnly(owner, repo, branch = 'main') {
  const readmeFiles = ['README.md', 'readme.md', 'Readme.md'];
  
  for (const readmeFile of readmeFiles) {
    try {
      const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${readmeFile}`;
      await downloadFile(url); // Проверяем что файл существует
      
      return [{
        path: readmeFile,
        url: url,
        sha: 'unknown'
      }];
    } catch (error) {
      // Продолжаем поиск
    }
  }
  
  // Если main не работает, пробуем master
  if (branch === 'main') {
    return tryDownloadReadmeOnly(owner, repo, 'master');
  }
  
  return [];
}

/**
 * Парсит GitHub URL и извлекает информацию о репозитории и пути
 */
function parseGitHubUrl(githubUrl) {
  // Поддерживаем разные форматы URL:
  // https://github.com/owner/repo
  // https://github.com/owner/repo/tree/branch/path/to/folder
  const urlMatch = githubUrl.match(/https:\/\/github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/([^\/]+)\/(.+))?/);
  if (!urlMatch) {
    throw new Error(`Неверный URL GitHub: ${githubUrl}`);
  }

  const [, owner, repo, branch = 'main', subPath = ''] = urlMatch;
  
  return {
    owner,
    repo,
    branch,
    subPath: subPath.replace(/\/$/, '') // убираем trailing slash
  };
}

/**
 * Скачивает все .md файлы из GitHub репозитория (всегда полный репозиторий)
 */
async function downloadGitHubRepoMarkdown(githubUrl, outputDir, alias = null) {
  const { owner, repo, branch } = parseGitHubUrl(githubUrl);
  
  // Создаем ключ для кеша
  const cacheKey = `${owner}/${repo}@${branch}`;
  
  // Проверяем кеш
  if (downloadedReposCache.has(cacheKey)) {
    const cachedResult = downloadedReposCache.get(cacheKey);
    // Обновляем псевдоним в кешированном результате если он изменился
    if (cachedResult.alias !== alias) {
      cachedResult.alias = alias;
    }
    return cachedResult;
  }
  
  const displayName = alias || `${owner}/${repo}`;
  console.log(`📥 ${displayName}`);

  // В temp всегда используем исходное имя репозитория
  // Alias используется только для dist при создании HTML страниц
  const projectDirName = `${owner}-${repo}`;
  const projectDir = path.join(outputDir, projectDirName);
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
  }

  // Получаем список файлов (всегда все файлы репозитория)
  const files = await getGitHubRepoFiles(owner, repo, branch);
  
  if (files.length === 0) {
    console.warn(`⚠️  Не найдено .md файлов в ${owner}/${repo}`);
    const result = { projectDir, files: [], owner, repo, branch, alias };
    // Кешируем даже пустой результат
    downloadedReposCache.set(cacheKey, result);
    return result;
  }

  const downloadedFiles = [];
  const totalFiles = files.length;
  let downloadedCount = 0;

  // Функция для отображения прогресс-бара
  function showProgress(current, total) {
    const percentage = Math.round((current / total) * 100);
    const barLength = 30;
    const filledLength = Math.round((barLength * current) / total);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
    
    // Используем \r для перезаписи строки
    process.stdout.write(`   [${bar}] ${percentage}% (${current}/${total})\r`);
    
    // Если загрузка завершена, переходим на новую строку
    if (current === total) {
      process.stdout.write('\n');
    }
  }

  // Скачиваем каждый файл
  for (const file of files) {
    try {
      if (file.type === 'markdown') {
        const content = await downloadFile(file.url);
        
        // Определяем локальный путь (сохраняем полную структуру)
        let localRelativePath = file.path;
        
        // Создаем структуру папок если нужно
        const localFilePath = path.join(projectDir, localRelativePath);
        const localFileDir = path.dirname(localFilePath);
        
        if (!fs.existsSync(localFileDir)) {
          fs.mkdirSync(localFileDir, { recursive: true });
        }
        
        // Сохраняем файл
        fs.writeFileSync(localFilePath, content, 'utf8');
        
        downloadedFiles.push({
          originalPath: file.path,
          localPath: localFilePath,
          localRelativePath,
          relativePath: path.relative(outputDir, localFilePath),
          url: file.url,
          type: 'markdown'
        });
        
        downloadedCount++;
        showProgress(downloadedCount, totalFiles);
        
      } else if (file.type === 'image') {
        // Сохраняем изображения в dist/assets/images с исходной структурой папок
        const assetsImagesDir = path.join(process.cwd(), 'dist', 'assets', 'images');
        const imageRelativePath = file.path; // Сохраняем полный путь
        const localFilePath = path.join(assetsImagesDir, imageRelativePath);
        const localFileDir = path.dirname(localFilePath);
        
        // Создаем структуру папок если её нет
        if (!fs.existsSync(localFileDir)) {
          fs.mkdirSync(localFileDir, { recursive: true });
        }
        
        // Скачиваем изображение
        await downloadBinaryFile(file.url, localFilePath);
        
        downloadedFiles.push({
          originalPath: file.path,
          localPath: localFilePath,
          localRelativePath: imageRelativePath,
          relativePath: `assets/images/${imageRelativePath}`,
          url: file.url,
          type: 'image'
        });
        
        downloadedCount++;
        showProgress(downloadedCount, totalFiles);
      }
      
    } catch (error) {
      console.warn(`\n  ❌ Ошибка скачивания ${file.path}:`, error.message);
      downloadedCount++;
      showProgress(downloadedCount, totalFiles);
    }
  }

  console.log(`   ✓ Скачано: ${downloadedFiles.length} из ${totalFiles} файлов`);
  
  const result = {
    projectDir,
    files: downloadedFiles,
    owner,
    repo,
    branch,
    alias,
    timestamp: new Date().toISOString()
  };
  
  // Сохраняем в кеш
  downloadedReposCache.set(cacheKey, result);
  
  // Сохраняем кеш на диск
  saveCacheToFile();
  
  return result;
}

/**
 * Находит главный файл проекта (README.md в корне указанного пути)
 */
function findMainFile(files, subPath = '') {
  const priorities = ['README.md', 'readme.md', 'Readme.md', 'index.md', 'main.md'];
  
  // Сначала ищем в корне указанного пути
  for (const priority of priorities) {
    const found = files.find(file => {
      if (subPath) {
        // Для подпути ищем README в корне этого подпути
        const targetPath = `${subPath}/${priority}`;
        return file.originalPath === targetPath || 
               file.originalPath === `${subPath}/${priority.toLowerCase()}`;
      } else {
        // Для корня репозитория ищем файл в корне
        return !file.originalPath.includes('/') && 
               path.basename(file.originalPath).toLowerCase() === priority.toLowerCase();
      }
    });
    
    if (found) {
      return found;
    }
  }
  
  // Если не найден приоритетный файл, берем первый в корне указанного пути
  const rootFiles = files.filter(file => {
    if (subPath) {
      // Для subPath берем файлы, которые находятся прямо в этой папке (без подпапок)
      const isInSubPath = file.originalPath.startsWith(subPath + '/');
      const hasNoSubdirs = !file.originalPath.substring(subPath.length + 1).includes('/');
      return isInSubPath && hasNoSubdirs;
    } else {
      return !file.originalPath.includes('/');
    }
  });
  
  const mainFile = rootFiles.length > 0 ? rootFiles[0] : files[0];
  return mainFile;
}

/**
 * Создает overview для GitHub проекта на основе README
 */
async function createGitHubProjectOverviewFromRepo(githubUrl, tempDir) {
  try {
    const result = await downloadGitHubRepoMarkdown(githubUrl, tempDir);
    
    if (result.files.length === 0) {
      return null;
    }
    
    // Находим главный файл
    const mainFile = findMainFile(result.files, result.subPath);
    
    if (!mainFile) {
      return null;
    }
    
    // Читаем содержимое главного файла
    const content = fs.readFileSync(mainFile.localPath, 'utf8');
    
    // Извлекаем заголовок из первой строки
    const lines = content.split('\n');
    let title = result.repo.replace(/-/g, ' ').replace(/([A-Z])/g, ' $1').trim();
    
    // Название остается базовым для репозитория
    
    // Ищем заголовок H1
    for (const line of lines) {
      const h1Match = line.match(/^#\s+(.+)$/);
      if (h1Match) {
        title = h1Match[1].trim();
        break;
      }
    }
    
    // Извлекаем описание (первый абзац после заголовка)
    let description = 'Open source project hosted on GitHub';
    let foundTitle = false;
    
    for (const line of lines) {
      if (line.match(/^#\s+/)) {
        foundTitle = true;
        continue;
      }
      
      if (foundTitle && line.trim() && !line.startsWith('#') && !line.startsWith('!') && !line.startsWith('[')) {
        description = line.trim();
        break;
      }
    }
    
    return {
      hasOverviewSection: true,
      title,
      overview: {
        image: null,
        revision: 'Latest',
        status: 'Active',
        price: null,
        descriptions: [description],
        keyFeatures: [
          'Open Source',
          'Community Driven',
          'Version Control'
        ],
        interfaces: [],
        tags: ['GitHub', 'Open Source', result.owner]
      },
      projectData: result
    };
    
  } catch (error) {
    console.warn(`Ошибка создания overview для ${githubUrl}:`, error.message);
    return null;
  }
}

/**
 * Получает HTML путь к файлу в репозитории
 */
function getHtmlPathForRepoFile(repoPath, owner, repo, alias = null) {
  // Конвертируем путь .md файла в .html путь
  let htmlPath = repoPath.replace(/\.md$/, '.html');
  
  // Если файл называется readme.html (любой регистр), заменяем на index.html
  const fileName = path.basename(htmlPath);
  if (/^readme\.html$/i.test(fileName)) {
    const dirPath = path.dirname(htmlPath);
    htmlPath = path.posix.join(dirPath, 'index.html');
  }
  
  // Пытаемся получить псевдоним из глобальной карты если не передан явно
  if (!alias) {
    const { getRepositoryAlias } = require('./config');
    alias = getRepositoryAlias(owner, repo);
  }
  
  // Используем псевдоним если он есть, иначе стандартное название
  const projectDirName = alias || `${owner}-${repo}`;
  return `../${projectDirName}/${htmlPath}`;
}

/**
 * Обрабатывает ссылки в markdown файле GitHub проекта
 */
function processGitHubMarkdownLinks(content, projectData, currentFilePath, allDownloadedRepos = []) {
  const { owner, repo, branch } = projectData;
  
  // Сначала обрабатываем изображения
  content = content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, altText, imagePath) => {
    // Обрабатываем GitHub ссылки на изображения из того же репозитория
    const githubImageMatch = imagePath.match(/https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/blob\/[^\/]+\/(.+)/);
    if (githubImageMatch) {
      const [, urlOwner, urlRepo, imagePathFromMatch] = githubImageMatch;
      // Проверяем, что это тот же репозиторий
      if (urlOwner === owner && urlRepo === repo) {
        
        // Убираем префикс "../" если есть
        const cleanImagePath = imagePathFromMatch.startsWith('../') ? imagePathFromMatch.substring(3) : imagePathFromMatch;
        
        // Проверяем, есть ли это изображение среди скачанных файлов
        // Сначала ищем точное совпадение, потом по имени файла
        let imageFile = projectData.files.find(f => 
          f.type === 'image' && f.originalPath === cleanImagePath
        );
        
        if (!imageFile) {
          // Если точного совпадения нет, ищем по имени файла
          const fileName = path.basename(cleanImagePath);
          imageFile = projectData.files.find(f => 
            f.type === 'image' && path.basename(f.originalPath) === fileName
          );
        }
        
        if (imageFile) {
          // Вычисляем относительный путь от текущего файла к assets/images
          const currentDir = path.dirname(currentFilePath);
          const levelsUp = currentDir.split('/').filter(part => part !== '').length;
          const relativePath = '../'.repeat(levelsUp) + `assets/images/${imageFile.originalPath}`;
          return `![${altText}](${relativePath})`;
        }
      }
    }
    
    // Пропускаем другие абсолютные URL
    if (imagePath.startsWith('http')) {
      return match;
    }
    
    // Обрабатываем относительные пути к изображениям
    let processedImagePath = imagePath;
    
    if (imagePath.startsWith('./') || imagePath.startsWith('../') || !imagePath.startsWith('/')) {
      const currentDir = path.dirname(currentFilePath);
      // Используем path.posix.join и нормализуем путь
      const resolvedPath = path.posix.join(currentDir, imagePath);
      processedImagePath = path.posix.normalize(resolvedPath);
      // Убираем ведущий слеш если он есть
      if (processedImagePath.startsWith('/')) {
        processedImagePath = processedImagePath.substring(1);
      }
    } else if (imagePath.startsWith('/')) {
      // Абсолютная ссылка в репозитории
      processedImagePath = imagePath.substring(1); // убираем ведущий слеш
    }
    
    // Проверяем, есть ли это изображение среди скачанных файлов
    const imageFile = projectData.files.find(f => 
      f.type === 'image' && 
      (f.originalPath === processedImagePath || path.basename(f.originalPath) === path.basename(processedImagePath))
    );
    
    if (imageFile) {
      // Изображение скачано в dist/assets/images с сохранением структуры
      // Вычисляем относительный путь от текущего файла к assets/images
      const currentDir = path.dirname(currentFilePath);
      const levelsUp = currentDir.split('/').filter(part => part !== '').length;
      const relativePath = '../'.repeat(levelsUp) + `assets/images/${imageFile.originalPath}`;
      return `![${altText}](${relativePath})`;
    }
    
    return `![${altText}](${processedImagePath})`;
  });
  
  // Обрабатываем ссылки на .md файлы (включая ссылки в изображениях)
  content = content.replace(/\]\(([^)]+\.md(?:#[^)]*)?)\)/g, (match, url) => {
    // Пропускаем абсолютные URL
    if (url.startsWith('http')) {
      return match;
    }
    
    const [filePart, anchor] = url.split('#');
    let targetPath = filePart;
    
    // Если ссылка относительная, разрешаем её относительно текущего файла
    if (filePart.startsWith('./') || filePart.startsWith('../') || !filePart.startsWith('/')) {
      const currentDir = path.dirname(currentFilePath);
      // Используем path.posix.join и нормализуем путь
      const resolvedPath = path.posix.join(currentDir, filePart);
      targetPath = path.posix.normalize(resolvedPath);
      // Убираем ведущий слеш если он есть
      if (targetPath.startsWith('/')) {
        targetPath = targetPath.substring(1);
      }
    } else if (filePart.startsWith('/')) {
      // Абсолютная ссылка в репозитории
      targetPath = filePart.substring(1); // убираем ведущий слеш
    }
    
    // Проверяем, есть ли этот файл в текущем репозитории
    const fileExistsInRepo = projectData.files && projectData.files.some(f => f.originalPath === targetPath);
    
    if (fileExistsInRepo) {
      // Файл есть в текущем репозитории - создаем относительную ссылку
      let htmlPath = targetPath.replace(/\.md$/, '.html');
      
      // Если файл называется readme.html (любой регистр), заменяем на index.html
      const fileName = path.basename(htmlPath);
      if (/^readme\.html$/i.test(fileName)) {
        const dirPath = path.dirname(htmlPath);
        htmlPath = path.posix.join(dirPath, 'index.html');
      }
      
      // Вычисляем относительный путь от текущего файла к целевому файлу
      const currentDir = path.dirname(currentFilePath);
      const relativePath = path.posix.relative(currentDir, htmlPath);
      
      return `](${relativePath}${anchor ? '#' + anchor : ''})`;
    } else {
      // Проверяем, есть ли файл в других скачанных репозиториях
      for (const repoData of allDownloadedRepos) {
        const fileInOtherRepo = repoData.files.find(f => f.originalPath === targetPath);
        if (fileInOtherRepo) {
          const htmlPath = getHtmlPathForRepoFile(targetPath, repoData.owner, repoData.repo, repoData.alias);
          return `](${htmlPath}${anchor ? '#' + anchor : ''})`;
        }
      }
      
      // Файл не найден - оставляем как есть, но конвертируем в .html
      let htmlPath = targetPath.replace(/\.md$/, '.html');
      
      // Если файл называется readme.html (любой регистр), заменяем на index.html
      const fileName = path.basename(htmlPath);
      if (/^readme\.html$/i.test(fileName)) {
        const dirPath = path.dirname(htmlPath);
        htmlPath = path.posix.join(dirPath, 'index.html');
      }
      
      return `](${htmlPath}${anchor ? '#' + anchor : ''})`;
    }
  });
  
  // Обрабатываем ссылки на файлы в том же репозитории (не .md и не .html)
  content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
    // Пропускаем уже обработанные .html ссылки и абсолютные URL
    if (url.startsWith('http') || url.endsWith('.html') || url.startsWith('#')) {
      return match;
    }
    
    // Для ВСЕХ ссылок на файлы внутри репозитория создаем абсолютные GitHub URL
    let targetPath = url;
    
    // Если ссылка относительная, разрешаем её относительно текущего файла
    if (url.startsWith('./') || url.startsWith('../')) {
      const currentDir = path.dirname(currentFilePath);
      const resolvedPath = path.posix.join(currentDir, url);
      targetPath = path.posix.normalize(resolvedPath);
      // Убираем ведущий слеш если он есть
      if (targetPath.startsWith('/')) {
        targetPath = targetPath.substring(1);
      }
    } else if (url.startsWith('/')) {
      // Абсолютная ссылка в репозитории
      targetPath = url.substring(1); // убираем ведущий слеш
    } else if (!url.includes('/') && !url.includes('.')) {
      // Простое имя папки без расширения (например, wiki, hardware)
      // Создаем абсолютную GitHub ссылку на папку
      const githubUrl = `https://github.com/${owner}/${repo}/tree/${branch}/${url}`;
      return `[${linkText}](${githubUrl})`;
    }
    
    // Проверяем, является ли это изображением
    const isImage = /\.(png|jpg|jpeg|gif|svg|webp|bmp|ico)$/i.test(targetPath);
    
    if (isImage) {
      // Проверяем, есть ли это изображение среди скачанных файлов
      const imageFile = projectData.files.find(f => 
        f.type === 'image' && 
        (f.originalPath === targetPath || path.basename(f.originalPath) === path.basename(targetPath))
      );
      
      if (imageFile) {
        // Вычисляем относительный путь от текущего файла к assets/images
        const currentDir = path.dirname(currentFilePath);
        const levelsUp = currentDir.split('/').filter(part => part !== '').length;
        const relativePath = '../'.repeat(levelsUp) + `assets/images/${imageFile.originalPath}`;
        return `[${linkText}](${relativePath})`;
      }
    }
    
    // Создаем абсолютную GitHub ссылку
    const githubUrl = `https://github.com/${owner}/${repo}/blob/${branch}/${targetPath}`;
    return `[${linkText}](${githubUrl})`;
  });
  
  return content;
}

/**
 * Очищает кеш скачанных репозиториев
 */
function clearRepoCache() {
  downloadedReposCache.clear();
  
  // Удаляем файл кеша
  try {
    if (fs.existsSync(CACHE_FILE)) {
      fs.unlinkSync(CACHE_FILE);
    }
  } catch (error) {
    console.warn('⚠️  Ошибка удаления файла кеша:', error.message);
  }
}

/**
 * Получает информацию о кешированных репозиториях
 */
function getCacheInfo() {
  const cached = Array.from(downloadedReposCache.keys());
  return {
    count: cached.length,
    repositories: cached
  };
}

/**
 * Проверяет, есть ли репозиторий в кеше
 */
function isRepoInCache(githubUrl) {
  try {
    const { owner, repo, branch } = parseGitHubUrl(githubUrl);
    const cacheKey = `${owner}/${repo}@${branch}`;
    return downloadedReposCache.has(cacheKey);
  } catch (error) {
    return false;
  }
}

module.exports = {
  downloadFile,
  downloadBinaryFile,
  getGitHubRepoFiles,
  downloadGitHubRepoMarkdown,
  findMainFile,
  createGitHubProjectOverviewFromRepo,
  processGitHubMarkdownLinks,
  getHtmlPathForRepoFile,
  parseGitHubUrl,
  clearRepoCache,
  getCacheInfo,
  isRepoInCache
};