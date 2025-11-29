// converter.js - Optimized version
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { CSS_CLASSES, getSiteConfig, getSectionKeywords, getExternalAssets, isRepositoryAllowed, getConfig } = require('./components/config');
const { generateHeader } = require('./components/header');
const { generateFooter } = require('./components/footer');
const { generateHamburgerMenu } = require('./components/hamburgerMenu');
const { generateNewSectionMap } = require('./components/newSectionMap');
const { parseOverviewContent, removeOverviewFromMarkdown, generateProductCard } = require('./components/overview');
const { parseMarkdownWithCards, renderCards } = require('./components/cardParser');
const { parseSpecifications, renderSpecificationCards, isSpecificationDocument } = require('./components/specParser');
const { parseProjects, renderProjectCards, loadProjectOverview, createGitHubProjectPages, createHtmlPagesForDirectory } = require('./components/projectParser');
const { processAnalytics } = require('./components/analytics');
const { processSelectorsInMarkdown, replaceSelectorPlaceholders } = require('./components/selectorParser');
const { generateModularScripts, getExternalDependencies } = require('./components/scriptLoader');
const { 
  createMarkdownInstance, 
  escapeHtml, 
  matchesKeywords,
  slugify
} = require('./components/utils');



// Создаем экземпляр markdown-it (с table-wrapper из utils)
const md = createMarkdownInstance({
  html: true,
  breaks: false,
  linkify: true,
  typographer: true
});

// Переопределяем рендеринг ссылок для добавления target="_blank" к внешним ссылкам
md.renderer.rules.link_open = function(tokens, idx, options, env, self) {
  const token = tokens[idx];
  const hrefIndex = token.attrIndex('href');
  
  if (hrefIndex >= 0) {
    const href = token.attrs[hrefIndex][1];
    
    // Проверяем, является ли ссылка внешней
    if (href.startsWith('http://') || href.startsWith('https://')) {
      // Добавляем target="_blank" и rel="noopener noreferrer" для безопасности
      token.attrSet('target', '_blank');
      token.attrSet('rel', 'noopener noreferrer');
    }
  }
  
  return self.renderToken(tokens, idx, options);
};


// ============================================
// CODE BLOCKS RENDERER
// ============================================


md.renderer.rules.fence = function(tokens, idx, options, env, self) {
  const token = tokens[idx];
  const info = token.info ? token.info.trim() : '';
  const langName = info ? info.split(/\s+/g)[0] : '';
  
  // Обрезаем пробелы и новые строки в начале и конце
  const trimmedContent = token.content ? token.content.trim() : '';
  
  // Отладка: проверяем что контент не пустой
  if (!trimmedContent) {
    console.warn('Empty code block content detected');
  }
  
  // ВАЖНО: экранируем ВСЁ содержимое
  const content = escapeHtml(trimmedContent);
  const langDisplay = escapeHtml(langName || 'text');
  const langClass = escapeHtml(langName || '');
  
  return '<pre><code class="language-' + langClass + '">' + content + '</code></pre>\n';
};


/**
 * Генерирует теги для favicon
 * @param {string} outputFile - Путь к выходному HTML файлу для корректных относительных путей
 * @param {Object} config - Конфигурация (опционально)
 */
function generateFaviconTags(outputFile = '', config = null) {
  const faviconConfig = config?.favicon || getSiteConfig().favicon;
  
  if (!faviconConfig) {
    return '';
  }

  const relativeRoot = getRelativePathToRoot(outputFile);
  const tags = [];
  
  // ICO для старых браузеров (32x32 fixes Chrome bug)
  if (faviconConfig.ico) {
    let href = faviconConfig.ico;
    if (!href.startsWith('http')) {
      href = href.startsWith('./') ? href.substring(2) : href;
      href = relativeRoot + href;
    }
    tags.push(`  <link rel="icon" href="${href}" sizes="32x32">`);
  }
  
  // SVG для современных браузеров
  if (faviconConfig.svg) {
    let href = faviconConfig.svg;
    if (!href.startsWith('http')) {
      href = href.startsWith('./') ? href.substring(2) : href;
      href = relativeRoot + href;
    }
    tags.push(`  <link rel="icon" href="${href}" type="image/svg+xml">`);
  }
  
  // Apple Touch Icon
  if (faviconConfig.appleTouchIcon) {
    let href = faviconConfig.appleTouchIcon;
    if (!href.startsWith('http')) {
      href = href.startsWith('./') ? href.substring(2) : href;
      href = relativeRoot + href;
    }
    tags.push(`  <link rel="apple-touch-icon" href="${href}">`);
  }
  
  // Web manifest для PWA
  if (faviconConfig.manifest) {
    let href = faviconConfig.manifest;
    if (!href.startsWith('http')) {
      // Для manifest убираем начальный слеш, если есть
      href = href.startsWith('/') ? href.substring(1) : href;
      href = href.startsWith('./') ? href.substring(2) : href;
      href = relativeRoot + href;
    }
    tags.push(`  <link rel="manifest" href="${href}">`);
  }
  
  return tags.join('\n');
}

// ============================================
// ГЛОБАЛЬНОЕ СОСТОЯНИЕ И КОНФИГУРАЦИЯ
// ============================================

class DocumentProcessor {
  constructor() {
    this.currentSection = null;
    this.sectionStack = [];
    this.config = null;
    this.anchors = new Map(); // Для якорей заголовков
    this.crossReferences = new Map(); // Для связей между файлами
  }

  reset() {
    this.currentSection = null;
    this.sectionStack = [];
    this.anchors.clear();
    this.crossReferences.clear();
  }

  loadConfig(configPath) {
    try {
      if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, 'utf-8');
        const yamlConfig = yaml.load(configContent);
        
        // Преобразуем YAML конфигурацию в формат, ожидаемый конвертером
        const defaultSiteConfig = getSiteConfig();
        this.config = {
          siteName: yamlConfig.site?.name || defaultSiteConfig.siteName,
          logoPath: yamlConfig.favicon?.svg || defaultSiteConfig.logoPath,
          breadcrumb: yamlConfig.site?.title || defaultSiteConfig.breadcrumb,
          favicon: {
            ico: yamlConfig.favicon?.ico || defaultSiteConfig.favicon.ico,
            svg: yamlConfig.favicon?.svg || defaultSiteConfig.favicon.svg,
            appleTouchIcon: yamlConfig.favicon?.appleTouchIcon || defaultSiteConfig.favicon.appleTouchIcon,
            manifest: yamlConfig.favicon?.manifest || defaultSiteConfig.favicon.manifest
          },
          navigation: yamlConfig.navigation || defaultSiteConfig.navigation,
          socials: yamlConfig.socials || defaultSiteConfig.socials
        };
        
        return this.config;
      }
    } catch (error) {
      console.warn(`Warning: Could not load config from ${configPath}:`, error.message);
    }
    return null;
  }
}

const processor = new DocumentProcessor();



// ============================================
// РЕНДЕРИНГ MARKDOWN
// ============================================



md.renderer.rules.hr = function(tokens, idx) {
  if (processor.sectionStack.length > 0) {
    processor.sectionStack.pop();
    processor.currentSection = null;
    return '</div></section>\n<hr class="section-divider" />\n';
  }
  return '<hr />\n';
};



const defaultHeadingOpen = md.renderer.rules.heading_open || 
  function(tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options);
  };



md.renderer.rules.heading_close = function(tokens, idx, options, env, self) {
  const token = tokens[idx];
  const level = parseInt(token.tag.substring(1), 10);
  
  // Для H2 заголовков не рендерим закрывающий тег, так как мы уже создали полный HTML
  if (level === 2) {
    return '';
  }
  
  // Для H1 заголовков проверяем, был ли скрыт opening тег
  if (level === 1) {
    // Находим соответствующий opening токен
    const openingIdx = idx - 2; // обычно opening, inline, closing
    if (openingIdx >= 0) {
      const openingToken = tokens[openingIdx];
      const inlineToken = tokens[openingIdx + 1];
      const titleText = inlineToken ? inlineToken.content : '';
      
      // Проверяем, есть ли Overview секция (такая же логика как в heading_open)
      let hasOverviewSection = false;
      for (let j = openingIdx + 2; j < tokens.length; j++) {
        const futureToken = tokens[j];
        if (futureToken.type === 'heading_open' && futureToken.tag === 'h2') {
          const futureContent = tokens[j + 1];
          if (futureContent && /overview|about|summary/i.test(futureContent.content)) {
            hasOverviewSection = true;
          }
          break;
        }
      }
      
      // Если H1 был скрыт, не рендерим и закрывающий тег
      if (hasOverviewSection) {
        return '';
      }
      
      // Для обычного H1 добавляем якорную ссылку
      const anchorId = slugify(titleText);
      return `<a href="#${anchorId}" class="anchor-link" aria-label="Ссылка на раздел" title="Скопировать ссылку">#</a></h1>`;
    }
  }
  
  // Для H3+ добавляем якорную ссылку
  if (level >= 3) {
    const openingIdx = idx - 2;
    if (openingIdx >= 0) {
      const inlineToken = tokens[openingIdx + 1];
      const titleText = inlineToken ? inlineToken.content : '';
      const anchorId = slugify(titleText);
      return `<a href="#${anchorId}" class="anchor-link" aria-label="Ссылка на раздел" title="Скопировать ссылку">#</a></${token.tag}>`;
    }
  }
  
  // Для остальных используем стандартный рендеринг
  return self.renderToken(tokens, idx, options);
};

