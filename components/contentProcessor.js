// contentProcessor.js - Модульная обработка markdown контента
const { createMarkdownInstance, slugify } = require('./utils');
const { parseOverviewContent, removeOverviewFromMarkdown } = require('./overview');
const { parseSpecifications, isSpecificationDocument } = require('./specParser');
const { parseMarkdownWithCards } = require('./cardParser');
const { parseProjects } = require('./projectParser');
const { processSelectorsInMarkdown, replaceSelectorPlaceholders } = require('./selectorParser');

/**
 * Процессор контента - обрабатывает markdown и преобразует в HTML
 */
class ContentProcessor {
  constructor() {
    this.md = createMarkdownInstance({
      html: true,
      breaks: false,
      linkify: true,
      typographer: true
    });
    
    this.currentSection = null;
    this.sectionStack = [];
    this.anchors = new Map();
    this.anchorCounts = new Map();
    
    this.setupMarkdownRenderers();
  }
  
  /**
   * Генерирует уникальный якорь для заголовка
   * @param {string} text - Текст заголовка
   * @returns {string} Уникальный ID якоря
   */
  generateUniqueAnchor(text) {
    const baseAnchor = slugify(text);
    
    if (!this.anchorCounts.has(baseAnchor)) {
      this.anchorCounts.set(baseAnchor, 1);
      return baseAnchor;
    }
    
    const count = this.anchorCounts.get(baseAnchor);
    this.anchorCounts.set(baseAnchor, count + 1);
    return `${baseAnchor}-${count}`;
  }

  /**
   * Настраивает кастомные рендереры markdown
   */
  setupMarkdownRenderers() {
    const { CSS_CLASSES, getSectionKeywords } = require('./config');
    const { escapeHtml, matchesKeywords } = require('./utils');
    
    // Рендерер для H2 заголовков - создаёт секции
    const defaultHeadingOpen = this.md.renderer.rules.heading_open || 
      ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
    
    this.md.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      const level = parseInt(token.tag.substring(1), 10);
      const nextToken = tokens[idx + 1];
      const titleText = nextToken ? nextToken.content : '';
      
      const cls = CSS_CLASSES;
      let html = '';
      
      // Генерируем уникальный якорь для заголовка
      const anchorId = this.generateUniqueAnchor(titleText);
      this.anchors.set(titleText, anchorId);
      
      if (level === 2) {
        let sectionType = null;
        
        for (const [type, keywords] of Object.entries(getSectionKeywords())) {
          if (type === 'overview') continue;
          if (matchesKeywords(titleText.toLowerCase(), keywords)) {
            sectionType = type;
            break;
          }
        }
        
        this.currentSection = sectionType;
        
        if (this.sectionStack.length > 0) {
          html += '</div></section>\n';
          this.sectionStack.pop();
        }
        
        // ВАЖНО: обнуляем inline-токен, чтобы текст не выводился второй раз
        if (nextToken) {
          nextToken.content = '';
          if (nextToken.children) {
            nextToken.children = [];
          }
        }
        
        const sectionId = anchorId || (sectionType || 'section').toLowerCase().replace(/\s+/g, '-');
        
        html += `<section id="${sectionId}" class="${cls.section}">\n` +
                `<h2 id="${anchorId}" class="${cls.sectionTitle} heading-with-anchor">${escapeHtml(titleText)}<a href="#${anchorId}" class="anchor-link" aria-label="Ссылка на раздел">🔗</a></h2>\n` +
                `<div class="${cls.sectionContent}">\n`;
        
        this.sectionStack.push(sectionType || 'generic');
        
        return html;
      }
      
      // Для H3+ добавляем якорь и класс
      if (level >= 3) {
        token.attrSet('id', anchorId);
        token.attrSet('class', 'heading-with-anchor');
      }
      
      return defaultHeadingOpen(tokens, idx, options, env, self);
    };
    
    // Рендерер для закрывающих тегов заголовков
    this.md.renderer.rules.heading_close = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      const level = parseInt(token.tag.substring(1), 10);
      
      // Для H2 не рендерим закрывающий тег (уже создан в heading_open)
      if (level === 2) {
        return '';
      }
      
      // Для H3+ добавляем якорную ссылку
      if (level >= 3) {
        const openingIdx = idx - 2;
        if (openingIdx >= 0) {
          const inlineToken = tokens[openingIdx + 1];
          const titleText = inlineToken ? inlineToken.content : '';
          const anchorId = this.generateUniqueAnchor(titleText);
          return `<a href="#${anchorId}" class="anchor-link" aria-label="Ссылка на раздел">🔗</a></${token.tag}>`;
        }
      }
      
