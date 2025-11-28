// search.js - Клиентский модуль поиска (MkDocs Material style)

let searchIndex = null;
let searchDocuments = null;
let searchInitialized = false;

/**
 * Получает путь к корню сайта
 */
function getSearchIndexPath() {
  // Получаем базовый путь (директория, где находится index.html)
  const pathname = window.location.pathname;
  
  // Если pathname заканчивается на .html, убираем имя файла
  let basePath = pathname.substring(0, pathname.lastIndexOf('/') + 1);
  
  // Если мы в поддиректории (например /dist/), убираем её
  if (basePath.includes('/dist/')) {
    basePath = basePath.substring(basePath.indexOf('/dist/') + 5);
  }
  
  // Считаем уровень вложенности
  const depth = (basePath.match(/\//g) || []).length;
  
  if (depth === 0 || depth === 1) {
    // Корень или первый уровень
    return basePath + 'search-index.json';
  }
  
  // Для вложенных страниц поднимаемся к корню
  return '../'.repeat(depth - 1) + 'search-index.json';
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
    
    // Добавляем информацию о документах к результатам
    return results.map(result => {
      const doc = searchDocuments[parseInt(result.ref)];
      return {
        ...doc,
        score: result.score,
        preview: generatePreview(doc.content, query)
      };
    }).slice(0, 20); // Увеличено до 20 результатов
  } catch (error) {
    console.error('❌ Search error:', error);
    return [];
  }
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
  
  console.log('🔍 Opening search modal');
  
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  input.focus();
  
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
  
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    
    if (input) input.value = '';
    if (results) results.innerHTML = '';
  }
}

/**
 * Преобразует URL результата в правильный относительный путь
 */
function getResultUrl(resultUrl) {
  // Убираем ./ из начала URL если есть
  let url = resultUrl.replace(/^\.\//, '');
  
  // Получаем текущий путь
  const pathname = window.location.pathname;
  let basePath = pathname.substring(0, pathname.lastIndexOf('/') + 1);
  
  // Если мы в поддиректории (например /dist/), убираем её
  if (basePath.includes('/dist/')) {
    basePath = basePath.substring(basePath.indexOf('/dist/') + 5);
  }
  
  // Считаем уровень вложенности
  const depth = (basePath.match(/\//g) || []).length;
  
  if (depth === 0 || depth === 1) {
    // Корень или первый уровень - используем URL как есть
    return url;
  }
  
  // Для вложенных страниц поднимаемся к корню
  return '../'.repeat(depth - 1) + url;
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
  
  // Отображаем результаты
  resultsContainer.innerHTML = results.map(result => `
    <a href="${getResultUrl(result.url)}" class="search-result-item" onclick="closeSearchModal()">
      <div class="search-result-header">
        <span class="search-result-title">${highlightQuery(result.title, query)}</span>
        ${result.breadcrumb ? `<span class="search-result-breadcrumb">${result.breadcrumb}</span>` : ''}
      </div>
      <div class="search-result-preview">${result.preview}</div>
    </a>
  `).join('');
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