md.renderer.rules.heading_open = function(tokens, idx, options, env, self) {
  const token = tokens[idx];
  const level = parseInt(token.tag.substring(1), 10);
  const nextToken = tokens[idx + 1];
  const titleText = nextToken ? nextToken.content : '';

  const cls = CSS_CLASSES;
  let html = '';

  // Генерируем якорь для заголовка
  const anchorId = slugify(titleText);
  processor.anchors.set(titleText, anchorId);

  // Проверяем, содержит ли заголовок слово "specification"
  const isSpecificationSection = /specification/i.test(titleText);
  
  if (level === 1) {
    // H1 интегрируется в product card ТОЛЬКО если есть секция Overview
    // Проверяем следующие токены, чтобы найти первый H2
    let hasOverviewSection = false;
    for (let j = idx + 2; j < tokens.length; j++) {
      const futureToken = tokens[j];
      if (futureToken.type === 'heading_open' && futureToken.tag === 'h2') {
        const futureContent = tokens[j + 1];
        if (futureContent && /overview|about|summary/i.test(futureContent.content)) {
          hasOverviewSection = true;
        }
        break;
      }
    }
    
    token.attrSet('id', anchorId);
    
    // Если есть Overview секция, H1 будет в product card
    if (hasOverviewSection) {
      return ''; // Скрываем стандартный H1
    }
    
    // Если нет Overview секции, рендерим как обычный H1 с якорной ссылкой
    token.attrSet('class', 'heading-with-anchor');
    return defaultHeadingOpen(tokens, idx, options, env, self);
  }

  if (level === 2) {
    let sectionType = null;

    for (const [type, keywords] of Object.entries(getSectionKeywords())) {
      if (type === 'overview') continue;
      if (matchesKeywords(titleText.toLowerCase(), keywords)) {
        sectionType = type;
        break;
      }
    }

    processor.currentSection = sectionType;

    if (processor.sectionStack.length > 0) {
      html += '</div></section>\n';
      processor.sectionStack.pop();
    }

    // ВАЖНО: обнуляем inline-токен, чтобы текст не выводился второй раз
    if (nextToken) {
      nextToken.content = '';
      if (nextToken.children) {
        nextToken.children = [];
      }
    }

    const sectionId = anchorId || (sectionType || 'section').toLowerCase().replace(/\s+/g, '-');

    html += `<section id="${sectionId}" class="${cls.section}">\n` +
            `<h2 id="${anchorId}" class="${cls.sectionTitle} heading-with-anchor">${escapeHtml(titleText)}<a href="#${anchorId}" class="anchor-link" aria-label="Ссылка на раздел" title="Скопировать ссылку">#</a></h2>\n` +
            `<div class="${cls.sectionContent}">\n`;

    processor.sectionStack.push(sectionType || 'generic');
    
    // Если это секция спецификаций, устанавливаем флаг
    if (isSpecificationSection) {
      processor.currentSection = 'specifications';
    }
    
    // Возвращаем html и пропускаем стандартный рендеринг
    return html;
  }

  if (level >= 3) {
    // Если мы в секции спецификаций или родительский заголовок содержит "specification"
    if (isSpecificationSection || processor.currentSection === 'specifications') {
      token.attrSet('class', 'spec-card heading-with-anchor');
    } else {
      token.attrSet('class', 'subsection-title heading-with-anchor');
    }
    token.attrSet('id', anchorId);
  }

  return defaultHeadingOpen(tokens, idx, options, env, self);
};



// ============================================
// ГЕНЕРАЦИЯ ТЕГОВ СТИЛЕЙ И СКРИПТОВ
// ============================================



/**
 * Вычисляет относительный путь к корню проекта на основе выходного файла
 * @param {string} outputFile - Путь к выходному HTML файлу
 * @returns {string} Относительный путь к корню (например, "../" или "../../")
 */
function getRelativePathToRoot(outputFile) {
  if (!outputFile) return './';
  
  // Нормализуем путь и разделяем на части
  let normalizedPath = path.normalize(outputFile).replace(/\\/g, '/');
  
  // Если путь абсолютный, делаем его относительным от текущей директории
  if (path.isAbsolute(outputFile)) {
    const cwd = process.cwd().replace(/\\/g, '/');
    if (normalizedPath.startsWith(cwd)) {
      normalizedPath = normalizedPath.substring(cwd.length + 1);
    }
  }
  
  const pathParts = normalizedPath.split('/');
  
  // Находим индекс папки dist
  const distIndex = pathParts.findIndex(part => part === 'dist');
  
  if (distIndex === -1) {
    // Если нет папки dist, считаем от корня проекта
    const folderDepth = pathParts.length - 1;
    return folderDepth <= 0 ? './' : '../'.repeat(folderDepth);
  }
  
  // Считаем уровни вложенности после dist (исключая имя файла)
  const levelsAfterDist = pathParts.length - distIndex - 2; // -1 для имени файла, -1 для самой папки dist
  
  if (levelsAfterDist <= 0) {
    // Файл находится прямо в dist/
    return './';
  }
  
  // Для каждого уровня вложенности после dist добавляем "../"
  return '../'.repeat(levelsAfterDist);
}

/**
 * Генерирует теги <link> для CSS - включая динамические зависимости
 * @param {string} outputFile - Путь к выходному HTML файлу для корректных относительных путей
 * @param {string} htmlContent - HTML контент для определения необходимых стилей
 * @param {Object} config - Конфигурация
 * @returns {string} HTML теги стилей
 */
function generateStylesheets(outputFile = '', htmlContent = '', config = null) {
  const externalAssets = getExternalAssets();
  const relativeRoot = getRelativePathToRoot(outputFile);
  
  const stylesheets = [];
  
  // Добавляем базовые стили из конфигурации
  if (externalAssets && externalAssets.stylesheets) {
    stylesheets.push(...externalAssets.stylesheets);
  }
  
  // Добавляем динамические зависимости на основе контента
  if (htmlContent) {
    const dependencies = getExternalDependencies(htmlContent, config || processor.config || getConfig());
    const cssDepend = dependencies.filter(dep => dep.type === 'stylesheet');
    stylesheets.push(...cssDepend);
  }

  if (stylesheets.length === 0) {
    return '';
  }

  return stylesheets
    .map(css => {
      const integrity = css.integrity 
        ? ` integrity="${css.integrity}" crossorigin="${css.crossorigin || 'anonymous'}"` 
        : '';
      
      let href = css.href;
      // Для локальных файлов корректируем путь
      if (css.type === 'local' && !href.startsWith('http')) {
        href = href.startsWith('./') ? href.substring(2) : href;
        href = relativeRoot + href;
      }
      
      return `  <link rel="stylesheet" href="${href}"${integrity}>`;
    })
    .join('\n');
}


/**
 * Генерирует теги <script> для JS - теперь использует модульную систему
 * @param {string} outputFile - Путь к выходному HTML файлу для корректных относительных путей
 * @param {string} htmlContent - HTML контент для определения необходимых скриптов
 * @param {Object} config - Конфигурация
 * @returns {string} HTML теги скриптов
 */
function generateScripts(outputFile = '', htmlContent = '', config = null) {
  // Используем модульную систему для генерации скриптов
  return generateModularScripts(htmlContent, outputFile, config || processor.config || getConfig());
}



// ============================================
// МУЛЬТИФАЙЛОВАЯ ПОДДЕРЖКА
// ============================================

