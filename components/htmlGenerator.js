// htmlGenerator.js - Модульная генерация HTML
const { generateHeader } = require('./header');
const { generateFooter } = require('./footer');
const { generateHamburgerMenu } = require('./hamburgerMenu');
const { generateNewSectionMap } = require('./newSectionMap');
const { generateProductCard } = require('./overview');
const { processAnalytics } = require('./analytics');
const { getSiteConfig, getConfig } = require('./config');
const { escapeHtml } = require('./utils');

/**
 * Генератор HTML - собирает полную HTML страницу из компонентов
 */
class HtmlGenerator {
  constructor(config = null) {
    this.config = config || getConfig();
    
    // Нормализуем конфигурацию для обратной совместимости
    // Если есть site.name, используем его как siteName
    if (this.config.site && this.config.site.name && !this.config.siteName) {
      this.config.siteName = this.config.site.name;
    }
    
    // Если есть icons.site.logo, используем его как logoPath
    if (this.config.icons && this.config.icons.site && this.config.icons.site.logo && !this.config.logoPath) {
      this.config.logoPath = this.config.icons.site.logo;
    }
    
    // Если есть site.logoClickUrl, используем его
    if (this.config.site && this.config.site.logoClickUrl && !this.config.logoClickUrl) {
      this.config.logoClickUrl = this.config.site.logoClickUrl;
    }
    
    // Убеждаемся что конфигурация имеет правильную структуру
    if (!this.config.icons) {
      this.config.icons = getSiteConfig().favicon;
    }
    if (!this.config.logoPath) {
      this.config.logoPath = getSiteConfig().logoPath;
    }
    if (!this.config.siteName) {
      this.config.siteName = getSiteConfig().siteName;
    }
    if (!this.config.navigation) {
      this.config.navigation = getSiteConfig().navigation;
    }
    if (!this.config.socials) {
      this.config.socials = getSiteConfig().socials;
    }
  }

  /**
   * Генерирует теги favicon
   */
  generateFaviconTags(outputFile, relativeRoot) {
    const faviconConfig = this.config.icons?.site?.favicon || getSiteConfig().favicon;
    
    if (!faviconConfig) {
      return '';
    }

    const tags = [];
    
    // ICO для старых браузеров
    if (faviconConfig.ico) {
      let href = faviconConfig.ico;
      if (!href.startsWith('http')) {
        href = href.startsWith('./') ? href.substring(2) : href;
        href = relativeRoot + href;
      }
      tags.push(`  <link rel="icon" href="${href}" sizes="32x32">`);
    }
    
    // SVG для современных браузеров
    if (faviconConfig.svg) {
      let href = faviconConfig.svg;
      if (!href.startsWith('http')) {
        href = href.startsWith('./') ? href.substring(2) : href;
        href = relativeRoot + href;
      }
      tags.push(`  <link rel="icon" href="${href}" type="image/svg+xml">`);
    }
    
    // Apple Touch Icon
    if (faviconConfig.appleTouchIcon) {
      let href = faviconConfig.appleTouchIcon;
      if (!href.startsWith('http')) {
        href = href.startsWith('./') ? href.substring(2) : href;
        href = relativeRoot + href;
      }
      tags.push(`  <link rel="apple-touch-icon" href="${href}">`);
    }
    
    // Web manifest
    if (faviconConfig.manifest) {
      let href = faviconConfig.manifest;
      if (!href.startsWith('http')) {
        href = href.startsWith('/') ? href.substring(1) : href;
        href = href.startsWith('./') ? href.substring(2) : href;
        href = relativeRoot + href;
      }
      tags.push(`  <link rel="manifest" href="${href}">`);
    }
    
    return tags.join('\n');
  }

  /**
   * Генерирует SEO мета-теги
   */
  generateSeoMetaTags(title, description, keywords, url, imageUrl) {
    const siteName = this.config.site?.name || this.config.siteName || 'creapunk';
    const siteUrl = this.config.site?.baseUrl || 'https://creapunk.com';
    
    const tags = [];
    
    // Базовые мета-теги
    if (description) {
      tags.push(`  <meta name="description" content="${escapeHtml(description)}">`);
    }
    if (keywords) {
      tags.push(`  <meta name="keywords" content="${escapeHtml(keywords)}">`);
    }
    tags.push(`  <meta name="author" content="${siteName}">`);
    
    // Open Graph теги для социальных сетей
    tags.push(`  <meta property="og:type" content="website">`);
    tags.push(`  <meta property="og:site_name" content="${siteName}">`);
    if (title) {
      tags.push(`  <meta property="og:title" content="${escapeHtml(title)}">`);
    }
    if (description) {
      tags.push(`  <meta property="og:description" content="${escapeHtml(description)}">`);
    }
    if (url) {
      tags.push(`  <meta property="og:url" content="${url}">`);
    }
    if (imageUrl) {
      tags.push(`  <meta property="og:image" content="${imageUrl}">`);
    }
    
    // Twitter Card теги
    tags.push(`  <meta name="twitter:card" content="summary_large_image">`);
    if (title) {
      tags.push(`  <meta name="twitter:title" content="${escapeHtml(title)}">`);
    }
    if (description) {
      tags.push(`  <meta name="twitter:description" content="${escapeHtml(description)}">`);
    }
    if (imageUrl) {
      tags.push(`  <meta name="twitter:image" content="${imageUrl}">`);
    }
    
    // Canonical URL
    if (url) {
      tags.push(`  <link rel="canonical" href="${url}">`);
    }
    
    return tags.join('\n');
  }

