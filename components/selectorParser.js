// selectorParser.js - парсер для интерактивных селекторов выбора
const { escapeHtml } = require('./utils');

/**
 * Парсинг markdown селекторов
 * Формат: Choose your system: [ **NPM** ](#npm) | [ **Yarn** ](#yarn) | [ **PNPM** ](#pnpm)
 */
function parseMarkdownSelectors(markdown) {
  const selectors = [];
  const lines = markdown.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Проверяем, является ли строка селектором
    if (line.includes('[') && line.includes('](#') && line.includes('|')) {
      const selector = {
        lineIndex: i,
        hint: '',
        options: [],
        contentBlocks: []
      };

      // Извлекаем hint (текст до двоеточия)
      const hintMatch = line.match(/^(.+?):/);
      if (hintMatch) {
        selector.hint = hintMatch[1].trim();
      }

      // Извлекаем все опции
      const optionMatches = [...line.matchAll(/\[\s*\*\*(.*?)\*\*\s*\]\((#.*?)\)/g)];
      selector.options = optionMatches.map(match => ({
        label: match[1].trim(),
        anchor: match[2].trim()
      }));

      // Генерируем уникальный ID набора опций для синхронизации
      selector.groupId = selector.options.map(o => o.label).sort().join('|');

      // Ищем контент после селектора
      let j = i + 1;
      let firstHeadingLevel = null;
      
      while (j < lines.length) {
        const contentLine = lines[j].trim();

        // Если встретили заголовок любого уровня (##, ###, ####, #####, ######)
        const headingMatch = contentLine.match(/^(#{2,6})\s+(.+)$/);
        if (headingMatch) {
          const headingLevel = headingMatch[1].length; // длина строки ##, ###, etc.
          const title = headingMatch[2].trim();

          // Запоминаем уровень первого заголовка
          if (firstHeadingLevel === null) {
            firstHeadingLevel = headingLevel;
          }

          // Проверяем, соответствует ли заголовок одной из опций
          const matchingOption = selector.options.find(
            opt => opt.label.toLowerCase() === title.toLowerCase()
          );

          if (matchingOption) {
            // Собираем контент до следующего заголовка того же уровня, что и первый, или селектора
            let content = [];
            let k = j + 1;

            while (k < lines.length) {
              const nextLine = lines[k].trim();

              // Останавливаемся на горизонтальной линии
              if (nextLine === '---') {
                break;
              }

              // Останавливаемся на заголовке того же уровня или более высокого (меньше #)
              const nextHeadingMatch = nextLine.match(/^(#{2,6})\s+/);
              if (nextHeadingMatch && nextHeadingMatch[1].length <= firstHeadingLevel) {
                break;
              }

              // Останавливаемся на новом селекторе
              if (nextLine.includes('[') && nextLine.includes('](#') && nextLine.includes('|')) {
                break;
              }

              content.push(lines[k]);
              k++;
            }

            selector.contentBlocks.push({
              option: matchingOption.label,
              anchor: matchingOption.anchor,
              content: content.join('\n').trim(),
              startLine: j,
              endLine: k - 1
            });

            j = k - 1;
          }
        }

        // Если встретили новый селектор или разделитель, останавливаемся
        if (contentLine === '---' ||
            (contentLine.includes('[') && contentLine.includes('](#') && contentLine.includes('|'))) {
          break;
        }

        j++;
      }

      selectors.push(selector);
    }
  }

  return selectors;
}

/**
 * Генерация HTML для селектора
 */
function generateSelectorHTML(selector, selectorIndex, mdRenderer) {
  const selectorId = `selector-${selectorIndex}`;
  const groupId = selector.groupId;

  let html = `
<div class="selector-wrapper">
  <span class="selector-hint">${escapeHtml(selector.hint)}</span>
  <div class="segment-wrapper">
    <div class="segment-group" 
         id="${selectorId}" 
         data-group-id="${groupId}"
         data-selector-index="${selectorIndex}">
      <div class="slider-bg"></div>
`;

  // Генерируем кнопки
  selector.options.forEach((option, optIndex) => {
    const isActive = optIndex === 0 ? 'active' : '';
    const targetId = `${selectorId}-content-${optIndex}`;

    html += `
      <button class="segment ${isActive}" 
              data-index="${optIndex}"
              data-option="${escapeHtml(option.label)}"
              data-target="${targetId}">
        ${escapeHtml(option.label)}
      </button>
`;
  });

  html += `
    </div>
  </div>
  <div class="content-container" id="${selectorId}-container">
`;

  // Генерируем панели контента с якорями
  selector.contentBlocks.forEach((block, blockIndex) => {
    const isActive = blockIndex === 0 ? 'active' : '';
    const contentId = `${selectorId}-content-${blockIndex}`;
    const anchorId = `${selectorId}${block.anchor}`;

    // Рендерим markdown контент
    const renderedContent = mdRenderer ? mdRenderer.render(block.content) : block.content;

    html += `
    <div class="content-panel ${isActive}" 
         id="${contentId}"
         data-anchor="${anchorId}">
      <a name="${anchorId}" id="${anchorId}"></a>
      ${renderedContent}
    </div>
`;
  });

  html += `
  </div>
</div>
`;

  return html;
}

/**
 * Обработка markdown с селекторами
 * Заменяет паттерны селекторов на placeholder и возвращает данные для замены
 */
function processSelectorsInMarkdown(markdown, mdRenderer) {
  const selectors = parseMarkdownSelectors(markdown);
  
  if (selectors.length === 0) {
    return { markdown, hasSelectors: false, selectors: [] };
  }

  let result = markdown;
  const selectorData = [];

  // Обрабатываем селекторы в обратном порядке, чтобы не сбивать индексы
  selectors.reverse().forEach((selector, reverseIndex) => {
    const selectorIndex = selectors.length - 1 - reverseIndex;
    const placeholder = `<!--SELECTOR_PLACEHOLDER_${selectorIndex}-->`;
    
    // Сохраняем данные селектора для последующей замены
    selectorData.push({
      index: selectorIndex,
      placeholder,
      selector,
      html: generateSelectorHTML(selector, selectorIndex, mdRenderer)
    });

    // Находим начало и конец блока селектора в markdown
    const lines = result.split('\n');
    const startLine = selector.lineIndex;
    
    // Находим конец контента последнего блока
    let endLine = startLine;
    if (selector.contentBlocks.length > 0) {
      endLine = Math.max(...selector.contentBlocks.map(b => b.endLine));
    }

    // Заменяем блок на placeholder
    const before = lines.slice(0, startLine).join('\n');
    const after = lines.slice(endLine + 1).join('\n');
    
    result = before + '\n\n' + placeholder + '\n\n' + after;
  });

  return { markdown: result, hasSelectors: true, selectors: selectorData };
}

/**
 * Заменяет placeholder'ы на HTML селекторов в отрендеренном контенте
 */
function replaceSelectorPlaceholders(html, selectorData) {
  let result = html;
  
  selectorData.forEach(data => {
    // Заменяем placeholder (может быть обернут в <p> тегами)
    const placeholderPattern = new RegExp(
      `<p>\\s*${data.placeholder}\\s*</p>|${data.placeholder}`,
      'g'
    );
    result = result.replace(placeholderPattern, data.html);
  });
  
  return result;
}

module.exports = {
  parseMarkdownSelectors,
  generateSelectorHTML,
  processSelectorsInMarkdown,
  replaceSelectorPlaceholders,
};