function processMultipleFiles(files, outputDir, configPath = null) {
  const results = [];
  
  // Загружаем конфигурацию
  if (configPath && fs.existsSync(configPath)) {
    processor.loadConfig(configPath);
  }

  // Первый проход - собираем все якоря и ссылки
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    collectAnchorsAndReferences(content, file);
  });

  // Второй проход - обрабатываем файлы
  files.forEach(file => {
    // Сохраняем структуру папок в выходной директории
    const relativePath = path.relative(process.cwd(), file);
    let outputPath = relativePath.replace('.md', '.html');
    
    // Если файл README.md (любой регистр), то создаем index.html
    const fileName = path.basename(relativePath);
    if (/^readme\.md$/i.test(fileName)) {
      const dirPath = path.dirname(outputPath);
      outputPath = path.join(dirPath, 'index.html');
    }
    
    outputPath = path.join(outputDir, outputPath);
    
    // Создаем папки если нужно
    const outputDirForFile = path.dirname(outputPath);
    if (!fs.existsSync(outputDirForFile)) {
      fs.mkdirSync(outputDirForFile, { recursive: true });
    }
    
    const result = convertMarkdownToHTML(file, outputPath, configPath);
    results.push(result);
  });

  return results;
}

function convertSingleProjectFile(markdownContent, projectFileName, projectTitle, outputFile) {
  // Сохраняем текущий процессор
  const originalProcessor = processor;
  
  // Создаем временный процессор для проекта
  processor.reset();
  if (originalProcessor.config) {
    processor.config = originalProcessor.config;
  }
  
  // Вычисляем относительный путь к корню для изображений
  const relativeRoot = getRelativePathToRoot(outputFile);
  
  // Сохраняем оригинальный markdown для проверки типа документа
  const originalMarkdown = markdownContent;
  
  // Парсим содержимое проекта
  const projectPageData = parseOverviewContent(markdownContent, relativeRoot);
  let projectMarkdown = removeOverviewFromMarkdown(markdownContent);
  
  // Проверяем, является ли документ спецификацией
  const isSpecDoc = isSpecificationDocument(originalMarkdown);
  
  let specHtml = '';
  if (isSpecDoc) {
    // Парсим спецификации
    const specResult = parseSpecifications(projectMarkdown);
    if (specResult.cards && specResult.cards.length > 0) {
      specHtml = renderSpecificationCards(specResult.cards);
      projectMarkdown = specResult.cleanedMarkdown;
    }
  }
  
  // Рендерим содержимое
  let projectContentHtml = md.render(projectMarkdown);
  
  // Закрываем все открытые секции
  while (processor.sectionStack.length > 0) {
    projectContentHtml += '</div></section>\n';
    processor.sectionStack.pop();
  }
  
  // Если это документ спецификации, вставляем карточки после H1
  if (isSpecDoc && specHtml) {
    const h1Regex = /(<h1[^>]*>.*?<\/h1>)/i;
    const match = projectContentHtml.match(h1Regex);
    
    if (match) {
      const h1Element = match[1];
      const replacement = `${h1Element}\n\n<div style="margin-top: 2rem;">\n${specHtml}\n</div>`;
      projectContentHtml = projectContentHtml.replace(h1Element, replacement);
    }
  }
  
  const projectProductCard = generateProductCard(projectPageData);
  
  // Формируем breadcrumb для проекта
  // Извлекаем корневую папку (самый высокий уровень) из outputFile
  const outputPathParts = outputFile.split(path.sep);
  
  // Находим индекс папки dist
  const distIndex = outputPathParts.findIndex(part => part === 'dist');
  
  // Корневая папка - это первая папка после dist
  const rootFolder = distIndex >= 0 && distIndex < outputPathParts.length - 1 
    ? outputPathParts[distIndex + 1] 
    : outputPathParts[outputPathParts.length - 2];
  
  let projectBreadcrumb;
  if (projectFileName.toLowerCase() === 'readme') {
    // Для readme используем H1 из pageData
    const h1Title = projectPageData.title || projectTitle;
    projectBreadcrumb = `${rootFolder} / ${h1Title}`;
  } else {
    projectBreadcrumb = `${rootFolder} / ${projectFileName}`;
  }
  
  // Генерируем header, footer и навигацию для проекта
  const projectHeader = generateHeader(processor.config || getSiteConfig(), projectFileName, projectBreadcrumb, outputFile);
  const projectFooter = generateFooter(processor.config || getSiteConfig(), relativeRoot);
  
  // Генерируем навигацию для проекта
  const projectHamburgerMenu = generateHamburgerMenu('', outputFile);
  const projectSectionMap = generateNewSectionMap('', outputFile);
  
  // Собираем полный HTML для определения необходимых скриптов
  const fullProjectHtml = projectProductCard + projectContentHtml;
  
  // Генерируем теги
  const projectStyleLinks = generateStylesheets(outputFile, fullProjectHtml, processor.config);
  const projectFaviconTags = generateFaviconTags(outputFile, processor.config);
  const projectScriptTags = generateScripts(outputFile, fullProjectHtml, processor.config);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(projectPageData.title || projectTitle)}</title>
${projectFaviconTags}
${projectStyleLinks}
</head>
<body>
  ${projectHeader}
  <div class="scope">
    ${projectHamburgerMenu}
    ${projectSectionMap}
    <main>
      ${projectProductCard}
      ${projectContentHtml}
    </main>
    ${projectFooter}
  </div>
${projectScriptTags}
</body>
</html>`;
  
  // Восстанавливаем оригинальный процессор
  Object.assign(processor, originalProcessor);
}

function collectAnchorsAndReferences(markdown, filePath) {
  const lines = markdown.split('\n');
  
  lines.forEach(line => {
    // Собираем заголовки для якорей
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const title = headingMatch[2].trim();
      const anchor = slugify(title);
      processor.anchors.set(title, anchor);
      processor.crossReferences.set(`${filePath}#${anchor}`, { file: filePath, anchor, title });
    }

    // Собираем ссылки между файлами
    const linkMatches = line.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g);
    for (const match of linkMatches) {
      const linkText = match[1];
      const linkUrl = match[2];
      
      if (linkUrl.endsWith('.md') || linkUrl.includes('.md#')) {
        processor.crossReferences.set(linkUrl, { 
          text: linkText, 
          originalUrl: linkUrl,
          sourceFile: filePath 
        });
      }
    }
  });
}

