// searchIndex.js - Модуль для создания поискового индекса на базе lunr.js
const lunr = require('lunr');
const fs = require('fs');
const path = require('path');

/**
 * Создает поисковый индекс из HTML файлов
 * @param {Array} htmlFiles - Массив объектов с информацией о HTML файлах
 * @returns {Object} - Объект с индексом и документами
 */
function createSearchIndex(htmlFiles) {
  const documents = [];
  
  // Собираем документы для индексации
  htmlFiles.forEach((file, idx) => {
    // Создаем строку с заголовками для индексации
    const headingsText = file.headings 
      ? file.headings.map(h => h.text).join(' ') 
      : '';
    
    const doc = {
      id: idx.toString(),
      title: file.title || '',
      headings: headingsText, // Добавляем заголовки как отдельное поле для поиска
      headingsData: file.headings || [], // Сохраняем полную информацию о заголовках
      content: file.content || '',
      contentHtml: file.contentHtml || '', // Сохраняем HTML
      url: file.url || '',
      breadcrumb: file.breadcrumb || '',
      section: file.section || ''
    };
    documents.push(doc);
  });
  
  // Создаем индекс с поддержкой русского языка
  const idx = lunr(function() {
    // Настройка полей для поиска
    this.ref('id');
    this.field('title', { boost: 10 });
    this.field('headings', { boost: 8 }); // Заголовки с высоким приоритетом
    this.field('breadcrumb', { boost: 5 });
    this.field('section', { boost: 3 });
    this.field('content');
    
    // Добавляем документы
    documents.forEach(doc => {
      this.add(doc);
    });
  });
  
  return {
    index: idx.toJSON(),
    documents: documents
  };
}

/**
 * Извлекает текстовый контент из HTML, исключая служебные элементы
 * @param {string} html - HTML контент
 * @returns {string} - Очищенный текст
 */
function extractTextFromHtml(html) {
  // Удаляем скрипты и стили
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Удаляем служебные элементы (header, footer, navigation, etc.)
  text = text.replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '');
  text = text.replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '');
  text = text.replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '');
  text = text.replace(/<div[^>]*class="[^"]*hamburger[^"]*"[^<]*(?:(?!<\/div>)<[^<]*)*<\/div>/gi, '');
  text = text.replace(/<div[^>]*class="[^"]*section-map[^"]*"[^<]*(?:(?!<\/div>)<[^<]*)*<\/div>/gi, '');
  text = text.replace(/<div[^>]*class="[^"]*menu-overlay[^"]*"[^<]*(?:(?!<\/div>)<[^<]*)*<\/div>/gi, '');
  
  // Удаляем HTML теги
  text = text.replace(/<[^>]+>/g, ' ');
  
  // Декодируем HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  
  // Убираем лишние пробелы
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

/**
 * Извлекает заголовок из HTML
 * @param {string} html - HTML контент
 * @returns {string} - Заголовок страницы
 */
function extractTitleFromHtml(html) {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    return titleMatch[1].trim();
  }
  
  // Пробуем найти первый h1
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match) {
    return extractTextFromHtml(h1Match[1]);
  }
  
  return 'Untitled';
}

/**
 * Извлекает заголовки и их контент из HTML с позициями
 * @param {string} html - HTML контент
 * @returns {Array} - Массив объектов с заголовками
 */
function extractHeadings(html) {
  const headings = [];
  const headingRegex = /<(h[1-6])[^>]*id="([^"]*)"[^>]*>([^<]+)<\/\1>/gi;
  let match;
  
  while ((match = headingRegex.exec(html)) !== null) {
    headings.push({
      level: match[1],
      id: match[2],
      text: extractTextFromHtml(match[3]),
      position: match.index
    });
  }
  
  return headings;
}

/**
 * Извлекает структурированный контент с HTML разметкой
 * @param {string} html - HTML контент
 * @returns {string} - HTML контент из main
 */
function extractMainHtml(html) {
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (mainMatch) {
    let mainHtml = mainMatch[1];
    
    // Удаляем служебные элементы
    mainHtml = mainHtml.replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '');
    mainHtml = mainHtml.replace(/<div[^>]*class="[^"]*hamburger[^"]*"[^<]*(?:(?!<\/div>)<[^<]*)*<\/div>/gi, '');
    mainHtml = mainHtml.replace(/<div[^>]*class="[^"]*section-map[^"]*"[^<]*(?:(?!<\/div>)<[^<]*)*<\/div>/gi, '');
    
    return mainHtml;
  }
  return html;
}

/**
 * Извлекает контент из main элемента (основной контент страницы)
 * @param {string} html - HTML контент
 * @returns {string} - Контент из main
 */
function extractMainContent(html) {
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (mainMatch) {
    return extractTextFromHtml(mainMatch[1]);
  }
  return extractTextFromHtml(html);
}

/**
 * Сканирует директорию и создает индекс для всех HTML файлов
 * @param {string} distDir - Путь к директории dist
 * @returns {Object} - Объект с индексом и документами
 */
function scanAndIndexHtmlFiles(distDir) {
  const htmlFiles = [];
  
  function scanDirectory(dir, baseUrl = '') {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        // Рекурсивно сканируем поддиректории
        scanDirectory(filePath, baseUrl + file + '/');
      } else if (file.endsWith('.html')) {
        // Пропускаем страницы ошибок (404, 500 и т.д.)
        if (file.match(/^(404|500|403|401|503)\.html$/i)) {
          console.log(`   ⊘ Skipping error page: ${file}`);
          return;
        }
        
        // ИНДЕКСИРУЕМ ТОЛЬКО .html ФАЙЛЫ
        const html = fs.readFileSync(filePath, 'utf8');
        
        // Проверяем, не является ли это страницей ошибки по содержимому
        const title = extractTitleFromHtml(html);
        if (title.match(/^(404|500|403|401|503|error|not found)/i)) {
          console.log(`   ⊘ Skipping error page by title: ${file} (${title})`);
          return;
        }
        
        const content = extractMainContent(html); // Используем только main контент
        const headings = extractHeadings(html);
        
        // Определяем URL относительно dist
        let url = baseUrl + file;
        if (file === 'index.html' && baseUrl === '') {
          url = './';
        }
        
        // Извлекаем breadcrumb из HTML
        const breadcrumbMatch = html.match(/<span class="breadcrumb">([^<]+)<\/span>/i);
        const breadcrumb = breadcrumbMatch ? breadcrumbMatch[1].trim() : '';
        
        // Извлекаем HTML контент для сохранения стилей
        const mainHtml = extractMainHtml(html);
        
        htmlFiles.push({
          title,
          content,
          contentHtml: mainHtml, // Сохраняем HTML для отображения со стилями
          url,
          breadcrumb,
          section: breadcrumb.split('/')[0].trim(),
          headings
        });
      }
      // ВСЕ ОСТАЛЬНЫЕ ФАЙЛЫ ИГНОРИРУЮТСЯ
    });
  }
  
  scanDirectory(distDir);
  return createSearchIndex(htmlFiles);
}

/**
 * Сохраняет индекс в JSON файл
 * @param {Object} searchData - Данные индекса
 * @param {string} outputPath - Путь для сохранения
 */
function saveSearchIndex(searchData, outputPath) {
  fs.writeFileSync(outputPath, JSON.stringify(searchData), 'utf8');
}

module.exports = {
  createSearchIndex,
  extractTextFromHtml,
  extractTitleFromHtml,
  scanAndIndexHtmlFiles,
  saveSearchIndex
};