  /**
   * Генерирует теги стилей
   */
  generateStylesheets(outputFile, relativeRoot, htmlContent = '') {
    const externalAssets = this.config.external || {};
    const stylesheets = externalAssets.stylesheets || [];

    if (stylesheets.length === 0) {
      return '';
    }

    return stylesheets
      .map(css => {
        const integrity = css.integrity 
          ? ` integrity="${css.integrity}" crossorigin="${css.crossorigin || 'anonymous'}"` 
          : '';
        
        let href = css.href;
        if (css.type === 'local' && !href.startsWith('http')) {
          href = href.startsWith('./') ? href.substring(2) : href;
          href = relativeRoot + href;
        }
        
        return `  <link rel="stylesheet" href="${href}"${integrity}>`;
      })
      .join('\n');
  }

  /**
   * Генерирует теги скриптов
   */
  generateScripts(outputFile, relativeRoot, htmlContent = '') {
    const { generateModularScripts } = require('./scriptLoader');
    return generateModularScripts(htmlContent, outputFile, this.config);
  }

  /**
   * Генерирует полную HTML страницу
   */
  generateFullPage(options) {
    const {
      title,
      pageData,
      contentHtml,
      outputFile,
      relativeRoot,
      breadcrumb,
      currentPage
    } = options;

    // Генерируем компоненты
    const header = generateHeader(
      this.config || getSiteConfig(), 
      currentPage, 
      breadcrumb, 
      outputFile
    );
    
    const footer = generateFooter(
      this.config || getSiteConfig(), 
      relativeRoot
    );
    
    const productCard = generateProductCard(pageData);
    const hamburgerMenu = generateHamburgerMenu('', outputFile);
    const sectionMap = generateNewSectionMap('', outputFile);
    
    // Генерируем модальное окно поиска
    const { generateSearchModal } = require('./searchModal');
    const searchModal = generateSearchModal();

    // Генерируем теги
    const fullHtml = productCard + contentHtml;
    const faviconTags = this.generateFaviconTags(outputFile, relativeRoot);
    const styleLinks = this.generateStylesheets(outputFile, relativeRoot, fullHtml);
    const scriptTags = this.generateScripts(outputFile, relativeRoot, fullHtml);

    // SEO мета-теги
    const pageTitle = title || this.config.site?.name || 'Documentation';
    const pageDescription = pageData?.description || this.config.site?.description || 'Documentation and projects';
    const pageKeywords = pageData?.keywords || this.config.site?.keywords || '';
    const siteUrl = this.config.site?.baseUrl || 'https://creapunk.com';
    const pageUrl = outputFile ? `${siteUrl}/${outputFile.replace(/\\/g, '/').replace('dist/', '')}` : siteUrl;
    const pageImage = pageData?.image || `${siteUrl}/assets/logo.png`;
    const seoTags = this.generateSeoMetaTags(pageTitle, pageDescription, pageKeywords, pageUrl, pageImage);

    // Обработка аналитики
    const analytics = processAnalytics(this.config);
    const analyticsHeadCode = analytics.headCode;
    const analyticsTrackingCode = analytics.trackingCode;

    // Собираем финальный HTML
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(pageTitle)}</title>
${seoTags}
${faviconTags}
${styleLinks}${analyticsHeadCode}
</head>
<body>
  ${header}
  ${searchModal}
  <div class="scope">
    ${hamburgerMenu}
    ${sectionMap}
    <main>
      ${productCard}
      ${contentHtml}
    </main>
    ${footer}
  </div>
${scriptTags}
  ${analyticsTrackingCode ? `<script>${analyticsTrackingCode}</script>` : ''}
</body>
</html>`;
  }

  /**
   * Генерирует только основной контент (без обертки)
   */
  generateMainContent(options) {
    const {
      pageData,
      contentHtml
    } = options;

    const productCard = generateProductCard(pageData);
    return productCard + contentHtml;
  }
}

module.exports = {
  HtmlGenerator
};