function processMarkdownLinks(markdown, currentFile, outputFile) {
  const currentOutputDir = path.dirname(outputFile);
  const projectRoot = process.cwd();
  
  // Загружаем индекс файлов
  const hierarchyPath = path.join(projectRoot, '.temp', 'hierarchy-info.json');
  let allFiles = [];
  let allRepositories = [];
  if (fs.existsSync(hierarchyPath)) {
    try {
      const hierarchyData = JSON.parse(fs.readFileSync(hierarchyPath, 'utf-8'));
      allFiles = hierarchyData.allFiles || [];
      allRepositories = hierarchyData.allRepositories || [];
    } catch (error) {
      console.warn('Warning: Could not load hierarchy-info.json:', error.message);
    }
  }
  
  // Вспомогательная функция для преобразования .md в .html с учетом readme
  function convertMdToHtml(mdPath) {
    const fileName = path.basename(mdPath);
    const isReadme = /^readme\.md$/i.test(fileName);
    return isReadme 
      ? mdPath.replace(/readme\.md$/i, 'index.html')
      : mdPath.replace(/\.md$/i, '.html');
  }
  
  // Функция для поиска файла в индексе (включая репозитории)
  function findFileInIndex(targetPath, currentFilePath) {
    // Нормализуем путь
    let normalizedTarget = targetPath.replace(/\\/g, '/').replace(/^\.\//, '');
    
    // Используем outputFile для определения текущей позиции файла
    // Извлекаем путь относительно dist/
    let currentOutputPath = outputFile.replace(/\\/g, '/');
    const distIndex = currentOutputPath.indexOf('dist/');
    if (distIndex >= 0) {
      currentOutputPath = currentOutputPath.substring(distIndex + 5); // убираем 'dist/'
    }
    
    // Определяем, находится ли текущий файл в репозитории
    let currentRepo = null;
    let currentFileLocalPath = null;
    
    for (const repo of allRepositories) {
      if (currentOutputPath.startsWith(repo.alias + '/')) {
        currentRepo = repo;
        // Извлекаем localRelativePath из outputPath
        // Например: CLN/wiki/CLN17/index.html -> wiki/CLN17/readme.md
        const pathInRepo = currentOutputPath.substring(repo.alias.length + 1); // убираем 'CLN/'
        // Конвертируем обратно из .html в .md
        if (pathInRepo.endsWith('/index.html')) {
          currentFileLocalPath = pathInRepo.replace('/index.html', '/readme.md');
        } else if (pathInRepo.endsWith('.html')) {
          currentFileLocalPath = pathInRepo.replace('.html', '.md');
        }
        break;
      }
    }
    
    // Если текущий файл в репозитории, ищем в файлах этого репозитория
    if (currentRepo) {
      // Получаем данные репозитория из fileStructure
      const hierarchyData = JSON.parse(fs.readFileSync(hierarchyPath, 'utf-8'));
      const fileStructure = hierarchyData.fileStructure || {};
      
      // Ищем репозиторий в структуре
      for (const key in fileStructure) {
        const items = fileStructure[key];
        if (Array.isArray(items)) {
          for (const item of items) {
            if (item.type === 'repository' && item.alias === currentRepo.alias) {
              // Нашли репозиторий, ищем файл в его файлах
              const repoFiles = item.repoInfo?.projectData?.files || item.repoInfo?.files || [];
              
              // Если целевой путь относительный (начинается с ../ или просто имя файла),
              // разрешаем его относительно текущего файла
              if (currentFileLocalPath && (normalizedTarget.startsWith('../') || !normalizedTarget.includes('/'))) {
                const currentFileDir = path.posix.dirname(currentFileLocalPath);
                const resolvedPath = path.posix.join(currentFileDir, normalizedTarget);
                normalizedTarget = path.posix.normalize(resolvedPath);
                // Убираем ведущий слеш если он есть
                if (normalizedTarget.startsWith('/')) {
                  normalizedTarget = normalizedTarget.substring(1);
                }
              }
              
              // Теперь ищем файл по разрешенному пути
              for (const file of repoFiles) {
                const localRelPath = file.localRelativePath?.replace(/\\/g, '/');
                
                // Проверяем совпадение (с учётом регистра)
                if (localRelPath === normalizedTarget || localRelPath.endsWith('/' + normalizedTarget)) {
                  // Возвращаем путь относительно dist
                  return {
                    relativePath: `${currentRepo.alias}/${convertMdToHtml(localRelPath)}`
                  };
                }
                
                // Проверяем совпадение без учёта регистра
                if (localRelPath.toLowerCase() === normalizedTarget.toLowerCase() || 
                    localRelPath.toLowerCase().endsWith('/' + normalizedTarget.toLowerCase())) {
                  // Возвращаем путь относительно dist
                  return {
                    relativePath: `${currentRepo.alias}/${convertMdToHtml(localRelPath)}`
                  };
                }
                
                // Проверяем совпадение по частям пути
                const targetParts = normalizedTarget.split('/');
                const fileParts = localRelPath.split('/');
                
                let match = true;
                for (let i = targetParts.length - 1, j = fileParts.length - 1; i >= 0 && j >= 0; i--, j--) {
                  if (targetParts[i].toLowerCase() !== fileParts[j].toLowerCase()) {
                    match = false;
                    break;
                  }
                }
                
                if (match) {
                  return {
                    relativePath: `${currentRepo.alias}/${convertMdToHtml(localRelPath)}`
                  };
                }
              }
            }
          }
        }
      }
    }
    
    // Ищем в обычных файлах
    for (const file of allFiles) {
      const fileRelPath = file.relativePath.replace(/\\/g, '/');
      
      // Проверяем точное совпадение
      if (fileRelPath === normalizedTarget || fileRelPath.endsWith('/' + normalizedTarget)) {
        return file;
      }
      
      // Проверяем совпадение имени файла
      const fileName = path.basename(normalizedTarget);
      if (fileRelPath.endsWith('/' + fileName) || fileRelPath === fileName) {
        // Проверяем, что путь содержит все части целевого пути
        const targetParts = normalizedTarget.split('/');
        const fileParts = fileRelPath.split('/');
        
        let match = true;
        for (let i = targetParts.length - 1, j = fileParts.length - 1; i >= 0 && j >= 0; i--, j--) {
          if (targetParts[i] !== fileParts[j]) {
            match = false;
            break;
          }
        }
        
        if (match) {
          return file;
        }
      }
    }
    
    return null;
  }
  
  // Обрабатываем markdown ссылки на .md файлы
  markdown = markdown.replace(/\]\(([^)]+\.md(?:#[^)]*)?)\)/g, (match, url) => {
    // Проверяем, что url является строкой
    if (typeof url !== 'string') {
      return match;
    }
    
    // Пропускаем абсолютные URL
    if (url.startsWith('http')) {
      return match;
    }
    
    const [file, anchor] = url.split('#');
    
    // Ищем файл в индексе
    const indexedFile = findFileInIndex(file, currentFile);
    
    let htmlFile;
    if (indexedFile && indexedFile.relativePath) {
      // Файл найден в индексе - используем его путь
      const targetHtmlPath = path.join(projectRoot, 'dist', indexedFile.relativePath);
      const relativePath = path.relative(currentOutputDir, targetHtmlPath);
      htmlFile = relativePath.replace(/\\/g, '/');
    } else {
      // Файл не найден в индексе - используем outputFile для определения текущей позиции
      // Извлекаем путь относительно dist/
      let currentOutputPath = outputFile.replace(/\\/g, '/');
      const distIndex = currentOutputPath.indexOf('dist/');
      if (distIndex >= 0) {
        currentOutputPath = currentOutputPath.substring(distIndex + 5); // убираем 'dist/'
      }
      
      // Разрешаем относительный путь
      const currentDir = path.posix.dirname(currentOutputPath);
      const resolvedPath = path.posix.join(currentDir, file);
      const normalizedPath = path.posix.normalize(resolvedPath);
      
      // Конвертируем .md в .html
      const htmlPath = normalizedPath.replace(/\.md$/i, '.html');
      
      // Вычисляем относительный путь от текущего файла
      const targetHtmlPath = path.join(projectRoot, 'dist', htmlPath);
      const relativePath = path.relative(currentOutputDir, targetHtmlPath);
      htmlFile = relativePath.replace(/\\/g, '/');
    }
    
    return `](${htmlFile}${anchor ? '#' + anchor : ''})`;
  });
  
  return markdown;
}

function resolveInternalLinks(html, currentFile, outputFile) {
  const currentOutputDir = path.dirname(outputFile);
  const projectRoot = process.cwd();
  
  // Загружаем индекс файлов
  const hierarchyPath = path.join(projectRoot, '.temp', 'hierarchy-info.json');
  let allFiles = [];
  let allRepositories = [];
  if (fs.existsSync(hierarchyPath)) {
    try {
      const hierarchyData = JSON.parse(fs.readFileSync(hierarchyPath, 'utf-8'));
      allFiles = hierarchyData.allFiles || [];
      allRepositories = hierarchyData.allRepositories || [];
    } catch (error) {
      console.warn('Warning: Could not load hierarchy-info.json:', error.message);
    }
  }
  
  // Вспомогательная функция для преобразования .md в .html с учетом readme
  function convertMdToHtml(mdPath) {
    const fileName = path.basename(mdPath);
    const isReadme = /^readme\.md$/i.test(fileName);
    return isReadme 
      ? mdPath.replace(/readme\.md$/i, 'index.html')
      : mdPath.replace(/\.md$/i, '.html');
  }
  
  // Функция для поиска файла в индексе (включая репозитории)
  function findFileInIndex(targetPath, currentFilePath) {
    // Нормализуем путь
    let normalizedTarget = targetPath.replace(/\\/g, '/').replace(/^\.\//, '');
    
    // Используем outputFile для определения текущей позиции файла
    // Извлекаем путь относительно dist/
    let currentOutputPath = outputFile.replace(/\\/g, '/');
    const distIndex = currentOutputPath.indexOf('dist/');
    if (distIndex >= 0) {
      currentOutputPath = currentOutputPath.substring(distIndex + 5); // убираем 'dist/'
    }
    
    // Определяем, находится ли текущий файл в репозитории
    let currentRepo = null;
    let currentFileLocalPath = null;
    
    for (const repo of allRepositories) {
      if (currentOutputPath.startsWith(repo.alias + '/')) {
        currentRepo = repo;
        // Извлекаем localRelativePath из outputPath
        // Например: CLN/wiki/CLN17/index.html -> wiki/CLN17/readme.md
        const pathInRepo = currentOutputPath.substring(repo.alias.length + 1); // убираем 'CLN/'
        // Конвертируем обратно из .html в .md
        if (pathInRepo.endsWith('/index.html')) {
          currentFileLocalPath = pathInRepo.replace('/index.html', '/readme.md');
        } else if (pathInRepo.endsWith('.html')) {
          currentFileLocalPath = pathInRepo.replace('.html', '.md');
        }
        break;
      }
    }
    
    // Если текущий файл в репозитории, ищем в файлах этого репозитория
    if (currentRepo) {
      // Получаем данные репозитория из fileStructure
      const hierarchyData = JSON.parse(fs.readFileSync(hierarchyPath, 'utf-8'));
      const fileStructure = hierarchyData.fileStructure || {};
      
      // Ищем репозиторий в структуре
      for (const key in fileStructure) {
        const items = fileStructure[key];
        if (Array.isArray(items)) {
          for (const item of items) {
            if (item.type === 'repository' && item.alias === currentRepo.alias) {
              // Нашли репозиторий, ищем файл в его файлах
              const repoFiles = item.repoInfo?.projectData?.files || item.repoInfo?.files || [];
              
              // Если целевой путь относительный (начинается с ../ или просто имя файла),
              // разрешаем его относительно текущего файла
              if (currentFileLocalPath && (normalizedTarget.startsWith('../') || !normalizedTarget.includes('/'))) {
                const currentFileDir = path.posix.dirname(currentFileLocalPath);
                const resolvedPath = path.posix.join(currentFileDir, normalizedTarget);
                normalizedTarget = path.posix.normalize(resolvedPath);
                // Убираем ведущий слеш если он есть
                if (normalizedTarget.startsWith('/')) {
                  normalizedTarget = normalizedTarget.substring(1);
                }
              }
              
              // Теперь ищем файл по разрешенному пути
              for (const file of repoFiles) {
                const localRelPath = file.localRelativePath?.replace(/\\/g, '/');
                
                // Проверяем совпадение (с учётом регистра)
                if (localRelPath === normalizedTarget || localRelPath.endsWith('/' + normalizedTarget)) {
                  // Возвращаем путь относительно dist
                  return {
                    relativePath: `${currentRepo.alias}/${convertMdToHtml(localRelPath)}`
                  };
                }
                
                // Проверяем совпадение без учёта регистра
                if (localRelPath.toLowerCase() === normalizedTarget.toLowerCase() || 
                    localRelPath.toLowerCase().endsWith('/' + normalizedTarget.toLowerCase())) {
                  // Возвращаем путь относительно dist
                  return {
                    relativePath: `${currentRepo.alias}/${convertMdToHtml(localRelPath)}`
                  };
                }
                
                // Проверяем совпадение по частям пути
                const targetParts = normalizedTarget.split('/');
                const fileParts = localRelPath.split('/');
                
                let match = true;
                for (let i = targetParts.length - 1, j = fileParts.length - 1; i >= 0 && j >= 0; i--, j--) {
                  if (targetParts[i].toLowerCase() !== fileParts[j].toLowerCase()) {
                    match = false;
                    break;
                  }
                }
                
                if (match) {
                  return {
                    relativePath: `${currentRepo.alias}/${convertMdToHtml(localRelPath)}`
                  };
                }
              }
            }
          }
        }
      }
    }
    
    // Ищем в обычных файлах
    for (const file of allFiles) {
      const fileRelPath = file.relativePath.replace(/\\/g, '/');
      
      // Проверяем точное совпадение
      if (fileRelPath === normalizedTarget || fileRelPath.endsWith('/' + normalizedTarget)) {
        return file;
      }
      
      // Проверяем совпадение имени файла
      const fileName = path.basename(normalizedTarget);
      if (fileRelPath.endsWith('/' + fileName) || fileRelPath === fileName) {
        // Проверяем, что путь содержит все части целевого пути
        const targetParts = normalizedTarget.split('/');
        const fileParts = fileRelPath.split('/');
        
        let match = true;
        for (let i = targetParts.length - 1, j = fileParts.length - 1; i >= 0 && j >= 0; i--, j--) {
          if (targetParts[i] !== fileParts[j]) {
            match = false;
            break;
          }
        }
        
        if (match) {
          return file;
        }
      }
    }
    
    return null;
  }
  
  // Функция для проверки GitHub ссылок
  function processGitHubLink(url) {
    // Проверяем, что url является строкой
    if (typeof url !== 'string') {
      return url;
    }
    
    // Проверяем, является ли это ссылкой на GitHub .md файл
    const githubMdRegex = /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/blob\/[^\/]+\/(.+\.md)/;
    const match = url.match(githubMdRegex);
    
    if (match) {
      const [, owner, repo, filePath] = match;
      const repoUrl = `https://github.com/${owner}/${repo}`;
      
      // Если репозиторий НЕ в списке разрешенных, оставляем ссылку как есть
      if (!isRepositoryAllowed(repoUrl)) {
        return url; // Возвращаем оригинальную ссылку на GitHub
      }
      
      // Если репозиторий разрешен, конвертируем в локальную HTML ссылку
      const { getRepositoryDirName } = require('./components/config');
      const projectDirName = getRepositoryDirName(owner, repo);
      const htmlPath = filePath.replace(/\.md$/, '.html');
      
      // Возвращаем относительный путь к локальному HTML файлу
      return `${projectDirName}/${htmlPath}`;
    }
    
    return url;
  }
  
  // Функция для обработки ссылки
  function processLink(file, anchor) {
    // Проверяем GitHub ссылки
    if (file && file.startsWith('http')) {
      const processedUrl = processGitHubLink(file);
      return `${processedUrl}${anchor ? '#' + anchor : ''}`;
    }
    
    // Ищем файл в индексе
    const indexedFile = findFileInIndex(file, currentFile);
    
    let htmlFile;
    if (indexedFile && indexedFile.relativePath) {
      // Файл найден в индексе - используем его путь
      const targetHtmlPath = path.join(projectRoot, 'dist', indexedFile.relativePath);
      const relativePath = path.relative(currentOutputDir, targetHtmlPath);
      htmlFile = relativePath.replace(/\\/g, '/');
    } else {
      // Файл не найден в индексе - используем outputFile для определения текущей позиции
      // Извлекаем путь относительно dist/
      let currentOutputPath = outputFile.replace(/\\/g, '/');
      const distIndex = currentOutputPath.indexOf('dist/');
      if (distIndex >= 0) {
        currentOutputPath = currentOutputPath.substring(distIndex + 5); // убираем 'dist/'
      }
      
      // Разрешаем относительный путь
      const currentDir = path.posix.dirname(currentOutputPath);
      const resolvedPath = path.posix.join(currentDir, file);
      const normalizedPath = path.posix.normalize(resolvedPath);
      
      // Конвертируем .md в .html
      const htmlPath = normalizedPath.replace(/\.md$/i, '.html');
      
      // Вычисляем относительный путь от текущего файла
      const targetHtmlPath = path.join(projectRoot, 'dist', htmlPath);
      const relativePath = path.relative(currentOutputDir, targetHtmlPath);
      htmlFile = relativePath.replace(/\\/g, '/');
    }
    
    return `${htmlFile}${anchor ? '#' + anchor : ''}`;
  }
  
  // Обрабатываем href ссылки
  html = html.replace(/href="([^"]+\.md(?:#[^"]*)?)"/g, (match, url) => {
    // Проверяем, что url является строкой
    if (typeof url !== 'string') {
      return match;
    }
    
    const [file, anchor] = url.split('#');
    const processedUrl = processLink(file, anchor);
    return `href="${processedUrl}"`;
  });
  
  // Обрабатываем onclick ссылки в карточках
  html = html.replace(/onclick="window\.location\.href='([^']+\.md(?:#[^']*)?)'"/g, (match, url) => {
    // Проверяем, что url является строкой
    if (typeof url !== 'string') {
      return match;
    }
    
    const [file, anchor] = url.split('#');
    const processedUrl = processLink(file, anchor);
    return `onclick="window.location.href='${processedUrl}'"`;
  });
  
  return html;
}

async function convertMarkdownToHTML(markdownFile, outputFile, configPath = null) {
  processor.reset();
  
  // Загружаем конфигурацию если указана
  if (configPath && fs.existsSync(configPath)) {
    processor.loadConfig(configPath);
  }

  let markdown = fs.readFileSync(markdownFile, 'utf-8');
  
  // Определяем breadcrumb на основе файла
  const fileName = path.basename(markdownFile, '.md');
  let breadcrumbPath = '';
  
  // Специальная обработка для root файлов (только root становится Home)
  if (fileName === 'root') {
    breadcrumbPath = 'Home';
  } else {
    // Для остальных файлов используем имя файла с заглавной буквы
    const relativePath = path.relative(process.cwd(), markdownFile);
    const pathParts = relativePath.split(path.sep);
    
    if (pathParts.length > 1) {
      // Убираем test-files из пути если есть
      const folders = pathParts.slice(0, -1).filter(folder => folder !== 'test-files');
      
      if (folders.length > 0) {
        // Для репозиториев: корневая_папка / название файла
        // Корневая папка - это самый высокий уровень (первая папка после фильтрации)
        const rootFolder = folders[0];
        
        // Если файл readme, используем H1 вместо имени файла
        if (fileName.toLowerCase() === 'readme') {
          // H1 будет добавлен позже в header.js
          breadcrumbPath = `${rootFolder} / readme`;
        } else {
          breadcrumbPath = `${rootFolder} / ${fileName}`;
        }
      } else {
        breadcrumbPath = fileName;
      }
    } else {
      // Файл в корневой папке - показываем только название проекта
      breadcrumbPath = 'root';
    }
  }
  
  // Сохраняем путь для использования в header
  processor.currentFilePath = breadcrumbPath;

  // Определяем относительный путь к корню для ассетов
  const relativeRoot = getRelativePathToRoot(outputFile);

  // Сохраняем оригинальный markdown для проверки типа документа
  const originalMarkdown = markdown;

  // 1. Парсинг Overview
  const pageData = parseOverviewContent(markdown, relativeRoot);
  const hasOverviewSection = pageData.hasOverviewSection;
  markdown = removeOverviewFromMarkdown(markdown);


  // 2. Парсинг Specifications (с поддержкой alerts)
  const specResult = parseSpecifications(markdown);
  markdown = specResult.cleanedMarkdown;


  // 3. Парсинг Features (автоматическое распознавание)
  const featureResult = parseMarkdownWithCards(markdown, 'features');
  markdown = featureResult.cleanedMarkdown;


  // 4. Парсинг Applications
  const applicationResult = parseMarkdownWithCards(markdown, 'applications');
  markdown = applicationResult.cleanedMarkdown;

  // 5. Парсинг Resources
  const resourceResult = parseMarkdownWithCards(markdown, 'resources');
  markdown = resourceResult.cleanedMarkdown;

  // 6. Парсинг Projects
  const projectResult = parseProjects(markdown);
  markdown = projectResult.cleanedMarkdown;


  // 7. Обработка селекторов в markdown
  const selectorResult = processSelectorsInMarkdown(markdown, md);
  markdown = selectorResult.markdown;
  const hasSelectors = selectorResult.hasSelectors;
  const selectorData = selectorResult.selectors || [];
  
  // 8. Обработка ссылок в markdown перед рендерингом
  markdown = processMarkdownLinks(markdown, markdownFile, outputFile);
  
  // 9. Рендеринг оставшегося markdown (alerts и таблицы обрабатываются автоматически)
  let contentHtml = md.render(markdown);
  
  // 9.1. Заменяем placeholder'ы селекторов на HTML
  if (hasSelectors && selectorData.length > 0) {
    contentHtml = replaceSelectorPlaceholders(contentHtml, selectorData);
  }
  
  // 9.2. Закрываем все открытые секции
  while (processor.sectionStack.length > 0) {
    contentHtml += '</div></section>\n';
    processor.sectionStack.pop();
  }


  // 10. Рендеринг карточек
  const featureHtml = renderCards(featureResult.cards);
  const applicationHtml = renderCards(applicationResult.cards);
  const resourceHtml = renderCards(resourceResult.cards);
  
  // Создаем временную папку для GitHub проектов
  const tempDir = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const projectHtml = await renderProjectCards(projectResult.projects, path.dirname(markdownFile), relativeRoot, tempDir);


  // 11. Вставка карточек в соответствующие секции
  
  // Проверяем, является ли документ спецификацией
  const isSpecDoc = isSpecificationDocument(originalMarkdown);
  
  if (isSpecDoc && specResult.cards && specResult.cards.length > 0) {
    // Для документов спецификаций вставляем карточки сразу после H1 заголовка
    const specHtml = renderSpecificationCards(specResult.cards);
    if (specHtml) {
      // Ищем H1 заголовок и вставляем карточки после него
      const h1Regex = /(<h1[^>]*>.*?<\/h1>)/i;
      const match = contentHtml.match(h1Regex);
      
      if (match) {
        const h1Element = match[1];
        const replacement = `${h1Element}\n\n<div style="margin-top: 2rem;">\n${specHtml}\n</div>`;
        contentHtml = contentHtml.replace(h1Element, replacement);
      }
    }
  } else {
    // Вставляем spec карточки в каждую соответствующую секцию (обычная логика)
    if (specResult.specsSections && specResult.specsSections.length > 0) {
      specResult.specsSections.forEach(section => {
        const sectionHtml = renderSpecificationCards(section.cards);
        if (sectionHtml) {
          // Ищем секцию по ID и вставляем карточки
          const sectionRegex = new RegExp(`(<section id="${section.id}" class="section">[\\s\\S]*?<div class="section-content">)([\\s\\S]*?)(</div></section>)`, 'i');
          const match = contentHtml.match(sectionRegex);
          
          if (match) {
            const [fullMatch, beforeContent, existingContent, afterContent] = match;
            const newContent = existingContent.trim() ? 
              `${existingContent}\n<div style="margin-top: 1.5rem;"></div>\n${sectionHtml}` :
              `\n<div style="margin-top: 1.5rem;"></div>\n${sectionHtml}\n`;
            
            contentHtml = contentHtml.replace(fullMatch, beforeContent + newContent + afterContent);
          }
        }
      });
    }
  }


  if (featureHtml) {
    contentHtml = contentHtml.replace(
      /(<section id="features" class="section">[\s\S]*?<div class="section-content">)/,
      match => match + '\n' + featureHtml
    );
  }


  if (applicationHtml) {
    contentHtml = contentHtml.replace(
      /(<section id="applications" class="section">[\s\S]*?<div class="section-content">)/,
      match => match + '\n' + applicationHtml
    );
  }


  if (resourceHtml) {
    contentHtml = contentHtml.replace(
      /(<section id="resources" class="section">[\s\S]*?<div class="section-content">)/,
      match => match + '\n' + resourceHtml
    );
  }

  if (projectHtml) {
    contentHtml = contentHtml.replace(
      /(<section id="projects" class="section">[\s\S]*?<div class="section-content">)/,
      match => match + '\n' + projectHtml
    );
  }


  // 12. Создаем HTML страницы для всех проектов
  if (projectResult.projects.length > 0) {
    const outputDir = path.dirname(outputFile);
    const baseDir = path.dirname(markdownFile);
    
    // Обрабатываем проекты асинхронно
    for (const project of projectResult.projects) {
      if (project.link.startsWith('https://github.com/')) {
        // GitHub проект - получаем данные проекта из overview
        const overview = await loadProjectOverview(project.link, baseDir, tempDir);
        if (overview && overview.projectData) {
          // Создаем HTML страницы для GitHub проекта
          await createGitHubProjectPages(
            overview.projectData, 
            outputDir, 
            (content, filename, projectTitle) => {
              return convertSingleProjectFile(content, filename.replace('.html', ''), projectTitle || project.title, path.join(outputDir, filename));
            }
          );
        }
      } else if (!project.link.startsWith('http')) {
        // Локальный проект
        const projectPath = path.resolve(baseDir, project.link);
        
        // Проверяем, является ли проект отдельным файлом или файлом в подпапке
        const projectDir = path.dirname(projectPath);
        const absoluteBaseDir = path.resolve(baseDir);
        
        // Если файл проекта находится в той же папке, что и основной файл,
        // то это отдельный проект-файл
        if (projectDir === absoluteBaseDir) {
          // Это отдельный файл проекта (например, local-tool.md)
          const projectFileName = path.basename(projectPath, '.md');
          // Если файл README (любой регистр), то создаем index.html
          const isReadme = /^readme$/i.test(projectFileName);
          const outputFileName = isReadme ? 'index.html' : projectFileName + '.html';
          const projectOutputFile = path.join(outputDir, outputFileName);
          
          try {
            const markdownContent = fs.readFileSync(projectPath, 'utf8');
            const htmlContent = convertSingleProjectFile(markdownContent, projectFileName, project.title, projectOutputFile);
            
            // Создаем папку если нужно
            const projectOutputDir = path.dirname(projectOutputFile);
            if (!fs.existsSync(projectOutputDir)) {
              fs.mkdirSync(projectOutputDir, { recursive: true });
            }
            
            fs.writeFileSync(projectOutputFile, htmlContent);
          } catch (error) {
            console.warn(`Error converting project file ${projectPath}:`, error.message);
          }
        } else {
          // Это файл в подпапке проекта (например, project-alpha/main.md)
          // Обрабатываем всю папку проекта
          const projectName = path.basename(projectDir);
          const projectOutputDir = path.join(outputDir, projectName);
          
          // Создаем HTML страницы только для содержимого папки проекта, без воссоздания структуры
          createHtmlPagesForDirectory(projectDir, projectOutputDir, (content, filename) => {
            // Используем тот же конвертер для создания HTML страниц проектов
            const tempFile = path.join(projectDir, filename);
            const tempOutputFile = path.join(projectOutputDir, filename.replace('.md', '.html'));
            
            // Создаем временный процессор для проекта
            const tempProcessor = new DocumentProcessor();
            if (processor.config) {
              tempProcessor.config = processor.config;
            }
            
            // Вычисляем относительный путь к корню для изображений
            const relativeRoot = getRelativePathToRoot(tempOutputFile);
            
            // Парсим содержимое проекта
            const projectPageData = parseOverviewContent(content, relativeRoot);
            const projectMarkdown = removeOverviewFromMarkdown(content);
            
            // Рендерим содержимое
            let projectContentHtml = md.render(projectMarkdown);
            const projectProductCard = generateProductCard(projectPageData);
            
            // Генерируем header, footer и навигацию для проекта
            const projectHeader = generateHeader(tempProcessor.config || getSiteConfig(), filename.replace('.md', ''), project.title, tempOutputFile);
            const projectFooter = generateFooter(tempProcessor.config || getSiteConfig(), relativeRoot);
            
            // Генерируем навигацию для проекта
            const projectHamburgerMenu = generateHamburgerMenu('', tempOutputFile);
            const projectSectionMap = generateNewSectionMap('', tempOutputFile);
            
            // Собираем полный HTML для определения необходимых скриптов
            const fullProjectHtml = projectProductCard + projectContentHtml;
            
            // Генерируем теги
            const projectStyleLinks = generateStylesheets(tempOutputFile, fullProjectHtml, tempProcessor.config);
            const projectFaviconTags = generateFaviconTags(tempOutputFile, tempProcessor.config);
            const projectScriptTags = generateScripts(tempOutputFile, fullProjectHtml, tempProcessor.config);
            
            return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(projectPageData.title || project.title)}</title>
${projectFaviconTags}
${projectStyleLinks}
</head>
<body>
  ${projectHeader}
  <div class="scope">
    ${projectHamburgerMenu}
    ${projectSectionMap}
    <main>
      ${projectProductCard}
      ${projectContentHtml}
    </main>
    ${projectFooter}
  </div>
${projectScriptTags}
</body>
</html>`;
          }, false); // preserveStructure = false для проектов
        }
      }
    }
  }

  // 13. Разрешаем внутренние ссылки
  contentHtml = resolveInternalLinks(contentHtml, markdownFile, outputFile);

  // 14. Закрываем незакрытые секции
  while (processor.sectionStack.length > 0) {
    contentHtml += '</div></section>\n';
    processor.sectionStack.pop();
  }


  // 15. Генерация header, footer, navigation и product card
  const currentPage = path.basename(outputFile); // Получаем имя файла (например, "main.html")
  
  // Для корневых файлов (index, main, root, readme) заменяем breadcrumb на H1
  const currentBaseName = path.basename(outputFile, '.html').toLowerCase();
  const isRootFile = ['index', 'main', 'root', 'readme'].includes(currentBaseName);
  let breadcrumbForHeader = processor.currentFilePath;
  
  if (isRootFile && pageData.title) {
    // Заменяем имя файла на H1 в breadcrumb
    const parts = processor.currentFilePath.split('/').map(p => p.trim());
    if (parts.length > 1) {
      // Для репозиториев: проект / H1
      parts[parts.length - 1] = pageData.title;
      breadcrumbForHeader = parts.join(' / ');
    } else {
      // Для обычных файлов просто используем H1
      breadcrumbForHeader = pageData.title;
    }
  }
  
  const header = generateHeader(processor.config || getSiteConfig(), currentPage, breadcrumbForHeader, outputFile);
  const footer = generateFooter(processor.config || getSiteConfig(), relativeRoot);
  const productCard = generateProductCard(pageData); // Функция сама решит, создавать ли product card
  
  // Генерируем навигацию (hamburger menu и section map)
  const hamburgerMenu = generateHamburgerMenu(markdownFile, outputFile);
  const sectionMap = generateNewSectionMap(markdownFile, outputFile);


// 16. Генерация тегов для стилей, скриптов и favicon с корректными путями
const fullHtml = productCard + contentHtml;
const styleLinks = generateStylesheets(outputFile, fullHtml, processor.config);
const faviconTags = generateFaviconTags(outputFile, processor.config);
const scriptTags = generateScripts(outputFile, fullHtml, processor.config);

// 16.1. Обработка аналитики
const fullConfig = processor.config || getConfig();
const analytics = processAnalytics(fullConfig);
const analyticsHeadCode = analytics.headCode;
const analyticsTrackingCode = analytics.trackingCode;


// 17. Финальная сборка HTML
const fullHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(pageData.title || getSiteConfig().siteName)}</title>
${faviconTags}
${styleLinks}${analyticsHeadCode}
</head>
<body>
  ${header}
  <div class="scope">
    ${hamburgerMenu}
    ${sectionMap}
    <main>
      ${productCard}
      ${contentHtml}
    </main>
    ${footer}
  </div>
${scriptTags}
  ${analyticsTrackingCode ? `<script>${analyticsTrackingCode}</script>` : ''}
</body>
</html>`;

  // Убеждаемся, что папка существует
  const outputDir = path.dirname(outputFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  try {
    fs.writeFileSync(outputFile, fullHTML, 'utf-8');
    // Проверяем, что файл действительно создан
    if (!fs.existsSync(outputFile)) {
      console.error(`❌ Файл не создан: ${outputFile}`);
    }
  } catch (error) {
    console.error(`❌ Ошибка сохранения ${outputFile}:`, error.message);
    throw error;
  }

  // Краткое логирование только если есть карточки
  const totalCards = specResult.cards.length + featureResult.cards.length + 
                     applicationResult.cards.length + resourceResult.cards.length + 
                     projectResult.projects.length;
  
  if (totalCards > 0) {
    const cardsSummary = [];
    if (specResult.cards.length > 0) cardsSummary.push(`${specResult.cards.length} specs`);
    if (featureResult.cards.length > 0) cardsSummary.push(`${featureResult.cards.length} features`);
    if (applicationResult.cards.length > 0) cardsSummary.push(`${applicationResult.cards.length} apps`);
    if (resourceResult.cards.length > 0) cardsSummary.push(`${resourceResult.cards.length} resources`);
    if (projectResult.projects.length > 0) cardsSummary.push(`${projectResult.projects.length} projects`);
    
    console.log(`✓ ${path.basename(outputFile)} (${cardsSummary.join(', ')})`);
  } else {
    console.log(`✓ ${path.basename(outputFile)}`);
  }
}



/**
 * Генерирует ТОЛЬКО контент <main> без HTML обёртки
 * @param {string} markdownFile - Путь к markdown файлу
 * @param {string} outputFile - Путь к выходному HTML файлу
 * @param {string} configPath - Путь к конфигурации (опционально)
 */
async function generateMainContentOnly(markdownFile, outputFile, configPath = null) {
  processor.reset();
  
  // Загружаем конфигурацию если указана
  if (configPath && fs.existsSync(configPath)) {
    processor.loadConfig(configPath);
  }

  let markdown = fs.readFileSync(markdownFile, 'utf-8');
  
  // Определяем относительный путь к корню для ассетов
  const relativeRoot = getRelativePathToRoot(outputFile);

  // Сохраняем оригинальный markdown для проверки типа документа
  const originalMarkdown = markdown;

  // 1. Парсинг Overview
  const pageData = parseOverviewContent(markdown, relativeRoot);
  const hasOverviewSection = pageData.hasOverviewSection;
  markdown = removeOverviewFromMarkdown(markdown);

  // 2. Парсинг Specifications
  const specResult = parseSpecifications(markdown);
  markdown = specResult.cleanedMarkdown;

  // 3. Парсинг Features
  const featureResult = parseMarkdownWithCards(markdown, 'features');
  markdown = featureResult.cleanedMarkdown;

  // 4. Парсинг Applications
  const applicationResult = parseMarkdownWithCards(markdown, 'applications');
  markdown = applicationResult.cleanedMarkdown;

  // 5. Парсинг Resources
  const resourceResult = parseMarkdownWithCards(markdown, 'resources');
  markdown = resourceResult.cleanedMarkdown;

  // 6. Парсинг Projects
  const projectResult = parseProjects(markdown);
  markdown = projectResult.cleanedMarkdown;

  // 7. Обработка селекторов в markdown
  const selectorResult = processSelectorsInMarkdown(markdown, md);
  markdown = selectorResult.markdown;
  const hasSelectors = selectorResult.hasSelectors;
  const selectorData = selectorResult.selectors || [];
  
  // 8. Обработка ссылок в markdown перед рендерингом
  markdown = processMarkdownLinks(markdown, markdownFile, outputFile);
  
  // 9. Рендеринг оставшегося markdown
  let contentHtml = md.render(markdown);
  
  // 9.1. Заменяем placeholder'ы селекторов на HTML
  if (hasSelectors && selectorData.length > 0) {
    contentHtml = replaceSelectorPlaceholders(contentHtml, selectorData);
  }
  
  // 9.2. Закрываем все открытые секции
  while (processor.sectionStack.length > 0) {
    contentHtml += '</div></section>\n';
    processor.sectionStack.pop();
  }

  // 10. Рендеринг карточек
  const featureHtml = renderCards(featureResult.cards);
  const applicationHtml = renderCards(applicationResult.cards);
  const resourceHtml = renderCards(resourceResult.cards);
  
  // Создаем временную папку для GitHub проектов
  const tempDir = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const projectHtml = await renderProjectCards(projectResult.projects, path.dirname(markdownFile), relativeRoot, tempDir);

  // 11. Вставка карточек в соответствующие секции
  const isSpecDoc = isSpecificationDocument(originalMarkdown);
  
  if (isSpecDoc && specResult.cards && specResult.cards.length > 0) {
    const specHtml = renderSpecificationCards(specResult.cards);
    if (specHtml) {
      const h1Regex = /(<h1[^>]*>.*?<\/h1>)/i;
      const match = contentHtml.match(h1Regex);
      
      if (match) {
        const h1Element = match[1];
        const replacement = `${h1Element}\n\n<div style="margin-top: 2rem;">\n${specHtml}\n</div>`;
        contentHtml = contentHtml.replace(h1Element, replacement);
      }
    }
  } else {
    if (specResult.specsSections && specResult.specsSections.length > 0) {
      specResult.specsSections.forEach(section => {
        const sectionHtml = renderSpecificationCards(section.cards);
        if (sectionHtml) {
          const sectionRegex = new RegExp(`(<section id="${section.id}" class="section">[\\s\\S]*?<div class="section-content">)([\\s\\S]*?)(</div></section>)`, 'i');
          const match = contentHtml.match(sectionRegex);
          
          if (match) {
            const [fullMatch, beforeContent, existingContent, afterContent] = match;
            const newContent = existingContent.trim() ? 
              `${existingContent}\n<div style="margin-top: 1.5rem;"></div>\n${sectionHtml}` :
              `\n<div style="margin-top: 1.5rem;"></div>\n${sectionHtml}\n`;
            
            contentHtml = contentHtml.replace(fullMatch, beforeContent + newContent + afterContent);
          }
        }
      });
    }
  }

  if (featureHtml) {
    contentHtml = contentHtml.replace(
      /(<section id="features" class="section">[\s\S]*?<div class="section-content">)/,
      match => match + '\n' + featureHtml
    );
  }

  if (applicationHtml) {
    contentHtml = contentHtml.replace(
      /(<section id="applications" class="section">[\s\S]*?<div class="section-content">)/,
      match => match + '\n' + applicationHtml
    );
  }

  if (resourceHtml) {
    contentHtml = contentHtml.replace(
      /(<section id="resources" class="section">[\s\S]*?<div class="section-content">)/,
      match => match + '\n' + resourceHtml
    );
  }

  if (projectHtml) {
    contentHtml = contentHtml.replace(
      /(<section id="projects" class="section">[\s\S]*?<div class="section-content">)/,
      match => match + '\n' + projectHtml
    );
  }

  // 12. Разрешаем внутренние ссылки
  contentHtml = resolveInternalLinks(contentHtml, markdownFile, outputFile);

  // 13. Генерация product card
  const productCard = generateProductCard(pageData);
  
  // 14. Собираем только <main> контент
  const mainContent = `<main>
  ${productCard}
  ${contentHtml}
</main>`;

  // Убеждаемся, что папка существует
  const outputDir = path.dirname(outputFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Сохраняем ТОЛЬКО контент main (без HTML обёртки)
  try {
    fs.writeFileSync(outputFile, mainContent, 'utf-8');
    if (!fs.existsSync(outputFile)) {
      console.error(`❌ Файл не создан: ${outputFile}`);
    }
  } catch (error) {
    console.error(`❌ Ошибка сохранения ${outputFile}:`, error.message);
    throw error;
  }
}

/**
 * Оборачивает контент <main> в полный HTML с header, footer, navigation
 * @param {string} htmlFile - Путь к HTML файлу с контентом <main>
 */
async function wrapMainContentInHTML(htmlFile) {
  // Читаем файл с контентом main
  let mainContent = fs.readFileSync(htmlFile, 'utf-8');
  
  // Извлекаем title из product card или H1
  let pageTitle = getSiteConfig().siteName;
  const titleMatch = mainContent.match(/<h1[^>]*>(.*?)<\/h1>/);
  if (titleMatch) {
    pageTitle = titleMatch[1].replace(/<[^>]*>/g, '').trim();
  }
  
  // Определяем относительный путь к корню
  const relativeRoot = getRelativePathToRoot(htmlFile);
  
  // Определяем breadcrumb для header
  const fileName = path.basename(htmlFile, '.html');
  let breadcrumbPath = '';
  
  // Извлекаем путь относительно dist
  let relativePath = htmlFile.replace(/\\/g, '/');
  const distIndex = relativePath.indexOf('dist/');
  if (distIndex >= 0) {
    relativePath = relativePath.substring(distIndex + 5);
  }
  
  const pathParts = relativePath.split('/');
  
  if (pathParts.length > 1) {
    // Файл в подпапке
    const rootFolder = pathParts[0];
    
    if (fileName.toLowerCase() === 'index' || fileName.toLowerCase() === 'readme') {
      // Для index/readme используем H1 или название папки
      breadcrumbPath = `${rootFolder} / ${pageTitle}`;
    } else {
      breadcrumbPath = `${rootFolder} / ${fileName}`;
    }
  } else {
    // Файл в корне
    if (fileName.toLowerCase() === 'index') {
      breadcrumbPath = pageTitle;
    } else {
      breadcrumbPath = fileName;
    }
  }
  
  // Генерируем header, footer и навигацию на основе индексированной структуры
  const currentPage = path.basename(htmlFile);
  const header = generateHeader(processor.config || getSiteConfig(), currentPage, breadcrumbPath, htmlFile);
  const footer = generateFooter(processor.config || getSiteConfig(), relativeRoot);
  
  // Генерируем навигацию с хайлайтом текущей страницы
  // ВАЖНО: передаём пустую строку как currentFile, так как outputFile уже содержит полный путь
  const hamburgerMenu = generateHamburgerMenu('', htmlFile);
  const sectionMap = generateNewSectionMap('', htmlFile);
  
  // Генерируем теги для стилей, скриптов и favicon
  const styleLinks = generateStylesheets(htmlFile, mainContent, processor.config);
  const faviconTags = generateFaviconTags(htmlFile, processor.config);
  const scriptTags = generateScripts(htmlFile, mainContent, processor.config);
  
  // Обработка аналитики
  const fullConfig = processor.config || getConfig();
  const analytics = processAnalytics(fullConfig);
  const analyticsHeadCode = analytics.headCode;
  const analyticsTrackingCode = analytics.trackingCode;
  
  // Генерируем модальное окно поиска
  const { generateSearchModal } = require('./components/searchModal');
  const searchModal = generateSearchModal();
  
  // Собираем полный HTML
  const fullHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(pageTitle)}</title>
${faviconTags}
${styleLinks}${analyticsHeadCode}
</head>
<body>
  ${header}
  <div class="scope">
    ${hamburgerMenu}
    ${sectionMap}
    ${mainContent}
    ${footer}
  </div>
  ${searchModal}
${scriptTags}
  ${analyticsTrackingCode ? `<script>${analyticsTrackingCode}</script>` : ''}
</body>
</html>`;

  // Сохраняем полный HTML
  fs.writeFileSync(htmlFile, fullHTML, 'utf-8');
}

module.exports = { 
  md, 
  convertMarkdownToHTML,
  convertSingleProjectFile,
  processMultipleFiles,
  DocumentProcessor,
  getSiteConfig, 
  CSS_CLASSES,
  generateStylesheets,
  generateScripts,
  generateFaviconTags,
  generateMainContentOnly,
  wrapMainContentInHTML
};



if (require.main === module) {
  const [,, inputFile, outputFile, cssFile] = process.argv;


  if (!inputFile || !outputFile) {
    console.log('Usage: node converter.js <input.md> <output.html> [styles.css]');
    process.exit(1);
  }


  convertMarkdownToHTML(inputFile, outputFile, cssFile);
}

