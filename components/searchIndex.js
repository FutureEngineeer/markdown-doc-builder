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
    const doc = {
      id: idx.toString(),
      title: file.title || '',
      content: file.content || '',
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
 * Извлекает текстовый контент из HTML
 * @param {string} html - HTML контент
 * @returns {string} - Очищенный текст
 */
function extractTextFromHtml(html) {
  // Удаляем скрипты и стили
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
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
        scanDirectory(filePath, baseUrl + file + '/');
      } else if (file.endsWith('.html')) {
        const html = fs.readFileSync(filePath, 'utf8');
        const title = extractTitleFromHtml(html);
        const content = extractTextFromHtml(html);
        
        // Определяем URL относительно dist
        let url = baseUrl + file;
        if (file === 'index.html' && baseUrl === '') {
          url = './';
        }
        
        // Извлекаем breadcrumb из HTML
        const breadcrumbMatch = html.match(/<span class="breadcrumb">([^<]+)<\/span>/i);
        const breadcrumb = breadcrumbMatch ? breadcrumbMatch[1].trim() : '';
        
        htmlFiles.push({
          title,
          content,
          url,
          breadcrumb,
          section: breadcrumb.split('/')[0].trim()
        });
      }
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
