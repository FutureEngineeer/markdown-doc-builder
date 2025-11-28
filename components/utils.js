// utils.js - Утилиты для парсинга и обработки Markdown
const MarkdownIt = require('markdown-it');
const katex = require('markdown-it-katex');
const taskLists = require('markdown-it-task-lists');

// Lazy load alert plugin
let alertPlugin = null;
let alertPluginLoading = null;

/**
 * Инициализация markdown-it с настройками по умолчанию
 */
function createMarkdownInstance(options = {}) {
  const md = new MarkdownIt({
    html: true,
    breaks: false,
    linkify: true,
    typographer: true,
    ...options
  });
  
  // Try to load alert plugin if available, but don't fail if it's not
  try {
    if (!alertPlugin && !alertPluginLoading) {
      alertPluginLoading = true;
      // Try synchronous require first (won't work for ES modules)
      // If it fails, we'll just skip the plugin
      try {
        // This will fail for ES modules, which is expected
        alertPlugin = require('@mdit/plugin-alert').alert;
      } catch (e) {
        // ES module - skip for now, alerts won't work but build will succeed
        console.warn('Note: @mdit/plugin-alert is an ES module and cannot be loaded synchronously. Alerts will not be rendered.');
        alertPlugin = null;
      }
    }
    
    if (alertPlugin) {
      md.use(alertPlugin);
    }
  } catch (error) {
    // Silently skip if plugin can't be loaded
    console.warn('Warning: Could not load @mdit/plugin-alert:', error.message);
  }
  
  // Подключаем плагин чек-листов с кастомными классами
  md.use(taskLists, {
    enabled: true,
    label: true,
    labelAfter: true,
    // Чекбоксы не должны менять состояние (disabled)
    // Их состояние задается только через .md файл
    disabled: true
  });

  // ============================================
  // КАСТОМНЫЕ ПРАВИЛА ДЛЯ ЧЕК-ЛИСТОВ
  // ============================================
  
  // Переопределяем рендеринг списков для чек-листов
  const defaultListOpen = md.renderer.rules.list_open || 
    function(tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

  const defaultListClose = md.renderer.rules.list_close || 
    function(tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

  const defaultListItemOpen = md.renderer.rules.list_item_open || 
    function(tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

  const defaultListItemClose = md.renderer.rules.list_item_close || 
    function(tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

  // Функция для проверки, является ли список чек-листом
  function isTaskList(tokens, idx) {
    // Ищем элементы списка с чекбоксами
    for (let i = idx + 1; i < tokens.length; i++) {
      if (tokens[i].type === 'list_close') break;
      if (tokens[i].type === 'list_item_open') {
        // Проверяем следующие токены на наличие чекбокса
        for (let j = i + 1; j < tokens.length; j++) {
          if (tokens[j].type === 'list_item_close') break;
          if (tokens[j].type === 'paragraph_open') {
            // Проверяем содержимое параграфа
            if (j + 2 < tokens.length && tokens[j + 1].type === 'inline') {
              const content = tokens[j + 1].content;
              if (content.match(/^\s*\[[ x]\]\s/)) {
                return true;
              }
            }
          }
        }
      }
    }
    return false;
  }

  // Переопределяем рендеринг списков
  md.renderer.rules.list_open = function(tokens, idx, options, env, self) {
    const token = tokens[idx];
    
    if (isTaskList(tokens, idx)) {
      return '<ul class="checklist">\n';
    }
    
    return defaultListOpen(tokens, idx, options, env, self);
  };

  md.renderer.rules.list_close = function(tokens, idx, options, env, self) {
    const token = tokens[idx];
    
    // Проверяем, был ли это чек-лист (ищем соответствующий list_open)
    for (let i = idx - 1; i >= 0; i--) {
      if (tokens[i].type === 'list_open') {
        if (isTaskList(tokens, i)) {
          return '</ul>\n';
        }
        break;
      }
    }
    
    return defaultListClose(tokens, idx, options, env, self);
  };

  md.renderer.rules.list_item_open = function(tokens, idx, options, env, self) {
    const token = tokens[idx];
    
    // Проверяем, находимся ли мы в чек-листе
    let inTaskList = false;
    for (let i = idx - 1; i >= 0; i--) {
      if (tokens[i].type === 'list_open') {
        inTaskList = isTaskList(tokens, i);
        break;
      }
    }
    
    if (inTaskList) {
      // Ищем содержимое элемента списка для определения состояния чекбокса
      let isChecked = false;
      for (let i = idx + 1; i < tokens.length; i++) {
        if (tokens[i].type === 'list_item_close') break;
        if (tokens[i].type === 'inline') {
          const content = tokens[i].content;
          const match = content.match(/^\s*\[([x ])\]\s*(.*)/);
          if (match) {
            isChecked = match[1] === 'x';
            // Обновляем содержимое, убирая чекбокс
            tokens[i].content = match[2];
            break;
          }
        }
      }
      
      const checkedClass = isChecked ? ' checked' : '';
      return `<li class="checklist-item${checkedClass}">
        <div class="checklist-checkbox"></div>
        <div class="checklist-text">`;
    }
    
    return defaultListItemOpen(tokens, idx, options, env, self);
  };

  md.renderer.rules.list_item_close = function(tokens, idx, options, env, self) {
    // Проверяем, находимся ли мы в чек-листе
    let inTaskList = false;
    for (let i = idx - 1; i >= 0; i--) {
      if (tokens[i].type === 'list_open') {
        inTaskList = isTaskList(tokens, i);
        break;
      }
    }
    
    if (inTaskList) {
      return '</div></li>\n';
    }
    
    return defaultListItemClose(tokens, idx, options, env, self);
  };
  
  // ============================================
  // КАСТОМНЫЕ ПРАВИЛА ДЛЯ ТАБЛИЦ
  // ============================================
  
  // Сохраняем оригинальные правила
  const defaultTableOpen = md.renderer.rules.table_open || 
    function(tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

  const defaultTableClose = md.renderer.rules.table_close || 
    function(tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

  // Переопределяем рендеринг таблиц с оберткой
  md.renderer.rules.table_open = function(tokens, idx, options, env, self) {
    return '<div class="table-wrapper">\n' + defaultTableOpen(tokens, idx, options, env, self);
  };

  md.renderer.rules.table_close = function(tokens, idx, options, env, self) {
    return defaultTableClose(tokens, idx, options, env, self) + '</div>\n';
  };

  // ============================================
  // АВТОМАТИЧЕСКАЯ ОБРАБОТКА IFRAME
  // ============================================
  
  // Сохраняем оригинальное правило для HTML
  const defaultHtmlInline = md.renderer.rules.html_inline || 
    function(tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

  const defaultHtmlBlock = md.renderer.rules.html_block || 
    function(tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

  // Функция для обработки iframe
  function processIframe(content) {
    // Проверяем, содержит ли контент iframe
    if (content.includes('<iframe')) {
      // Если iframe уже обернут в video-responsive, не трогаем
      if (content.includes('class="video-responsive"')) {
        return content;
      }
      
      // Оборачиваем iframe в video-responsive
      return content.replace(
        /(<iframe[^>]*>.*?<\/iframe>)/gi,
        '<div class="video-responsive">$1</div>'
      );
    }
    return content;
  }

  // Переопределяем рендеринг HTML для автоматической обработки iframe
  md.renderer.rules.html_inline = function(tokens, idx, options, env, self) {
    const token = tokens[idx];
    const content = processIframe(token.content);
    return content;
  };

  md.renderer.rules.html_block = function(tokens, idx, options, env, self) {
    const token = tokens[idx];
    const content = processIframe(token.content);
    return content;
  };

  // ============================================
  // КАСТОМНЫЕ ПРАВИЛА ДЛЯ КЛИКАБЕЛЬНЫХ ИЗОБРАЖЕНИЙ
  // ============================================
  
  // Сохраняем оригинальные правила для изображений и ссылок
  const defaultImage = md.renderer.rules.image || 
    function(tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

  const defaultLinkOpen = md.renderer.rules.link_open || 
    function(tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

  const defaultLinkClose = md.renderer.rules.link_close || 
    function(tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

  // Переопределяем рендеринг изображений для поддержки кликабельности
  md.renderer.rules.image = function(tokens, idx, options, env, self) {
    const token = tokens[idx];
    const src = token.attrGet('src');
    const alt = token.attrGet('alt') || '';
    const title = token.attrGet('title') || '';
    
    // Проверяем, находится ли изображение внутри ссылки
    // Ищем предыдущий токен link_open
    let isInsideLink = false;
    let linkUrl = '';
    
    for (let i = idx - 1; i >= 0; i--) {
      if (tokens[i].type === 'link_open') {
        isInsideLink = true;
        linkUrl = tokens[i].attrGet('href') || '';
        break;
      } else if (tokens[i].type === 'link_close') {
        break;
      }
    }
    
    // Создаем базовый img элемент
    let imgHtml = `<img src="${src}" alt="${escapeHtml(alt)}"`;
    if (title) {
      imgHtml += ` title="${escapeHtml(title)}"`;
    }
    imgHtml += ' loading="lazy"';
    
    // Если изображение внутри ссылки, проверяем, нужно ли добавлять onclick
    if (isInsideLink && linkUrl) {
      // Проверяем, содержит ли ссылка только изображение
      let hasOnlyImage = false;
      let imageCount = 0;
      let textContent = '';
      
      // Ищем содержимое ссылки
      for (let i = idx - 1; i >= 0; i--) {
        if (tokens[i].type === 'link_open') {
          // Ищем содержимое до link_close
          for (let j = i + 1; j < tokens.length; j++) {
            if (tokens[j].type === 'link_close') {
              break;
            }
            if (tokens[j].type === 'image') {
              imageCount++;
            } else if (tokens[j].type === 'text') {
              textContent += tokens[j].content;
            }
          }
          break;
        }
      }
      
      hasOnlyImage = imageCount > 0 && textContent.trim() === '';
      
      // Добавляем onclick только если ссылка содержит только изображение
      if (hasOnlyImage) {
        // Определяем, внешняя ли это ссылка
        const isExternalLink = linkUrl.startsWith('http://') || linkUrl.startsWith('https://');
        const isInternalLink = linkUrl.startsWith('#') || linkUrl.startsWith('./') || linkUrl.startsWith('../') || 
                              (!linkUrl.includes('://') && !linkUrl.startsWith('mailto:') && !linkUrl.startsWith('tel:'));
        
        if (isExternalLink) {
          // Внешняя ссылка - открываем в новой вкладке
          imgHtml += ` onclick="window.open('${linkUrl}', '_blank'); return false;" style="cursor: pointer;"`;
        } else if (isInternalLink) {
          // Внутренняя ссылка - открываем в том же окне
          imgHtml += ` onclick="window.location.href='${linkUrl}'; return false;" style="cursor: pointer;"`;
        } else {
          // Для остальных случаев (mailto, tel и т.д.) - открываем в новой вкладке
          imgHtml += ` onclick="window.open('${linkUrl}', '_blank'); return false;" style="cursor: pointer;"`;
        }
      }
    }
    
    imgHtml += '>';
    
    return imgHtml;
  };

  // Добавляем кастомный плагин для обработки кликабельных изображений и чек-листов
  md.use(function(md) {
    // Сохраняем оригинальный метод render
    const originalRender = md.render.bind(md);
    
    // Переопределяем метод render для постобработки
    md.render = function(src, env) {
      let html = originalRender(src, env);
      
      // Постобработка: удаляем <a> теги вокруг изображений, которые имеют onclick
      html = html.replace(/<a[^>]*href="([^"]*)"[^>]*>(\s*<img[^>]*onclick="[^"]*"[^>]*>\s*)<\/a>/gi, '$2');
      
      // Постобработка: исправляем дублирование markdown в чек-листах
      // Убираем весь текст из label если есть <strong> перед ним
      html = html.replace(/(<strong>[^<]+<\/strong>)<label[^>]*class="task-list-item-label"[^>]*>[^<]*<\/label>/gi, 
        '$1<label class="task-list-item-label"></label>');
      
      // Исправляем случаи где в label остался markdown синтаксис
      html = html.replace(/<label class="task-list-item-label"[^>]*>\s*\*\*[^*]*\*\*[^<]*<\/label>/gi, 
        '<label class="task-list-item-label"></label>');
      
      // Генерируем прогресс-бары для чек-листов
      html = generateChecklistProgressBars(html);
      
      // Обрабатываем обычные списки внутри чек-листов
      html = processRegularListsInTaskLists(html);
      
      return html;
    };
  });
  
  return md;
}


// Глобальный экземпляр markdown-it для переиспользования
const md = createMarkdownInstance();


// ============================================
// ЭКРАНИРОВАНИЕ И БЕЗОПАСНОСТЬ
// ============================================


/**
 * Экранирование HTML-символов для предотвращения XSS
 * @param {string} text - Текст для экранирования
 * @returns {string} Экранированный текст
 */
function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;', // Изменено с ''' на &#39;
    '`': '&#96;' // Добавлено экранирование обратных кавычек
  };
  
  return text.replace(/[&<>"'`]/g, m => map[m]);
}


/**
 * Удаление HTML-тегов из текста
 * @param {string} text - Текст с HTML
 * @returns {string} Чистый текст
 */
function stripHtml(text) {
  return text.replace(/<[^>]*>/g, '');
}


// ============================================
// MARKDOWN РЕНДЕРИНГ
// ============================================


/**
 * Рендеринг markdown в HTML с помощью markdown-it
 * @param {string} markdown - Markdown текст
 * @param {Object} options - Опции для markdown-it
 * @returns {string} HTML
 */
function renderMarkdown(markdown, options = {}) {
  const mdInstance = options ? createMarkdownInstance(options) : md;
  return mdInstance.render(markdown);
}


/**
 * Рендеринг inline markdown (без блочных элементов)
 * @param {string} markdown - Markdown текст
 * @param {Object} options - Опции для markdown-it
 * @returns {string} HTML
 */
function renderInlineMarkdown(markdown, options = {}) {
  const mdInstance = options ? createMarkdownInstance(options) : md;
  return mdInstance.renderInline(markdown);
}


// ============================================
// ИЗВЛЕЧЕНИЕ И ПАРСИНГ
// ============================================


/**
 * Извлечение эмодзи или изображения из начала строки
 * @param {string} text - Текст для анализа
 * @returns {Object} {emoji, image, remainingText}
 */
function extractIcon(text) {
  if (typeof text !== 'string') {
    return { emoji: null, image: null, remainingText: '' };
  }
  
  const imageMatch = text.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*/);
  if (imageMatch) {
    return {
      emoji: null,
      image: { alt: imageMatch[1] || 'Image', url: imageMatch[2] },
      remainingText: text.substring(imageMatch[0].length)
    };
  }
  
  const emojiMatch = text.match(/^([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}])\s*/u);
  if (emojiMatch) {
    return {
      emoji: emojiMatch[1],
      image: null,
      remainingText: text.substring(emojiMatch[0].length)
    };
  }
  
  return { emoji: null, image: null, remainingText: text };
}


/**
 * Извлечение ссылки и заголовка из markdown текста
 * @param {string} text - Текст для парсинга
 * @returns {Object} {emoji, image, title, link, remainingText}
 */
function extractLinkAndTitle(text) {
  if (typeof text !== 'string') {
    return { emoji: null, image: null, title: '', link: null, remainingText: '' };
  }

  let match = text.match(/^\[([^\]]+)\]\(([^)]+)\)(.*)$/);
  if (match) {
    const innerText = match[1];
    const url = match[2];
    const remaining = match[3];

    const { emoji, image, remainingText: titleText } = extractIcon(innerText);

    const cleanTitle = stripMarkdownFormatting(titleText);

    return {
      emoji,
      image,
      title: cleanTitle,
      link: url,
      remainingText: remaining.trim()
    };
  }

  const { emoji, image, remainingText: afterIcon } = extractIcon(text);

  if (emoji || image) {
    match = afterIcon.match(/^\[([^\]]+)\]\(([^)]+)\)(.*)$/);
    if (match) {
      const rawTitle = match[1];
      return {
        emoji,
        image,
        title: stripMarkdownFormatting(rawTitle),
        link: match[2],
        remainingText: match[3].trim()
      };
    }
  }

  match = text.match(/^\*\*\[([^\]]+)\]\(([^)]+)\)\*\*(.*)$/);
  if (match) {
    return {
      emoji: null,
      image: null,
      title: stripMarkdownFormatting(match[1]),
      link: match[2],
      remainingText: match[3].trim()
    };
  }

  match = text.match(/^\*\*([^*]+)\*\*(.*)$/);
  if (match) {
    return {
      emoji,
      image,
      title: stripMarkdownFormatting(match[1]),
      link: null,
      remainingText: match[2].trim()
    };
  }

  // Ищем разделители только после жирного текста или в конце
  const separatorMatch = afterIcon.match(/^(.+?)(\s*[:.]\s*(.*))?$/);
  if (separatorMatch) {
    return {
      emoji,
      image,
      title: stripMarkdownFormatting(separatorMatch[1]),
      link: null,
      remainingText: separatorMatch[3] ? separatorMatch[3].trim() : ''
    };
  }

  return {
    emoji,
    image,
    title: stripMarkdownFormatting(afterIcon),
    link: null,
    remainingText: ''
  };
}


/**
 * Удаление markdown-выделений, получение чистого текста
 * @param {string} text
 * @returns {string}
 */
function stripMarkdownFormatting(text) {
  if (typeof text !== 'string') return '';

  // Используем существующий глобальный md (inline-рендер)
  const html = md.renderInline(text);

  // Удаляем все теги, остаётся только текст
  return stripHtml(html).trim();
}


/**
 * Извлечение заголовков из markdown
 * @param {string} markdown - Markdown текст
 * @param {number} level - Уровень заголовков (1-6)
 * @returns {Array} Массив {level, text, line}
 */
function extractHeadings(markdown, level = null) {
  const lines = markdown.split('\n');
  const headings = [];
  
  lines.forEach((line, index) => {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const headingLevel = match[1].length;
      if (level === null || headingLevel === level) {
        headings.push({
          level: headingLevel,
          text: match[2].trim(),
          line: index
        });
      }
    }
  });
  
  return headings;
}


