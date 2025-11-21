// converter.js - Optimized version
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { CSS_CLASSES, getSiteConfig, getSectionKeywords, getExternalAssets, isRepositoryAllowed, getConfig } = require('./components/config');
const { generateHeader } = require('./components/header');
const { generateFooter } = require('./components/footer');
const { parseOverviewContent, removeOverviewFromMarkdown, generateProductCard } = require('./components/overview');
const { parseMarkdownWithCards, renderCards } = require('./components/cardParser');
const { parseSpecifications, renderSpecificationCards, isSpecificationDocument } = require('./components/specParser');
const { parseProjects, renderProjectCards, loadProjectOverview, createGitHubProjectPages, createHtmlPagesForDirectory } = require('./components/projectParser');
const { processAnalytics } = require('./components/analytics');
const { processSelectorsInMarkdown, replaceSelectorPlaceholders } = require('./components/selectorParser');
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
    
    // Если нет Overview секции, рендерим как обычный H1
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
            `<h2 id="${anchorId}" class="${cls.sectionTitle}">${escapeHtml(titleText)}</h2>\n` +
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
      token.attrSet('class', 'spec-card');
    } else {
      token.attrSet('class', 'subsection-title');
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
  const normalizedPath = path.normalize(outputFile).replace(/\\/g, '/');
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
 * Генерирует теги <link> для CSS из EXTERNAL_ASSETS
 * @param {string} outputFile - Путь к выходному HTML файлу для корректных относительных путей
 */
function generateStylesheets(outputFile = '') {
  const externalAssets = getExternalAssets();
  if (!externalAssets || !externalAssets.stylesheets) {
    return '';
  }

  const relativeRoot = getRelativePathToRoot(outputFile);

  return externalAssets.stylesheets
    .map(css => {
      const integrity = css.integrity 
        ? ` integrity="${css.integrity}" crossorigin="anonymous"` 
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
 * Генерирует теги <script> для JS из EXTERNAL_ASSETS
 * @param {string} outputFile - Путь к выходному HTML файлу для корректных относительных путей
 */
function generateScripts(outputFile = '') {
  const externalAssets = getExternalAssets();
  if (!externalAssets || !externalAssets.scripts) {
    return '';
  }

  const relativeRoot = getRelativePathToRoot(outputFile);

  const scriptTags = externalAssets.scripts
    .map(js => {
      const defer = js.defer ? ' defer' : '';
      const async = js.async ? ' async' : '';
      const type = js.module ? ' type="module"' : '';
      const integrity = js.integrity 
        ? ` integrity="${js.integrity}" crossorigin="anonymous"` 
        : '';
      
      let src = js.src;
      // Для локальных файлов корректируем путь
      if (js.type === 'local' && !src.startsWith('http')) {
        src = src.startsWith('./') ? src.substring(2) : src;
        src = relativeRoot + src;
      }
      
      return `  <script src="${src}"${defer}${async}${type}${integrity}></script>`;
    })
    .join('\n');

  return scriptTags ? '\n' + scriptTags : '';
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
    const outputPath = path.join(outputDir, relativePath.replace('.md', '.html'));
    
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
  
  // Генерируем header и footer для проекта
  const projectHeader = generateHeader(processor.config || getSiteConfig(), projectFileName + '.html', projectTitle, outputFile);
  const projectFooter = generateFooter(processor.config || getSiteConfig(), relativeRoot);
  
  // Генерируем теги
  const projectStyleLinks = generateStylesheets(outputFile);
  const projectFaviconTags = generateFaviconTags(outputFile, processor.config);
  const projectScriptTags = generateScripts(outputFile);
  
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
  <div class="${CSS_CLASSES.siteWrapper}">
    ${projectHeader}

    <main>
      ${projectProductCard}
      ${projectContentHtml}
    </main>

    ${projectFooter}
  </div>${projectScriptTags}
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
  
  // Функция для очистки пути от test-files
  function cleanPath(filePath) {
    return filePath.replace(/^\.\/test-files\//, './').replace(/test-files[\/\\]/g, '');
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
    let cleanFile = cleanPath(file);
    let htmlFile = cleanFile.replace('.md', '.html');
    
    // Если ссылка относительная, вычисляем правильный путь
    if (!htmlFile.startsWith('http') && !htmlFile.startsWith('/')) {
      // Определяем абсолютный путь к целевому файлу
      const sourceFileDir = path.dirname(currentFile);
      const targetMarkdownPath = path.resolve(sourceFileDir, file);
      
      // Преобразуем в путь к HTML файлу в выходной директории
      const relativeToProject = path.relative(projectRoot, targetMarkdownPath);
      const cleanRelativePath = cleanPath(relativeToProject);
      const targetHtmlPath = path.join(projectRoot, 'dist', cleanRelativePath.replace('.md', '.html'));
      
      // Вычисляем относительный путь от текущего выходного файла к целевому
      const relativePath = path.relative(currentOutputDir, targetHtmlPath);
      htmlFile = relativePath.replace(/\\/g, '/'); // Нормализуем слеши для веба
    }
    
    return `](${htmlFile}${anchor ? '#' + anchor : ''})`;
  });
  
  return markdown;
}

function resolveInternalLinks(html, currentFile, outputFile) {
  const currentOutputDir = path.dirname(outputFile);
  const projectRoot = process.cwd();
  
  // Функция для очистки пути от test-files
  function cleanPath(filePath) {
    return filePath.replace(/^\.\/test-files\//, './').replace(/test-files[\/\\]/g, '');
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
  
  // Обрабатываем href ссылки
  html = html.replace(/href="([^"]+\.md(?:#[^"]*)?)"/g, (match, url) => {
    // Проверяем, что url является строкой
    if (typeof url !== 'string') {
      return match;
    }
    
    const [file, anchor] = url.split('#');
    
    // Проверяем GitHub ссылки
    if (file && file.startsWith('http')) {
      const processedUrl = processGitHubLink(file);
      return `href="${processedUrl}${anchor ? '#' + anchor : ''}"`;
    }
    
    let cleanFile = cleanPath(file);
    let htmlFile = cleanFile.replace('.md', '.html');
    
    // Если ссылка относительная, вычисляем правильный путь
    if (!htmlFile.startsWith('http') && !htmlFile.startsWith('/')) {
      // Определяем абсолютный путь к целевому файлу
      const sourceFileDir = path.dirname(currentFile);
      const targetMarkdownPath = path.resolve(sourceFileDir, file);
      
      // Преобразуем в путь к HTML файлу в выходной директории
      const relativeToProject = path.relative(projectRoot, targetMarkdownPath);
      const cleanRelativePath = cleanPath(relativeToProject);
      const targetHtmlPath = path.join(projectRoot, 'dist', cleanRelativePath.replace('.md', '.html'));
      
      // Вычисляем относительный путь от текущего выходного файла к целевому
      const relativePath = path.relative(currentOutputDir, targetHtmlPath);
      htmlFile = relativePath.replace(/\\/g, '/'); // Нормализуем слеши для веба
    }
    
    return `href="${htmlFile}${anchor ? '#' + anchor : ''}"`;
  });
  
  // Обрабатываем onclick ссылки в карточках
  html = html.replace(/onclick="window\.location\.href='([^']+\.md(?:#[^']*)?)'"/g, (match, url) => {
    // Проверяем, что url является строкой
    if (typeof url !== 'string') {
      return match;
    }
    
    const [file, anchor] = url.split('#');
    
    // Проверяем GitHub ссылки
    if (file && file.startsWith('http')) {
      const processedUrl = processGitHubLink(file);
      return `onclick="window.location.href='${processedUrl}${anchor ? '#' + anchor : ''}'"`;
    }
    
    let cleanFile = cleanPath(file);
    let htmlFile = cleanFile.replace('.md', '.html');
    
    // Если ссылка относительная, вычисляем правильный путь
    if (!htmlFile.startsWith('http') && !htmlFile.startsWith('/')) {
      // Определяем абсолютный путь к целевому файлу
      const sourceFileDir = path.dirname(currentFile);
      const targetMarkdownPath = path.resolve(sourceFileDir, file);
      
      // Преобразуем в путь к HTML файлу в выходной директории
      const relativeToProject = path.relative(projectRoot, targetMarkdownPath);
      const cleanRelativePath = cleanPath(relativeToProject);
      const targetHtmlPath = path.join(projectRoot, 'dist', cleanRelativePath.replace('.md', '.html'));
      
      // Вычисляем относительный путь от текущего выходного файла к целевому
      const relativePath = path.relative(currentOutputDir, targetHtmlPath);
      htmlFile = relativePath.replace(/\\/g, '/'); // Нормализуем слеши для веба
    }
    
    return `onclick="window.location.href='${htmlFile}${anchor ? '#' + anchor : ''}'"`;
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
      const cleanFileName = fileName.charAt(0).toUpperCase() + fileName.slice(1);
      
      if (folders.length > 0) {
        breadcrumbPath = [...folders, cleanFileName].join(' / ');
      } else {
        breadcrumbPath = cleanFileName;
      }
    } else {
      breadcrumbPath = fileName.charAt(0).toUpperCase() + fileName.slice(1);
    }
  }
  
  // Сохраняем путь для использования в header
  processor.currentFilePath = breadcrumbPath;

  // Определяем относительный путь к корню для ассетов
  const relativeRoot = getRelativePathToRoot(outputFile);

  console.log('\n' + '='.repeat(60));
  console.log('ПАРСИНГ КАРТОЧЕК');
  console.log('='.repeat(60));

  // Сохраняем оригинальный markdown для проверки типа документа
  const originalMarkdown = markdown;

  // 1. Парсинг Overview
  const pageData = parseOverviewContent(markdown, relativeRoot);
  const hasOverviewSection = pageData.hasOverviewSection;
  markdown = removeOverviewFromMarkdown(markdown);


  // 2. Парсинг Specifications (с поддержкой alerts)
  const specResult = parseSpecifications(markdown);
  console.log(`Specifications: ${specResult.cards.length} карточек`);
  markdown = specResult.cleanedMarkdown;


  // 3. Парсинг Features (автоматическое распознавание)
  const featureResult = parseMarkdownWithCards(markdown, 'features');
  console.log(`Features: ${featureResult.cards.length} карточек`);
  markdown = featureResult.cleanedMarkdown;


  // 4. Парсинг Applications
  const applicationResult = parseMarkdownWithCards(markdown, 'applications');
  console.log(`Applications: ${applicationResult.cards.length} карточек`);
  markdown = applicationResult.cleanedMarkdown;

  // 5. Парсинг Resources
  const resourceResult = parseMarkdownWithCards(markdown, 'resources');
  console.log(`Resources: ${resourceResult.cards.length} карточек`);
  markdown = resourceResult.cleanedMarkdown;

  // 6. Парсинг Projects
  const projectResult = parseProjects(markdown);
  console.log(`Projects: ${projectResult.projects.length} проектов`);
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
          const projectOutputFile = path.join(outputDir, projectFileName + '.html');
          
          try {
            const markdownContent = fs.readFileSync(projectPath, 'utf8');
            const htmlContent = convertSingleProjectFile(markdownContent, projectFileName, project.title, projectOutputFile);
            
            // Создаем папку если нужно
            const projectOutputDir = path.dirname(projectOutputFile);
            if (!fs.existsSync(projectOutputDir)) {
              fs.mkdirSync(projectOutputDir, { recursive: true });
            }
            
            fs.writeFileSync(projectOutputFile, htmlContent);
            console.log(`Created project file: ${projectOutputFile}`);
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
            
            // Генерируем header и footer для проекта
            const projectHeader = generateHeader(tempProcessor.config || getSiteConfig(), filename.replace('.md', '.html'), project.title, tempOutputFile);
            const projectFooter = generateFooter(tempProcessor.config || getSiteConfig(), relativeRoot);
            
            // Генерируем теги
            const projectStyleLinks = generateStylesheets(tempOutputFile);
            const projectFaviconTags = generateFaviconTags(tempOutputFile, tempProcessor.config);
            const projectScriptTags = generateScripts(tempOutputFile);
            
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
  <div class="${CSS_CLASSES.siteWrapper}">
    ${projectHeader}

    <main>
      ${projectProductCard}
      ${projectContentHtml}
    </main>

    ${projectFooter}
  </div>${projectScriptTags}
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


  // 15. Генерация header, footer и product card
  const currentPage = path.basename(outputFile); // Получаем имя файла (например, "main.html")
  const header = generateHeader(processor.config || getSiteConfig(), currentPage, processor.currentFilePath, outputFile);
  const footer = generateFooter(processor.config || getSiteConfig(), relativeRoot);
  const productCard = generateProductCard(pageData); // Функция сама решит, создавать ли product card


// 16. Генерация тегов для стилей, скриптов и favicon с корректными путями
const styleLinks = generateStylesheets(outputFile);
const faviconTags = generateFaviconTags(outputFile, processor.config);
const scriptTags = generateScripts(outputFile);

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
  <div class="${CSS_CLASSES.siteWrapper}">
    ${header}

    <main>
      ${productCard}
      ${contentHtml}
    </main>

    ${footer}
  </div>${scriptTags}
  ${analyticsTrackingCode ? `<script>${analyticsTrackingCode}</script>` : ''}$
</body>
</html>`;

  fs.writeFileSync(outputFile, fullHTML, 'utf-8');


  console.log('\n' + '='.repeat(60));
  console.log('✓ HTML saved to ' + outputFile);
  console.log('='.repeat(60));
  console.log(`Title: ${pageData.title}`);
  console.log(`Specifications: ${specResult.cards.length} карточек`);
  console.log(`Features: ${featureResult.cards.length} карточек`);
  console.log(`Applications: ${applicationResult.cards.length} карточек`);
  console.log(`Resources: ${resourceResult.cards.length} карточек`);
  console.log(`Projects: ${projectResult.projects.length} проектов`);
  console.log('='.repeat(60) + '\n');
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
  generateFaviconTags
};



if (require.main === module) {
  const [,, inputFile, outputFile, cssFile] = process.argv;


  if (!inputFile || !outputFile) {
    console.log('Usage: node converter.js <input.md> <output.html> [styles.css]');
    process.exit(1);
  }


  convertMarkdownToHTML(inputFile, outputFile, cssFile);
}
