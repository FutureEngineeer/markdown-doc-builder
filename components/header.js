// header.js
const path = require('path');
const { CSS_CLASSES, getAssets } = require('./config');
const { generateInlineSvg } = require('./utils');

/**
 * Вычисляет относительный путь к корню проекта на основе выходного файла
 * @param {string} outputFile - Путь к выходному HTML файлу
 * @returns {string} Относительный путь к корню (например, "../" или "../../")
 */
function getRelativePathToRoot(outputFile) {
  if (!outputFile) return './';
  
  const relativePath = path.relative(process.cwd(), outputFile);
  const pathParts = relativePath.split(path.sep);
  
  // Считаем количество папок (исключая имя файла)
  const folderDepth = pathParts.length - 1;
  
  if (folderDepth <= 1) {
    // Файл в корне или в папке dist
    return './';
  }
  
  // Для каждого уровня вложенности добавляем "../"
  return '../'.repeat(folderDepth - 1);
}

function generateHeader(config, currentPage = '', customBreadcrumb = '', outputFile = '') {
  const cls = CSS_CLASSES;
  const relativeRoot = getRelativePathToRoot(outputFile);
  
  const navLinks = config.navigation.map(link => {
    // Определяем активность ссылки
    let isActive = false;
    
    // Для якорных ссылок (начинающихся с #)
    if (link.url.startsWith('#')) {
      isActive = currentPage === 'index.html' || currentPage === '/' || currentPage === '';
    } else {
      // Для файловых ссылок проверяем соответствие
      const linkFileName = path.basename(link.url);
      isActive = currentPage === linkFileName || 
                 currentPage.includes(linkFileName) ||
                 (link.url === '/' && currentPage === 'index.html');
    }
    
    const activeClass = isActive ? ' class="active"' : '';
    
    // Корректируем URL для относительных ссылок
    let href = link.url;
    if (!href.startsWith('http') && !href.startsWith('#')) {
      // Это относительная ссылка на файл
      href = relativeRoot + href;
    }
    
    return `<li><a href="${href}"${activeClass}>${link.text}</a></li>`;
  }).join('\n          ');
  
  // Определяем текущий раздел для breadcrumb
  let currentSection = 'Projects'; // По умолчанию Projects
  const activeLink = config.navigation.find(link => 
    currentPage === link.url || 
    (currentPage.includes(link.url) && link.url !== '/') ||
    (link.url === '/' && currentPage === 'index.html')
  );
  if (activeLink && activeLink.text !== 'Home') {
    currentSection = activeLink.text;
  }
  
  // Показываем breadcrumb на основе структуры файлов или навигации
  const isHomePage = currentPage === 'index.html' || currentPage === '/' || currentPage === '';
  
  let breadcrumbText;
  if (customBreadcrumb) {
    // Используем путь файла для breadcrumb
    breadcrumbText = customBreadcrumb;
  } else if (isHomePage) {
    breadcrumbText = 'Home';  // Для домашней страницы всегда показываем "Home"
  } else {
    breadcrumbText = currentSection;
  }
  
  // Вычисляем относительный путь к ассетам
  const assetRoot = getRelativePathToRoot(outputFile);
  
  // Определяем URL для клика на логотип
  let logoClickUrl = config.logoClickUrl || relativeRoot;
  // Если это не абсолютный URL, делаем его относительным
  if (!logoClickUrl.startsWith('http') && !logoClickUrl.startsWith('#')) {
    logoClickUrl = relativeRoot + (logoClickUrl.startsWith('./') ? logoClickUrl.substring(2) : logoClickUrl);
  }
  
  const discordButton = config.socials.discord ? 
    `<div class="${cls.communityBtn} discord-btn" onclick="window.open('${config.socials.discord}', '_blank')">
            ${generateInlineSvg('discord', cls.btnIcon, 'var(--btn-icon-size)')}
            <span class="${cls.btnText}">Discord</span>
          </div>` : '';
  
  const kofiButton = config.socials.kofi ? 
    `<div class="${cls.communityBtn} kofi-btn" onclick="window.open('${config.socials.kofi}', '_blank')">
            ${generateInlineSvg('kofi', cls.btnIcon, 'var(--btn-icon-size)')}
            <span class="${cls.btnText}">Support ♥</span>
          </div>` : '';
  
  return `<header class="${cls.header}">
    <div class="${cls.headerContainer}">
      <div class="${cls.logoSection}" onclick="window.location.href='${logoClickUrl}'">
        <img src="${assetRoot}${config.logoPath.startsWith('./') ? config.logoPath.substring(2) : config.logoPath}" alt="Logo" class="${cls.logo}" />
        <div class="${cls.siteTitleWrapper}">
          <span class="${cls.sitename}">${config.siteName}</span>
          <span class="${cls.breadcrumb}">${breadcrumbText}</span>
        </div>
      </div>
      
      <nav class="${cls.navSection}">
        <ul class="${cls.navLinks}">
          ${navLinks}
        </ul>
        
        <div class="${cls.communityButtons}">
          ${discordButton}
          ${kofiButton}
        </div>
      </nav>
    </div>
  </header>`;
}

module.exports = { generateHeader };