// ============================================
// ТЕКСТОВЫЕ УТИЛИТЫ
// ============================================


/**
 * Подсчет слов в тексте
 * @param {string} text - Текст для подсчета
 * @returns {number} Количество слов
 */
function countWords(text) {
  if (typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}


/**
 * Обрезка текста до максимального количества слов
 * @param {string} text - Текст для обрезки
 * @param {number} maxWords - Максимальное количество слов
 * @param {string} suffix - Суффикс (по умолчанию '...')
 * @returns {string} Обрезанный текст
 */
function truncateWords(text, maxWords, suffix = '...') {
  if (typeof text !== 'string') return '';
  
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  
  return words.slice(0, maxWords).join(' ') + suffix;
}


/**
 * Генерация slug из текста (для ID и URL)
 * @param {string} text - Текст для преобразования
 * @returns {string} Slug
 */
function slugify(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\u0400-\u04FF-]/g, '') // Поддержка кириллицы
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Загрузка и валидация YAML конфигурации
 * @param {string} configPath - Путь к файлу конфигурации
 * @returns {Object|null} Объект конфигурации или null
 */
function loadYamlConfig(configPath) {
  try {
    const fs = require('fs');
    const yaml = require('js-yaml');
    
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      return yaml.load(configContent);
    }
  } catch (error) {
    console.warn(`Warning: Could not load config from ${configPath}:`, error.message);
  }
  return null;
}

