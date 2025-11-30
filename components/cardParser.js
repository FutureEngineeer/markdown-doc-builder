// cardParser.js (обновленная версия с utils)
const { CSS_CLASSES } = require('./config');
const {
  createMarkdownInstance,
  escapeHtml,
  countWords,
  extractIcon,
  extractLinkAndTitle
} = require('./utils');

const md = createMarkdownInstance({
  html: true,
  breaks: false,
  linkify: true,
  typographer: true
});

/**
 * Парсинг одного элемента списка в карточку
 */
function parseListItemToCard(itemText) {
  const cleaned = itemText.replace(/^[-*+]\s+|^\d+\.\s+/, '').trim();

  const parsed = extractLinkAndTitle(cleaned);

  if (!parsed.emoji && !parsed.image) {
    return null;
  }

  if (!parsed.title) {
    return null;
  }

  let description = parsed.remainingText;
  description = description.replace(/^[-:–—]\s*/, '').trim();

  if (countWords(description) > 40) {
    const words = description.split(/\s+/);
    description = words.slice(0, 40).join(' ') + '...';
  }

  return {
    emoji: parsed.emoji,
    image: parsed.image,
    title: parsed.title,
    link: parsed.link,
    description: description
  };
}

/**
 * Парсинг подзаголовка (### или ####) в карточку
 */
function parseSubheadingToCard(headingText, contentLines) {
  const parsed = extractLinkAndTitle(headingText);

  if (!parsed.emoji && !parsed.image) {
    return null;
  }

  if (!parsed.title) {
    return null;
  }

  // Проверяем есть ли списки в контенте
  const listItems = contentLines.filter(line => line.match(/^[-*+]\s+/));

  let description;
  if (listItems.length > 0) {
    // Если есть списки, используем их как описание
    description = listItems.map(item => item.replace(/^[-*+]\s+/, '').trim()).join('\n');
  } else {
    // Обычный текст - объединяем строки через пробел, но убираем лишние точки
    description = contentLines.join(' ').trim();

    // Убираем дублирующиеся точки в конце
    description = description.replace(/\.+$/, '.');

    if (countWords(description) > 50) {
      return null;
    }
  }

  return {
    emoji: parsed.emoji,
    image: parsed.image,
    title: parsed.title,
    link: parsed.link,
    description: description
  };
}

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
 * Парсинг H2 заголовков в spec cards для документов спецификаций
 */
function parseSpecificationCards(markdown) {
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

      // Создаем spec card
      const content = contentLines.join('\n').trim();
      let description = '';
      
      if (content) {
        // Берем первые несколько строк как описание
        const contentText = content.replace(/#{3,}/g, '').replace(/\n+/g, ' ').trim();
        const words = contentText.split(/\s+/);
        if (words.length > 30) {
          description = words.slice(0, 30).join(' ') + '...';
        } else {
          description = contentText;
        }
      }

      cards.push({
        emoji: '📋', // Иконка по умолчанию для spec cards
        title: title,
        description: description,
        link: null // Spec cards обычно не имеют ссылок
      });

      continue;
    }

    // Все остальные строки добавляем в вывод
    outputLines.push(lines[i]);
    i++;
  }

  return {
    cards,
    cleanedMarkdown: outputLines.join('\n')
  };
}

/**
 * Парсинг markdown с автоматическим распознаванием карточек
 */
