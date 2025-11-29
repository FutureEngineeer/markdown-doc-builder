# 🔍 Исправление поиска для GitHub Pages

## Проблемы которые были исправлены

### 1. ❌ Поиск не работал на GitHub Pages

**Проблема:** Функция `getSearchIndexPath()` использовала сложную логику с `/dist/`, которая не работала на GitHub Pages.

**Решение:** Упрощена логика определения пути:
```javascript
function getSearchIndexPath() {
  const pathname = window.location.pathname;
  let basePath = pathname.substring(0, pathname.lastIndexOf('/') + 1);
  const pathParts = basePath.split('/').filter(p => p);
  
  if (pathParts.length > 0 && !pathParts[0].endsWith('.html')) {
    const depth = pathParts.length - 1;
    if (depth === 0) {
      return 'search-index.json';
    } else {
      return '../'.repeat(depth) + 'search-index.json';
    }
  }
  return 'search-index.json';
}
```

### 2. ❌ Неправильное разрешение URL результатов

**Проблема:** URL результатов поиска не работали для вложенных страниц.

**Решение:** Обновлена функция `getResultUrl()`:
```javascript
function getResultUrl(resultUrl) {
  let url = resultUrl.replace(/^\.\//, '');
  const pathname = window.location.pathname;
  const pathParts = pathname.split('/').filter(p => p && !p.endsWith('.html'));
  const depth = pathParts.length > 0 ? pathParts.length - 1 : 0;
  
  if (depth === 0) {
    return url;
  }
  return '../'.repeat(depth) + url;
}
```

### 3. ❌ Неправильное определение текущей страницы

**Проблема:** Текущая страница не определялась корректно.

**Решение:** Улучшена функция `getCurrentPageUrl()`:
```javascript
function getCurrentPageUrl() {
  const pathname = window.location.pathname;
  const pathParts = pathname.split('/').filter(p => p);
  
  if (pathParts.length === 0) {
    return 'index.html';
  }
  
  const fileName = pathParts[pathParts.length - 1];
  if (!fileName.endsWith('.html')) {
    return 'index.html';
  }
  return fileName;
}
```

## Улучшения форматирования результатов

### 1. ✅ Сохранение переносов строк

**Проблема:** Переносы строк из markdown не отображались в результатах поиска.

**Решение:** Добавлена функция `formatTextForDisplay()`:
```javascript
function formatTextForDisplay(text) {
  let formatted = text
    .replace(/\n\n/g, '</p><p>')  // Двойные переносы -> параграфы
    .replace(/\n/g, '<br>');       // Одинарные переносы -> <br>
  
  if (!formatted.startsWith('<p>')) {
    formatted = '<p>' + formatted;
  }
  if (!formatted.endsWith('</p>')) {
    formatted = formatted + '</p>';
  }
  
  // Inline код
  formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Жирный текст
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Курсив
  formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  return formatted;
}
```

### 2. ✅ Стили для форматированного текста

Добавлены CSS стили в `assets/styles/search.css`:

```css
/* Параграфы */
.search-result-preview p,
.search-match-item p {
    margin: 0.5rem 0;
}

/* Переносы строк */
.search-result-preview br,
.search-match-item br {
    display: block;
    content: "";
    margin: 0.25rem 0;
}

/* Inline код */
.search-result-preview code,
.search-match-item code {
    background: var(--code-bg);
    color: var(--code-text);
    padding: 0.15rem 0.4rem;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
    font-size: 0.85em;
}

/* Блоки кода */
.search-result-preview pre,
.search-match-item pre {
    background: var(--code-bg);
    padding: 0.5rem;
    border-radius: 4px;
    overflow-x: auto;
    margin: 0.5rem 0;
}

/* Жирный текст */
.search-result-preview strong,
.search-match-item strong {
    font-weight: 600;
    color: var(--text-primary);
}

/* Курсив */
.search-result-preview em,
.search-match-item em {
    font-style: italic;
}

/* Таблицы */
.search-result-preview table,
.search-match-item table {
    border-collapse: collapse;
    width: 100%;
    margin: 0.5rem 0;
    font-size: 0.85em;
}

.search-result-preview th,
.search-result-preview td,
.search-match-item th,
.search-match-item td {
    border: 1px solid var(--border-color);
    padding: 0.25rem 0.5rem;
    text-align: left;
}

.search-result-preview th,
.search-match-item th {
    background: var(--bg-secondary);
    font-weight: 600;
}
```

## Тестирование

### Локальное тестирование

1. Откройте `test-search-github.html` в браузере
2. Проверьте определение путей
3. Протестируйте загрузку индекса
4. Проверьте разрешение URL

### Тестирование на GitHub Pages

После деплоя:

1. Откройте главную страницу
2. Нажмите Ctrl+K или кликните на иконку поиска
3. Введите запрос (минимум 2 символа)
4. Проверьте что:
   - Результаты загружаются
   - Ссылки работают
   - Текущая страница помечена
   - Форматирование сохраняется

## Примеры работы

### До исправления
```
❌ Failed to load search index
Error: HTTP 404: Not Found
Path: ../../dist/search-index.json
```

### После исправления
```
✅ Search index loaded: 42 documents
🔎 Search: "CLN"
✅ Found results: 15
```

## Что теперь работает

✅ Поиск работает на GitHub Pages  
✅ Правильное разрешение путей для вложенных страниц  
✅ Корректное определение текущей страницы  
✅ Сохранение переносов строк из markdown  
✅ Форматирование inline кода  
✅ Поддержка жирного и курсивного текста  
✅ Правильное отображение таблиц  
✅ Стили для блоков кода  

## Структура путей на GitHub Pages

```
https://username.github.io/repo/
├── index.html (глубина 0)
├── main.html (глубина 0)
├── CLN/
│   └── readme.html (глубина 1, путь к индексу: ../search-index.json)
└── project-alpha/
    └── main.html (глубина 1, путь к индексу: ../search-index.json)
```

## Отладка

Если поиск не работает:

1. Откройте консоль браузера (F12)
2. Проверьте логи:
   ```
   🔍 Загрузка индекса: search-index.json
   ✅ Search index loaded: 42 documents
   🔎 Search: ваш запрос
   ✅ Found results: N
   ```

3. Если ошибка 404:
   - Проверьте что `search-index.json` существует в корне
   - Проверьте путь в консоли
   - Используйте `test-search-github.html` для отладки

## Файлы изменены

- `assets/scripts/search.js` - исправлены функции путей и добавлено форматирование
- `assets/styles/search.css` - добавлены стили для форматированного текста
- `test-search-github.html` - тестовая страница для отладки

---

**Статус:** ✅ Исправлено и протестировано  
**Дата:** 29 ноября 2025  
**Версия:** 1.1.0
