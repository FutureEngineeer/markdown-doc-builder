// projectParser.js - парсер для секции Projects/Versions
const { CSS_CLASSES } = require('./config');
const {
  createMarkdownInstance,
  escapeHtml
} = require('./utils');
const { parseOverviewContent } = require('./overview');
const {
  downloadGitHubRepoMarkdown,
  createGitHubProjectOverviewFromRepo,
  findMainFile
} = require('./githubFetcher');
const fs = require('fs');
const path = require('path');

const md = createMarkdownInstance({
  html: true,
  breaks: false,
  linkify: true,
  typographer: true
});

/**
 * Определение класса статуса по тексту
 */
function getStatusClass(statusText) {
  if (!statusText) return '';
  
  const text = statusText.toLowerCase();
  
  if (text.includes('obsolete')) return 'caution';
  if (text.includes('not recommended') || text.includes('deprecated')) return 'note';
  if (text.includes('active') || text.includes('stable') || text.includes('released')) return 'active';
  if (text.includes('preview') || text.includes('preorder') || text.includes('beta') || text.includes('development')) return 'preview';
  
  return 'active'; // по умолчанию
}

/**
 * Парсинг секции Projects
 * Возвращает массив проектов и очищенный markdown
 */
function parseProjects(markdown) {
  const lines = markdown.split('\n');
  const projects = [];
  const outputLines = [];
  let inSection = false;
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    // Начало секции Projects
    if (trimmed.match(/^##\s+projects/i)) {
      inSection = true;
      outputLines.push(lines[i]); // Сохраняем заголовок секции
      i++;
      continue;
    }

    // Конец секции Projects
    if (inSection && (trimmed.startsWith('## ') || trimmed.match(/^---+$/))) {
      inSection = false;
    }

    if (inSection) {
      // Проект (### заголовок с ссылкой)
      if (trimmed.startsWith('### ')) {
        const titleText = trimmed.substring(4).trim();
        const linkMatch = titleText.match(/\[([^\]]+)\]\(([^)]+)\)/);

        if (linkMatch) {
          const project = {
            title: linkMatch[1],
            link: linkMatch[2],
            description: ''
          };

          i++;

          // Собираем описание до следующего ### или ##
          let descriptionLines = [];
          while (i < lines.length) {
            const nextLine = lines[i].trim();
            if (nextLine.startsWith('### ') || nextLine.startsWith('## ') || nextLine.match(/^---+$/)) {
              break;
            }
            if (nextLine) {
              descriptionLines.push(nextLine);
            }
            i++;
          }

          project.description = descriptionLines.join(' ').trim();
          projects.push(project);
          continue;
        }
      }

      // Все остальное в секции игнорируем (не добавляем в output)
      i++;
      continue;
    }

    // Все остальное добавляем в output
    outputLines.push(lines[i]);
    i++;
  }

  return {
    projects,
    cleanedMarkdown: outputLines.join('\n')
  };
}

/**
 * Загрузка overview из файла проекта или GitHub
 */