function parseMarkdownWithCards(markdown, sectionName = null) {
  // Проверяем, является ли документ спецификацией
  if (isSpecificationDocument(markdown)) {
    return parseSpecificationCards(markdown);
  }

  const lines = markdown.split('\n');
  const cards = [];
  const outputLines = [];
  let i = 0;

  let inTargetSection = sectionName ? false : true;
  let inSpecificationSection = false; // Флаг для отслеживания секций спецификаций

  const sectionRegex = sectionName ? new RegExp(`^##\\s+${sectionName}\\b`, 'i') : null;

  // Исключаем секции спецификаций из обработки карточек
  const isSpecificationSection = sectionName && /specification/i.test(sectionName);



  while (i < lines.length) {
    const trimmed = lines[i].trim();

    // Проверяем начало любой секции спецификаций (независимо от целевой секции)
    if (trimmed.match(/^##\s+.*?(specifications|specs)/i)) {
      inSpecificationSection = true;
      outputLines.push(lines[i]);
      i++;
      continue;
    }

    // Проверяем конец секции спецификаций - ЛЮБОЙ новый H2 заголовок
    if (inSpecificationSection && trimmed.startsWith('## ')) {
      inSpecificationSection = false;
      // Продолжаем обработку этой строки ниже
    }

    // Проверка начала целевой секции
    if (sectionRegex && trimmed.match(sectionRegex)) {
      // Если это секция спецификаций, не обрабатываем как карточки
      if (isSpecificationSection) {
        outputLines.push(lines[i]);
        i++;
        continue;
      }
      inTargetSection = true;
      outputLines.push(lines[i]); // Сохраняем заголовок секции
      i++;
      continue;
    }

    // Проверка конца целевой секции
    if (sectionRegex && inTargetSection && (trimmed.startsWith('## ') || trimmed.match(/^---+$/))) {
      inTargetSection = false;
    }

    // Парсим только внутри целевой секции и НЕ внутри секций спецификаций
    if (inTargetSection && !inSpecificationSection) {
      // Случай 1: Список с иконками
      if (trimmed.match(/^[-*+]\s+/) || trimmed.match(/^\d+\.\s+/)) {
        const listItems = [];
        const listStartIndex = i;

        // Собираем все элементы списка подряд
        while (i < lines.length && (lines[i].trim().match(/^[-*+]\s+/) || lines[i].trim().match(/^\d+\.\s+/))) {
          listItems.push(lines[i].trim());
          i++;
        }

        // Пробуем парсить как карточки
        const potentialCards = listItems.map(item => parseListItemToCard(item)).filter(c => c !== null);

        // Если хотя бы один элемент - карточка, конвертируем весь список в карточки
        if (potentialCards.length > 0) {
          cards.push(...potentialCards);
          // НЕ добавляем в outputLines - карточки удалены
        } else {
          // Обычный список, добавляем обратно
          for (let j = listStartIndex; j < i; j++) {
            outputLines.push(lines[j]);
          }
        }

        continue;
      }

      // Случай 2: Группа подзаголовков с иконками
      if (trimmed.match(/^#{3,4}\s+/)) {
        const headingLevel = trimmed.match(/^(#{3,4})/)[1].length;
        const headingGroup = [];
        let tempI = i;

        // Собираем группу подзаголовков
        while (tempI < lines.length) {
          const tempTrimmed = lines[tempI].trim();

          if (tempTrimmed.match(new RegExp(`^#{${headingLevel}}\\s+`))) {
            const headingText = tempTrimmed.substring(headingLevel + 1).trim();

            const { emoji, image } = extractIcon(headingText);
            if (!emoji && !image) {
              break;
            }

            const headingLineIndex = tempI;
            tempI++;

            // Собираем контент до следующего заголовка
            const contentLines = [];
            while (tempI < lines.length) {
              const nextLine = lines[tempI].trim();
              // Прерываемся только на заголовках, не на списках
              if (nextLine.match(/^#{2,}\s+/)) {
                break;
              }
              if (nextLine) {
                contentLines.push(nextLine);
              }
              tempI++;
            }

            headingGroup.push({ headingText, contentLines, startLine: headingLineIndex, endLine: tempI });
          } else {
            break;
          }
        }

        // Если нашли 2+ подзаголовков с иконками подряд
        if (headingGroup.length >= 2) {
          const potentialCards = headingGroup
            .map(({ headingText, contentLines }) => parseSubheadingToCard(headingText, contentLines))
            .filter(c => c !== null);

          if (potentialCards.length >= 2) {
            cards.push(...potentialCards);
            i = tempI;
            // НЕ добавляем в outputLines - карточки удалены
            continue;
          }
        }

        // Не карточки - добавляем как обычный текст
        outputLines.push(lines[i]);
        i++;
        continue;
      }
    }

    // Все остальное добавляем как обычный текст
    outputLines.push(lines[i]);
    i++;
  }

  // ВАЖНО: Если мы удалили карточки из секции, добавляем placeholder
  // чтобы секция не была пустой и markdown-it создал для неё <section>
  if (sectionName && cards.length > 0) {
    const cleanedLines = outputLines.join('\n').split('\n');
    const sectionRegex = new RegExp(`^##\\s+${sectionName}\\b`, 'i');
    let sectionIndex = -1;
    let nextSectionIndex = -1;
    
    // Находим индекс секции
    for (let i = 0; i < cleanedLines.length; i++) {
      if (cleanedLines[i].match(sectionRegex)) {
        sectionIndex = i;
      } else if (sectionIndex >= 0 && cleanedLines[i].match(/^##\s+/)) {
        nextSectionIndex = i;
        break;
      }
    }
    
    // Если секция найдена, проверяем есть ли в ней контент
    if (sectionIndex >= 0) {
      const endIndex = nextSectionIndex >= 0 ? nextSectionIndex : cleanedLines.length;
      const sectionContent = cleanedLines.slice(sectionIndex + 1, endIndex);
      const hasContent = sectionContent.some(line => line.trim().length > 0);
      
      if (!hasContent) {
        // Секция пустая - добавляем пустую строку чтобы секция не была пустой
        cleanedLines.splice(sectionIndex + 1, 0, '');
      }
    }
    
    return {
      cards,
      cleanedMarkdown: cleanedLines.join('\n')
    };
  }

  return {
    cards,
    cleanedMarkdown: outputLines.join('\n')
  };
}

/**
 * Определение grid класса
 */
function determineGridClass(cards) {
  const count = cards.length;

  if (count === 1) return null;
  if (count === 2) return 'grid2';
  if (count === 3) return 'grid3';
  if (count === 4) return 'grid4';

  const allShortDescriptions = cards.every(card =>
    !card.description || countWords(card.description) < 10
  );

  if (allShortDescriptions) {
    if ([5, 6, 9].includes(count)) return 'grid3';
    if ([7, 8, 10, 11, 12].includes(count)) return 'grid4';
    if (count === 6) return 'grid3';
    return 'grid5';
  } else {
    if ([5, 6, 9].includes(count)) return 'grid3';
    return 'grid4';
  }
}

/**
 * Рендеринг карточек в HTML
 */
function renderCards(cards) {
  const cls = CSS_CLASSES;

  if (cards.length === 0) {
    return '';
  }

  const gridClass = determineGridClass(cards);

  const cardsHtml = cards.map(card => {
    const onclickAttr = card.link ? ` onclick="window.location.href='${card.link}'"` : '';
    const clickableClass = card.link ? ' clickable' : '';

    let iconHtml = '';
    if (card.emoji) {
      iconHtml = `<span class="${cls.cardIcon}">${card.emoji}</span>`;
    } else if (card.image) {
      iconHtml = `<img src="${card.image.url}" alt="${escapeHtml(card.image.alt)}" class="${cls.cardIcon}">`;
    }

    const titleHtml = `<h3 class="${cls.cardTitle}">${escapeHtml(card.title)}</h3>`;

    let descriptionHtml = '';
    if (card.description) {
      // Проверяем есть ли переносы строк (списки)
      if (card.description.includes('\n')) {
        // Рендерим как список
        const listItems = card.description.split('\n').map(item =>
          `<li>${md.renderInline(item.trim())}</li>`
        ).join('');
        descriptionHtml = `<ul class="${cls.cardDescription}">${listItems}</ul>`;
      } else {
        // Обычный текст
        const renderedDesc = md.renderInline(card.description);
        descriptionHtml = `<p class="${cls.cardDescription}">${renderedDesc}</p>`;
      }
    }

    return `<div class="${cls.card}${clickableClass}"${onclickAttr}>
  <div class="${cls.gradientOverlay}"></div>
  <div class="${cls.cardContentWrapper}">
    ${iconHtml}
    ${titleHtml}
    ${descriptionHtml}
  </div>
</div>`;
  }).join('\n    ');

  if (!gridClass) {
    return cardsHtml;
  }

  return `<div class="${cls[gridClass]}">
    ${cardsHtml}
  </div>`;
}

module.exports = {
  parseMarkdownWithCards,
  renderCards,
  determineGridClass,
  isSpecificationDocument,
  parseSpecificationCards
};
