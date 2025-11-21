// specParser.js (обновленная версия)
const { CSS_CLASSES } = require('./config');
const { 
  createMarkdownInstance,
  escapeHtml
} = require('./utils');

// Создаем экземпляр markdown-it с плагином alerts
const md = createMarkdownInstance({
  html: true,
  breaks: false,
  linkify: true,
  typographer: true
});

/**
 * Проверяет, является ли документ спецификацией по H1 заголовку
 */
function isSpecificationDocument(markdown) {
  const lines = markdown.split('\n');
  const h1Line = lines.find(line => line.trim().startsWith('# '));
  if (!h1Line) return false;
  
  const h1Text = h1Line.trim().substring(2).toLowerCase();
  return /\b(specification|specifications|specs)\b/.test(h1Text);
}

/**
 * Обработка контента карточки спецификации для форматирования списков как spec-item
 */
function processSpecificationContent(content) {
  return content; // Возвращаем как есть, обработка будет в рендере
}

/**
 * Парсинг H2 заголовков в spec cards для документов спецификаций
 */
function parseSpecificationDocument(markdown) {
  const lines = markdown.split('\n');
  const cards = [];
  const outputLines = [];
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    // Ищем H2 заголовки
    if (trimmed.match(/^##\s+/)) {
      const title = trimmed.substring(3).trim();
      const startIndex = i;
      i++; // Переходим к следующей строке

      // Собираем контент до следующего H2 или конца файла
      const contentLines = [];
      while (i < lines.length) {
        const nextLine = lines[i].trim();
        if (nextLine.match(/^##\s+/)) {
          break; // Следующий H2 заголовок
        }
        contentLines.push(lines[i]);
        i++;
      }

      // Создаем spec card с обработанным контентом
      const rawContent = contentLines.join('\n').trim();
      const processedContent = processSpecificationContent(rawContent);
      
      cards.push({
        title: title,
        link: null, // Spec cards обычно не имеют ссылок
        content: processedContent
      });

      continue;
    }

    // Все остальные строки добавляем в вывод (включая H1)
    outputLines.push(lines[i]);
    i++;
  }

  return {
    cards,
    specsSections: [{
      id: 'document-specs',
      cards: cards
    }],
    cleanedMarkdown: outputLines.join('\n')
  };
}

/**
 * Парсинг секции Specifications
 * Возвращает массив карточек и очищенный markdown
 */
function parseSpecifications(markdown) {
  // Проверяем, является ли весь документ спецификацией
  if (isSpecificationDocument(markdown)) {
    return parseSpecificationDocument(markdown);
  }
  const lines = markdown.split('\n');
  const cards = [];
  const outputLines = [];
  const specsSections = []; // Массив секций с их карточками
  let inSpecsSection = false;
  let specsLevel = 0;
  let currentCard = null;
  let sectionContent = [];
  let currentSectionCards = []; // Карточки текущей секции
  let currentSectionId = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Ищем заголовок секции Specifications
    const specsMatch = trimmed.match(/^(#{2,6})\s+.*?(specifications|specs)/i);
    if (specsMatch && !inSpecsSection) {
      specsLevel = specsMatch[1].length;
      inSpecsSection = true;
      currentSectionCards = [];
      
      // Генерируем ID секции для идентификации
      const sectionTitle = trimmed.replace(/^#+\s*/, '').toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-');
      currentSectionId = sectionTitle;
      
      // Добавляем заголовок секции в outputLines - оставляем его для рендеринга
      outputLines.push(line);
      sectionContent = [];
      continue;
    }

    // Если мы в секции Specifications
    if (inSpecsSection) {
      const headerMatch = trimmed.match(/^(#{1,6})\s+(.+)/);
      
      // Проверяем конец секции (заголовок того же или более высокого уровня)
      if (headerMatch && headerMatch[1].length <= specsLevel) {
        // Завершаем текущую карточку
        if (currentCard && currentCard.content) {
          currentSectionCards.push(currentCard);
          currentCard = null;
        }
        
        // Сохраняем секцию с её карточками
        if (currentSectionCards.length > 0) {
          specsSections.push({
            id: currentSectionId,
            cards: [...currentSectionCards]
          });
          cards.push(...currentSectionCards); // Добавляем в общий массив для совместимости
        }
        
        // НЕ добавляем накопленный контент секции - он уже обработан как карточки
        // if (sectionContent.length > 0) {
        //   outputLines.push(...sectionContent);
        // }
        inSpecsSection = false;
        // Обрабатываем этот заголовок как обычный
        outputLines.push(line);
        continue;
      }

      // Проверяем карточку (заголовок на 1 уровень глубже)
      if (headerMatch && headerMatch[1].length === specsLevel + 1) {
        // НЕ добавляем накопленный контент секции - он станет частью карточек
        // if (sectionContent.length > 0) {
        //   outputLines.push(...sectionContent);
        //   sectionContent = [];
        // }
        
        // Завершаем предыдущую карточку
        if (currentCard && currentCard.content) {
          currentSectionCards.push(currentCard);
        }

        // Создаем новую карточку
        const titleText = headerMatch[2].trim();
        const linkMatch = titleText.match(/\[([^\]]+)\]\(([^)]+)\)/);
        
        currentCard = {
          title: linkMatch ? linkMatch[1] : titleText,
          link: linkMatch ? linkMatch[2] : null,
          content: ''
        };

        // Собираем контент карточки
        const cardContent = [];
        i++; // Переходим к следующей строке после заголовка
        
        while (i < lines.length) {
          const nextLine = lines[i];
          const nextTrimmed = nextLine.trim();
          
          // Проверяем заголовок того же или более высокого уровня
          const nextHeaderMatch = nextTrimmed.match(/^(#{1,6})\s+/);
          if (nextHeaderMatch && nextHeaderMatch[1].length <= specsLevel + 1) {
            i--; // Возвращаемся на шаг назад, чтобы обработать этот заголовок
            break;
          }
          
          cardContent.push(nextLine);
          i++;
        }
        
        currentCard.content = cardContent.join('\n').trim();
        continue;
      }

      // Накапливаем контент секции (но он не будет добавлен в outputLines)
      sectionContent.push(line);
    } else {
      // Обычная обработка
      outputLines.push(line);
    }
  }

  // Завершаем последнюю карточку и секцию
  if (currentCard && currentCard.content) {
    currentSectionCards.push(currentCard);
  }
  
  if (inSpecsSection && currentSectionCards.length > 0) {
    specsSections.push({
      id: currentSectionId,
      cards: [...currentSectionCards]
    });
    cards.push(...currentSectionCards);
  }

  // НЕ добавляем оставшийся контент секции - он уже обработан как карточки
  // if (sectionContent.length > 0) {
  //   outputLines.push(...sectionContent);
  // }

  return {
    cards,
    specsSections,
    cleanedMarkdown: outputLines.join('\n')
  };
}/**
 
* Рендеринг specification карточек в HTML
 */
function renderSpecificationCards(cards) {
  const cls = CSS_CLASSES;
  if (cards.length === 0) return '';

  const cardsHtml = cards.map(card => {
    const onclickAttr = card.link ? ` onclick="window.location.href='${card.link}'"` : '';
    const clickableClass = card.link ? ' clickable' : '';

    // Рендерим markdown контент - плагин автоматически обработает alerts
    let renderedContent = md.render(card.content);

    // Простой подход: заменяем все элементы с паттерном **Label:** на spec-item
    renderedContent = renderedContent.replace(/<li><strong>([^<]*?):<\/strong>\s*(.*?)<\/li>/gs, (match, label, value) => {
      // Обрабатываем вложенные списки в значении
      let processedValue = value.replace(/<ul>\s*((?:<li>.*?<\/li>\s*)+)<\/ul>/gs, (nestedMatch, nestedItems) => {
        const nestedHtml = nestedItems.replace(/<li>(.*?)<\/li>/gs, (nestedLi, nestedContent) => {
          return `<div class="spec-nested-item">${nestedContent.trim()}</div>`;
        });
        return `<blockquote class="spec-nested-list">${nestedHtml}</blockquote>`;
      });
      
      return `<li class="${cls.specItem}">
        <span class="${cls.specLabel}">${label}:</span>
        <span class="${cls.specValue}">${processedValue}</span>
      </li>`;
    });

    // Обрабатываем списки спецификаций (добавляем класс spec-list)
    renderedContent = renderedContent.replace(/<ul>\s*((?:<li[^>]*class="spec-item"[^>]*>.*?<\/li>\s*)+)<\/ul>/gs, (match, items) => {
      return `<ul class="${cls.specList}">${items}</ul>`;
    });




    return `<div class="${cls.specCard}${clickableClass}"${onclickAttr}>
      <h3 class="${cls.specCardTitle}">${escapeHtml(card.title)}</h3>
      ${renderedContent}
    </div>`;
  }).join('\n    ');

  return `<div class="${cls.specsGrid}">
    ${cardsHtml}
  </div>`;
}

module.exports = {
  parseSpecifications,
  renderSpecificationCards,
  isSpecificationDocument,
  parseSpecificationDocument,
  processSpecificationContent
};