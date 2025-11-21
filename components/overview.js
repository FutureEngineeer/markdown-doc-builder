// overview.js (обновленная версия с utils)
const { CSS_CLASSES, OVERVIEW_FIELDS } = require('./config');
const { 
  renderInlineMarkdown,  // ← ИЗМЕНЕНО: используем renderInlineMarkdown вместо processInlineFormatting
  escapeHtml,
  matchesKeywords
} = require('./utils');


/**
 * Проверка совпадения поля
 */
function matchesField(line, keywords) {
  return new RegExp(`\\*\\*(${keywords.join('|')}):\\*\\*`, 'i').test(line);
}

/**
 * Определение класса статуса по тексту
 */
function getStatusClass(statusText) {
  if (!statusText) return '';
  
  const text = statusText.toLowerCase();
  
  if (text.includes('obsolete')) return 'caution';
  if (text.includes('not recommended') || text.includes('deprecated')) return 'note';
  if (text.includes('active') || text.includes('stable') || text.includes('released')) return 'active';
  if (text.includes('preview') || text.includes('preorder') || text.includes('beta') || text.includes('development')) return 'preview';
  
  return 'active'; // по умолчанию
}


/**
 * Парсинг содержимого секции Overview
 */
function parseOverviewContent(markdown, relativeRoot = './') {
  const lines = markdown.split('\n');
  let h1Title = null;
  let inOverview = false;
  let overviewLines = [];
  let hasOverviewSection = false;
  
  const pageData = {
    title: '',
    hasOverviewSection: false,
    overview: {
      revision: null,
      status: null,
      price: null,
      priceNote: null,
      keyFeatures: [],
      interfaces: [],
      tags: [],
      descriptions: [],
      image: null
    }
  };
  
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    
    if (trimmed.startsWith('# ') && !h1Title) {
      h1Title = trimmed.substring(2).trim();
      continue;
    }
    
    if (trimmed.match(/^##\s+(project\s+overview|product\s+overview)/i)) {
      inOverview = true;
      hasOverviewSection = true;
      continue;
    }
    
    if (inOverview && (trimmed.match(/^---+$/) || trimmed.match(/^===+$/) || 
        (trimmed.startsWith('## ') && !trimmed.match(/^##\s+(overview|about|summary)/i)))) {
      break;
    }
    
    if (inOverview) {
      overviewLines.push(lines[i]);
    }
  }
  
  pageData.title = h1Title || 'Untitled';
  pageData.hasOverviewSection = hasOverviewSection;
  
  let inKeyFeaturesBlock = false;
  
  for (let i = 0; i < overviewLines.length; i++) {
    let line = overviewLines[i].trim();
    let originalLine = line; // Сохраняем оригинальную строку
    
    if (line.startsWith('>')) {
      line = line.substring(1).trim();
    }
    
    if (!line) continue;
    
    const imgMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
    if (imgMatch) {
      let imageSrc = imgMatch[2];
      
      // Корректируем путь к изображению если он относительный
      if (imageSrc && !imageSrc.startsWith('http')) {
        const path = require('path');
        
        if (imageSrc.startsWith('./assets/') || imageSrc.startsWith('assets/')) {
          imageSrc = imageSrc.replace(/^\.?\/assets\//, `${relativeRoot}assets/`);
        } else if (imageSrc.startsWith('../')) {
          // Обрабатываем пути типа ../../assets/image.gif
          const segments = imageSrc.split('/');
          const assetIndex = segments.findIndex(seg => seg === 'assets');
          if (assetIndex !== -1) {
            // Берем путь от assets и далее
            const assetPath = segments.slice(assetIndex).join('/');
            imageSrc = `${relativeRoot}${assetPath}`;
          } else {
            // Если нет папки assets, просто берем имя файла
            imageSrc = `${relativeRoot}assets/${path.basename(imageSrc)}`;
          }
        }
      }
      
      pageData.overview.image = imageSrc;
      continue;
    }
    
    if (matchesField(line, OVERVIEW_FIELDS.revision)) {
      const match = line.match(/\*\*(?:Revision|Version):\*\*\s*(.+)/i);
      if (match) {
        pageData.overview.revision = renderInlineMarkdown(match[1].trim());  // ← ИЗМЕНЕНО
        continue;
      }
    }
    
    if (matchesField(line, OVERVIEW_FIELDS.status)) {
      const match = line.match(/\*\*Status:\*\*\s*(.+)/i);
      if (match) {
        pageData.overview.status = renderInlineMarkdown(match[1].trim());  // ← ИЗМЕНЕНО
        continue;
      }
    }
    
    if (matchesField(line, OVERVIEW_FIELDS.price)) {
      const match = line.match(/\*\*(?:Price|Cost):\*\*\s*([^\(]+)(?:\(([^)]+)\))?/i);
      if (match) {
        pageData.overview.price = renderInlineMarkdown(match[1].trim());  // ← ИЗМЕНЕНО
        if (match[2]) {
          pageData.overview.priceNote = renderInlineMarkdown(match[2].trim());  // ← ИЗМЕНЕНО
        }
        continue;
      }
    }
    
    if (matchesField(line, OVERVIEW_FIELDS.keyFeatures)) {
      inKeyFeaturesBlock = true;
      continue;
    }
    
    if (inKeyFeaturesBlock) {
      // Проверяем списки (уже обработанная строка без >)
      const listMatch = line.match(/^[-*]\s+(.+)/);
      if (listMatch) {
        pageData.overview.keyFeatures.push(renderInlineMarkdown(listMatch[1].trim()));
        continue;
      }
      
      // Проверяем конец блока ключевых особенностей
      if (!line.match(/^[-*]\s+/) && line !== '') {
        inKeyFeaturesBlock = false;
      }
    }
    
    if (matchesField(line, OVERVIEW_FIELDS.interfaces)) {
      const match = line.match(/\*\*Interfaces?:\*\*\s*(.+)/i);
      if (match) {
        pageData.overview.interfaces = match[1]
          .split(/[,;]/)
          .map(s => renderInlineMarkdown(s.trim()))  // ← ИЗМЕНЕНО
          .filter(s => s);
        continue;
      }
    }
    
    if (matchesField(line, OVERVIEW_FIELDS.tags)) {
      const match = line.match(/\*\*Tags:\*\*\s*(.+)/i);
      if (match) {
        pageData.overview.tags = match[1]
          .split(/[,;]/)
          .map(s => renderInlineMarkdown(s.trim()))  // ← ИЗМЕНЕНО
          .filter(s => s);
        continue;
      }
    }
    
    // Добавляем в descriptions только если это не поле и не элемент списка
    if (!line.match(/\*\*\w+:\*\*/) && !line.match(/^[-*]\s+/) && !inKeyFeaturesBlock && line) {
      const processed = renderInlineMarkdown(line);
      if (processed) {
        pageData.overview.descriptions.push(processed);
      }
    }
  }
  
  return pageData;
}


/**
 * Удаление секции Overview из markdown
 */
function removeOverviewFromMarkdown(markdown) {
  const lines = markdown.split('\n');
  const result = [];
  let inOverview = false;
  let foundOverview = false;
  let h1Line = null;
  let skipContentAfterH1 = false; // Флаг для пропуска контента после H1 до первой секции
  
  // Сначала проверяем, есть ли Overview секция
  for (const line of lines) {
    if (line.trim().match(/^##\s+(project\s+overview|product\s+overview)/i)) {
      foundOverview = true;
      break;
    }
  }
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Обрабатываем H1 заголовок
    if (trimmed.startsWith('# ')) {
      h1Line = line;
      
      // Если есть Overview секция, пропускаем весь контент после H1 до первой секции H2
      if (foundOverview) {
        skipContentAfterH1 = true;
      } else {
        // Если нет Overview секции, добавляем H1 как обычный заголовок
        result.push(line);
      }
      continue;
    }
    
    // Если мы пропускаем контент после H1 и встречаем первую секцию H2
    if (skipContentAfterH1 && trimmed.startsWith('## ')) {
      skipContentAfterH1 = false;
      // Проверяем, является ли это секцией Overview
      if (trimmed.match(/^##\s+(project\s+overview|product\s+overview)/i)) {
        inOverview = true;
        continue;
      }
    }
    
    // Если мы все еще пропускаем контент после H1, продолжаем
    if (skipContentAfterH1) {
      continue;
    }
    
    // Начало секции Overview (если мы еще не в ней)
    if (!inOverview && trimmed.match(/^##\s+(project\s+overview|product\s+overview)/i)) {
      inOverview = true;
      continue;
    }
    
    // Конец секции Overview
    if (inOverview && (trimmed.match(/^---+$/) || trimmed.match(/^===+$/) || 
        (trimmed.startsWith('## ') && !trimmed.match(/^##\s+(project\s+overview|product\s+overview)/i)))) {
      inOverview = false;
    }
    
    // Добавляем строку, если мы не в секции Overview
    if (!inOverview) {
      result.push(line);
    }
  }
  
  return result.join('\n');
}


/**
 * Генерация HTML карточки продукта
 */
function generateProductCard(pageData) {
  // Если нет Overview секции, не создаем product card
  if (!pageData.hasOverviewSection) {
    return '';
  }
  
  const ov = pageData.overview;
  const cls = CSS_CLASSES;
  
  const imageHtml = ov.image ? 
    `<div class="${cls.productImage}">
      <img src="${ov.image}" alt="${escapeHtml(pageData.title)}" loading="lazy">
    </div>` :
    `<div class="${cls.productImage}">
      <div class="${cls.productImagePlaceholder}">📸</div>
    </div>`;
  
  const statusClass = getStatusClass(ov.status);
  const statusHtml = ov.status ? 
    `<div class="${cls.status}">
      <span class="${cls.statusDot} ${statusClass}"></span>
      <span class="${statusClass}">${ov.status}</span>
    </div>` : '';
  
  const revisionPill = ov.revision ? `<span class="${cls.versionPill}">${ov.revision}</span>` : '';
  
  const statusVersionRow = (ov.status || ov.revision) ? 
    `<div class="${cls.statusVersionRow}">
      ${statusHtml}
      ${revisionPill}
    </div>` : '';
  
  const cardHeader = `<div class="${cls.cardHeader}">
    <h2 class="${cls.cardTitle}">${escapeHtml(pageData.title)}</h2>
  </div>`;
  
  const priceHtml = ov.price ? `<div class="${cls.price}">${ov.price}</div>` : '';
  const priceNoteHtml = ov.priceNote ? `<div class="${cls.priceNote}">${ov.priceNote}</div>` : '';
  
  const descriptionsHtml = ov.descriptions.length > 0 ?
    ov.descriptions.map(desc => `<p class="${cls.description}">${desc}</p>`).join('\n    ') : '';
  
  const interfacesHtml = ov.interfaces.length > 0 ?
    `<div class="${cls.interfaces}">
      ${ov.interfaces.map(iface => `<span class="${cls.interfaceTag}">${iface}</span>`).join('\n      ')}
    </div>` : '';
  
  const specsHtml = ov.keyFeatures.length > 0 ?
    `<div class="${cls.specs}">
      <ul>
        ${ov.keyFeatures.map(feat => `<li>${feat}</li>`).join('\n        ')}
      </ul>
    </div>` : '';
  
  const tagsHtml = ov.tags.length > 0 ?
    `<div class="${cls.tags}">
      ${ov.tags.map(tag => `<span class="${cls.tag}">${tag}</span>`).join('\n      ')}
    </div>` : '';
  
  return `<section id="overview" class="${cls.section}">
  <div class="${cls.productCard}">
    <div class="${cls.productContent}">
      ${imageHtml}
      
      <div class="${cls.productDetails}">
        ${statusVersionRow}
        ${cardHeader}
        ${priceHtml}
        ${priceNoteHtml}
        ${descriptionsHtml}
        ${interfacesHtml}
        ${specsHtml}
        ${tagsHtml}
      </div>
    </div>
  </div>
</section>`;
}


module.exports = {
  parseOverviewContent,
  removeOverviewFromMarkdown,
  generateProductCard
};