async function loadProjectOverview(projectLink, baseDir = '.', tempDir = './temp') {
  try {
    // GitHub проекты - скачиваем и создаем overview
    if (projectLink.startsWith('https://github.com/')) {
      // Парсим URL чтобы получить информацию о subPath
      const { parseGitHubUrl } = require('./githubFetcher');
      const { owner, repo, subPath } = parseGitHubUrl(projectLink);
      
      // Получаем псевдоним из конфигурации
      const { getRepositoryAlias } = require('./config');
      const alias = getRepositoryAlias(owner, repo);
      
      // Скачиваем полный репозиторий с псевдонимом
      const result = await downloadGitHubRepoMarkdown(`https://github.com/${owner}/${repo}`, tempDir, alias);
      
      if (result.files.length === 0) {
        return null;
      }
      
      // Находим главный файл для указанного subPath (или корня если subPath нет)
      const mainFile = findMainFile(result.files, subPath || '');
      
      if (!mainFile) {
        return null;
      }
      
      // Читаем содержимое главного файла
      const content = fs.readFileSync(mainFile.localPath, 'utf8');
      
      // Извлекаем заголовок из первой строки
      const lines = content.split('\n');
      let title = repo.replace(/-/g, ' ').replace(/([A-Z])/g, ' $1').trim();
      
      // Если есть subPath, добавляем его к названию
      if (subPath) {
        const subPathName = subPath.split('/').pop().replace(/-/g, ' ');
        title = `${title} - ${subPathName}`;
      }
      
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
          tags: ['GitHub', 'Open Source', owner]
        },
        projectData: { ...result, subPath }
      };
    }

    // Внешние ссылки (не GitHub) - не можем загрузить
    if (projectLink.startsWith('http')) {
      return null;
    }

    // Локальная ссылка
    let filePath;
    if (projectLink.startsWith('./') || projectLink.startsWith('../')) {
      filePath = path.resolve(baseDir, projectLink);
    } else {
      filePath = path.resolve(baseDir, projectLink);
    }

    // Проверяем существование файла
    if (!fs.existsSync(filePath)) {
      return null;
    }

    // Читаем и парсим файл
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Вычисляем относительный путь от файла проекта к корню
    const projectDir = path.dirname(filePath);
    const relativeToRoot = path.relative(projectDir, baseDir) || './';
    const normalizedRelativeRoot = relativeToRoot.replace(/\\/g, '/') + (relativeToRoot ? '/' : '');
    
    const pageData = parseOverviewContent(content, normalizedRelativeRoot);

    return pageData.hasOverviewSection ? pageData : null;
  } catch (error) {
    console.warn(`Ошибка загрузки overview для ${projectLink}:`, error.message);
    return null;
  }
}

/**
 * Создание базового overview для GitHub проектов
 */
function createGitHubProjectOverview(githubUrl) {
  // Извлекаем информацию из URL
  const urlMatch = githubUrl.match(/https:\/\/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!urlMatch) return null;

  const [, owner, repo] = urlMatch;

  return {
    hasOverviewSection: true,
    title: repo.replace(/-/g, ' ').replace(/([A-Z])/g, ' $1').trim(),
    overview: {
      image: null,
      revision: 'Latest',
      status: 'Active',
      price: null,
      descriptions: ['Open source project hosted on GitHub'],
      keyFeatures: [
        'Open Source',
        'Community Driven',
        'Version Control'
      ],
      interfaces: [],
      tags: ['GitHub', 'Open Source', owner]
    }
  };
}

/**
 * Определение grid класса для проектов
 */
function determineProjectGridClass(projects) {
  const count = projects.length;

  if (count === 1) return 'grid1';
  if (count === 2 || count === 4) return 'grid2';
  return 'grid3';
}

/**
 * Рендеринг карточек проектов в HTML
 */
