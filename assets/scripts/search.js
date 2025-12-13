// search.js - Клиентский модуль поиска (MkDocs Material style)

let searchIndex = null;
let searchDocuments = null;
let searchInitialized = false;

/**
 * Получает путь к корню сайта
 */
function getSearchIndexPath() {
  const pathname = window.location.pathname;
  
  // Убираем имя файла, оставляем только путь к директории
  let basePath = pathname.substring(0, pathname.lastIndexOf('/') + 1);
  
  // Убираем базовый URL репозитория для GitHub Pages
  // Например: /markdown-doc-builder/ -> /
  const pathParts = basePath.split('/').filter(p => p);
  
  // Если первая часть - это название репозитория, убираем её
  if (pathParts.length > 0 && !pathParts[0].endsWith('.html')) {
    // Считаем глубину вложенности после базового пути
    const depth = pathParts.length - 1;
    
    if (depth === 0) {
      // Мы в корне репозитория
      return 'search-index.json';
    } else {
      // Поднимаемся к корню
      return '../'.repeat(depth) + 'search-index.json';
    }
  }
  
  // Если мы в корне сайта
  return 'search-index.json';
}

/**
 * Инициализация поиска
 */
async function initSearch() {
  if (searchInitialized) return;
  
  try {
    const indexPath = getSearchIndexPath();
    console.log('🔍 Загрузка индекса:', indexPath);
    
    const response = await fetch(indexPath);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    searchIndex = lunr.Index.load(data.index);
    searchDocuments = data.documents;
    searchInitialized = true;
    
    console.log('✅ Search index loaded:', searchDocuments.length, 'documents');
  } catch (error) {
    console.error('❌ Failed to load search index:', error);
    console.error('   Path:', getSearchIndexPath());
  }
}

/**
 * Получает текущий URL страницы
 */
function getCurrentPageUrl() {
  const pathname = window.location.pathname;
  
  // Убираем базовый путь репозитория
  const pathParts = pathname.split('/').filter(p => p);
  
  if (pathParts.length === 0) {
    return 'index.html';
  }
  
  // Последняя часть - это имя файла
  const fileName = pathParts[pathParts.length - 1];
  
  // Если это директория (нет .html), возвращаем index.html
  if (!fileName.endsWith('.html')) {
    return 'index.html';
  }
  
  return fileName;
}

/**
 * Выполняет поиск
 * @param {string} query - Поисковый запрос
 * @returns {Array} - Массив результатов
 */