      return self.renderToken(tokens, idx, options);
    };
  }

  /**
   * Обрабатывает изображения в markdown и обновляет пути к assets/images/
   */
  processMarkdownImages(markdown, currentFile, outputFile) {
    const path = require('path');
    const fs = require('fs');
    const currentFileDir = path.dirname(currentFile);
    const outputDir = path.dirname(outputFile);
    const projectRoot = process.cwd();
    
    return markdown.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, altText, imagePath) => {
      // Пропускаем абсолютные URL
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return match;
      }
      
      try {
        // Разрешаем путь к изображению относительно markdown файла
        let resolvedImagePath;
        if (imagePath.startsWith('./') || imagePath.startsWith('../')) {
          resolvedImagePath = path.resolve(currentFileDir, imagePath);
        } else if (imagePath.startsWith('/')) {
          resolvedImagePath = path.join(projectRoot, imagePath.substring(1));
        } else if (imagePath.startsWith('assets/')) {
          // Специальная обработка для путей assets/ - ищем в корне проекта
          resolvedImagePath = path.join(projectRoot, imagePath);
        } else {
          resolvedImagePath = path.resolve(currentFileDir, imagePath);
        }
        
        // Проверяем, существует ли файл
        if (!fs.existsSync(resolvedImagePath)) {
          return match;
        }
        
        // Определяем, где находится изображение относительно проекта
        const relativeImagePath = path.relative(projectRoot, resolvedImagePath);
        const imagePathParts = relativeImagePath.split(path.sep);
        
        // Определяем структуру для изображения в dist/assets/images/
        let targetImagePath;
        
        if (imagePathParts[0] === 'assets') {
          // Изображение в корневой папке assets/ - копируем в assets/images/root/
          const imageFileName = path.basename(resolvedImagePath);
          targetImagePath = path.join('assets', 'images', 'root', imageFileName);
        } else {
          // Изображение в другой папке - определяем sectionPath
          const relativeToProject = path.relative(projectRoot, currentFile);
          const pathParts = relativeToProject.split(path.sep);
          
          let sectionPath = '';
          if (pathParts[0] === 'website') {
            if (pathParts.length > 1) {
              sectionPath = pathParts.slice(0, 2).join('/');
            } else {
              sectionPath = 'website';
            }
          } else {
            sectionPath = pathParts[0];
          }
          
          const imageFileName = path.basename(imagePath);
          const imageRelativeDir = path.dirname(imagePath);
          const normalizedRelativeDir = imageRelativeDir === '.' ? '' : imageRelativeDir.replace(/^\.\//, '').replace(/\.\.\//g, '');
          
          targetImagePath = path.join('assets', 'images', sectionPath, normalizedRelativeDir, imageFileName);
        }
        
        // Вычисляем относительный путь от HTML файла к изображению
        const targetImageFullPath = path.join(projectRoot, 'dist', targetImagePath);
        const relativePathToImage = path.relative(outputDir, targetImageFullPath).replace(/\\/g, '/');
        
        return `![${altText}](${relativePathToImage})`;
        
      } catch (error) {
        return match;
      }
    });
  }

  /**
   * Обрабатывает markdown файл полностью
   */
  async processMarkdown(markdown, options = {}) {
    const {
      relativeRoot = './',
      sourceFile = '',
      outputFile = '',
      skipImageProcessing = false
    } = options;

    // Сохраняем оригинальный markdown
    const originalMarkdown = markdown;

    // 1. Парсинг Overview
    const pageData = parseOverviewContent(markdown, relativeRoot);
    markdown = removeOverviewFromMarkdown(markdown);

    // 1.5. Обработка изображений в markdown (если не пропущено)
    if (sourceFile && outputFile && !skipImageProcessing) {
      markdown = this.processMarkdownImages(markdown, sourceFile, outputFile);
    }

    // 2. Парсинг Specifications
    const specResult = parseSpecifications(markdown);
    markdown = specResult.cleanedMarkdown;

    // 3. Парсинг Features
    const featureResult = parseMarkdownWithCards(markdown, 'features');
    markdown = featureResult.cleanedMarkdown;

    // 4. Парсинг Applications
    const applicationResult = parseMarkdownWithCards(markdown, 'applications');
    markdown = applicationResult.cleanedMarkdown;

    // 5. Парсинг Resources
    const resourceResult = parseMarkdownWithCards(markdown, 'resources');
    markdown = resourceResult.cleanedMarkdown;

    // 6. Парсинг Projects
    const projectResult = parseProjects(markdown);
    markdown = projectResult.cleanedMarkdown;

    // 7. Обработка селекторов
    const selectorResult = processSelectorsInMarkdown(markdown, this.md);
    markdown = selectorResult.markdown;

    // 8. Рендеринг основного контента
    let contentHtml = this.md.render(markdown);

    // 9. Замена placeholder'ов селекторов
    if (selectorResult.hasSelectors && selectorResult.selectors.length > 0) {
      contentHtml = replaceSelectorPlaceholders(contentHtml, selectorResult.selectors);
    }

    // 10. Закрываем открытые секции
    while (this.sectionStack.length > 0) {
      contentHtml += '</div></section>\n';
      this.sectionStack.pop();
    }

    return {
      pageData,
      contentHtml,
      specResult,
      featureResult,
      applicationResult,
      resourceResult,
      projectResult,
      originalMarkdown
    };
  }

  /**
   * Рендерит карточки в соответствующие секции
   */
  renderCardsIntoSections(contentHtml, results) {
    const { renderCards } = require('./cardParser');
    const { renderSpecificationCards } = require('./specParser');
    const { renderProjectCards } = require('./projectParser');

    let html = contentHtml;

    // Вставляем spec карточки
    if (results.specResult.cards && results.specResult.cards.length > 0) {
      const isSpecDoc = isSpecificationDocument(results.originalMarkdown);
      
      if (isSpecDoc) {
        // Для документов спецификаций вставляем после H1
        const specHtml = renderSpecificationCards(results.specResult.cards);
        if (specHtml) {
          const h1Regex = /(<h1[^>]*>.*?<\/h1>)/i;
          const match = html.match(h1Regex);
          
          if (match) {
            const h1Element = match[1];
            const replacement = `${h1Element}\n\n<div style="margin-top: 2rem;">\n${specHtml}\n</div>`;
            html = html.replace(h1Element, replacement);
          }
        }
      } else if (results.specResult.specsSections && results.specResult.specsSections.length > 0) {
        // Вставляем в каждую секцию
        results.specResult.specsSections.forEach(section => {
          const sectionHtml = renderSpecificationCards(section.cards);
          if (sectionHtml) {
            const sectionRegex = new RegExp(
              `(<section id="${section.id}" class="section">[\\s\\S]*?<div class="section-content">)([\\s\\S]*?)(</div></section>)`, 
              'i'
            );
            const match = html.match(sectionRegex);
            
            if (match) {
              const [fullMatch, beforeContent, existingContent, afterContent] = match;
              const newContent = existingContent.trim() ? 
                `${existingContent}\n<div style="margin-top: 1.5rem;"></div>\n${sectionHtml}` :
                `\n<div style="margin-top: 1.5rem;"></div>\n${sectionHtml}\n`;
              
              html = html.replace(fullMatch, beforeContent + newContent + afterContent);
            }
          }
        });
      }
    }

    // Вставляем feature карточки
    if (results.featureResult.cards && results.featureResult.cards.length > 0) {
      const featureHtml = renderCards(results.featureResult.cards);
      if (featureHtml) {
        html = html.replace(
          /(<section id="features" class="section">[\s\S]*?<div class="section-content">)/,
          match => match + '\n' + featureHtml
        );
      }
    }

    // Вставляем application карточки
    if (results.applicationResult.cards && results.applicationResult.cards.length > 0) {
      const applicationHtml = renderCards(results.applicationResult.cards);
      if (applicationHtml) {
        html = html.replace(
          /(<section id="applications" class="section">[\s\S]*?<div class="section-content">)/,
          match => match + '\n' + applicationHtml
        );
      }
    }

    // Вставляем resource карточки
    if (results.resourceResult.cards && results.resourceResult.cards.length > 0) {
      const resourceHtml = renderCards(results.resourceResult.cards);
      if (resourceHtml) {
        html = html.replace(
          /(<section id="resources" class="section">[\s\S]*?<div class="section-content">)/,
          match => match + '\n' + resourceHtml
        );
      }
    }

    return html;
  }

  /**
   * Генерирует якорь для заголовка
   */
  generateAnchor(text) {
    const anchorId = slugify(text);
    this.anchors.set(text, anchorId);
    return anchorId;
  }

  /**
   * Получает все якоря
   */
  getAnchors() {
    return new Map(this.anchors);
  }

  /**
   * Сбрасывает состояние процессора
   */
  reset() {
    this.currentSection = null;
    this.sectionStack = [];
    this.anchors.clear();
  }
}

module.exports = {
  ContentProcessor
};