async function renderProjectCards(projects, baseDir = '.', relativeRoot = './', tempDir = './temp') {
  const cls = CSS_CLASSES;
  if (projects.length === 0) return '';

  const gridClass = determineProjectGridClass(projects);

  // Обрабатываем проекты асинхронно
  const cardsPromises = projects.map(async project => {
    // Загружаем overview из файла проекта
    const overview = await loadProjectOverview(project.link, baseDir, tempDir);

    if (!overview) {
      // Если нет overview, создаем простую карточку
      return `<div class="${cls.productCard} clickable">
        <div class="${cls.productContent}">
          <div class="${cls.productDetails}">
            <h3 class="${cls.cardTitle}">${escapeHtml(project.title)}</h3>
            <p class="${cls.description}">Overview not available</p>
          </div>
        </div>
        <button class="${cls.projectButton}" onclick="window.location.href='${project.link}'">
          See Details
        </button>
      </div>`;
    }

    const ov = overview.overview;

    // Изображение проекта с правильным путем
    let imageSrc = ov.image;
    if (imageSrc && !imageSrc.startsWith('http')) {
      // Если путь относительный, корректируем его
      if (imageSrc.startsWith('./assets/') || imageSrc.startsWith('assets/')) {
        imageSrc = imageSrc.replace(/^\.?\/assets\//, `${relativeRoot}assets/`);
      } else if (imageSrc.startsWith('../')) {
        // Обрабатываем пути типа ../../assets/image.gif
        const segments = imageSrc.split('/');
        const assetIndex = segments.findIndex(seg => seg === 'assets');
        if (assetIndex !== -1) {
          // Берем путь от assets и далее
          const assetPath = segments.slice(assetIndex).join('/');
          imageSrc = `${relativeRoot}${assetPath}`;
        } else {
          // Если нет папки assets, просто берем имя файла
          imageSrc = `${relativeRoot}assets/${path.basename(imageSrc)}`;
        }
      }
    }

    const imageHtml = imageSrc ?
      `<div class="${cls.productImage}">
        <img src="${imageSrc}" alt="${escapeHtml(overview.title)}" loading="lazy">
      </div>` :
      `<div class="${cls.productImage}">
        <div class="${cls.productImagePlaceholder}">📁</div>
      </div>`;

    // Статус и версия проекта в одной строке
    const statusClass = getStatusClass(ov.status);
    const statusVersionHtml = (ov.status || ov.revision) ?
      `<div class="${cls.statusVersionRow}">
        ${ov.status ? `<div class="${cls.status}">
          <span class="${cls.statusDot} ${statusClass}"></span>
          <span class="${statusClass}">${ov.status}</span>
        </div>` : ''}
        ${ov.revision ? `<span class="${cls.versionPill}">${ov.revision}</span>` : ''}
      </div>` : '';

    // Описание (берем первое из descriptions или используем краткое описание)
    const description = ov.descriptions.length > 0 ? ov.descriptions[0] :
      (project.description || 'No description available');

    // Ключевые особенности (показываем первые 3)
    const featuresHtml = ov.keyFeatures.length > 0 ?
      `<div class="${cls.specs}">
        <ul>
          ${ov.keyFeatures.slice(0, 3).map(feat => `<li>${feat}</li>`).join('')}
        </ul>
      </div>` : '';

    // Теги
    const tagsHtml = ov.tags.length > 0 ?
      `<div class="${cls.tags}">
        ${ov.tags.slice(0, 4).map(tag => `<span class="${cls.tag}">${tag}</span>`).join('')}
      </div>` : '';

    // Определяем ссылку - для GitHub проектов создаем локальную ссылку на главную страницу
    let targetLink = project.link;
    let buttonAction;

    if (project.link.startsWith('https://github.com/')) {
      // Для GitHub проектов создаем ссылку на локальную страницу
      if (overview.projectData) {
        const { owner, repo, subPath, alias } = overview.projectData;
        // Используем псевдоним если он есть, иначе стандартное название
        const projectDirName = alias || `${owner}-${repo}`;
        
        if (subPath) {
          // Если есть subPath, ссылаемся на конкретный файл в репозитории
          const subPathFile = findMainFile(overview.projectData.files, subPath);
          if (subPathFile) {
            const htmlPath = subPathFile.originalPath.replace(/\.md$/i, '.html');
            targetLink = `${relativeRoot}${projectDirName}/${htmlPath}`;
          } else {
            targetLink = `${relativeRoot}${projectDirName}/index.html`;
          }
        } else {
          // Без subPath ссылаемся на главную страницу репозитория
          targetLink = `${relativeRoot}${projectDirName}/index.html`;
        }
        
        buttonAction = `window.location.href='${targetLink}'`;
      } else {
        buttonAction = `window.open('${project.link}', '_blank')`;
      }
    } else if (!project.link.startsWith('http')) {
      // Локальные проекты
      targetLink = project.link.replace(/\.md$/i, '.html');
      buttonAction = `window.location.href='${targetLink}'`;
    } else {
      // Другие внешние ссылки
      buttonAction = `window.open('${project.link}', '_blank')`;
    }

    return `<div class="${cls.productCard} clickable">
      <div class="${cls.productContent}">
        ${imageHtml}
        
        <div class="${cls.productDetails}">
          ${statusVersionHtml}
          <div class="${cls.cardHeader}">
            <h2 class="${cls.cardTitle}">${escapeHtml(overview.title)}</h2>
          </div>
          <p class="${cls.description}">${description}</p>
          ${featuresHtml}
          ${tagsHtml}
        </div>
      </div>
      <button class="${cls.projectButton}" onclick="${buttonAction}">
        ${project.link.startsWith('https://github.com/') && overview.projectData ? 'See Details' :
        project.link.startsWith('http') ? 'View on GitHub' : 'See Details'}
      </button>
    </div>`;
  });

  const cardsHtml = (await Promise.all(cardsPromises)).join('\n    ');

  return `<div class="${cls[gridClass]}">
    ${cardsHtml}
  </div>`;
}

// Кеш созданных HTML страниц для репозиториев
const generatedHtmlCache = new Set();

/**
 * Создание HTML страниц для GitHub проекта
 */
async function createGitHubProjectPages(projectData, outputDir, converter, allDownloadedRepos = []) {
  if (!projectData || !projectData.files || projectData.files.length === 0) {
    return;
  }

  const { owner, repo, files, branch, alias } = projectData;
  // Используем псевдоним если он есть, иначе стандартное название
  const projectName = alias || `${owner}-${repo}`;
  const projectOutputDir = path.join(outputDir, projectName);
  
  console.log(`   DEBUG: alias=${alias}, projectName=${projectName}, outputDir=${outputDir}, projectOutputDir=${projectOutputDir}`);
  
  // Создаем уникальный ключ для кеша HTML генерации (используем псевдоним как основной ключ)
  const projectDirName = alias || `${owner}-${repo}`;
  const htmlCacheKey = `${projectDirName}@${branch || 'main'}`;
  
  // Проверяем, были ли уже созданы HTML страницы для этого проекта
  if (generatedHtmlCache.has(htmlCacheKey)) {
    return;
  }

  // Создаем папку для проекта
  if (!fs.existsSync(projectOutputDir)) {
    fs.mkdirSync(projectOutputDir, { recursive: true });
  }

  const displayName = alias || `${owner}/${repo}`;
  console.log(`\n📄 ${displayName}`);

  // Находим главный файл для создания index.html (корневой README)
  const { findMainFile, processGitHubMarkdownLinks } = require('./githubFetcher');
  const mainFile = findMainFile(files, '');

  for (const file of files) {
    try {
      let content = fs.readFileSync(file.localPath, 'utf8');
      
      // Обрабатываем ссылки в markdown
      content = processGitHubMarkdownLinks(content, projectData, file.localRelativePath, allDownloadedRepos);
      
      // Определяем структуру выходных файлов (сохраняем иерархию)
      let outputRelativePath;
      if (file === mainFile) {
        outputRelativePath = 'index.html'; // Главный файл становится index.html
      } else {
        // Сохраняем структуру папок (игнорируем регистр .md)
        outputRelativePath = file.localRelativePath.replace(/\.md$/i, '.html');
        
        // Если файл называется README.md (любой регистр), заменяем на index.html
        const fileName = path.basename(outputRelativePath);
        if (/^readme\.html$/i.test(fileName)) {
          const dirPath = path.dirname(outputRelativePath);
          outputRelativePath = path.join(dirPath, 'index.html');
        }
      }
      
      const outputPath = path.join(projectOutputDir, outputRelativePath);
      
      // Создаем папки если нужно
      const outputFileDir = path.dirname(outputPath);
      if (!fs.existsSync(outputFileDir)) {
        fs.mkdirSync(outputFileDir, { recursive: true });
      }
      
      // Создаем HTML содержимое с правильным путем для расчета относительных ссылок
      const fullOutputPath = path.join(outputDir, projectName, outputRelativePath);
      
      // Используем правильную функцию для конвертации содержимого
      const { convertSingleProjectFile } = require('../converter');
      // Формируем breadcrumb: проект / название файла
      const projectDisplayName = alias || repo;
      const fileNameWithoutExt = path.basename(outputRelativePath, '.html');
      
      // Для index.html (главного файла) используем "readme"
      let breadcrumbFileName = fileNameWithoutExt === 'index' ? 'readme' : fileNameWithoutExt;
      
      const breadcrumbTitle = `${projectDisplayName} / ${breadcrumbFileName}`;
      const htmlContent = convertSingleProjectFile(content, breadcrumbFileName, breadcrumbTitle, fullOutputPath);
      
      // Сохраняем файл
      fs.writeFileSync(outputPath, htmlContent);
      console.log(`   ✓ ${outputRelativePath}`);

    } catch (error) {
      console.warn(`   ✗ ${file.originalPath}: ${error.message}`);
    }
  }

  // Добавляем в кеш созданных HTML страниц
  generatedHtmlCache.add(htmlCacheKey);
}

/**
 * Создание HTML страниц для всех .md файлов в директории
 */
async function createHtmlPagesForDirectory(dirPath, outputDir, converter, preserveStructure = true) {
  if (!fs.existsSync(dirPath)) {
    return;
  }

  // Убеждаемся, что выходная папка существует
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const files = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const file of files) {
    const fullPath = path.join(dirPath, file.name);

    if (file.isDirectory()) {
      // Рекурсивно обрабатываем подпапки
      const subOutputDir = preserveStructure ?
        path.join(outputDir, file.name) :
        outputDir;

      if (preserveStructure && !fs.existsSync(subOutputDir)) {
        fs.mkdirSync(subOutputDir, { recursive: true });
      }
      await createHtmlPagesForDirectory(fullPath, subOutputDir, converter, preserveStructure);
    } else if (/\.md$/i.test(file.name)) {
      // Конвертируем .md файл в .html (игнорируем регистр)
      // Если файл README.md (любой регистр), то создаем index.html
      const isReadme = /^readme\.md$/i.test(file.name);
      const htmlFileName = isReadme ? 'index.html' : file.name.replace(/\.md$/i, '.html');
      const outputPath = path.join(outputDir, htmlFileName);

      // Убеждаемся, что папка для выходного файла существует
      const outputFileDir = path.dirname(outputPath);
      if (!fs.existsSync(outputFileDir)) {
        fs.mkdirSync(outputFileDir, { recursive: true });
      }

      try {
        const markdownContent = fs.readFileSync(fullPath, 'utf8');
        const htmlContent = await converter(fullPath, outputPath);
        console.log(`✓ ${path.relative(process.cwd(), outputPath)}`);
      } catch (error) {
        console.warn(`❌ Error converting ${fullPath}:`, error.message);
      }
    }
  }
}

/**
 * Очищает кеш созданных HTML страниц
 */
function clearHtmlGenerationCache() {
  generatedHtmlCache.clear();
}

/**
 * Получает информацию о кеше HTML генерации
 */
function getHtmlCacheInfo() {
  return {
    count: generatedHtmlCache.size,
    repositories: Array.from(generatedHtmlCache)
  };
}

/**
 * Проверяет, были ли уже созданы HTML страницы для репозитория
 */
function isHtmlGenerated(owner, repo, branch = 'main', alias = null) {
  const projectDirName = alias || `${owner}-${repo}`;
  const htmlCacheKey = `${projectDirName}@${branch}`;
  return generatedHtmlCache.has(htmlCacheKey);
}

module.exports = {
  parseProjects,
  renderProjectCards,
  loadProjectOverview,
  createGitHubProjectOverview,
  createGitHubProjectPages,
  createHtmlPagesForDirectory,
  determineProjectGridClass,
  clearHtmlGenerationCache,
  getHtmlCacheInfo,
  isHtmlGenerated
};