/**
 * Глубокое слияние объектов конфигурации
 * @param {Object} target - Целевой объект
 * @param {Object} source - Исходный объект
 * @returns {Object} Объединенный объект
 */
function mergeConfig(target, source) {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = mergeConfig(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}


/**
 * Проверка совпадения текста с ключевыми словами
 * @param {string} text - Текст для проверки
 * @param {Array<string>} keywords - Массив ключевых слов
 * @returns {boolean} True если найдено совпадение
 */
function matchesKeywords(text, keywords) {
  if (!text || !Array.isArray(keywords)) return false;
  
  const lowerText = text.toLowerCase();
  return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
}


// ============================================
// ЭКСПОРТ
// ============================================


/**
 * Получение SVG path для иконки
 */
function getSvgPath(iconName) {
  const paths = {
    email: 'M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z',
    github: 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
    youtube: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
    discord: 'M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z',
    kofi: 'M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.77s1.971.551 1.971 2.638c0 1.913-.985 2.667-2.059 3.015z'
  };
  
  return paths[iconName] || '';
}

/**
 * Генерация inline SVG иконки
 */
function generateInlineSvg(iconName, className = '', size = '24') {
  const path = getSvgPath(iconName);
  
  if (!path) {
    return `<span class="${className}">?</span>`;
  }
  
  return `<svg class="${className}" width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
    <path d="${path}"/>
  </svg>`;
}

// ============================================
// CHECKLIST PROCESSING
// ============================================

/**
 * Подсчет задач в HTML с помощью регулярных выражений
 */
function countTasksInHtml(html) {
  // Считаем все чекбоксы в данном HTML фрагменте
  const checkboxMatches = html.match(/<input[^>]*class="task-list-item-checkbox"[^>]*>/g) || [];
  const checkedMatches = html.match(/<input[^>]*class="task-list-item-checkbox"[^>]*checked[^>]*>/g) || [];
  
  // Считаем обычные списки внутри данного HTML фрагмента
  let regularListItems = 0;
  
  // Ищем обычные списки (не contains-task-list) в данном фрагменте
  const regularLists = html.match(/<ul(?![^>]*contains-task-list)[^>]*>[\s\S]*?<\/ul>/g) || [];
  const regularOlLists = html.match(/<ol(?![^>]*contains-task-list)[^>]*>[\s\S]*?<\/ol>/g) || [];
  
  [...regularLists, ...regularOlLists].forEach(list => {
    const listItemMatches = list.match(/<li[^>]*>/g) || [];
    regularListItems += listItemMatches.length;
  });
  
  const totalTasks = checkboxMatches.length + regularListItems;
  const completedTasks = checkedMatches.length;
  
  return { total: totalTasks, completed: completedTasks };
}

/**
 * Генерация прогресс-баров для чек-листов
 */
function generateChecklistProgressBars(html) {
  try {
    // Находим все корневые контейнеры чек-листов (не вложенные)
    let processedHtml = html;
    let matchIndex = 0;
    
    // Используем более точный подход для поиска корневых списков
    const taskListPattern = /<ul class="contains-task-list">/g;
    let match;
    
    while ((match = taskListPattern.exec(html)) !== null) {
      const startIndex = match.index;
      
      // Проверяем, что это корневой список (не внутри task-list-item)
      const beforeMatch = html.substring(0, startIndex);
      const openTaskItems = (beforeMatch.match(/<li class="task-list-item[^"]*"[^>]*>/g) || []).length;
      const closeTaskItems = (beforeMatch.match(/<\/li>/g) || []).length;
      
      // Если есть незакрытые task-list-item, это вложенный список
      if (openTaskItems > closeTaskItems) {
        continue;
      }
      
      // Находим конец этого ul элемента
      let depth = 1;
      let endIndex = startIndex + match[0].length;
      
      while (depth > 0 && endIndex < html.length) {
        const nextUlOpen = html.indexOf('<ul', endIndex);
        const nextUlClose = html.indexOf('</ul>', endIndex);
        
        if (nextUlClose === -1) break;
        
        if (nextUlOpen !== -1 && nextUlOpen < nextUlClose) {
          depth++;
          endIndex = nextUlOpen + 3;
        } else {
          depth--;
          endIndex = nextUlClose + 5;
        }
      }
      
      const fullMatch = html.substring(startIndex, endIndex);
      const content = html.substring(startIndex + match[0].length, endIndex - 5);
      
      // Проверяем, нет ли уже прогресс-бара
      if (content.includes('checklist-progress')) {
        continue;
      }
      
      // Считаем все задачи в этом контейнере (включая вложенные)
      const taskCount = countTasksInHtml(fullMatch);
      
      if (taskCount.total > 2) {
        const progress = Math.round((taskCount.completed / taskCount.total) * 100);
        
        const progressHtml = `
          <div class="checklist-progress">
            <div class="checklist-progress-bar">
              <div class="checklist-progress-fill" style="width: ${progress}%"></div>
            </div>
            <div class="checklist-progress-text">
              <span>${progress}% completed</span>
              <span class="checklist-progress-count">${taskCount.completed}/${taskCount.total} tasks</span>
            </div>
          </div>`;
        
        const newContent = `<ul class="contains-task-list">${progressHtml}${content}</ul>`;
        processedHtml = processedHtml.replace(fullMatch, newContent);
      }
    }
    
    return processedHtml;
  } catch (error) {
    console.warn('Error generating progress bars:', error.message);
    return html;
  }
}

/**
 * Обработка обычных списков внутри чек-листов
 */
function processRegularListsInTaskLists(html) {
  try {
    // Сначала добавляем классы к обычным спискам
    html = html.replace(/<ul(?![^>]*contains-task-list)([^>]*)>/g, (match, attributes) => {
      // Проверяем, находится ли этот ul внутри contains-task-list
      const beforeMatch = html.substring(0, html.indexOf(match));
      const openTaskLists = (beforeMatch.match(/<ul class="contains-task-list">/g) || []).length;
      const closeTaskLists = (beforeMatch.match(/<\/ul>/g) || []).length;
      
      if (openTaskLists > closeTaskLists) {
        // Этот ul находится внутри contains-task-list
        if (attributes.includes('class=')) {
          return match.replace(/class="([^"]*)"/, 'class="$1 regular-list-in-checklist"');
        } else {
          return `<ul${attributes} class="regular-list-in-checklist">`;
        }
      }
      return match;
    });
    
    // Аналогично для ol
    html = html.replace(/<ol(?![^>]*contains-task-list)([^>]*)>/g, (match, attributes) => {
      const beforeMatch = html.substring(0, html.indexOf(match));
      const openTaskLists = (beforeMatch.match(/<ul class="contains-task-list">/g) || []).length;
      const closeTaskLists = (beforeMatch.match(/<\/ul>/g) || []).length;
      
      if (openTaskLists > closeTaskLists) {
        if (attributes.includes('class=')) {
          return match.replace(/class="([^"]*)"/, 'class="$1 regular-list-in-checklist"');
        } else {
          return `<ol${attributes} class="regular-list-in-checklist">`;
        }
      }
      return match;
    });
    
    // Теперь добавляем класс pseudo-checkbox-item к li элементам внутри regular-list-in-checklist
    html = html.replace(/<ul[^>]*class="[^"]*regular-list-in-checklist[^"]*"[^>]*>([\s\S]*?)<\/ul>/g, (match, content) => {
      const processedContent = content.replace(/<li([^>]*)>/g, (liMatch, liAttributes) => {
        if (liAttributes.includes('class=')) {
          return liMatch.replace(/class="([^"]*)"/, 'class="$1 pseudo-checkbox-item"');
        } else {
          return `<li${liAttributes} class="pseudo-checkbox-item">`;
        }
      });
      return match.replace(content, processedContent);
    });
    
    html = html.replace(/<ol[^>]*class="[^"]*regular-list-in-checklist[^"]*"[^>]*>([\s\S]*?)<\/ol>/g, (match, content) => {
      const processedContent = content.replace(/<li([^>]*)>/g, (liMatch, liAttributes) => {
        if (liAttributes.includes('class=')) {
          return liMatch.replace(/class="([^"]*)"/, 'class="$1 pseudo-checkbox-item"');
        } else {
          return `<li${liAttributes} class="pseudo-checkbox-item">`;
        }
      });
      return match.replace(content, processedContent);
    });
    
    return html;
  } catch (error) {
    console.warn('Error processing regular lists:', error.message);
    return html;
  }
}

module.exports = {
  createMarkdownInstance,
  renderMarkdown,
  renderInlineMarkdown,
  escapeHtml,
  stripHtml,
  extractIcon,
  extractLinkAndTitle,
  extractHeadings,
  countWords,
  truncateWords,
  slugify,
  matchesKeywords,
  stripMarkdownFormatting,
  loadYamlConfig,
  mergeConfig,
  getSvgPath,
  generateInlineSvg,
  generateChecklistProgressBars,
  processRegularListsInTaskLists,
  countTasksInHtml
};