function performSearch(query) {
  if (!searchInitialized) {
    console.warn('⚠️ Search not initialized');
    return [];
  }
  
  if (!query.trim()) {
    return [];
  }
  
  try {
    console.log('🔎 Search:', query);
    
    // Выполняем поиск с использованием wildcard для частичного совпадения
    const results = searchIndex.search(query + '*');
    
    console.log(`✅ Found results: ${results.length}`);
    
    const currentPageUrl = getCurrentPageUrl();
    
    // Добавляем информацию о документах к результатам
    const enrichedResults = results.map(result => {
      const doc = searchDocuments[parseInt(result.ref)];
      
      // Нормализуем URL для сравнения
      const docUrl = doc.url.replace(/^\.\//, '');
      const docFileName = docUrl.split('/').pop();
      
      const isCurrentPage = docFileName === currentPageUrl || 
                           docUrl === currentPageUrl ||
                           (currentPageUrl === 'index.html' && docUrl === './');
      
      return {
        ...doc,
        score: result.score,
        isCurrentPage,
        matches: findMatches(doc, query)
      };
    });
    
    // Сортируем: сначала текущая страница, потом по score
    enrichedResults.sort((a, b) => {
      if (a.isCurrentPage && !b.isCurrentPage) return -1;
      if (!a.isCurrentPage && b.isCurrentPage) return 1;
      return b.score - a.score;
    });
    
    return enrichedResults.slice(0, 30);
  } catch (error) {
    console.error('❌ Search error:', error);
    return [];
  }
}

/**
 * Находит ближайший заголовок к позиции в тексте
 * @param {Array} headings - Массив заголовков
 * @param {number} position - Позиция в тексте
 * @returns {Object|null} - Ближайший заголовок или null
 */
function findNearestHeading(headings, position) {
  if (!headings || headings.length === 0) return null;
  
  let nearest = null;
  for (const heading of headings) {
    if (heading.position <= position) {
      nearest = heading;
    } else {
      break;
    }
  }
  
  return nearest;
}

/**
 * Подсчитывает количество слов в тексте
 * @param {string} text - Текст
 * @returns {number} - Количество слов
 */
function countWords(text) {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Преобразует markdown-подобный текст в HTML для отображения
 * @param {string} text - Текст
 * @returns {string} - HTML
 */
function formatTextForDisplay(text) {
  // Сохраняем переносы строк
  let formatted = text
    // Заменяем двойные переносы на параграфы
    .replace(/\n\n/g, '</p><p>')
    // Заменяем одинарные переносы на <br>
    .replace(/\n/g, '<br>');
  
  // Оборачиваем в параграф если нужно
  if (!formatted.startsWith('<p>')) {
    formatted = '<p>' + formatted;
  }
  if (!formatted.endsWith('</p>')) {
    formatted = formatted + '</p>';
  }
  
  // Обрабатываем inline код
  formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Обрабатываем жирный текст
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Обрабатываем курсив
  formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  return formatted;
}

/**
 * Извлекает контекст с ограничением по словам или абзацу
 * @param {string} content - Текстовый контент
 * @param {number} position - Позиция совпадения
 * @param {number} maxWords - Максимум слов (по умолчанию 50)
 * @returns {string} - Контекст
 */
function extractSmartContext(content, position, maxWords = 50) {
  // Находим начало и конец абзаца
  let paragraphStart = content.lastIndexOf('\n\n', position);
  if (paragraphStart === -1) paragraphStart = 0;
  else paragraphStart += 2;
  
  let paragraphEnd = content.indexOf('\n\n', position);
  if (paragraphEnd === -1) paragraphEnd = content.length;
  
  let context = content.substring(paragraphStart, paragraphEnd).trim();
  
  // Если абзац слишком длинный, ограничиваем по словам
  if (countWords(context) > maxWords) {
    const words = context.split(/\s+/);
    const matchPosition = position - paragraphStart;
    const matchWordIndex = countWords(content.substring(paragraphStart, paragraphStart + matchPosition));
    
    // Берем слова вокруг совпадения
    const startWord = Math.max(0, matchWordIndex - Math.floor(maxWords / 2));
    const endWord = Math.min(words.length, startWord + maxWords);
    
    context = words.slice(startWord, endWord).join(' ');
    
    if (startWord > 0) context = '...' + context;
    if (endWord < words.length) context = context + '...';
  }
  
  // Форматируем текст для отображения
  return formatTextForDisplay(context);
}

/**
 * Извлекает HTML фрагмент вокруг совпадения с умным контекстом
 * @param {string} html - HTML контент
 * @param {string} plainText - Текстовый контент
 * @param {number} position - Позиция совпадения в тексте
 * @param {Object} heading - Ближайший заголовок
 * @returns {string} - HTML фрагмент
 */
function extractHtmlFragment(html, plainText, position, heading) {
  // Извлекаем умный контекст из текста
  const textContext = extractSmartContext(plainText, position, 50);
  
  // Если есть заголовок, пытаемся найти его в HTML и добавить
  if (heading && heading.text) {
    const headingPattern = new RegExp(`<h[1-6][^>]*>${heading.text}</h[1-6]>`, 'i');
    const headingMatch = html.match(headingPattern);
    
    if (headingMatch) {
      // Возвращаем заголовок + контекст
      return `<div class="search-heading">${headingMatch[0]}</div><div class="search-context">${textContext}</div>`;
    }
  }
  
  return `<div class="search-context">${textContext}</div>`;
}

/**
 * Находит все совпадения в документе
 * @param {Object} doc - Документ
 * @param {string} query - Поисковый запрос
 * @returns {Array} - Массив совпадений
 */
function findMatches(doc, query) {
  const matches = [];
  const queryLower = query.toLowerCase();
  const contentLower = doc.content.toLowerCase();
  
  // Используем headingsData вместо headings
  const headingsData = doc.headingsData || [];
  
  // Ищем все вхождения
  let index = 0;
  while ((index = contentLower.indexOf(queryLower, index)) !== -1) {
    // Находим ближайший заголовок
    const nearestHeading = findNearestHeading(headingsData, index);
    
    // Извлекаем умный контекст (50 слов или конец абзаца)
    const preview = extractHtmlFragment(
      doc.contentHtml || doc.content,
      doc.content,
      index,
      nearestHeading
    );
    
    matches.push({
      preview: highlightQuery(preview, query),
      position: index,
      heading: nearestHeading
    });
    
    index += queryLower.length;
  }
  
  return matches.slice(0, 5); // Максимум 5 совпадений на документ
}

/**
 * Генерирует превью с подсветкой найденных слов
 * @param {string} content - Контент документа
 * @param {string} query - Поисковый запрос
 * @returns {string} - HTML превью
 */
function generatePreview(content, query) {
  const maxLength = 150;
  const queryLower = query.toLowerCase();
  const contentLower = content.toLowerCase();
  
  // Находим позицию первого вхождения
  let index = contentLower.indexOf(queryLower);
  
  if (index === -1) {
    // Если точного совпадения нет, берем начало
    index = 0;
  }
  
  // Определяем начало и конец превью
  const start = Math.max(0, index - 50);
  const end = Math.min(content.length, start + maxLength);
  
  let preview = content.substring(start, end);
  
  // Добавляем многоточие
  if (start > 0) preview = '...' + preview;
  if (end < content.length) preview = preview + '...';
  
  // Подсвечиваем найденные слова
  const words = query.split(/\s+/).filter(w => w.length > 2);
  words.forEach(word => {
    const regex = new RegExp(`(${word})`, 'gi');
    preview = preview.replace(regex, '<mark>$1</mark>');
  });
  
  return preview;
}

/**
 * Открывает модальное окно поиска
 */
function openSearchModal() {
  const modal = document.getElementById('search-modal');
  const input = document.getElementById('search-input');
  
  if (!modal) {
    console.error('❌ Search modal not found!');
    return;
  }
  
  if (!input) {
    console.error('❌ Search input not found!');
    return;
  }
  
  // Если модальное окно уже открыто, не делаем ничего
  if (modal.classList.contains('active')) {
    console.log('⚠️ Search modal already open');
    return;
  }
  
  console.log('🔍 Opening search modal');
  
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  
  // Фокусируем input после небольшой задержки для корректной работы анимации
  setTimeout(() => {
    input.focus();
  }, 100);
  
  // Инициализируем поиск при первом открытии
  if (!searchInitialized) {
    console.log('⏳ Initializing search...');
    initSearch();
  } else {
    console.log('✅ Search already initialized');
  }
}

/**
 * Закрывает модальное окно поиска
 */
function closeSearchModal() {
  const modal = document.getElementById('search-modal');
  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');
  
  if (!modal) {
    return;
  }
  
  // Если модальное окно уже закрыто, не делаем ничего
  if (!modal.classList.contains('active')) {
    console.log('⚠️ Search modal already closed');
    return;
  }
  
  console.log('🔍 Closing search modal');
  
  modal.classList.remove('active');
  document.body.style.overflow = '';
  
  // Очищаем поле ввода и восстанавливаем начальное состояние результатов
  setTimeout(() => {
    if (input) input.value = '';
    if (results) results.innerHTML = '<div class="search-hint">Type at least 2 characters to search</div>';
  }, 300); // Задержка соответствует времени анимации
}

/**
 * Преобразует URL результата в правильный относительный путь
 */
function getResultUrl(resultUrl) {
  // Убираем ./ из начала URL если есть
  let url = resultUrl.replace(/^\.\//, '');
  
  // Получаем текущий путь
  const pathname = window.location.pathname;
  const pathParts = pathname.split('/').filter(p => p && !p.endsWith('.html'));
  
  // Считаем глубину вложенности (исключая базовый путь репозитория)
  const depth = pathParts.length > 0 ? pathParts.length - 1 : 0;
  
  if (depth === 0) {
    // Мы в корне - используем URL как есть
    return url;
  }
  
  // Для вложенных страниц поднимаемся к корню
  return '../'.repeat(depth) + url;
}

/**
 * Обработчик ввода в поисковую строку
 */
function handleSearchInput(event) {
  const query = event.target.value;
  const resultsContainer = document.getElementById('search-results');
  
  if (!resultsContainer) return;
  
  if (query.length < 2) {
    resultsContainer.innerHTML = '<div class="search-hint">Type at least 2 characters to search</div>';
    return;
  }
  
  const results = performSearch(query);
  
  if (results.length === 0) {
    resultsContainer.innerHTML = '<div class="search-no-results">No results found</div>';
    return;
  }
  
  // Группируем результаты по страницам
  const groupedResults = [];
  let currentUrl = null;
  
  results.forEach(result => {
    if (result.url !== currentUrl) {
      groupedResults.push({
        type: 'page',
        ...result
      });
      currentUrl = result.url;
    } else {
      // Дополнительные совпадения на той же странице
      groupedResults.push({
        type: 'match',
        ...result
      });
    }
  });
  
  // Отображаем результаты
  let html = '';
  let lastUrl = null;
  
  groupedResults.forEach((result, index) => {
    // Добавляем разделитель между разными страницами
    if (lastUrl !== null && result.url !== lastUrl) {
      html += '<div class="search-result-separator"></div>';
    }
    
    if (result.type === 'page') {
      // Основной результат страницы
      const currentPageBadge = result.isCurrentPage ? '<span class="current-page-badge">Current Page</span>' : '';
      
      // Определяем якорь для первого совпадения
      const firstMatchAnchor = result.matches.length > 0 && result.matches[0].heading 
        ? `#${result.matches[0].heading.id}` 
        : '';
      
      html += `
        <a href="${getResultUrl(result.url)}${firstMatchAnchor}" class="search-result-item ${result.isCurrentPage ? 'current-page' : ''}" onclick="closeSearchModal()">
          <div class="search-result-header">
            <span class="search-result-title">${highlightQuery(result.title, query)}</span>
            ${currentPageBadge}
            ${result.breadcrumb ? `<span class="search-result-breadcrumb">${result.breadcrumb}</span>` : ''}
          </div>
          ${result.matches.length > 0 ? `<div class="search-result-preview">${result.matches[0].preview}</div>` : ''}
        </a>
      `;
      
      // Если есть дополнительные совпадения на этой странице
      if (result.matches.length > 1) {
        const isCollapsed = !result.isCurrentPage;
        const collapseClass = isCollapsed ? 'collapsed' : '';
        const uniqueId = `more-matches-${index}`;
        
        html += `<div class="search-more-matches ${collapseClass}" id="${uniqueId}">`;
        html += `<div class="search-more-matches-header" onclick="toggleMoreMatches('${uniqueId}')">${result.matches.length - 1} more on this page</div>`;
        html += '<div class="search-more-matches-content">';
        result.matches.slice(1).forEach(match => {
          const anchor = match.heading ? `#${match.heading.id}` : '';
          html += `
            <a href="${getResultUrl(result.url)}${anchor}" class="search-match-item" onclick="closeSearchModal()">
              <div class="search-result-preview">${match.preview}</div>
            </a>
          `;
        });
        html += '</div></div>';
      }
    }
    
    lastUrl = result.url;
  });
  
  resultsContainer.innerHTML = html;
}

/**
 * Подсвечивает запрос в тексте
 * @param {string} text - Текст
 * @param {string} query - Запрос
 * @returns {string} - HTML с подсветкой
 */
function highlightQuery(text, query) {
  const words = query.split(/\s+/).filter(w => w.length > 1);
  let result = text;
  
  words.forEach(word => {
    const regex = new RegExp(`(${word})`, 'gi');
    result = result.replace(regex, '<mark>$1</mark>');
  });
  
  return result;
}

/**
 * Переключает видимость дополнительных совпадений
 * @param {string} id - ID элемента
 */
function toggleMoreMatches(id) {
  const element = document.getElementById(id);
  if (element) {
    element.classList.toggle('collapsed');
  }
}

// Экспортируем для использования в onclick
if (typeof window !== 'undefined') {
  window.toggleMoreMatches = toggleMoreMatches;
}

/**
 * Инициализация обработчиков событий
 */
document.addEventListener('DOMContentLoaded', () => {
  // Обработчик клавиши Escape для закрытия
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSearchModal();
    }
    
    // Ctrl+K или Cmd+K для открытия поиска
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      openSearchModal();
    }
  });
  
  // Клик по overlay для закрытия
  const overlay = document.querySelector('.search-modal-overlay');
  if (overlay) {
    overlay.addEventListener('click', closeSearchModal);
  }
  
  // Обработчик ввода в поисковую строку
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', handleSearchInput);
  }
});
