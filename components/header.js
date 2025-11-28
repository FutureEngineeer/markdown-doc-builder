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
  
  // Поддержка новой структуры навигации (priority + menu) и старой (массив)
  let allLinks = [];
  let priorityLinks = [];
  let menuLinks = [];
  
  if (config.navigation.priority && config.navigation.menu) {
    // Новая структура
    priorityLinks = config.navigation.priority || [];
    menuLinks = config.navigation.menu || [];
    allLinks = [...priorityLinks, ...menuLinks];
  } else {
    // Старая структура (массив)
    allLinks = Array.isArray(config.navigation) ? config.navigation : [];
    priorityLinks = allLinks;
  }
  
  const generateLinkHtml = (link, additionalClass = '') => {
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
    
    const activeClass = isActive ? ' active' : '';
    const classes = (additionalClass + activeClass).trim();
    const classAttr = classes ? ` class="${classes}"` : '';
    
    // Корректируем URL для относительных ссылок
    let href = link.url;
    if (!href.startsWith('http') && !href.startsWith('#')) {
      // Это относительная ссылка на файл
      href = relativeRoot + href;
    }
    
    return `<li${classAttr}><a href="${href}"${isActive ? ' class="active"' : ''}>${link.text}</a></li>`;
  };
  
  // Генерируем приоритетные ссылки (отображаются в header на десктопе)
  const priorityNavLinks = priorityLinks.map(link => generateLinkHtml(link, 'priority-link')).join('\n          ');
  
  // Генерируем все ссылки для мобильного меню
  const allNavLinks = allLinks.map(link => generateLinkHtml(link)).join('\n          ');
  
  // Определяем текущий раздел для breadcrumb
  let currentSection = 'Projects'; // По умолчанию Projects
  const activeLink = allLinks.find(link => 
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
    // Парсим customBreadcrumb для форматирования
    const parts = customBreadcrumb.split('/').map(part => part.trim());
    
    // Если это репозиторий (содержит несколько частей)
    if (parts.length > 1) {
      // Извлекаем корневую папку (самый высокий уровень)
      const rootFolder = parts[0].toUpperCase();
      let fileName = parts[parts.length - 1];
      
      // Проверяем, является ли это корневым файлом (index, main, root, readme)
      const isRootFileName = /^(index|main|root|readme)$/i.test(fileName);
      
      // Если файл корневой или это уже H1 заголовок (содержит пробелы или длинный)
      if (isRootFileName || fileName.includes(' ') || fileName.length > 20) {
        // Это уже H1 заголовок или будет заменен на H1, просто делаем uppercase
        fileName = fileName.toUpperCase();
      } else {
        // Обычное имя файла
        fileName = fileName.toUpperCase();
      }
      
      // Отображаем: КОРНЕВАЯ_ПАПКА / НАЗВАНИЕ_ФАЙЛА
      breadcrumbText = `${rootFolder} / ${fileName}`;
      
      // Ограничиваем общую длину breadcrumb до 25 символов
      if (breadcrumbText.length > 25) {
        breadcrumbText = breadcrumbText.substring(0, 22) + '...';
      }
    } else {
      // Для обычных файлов в корневой папке показываем только название файла без .html
      let fileName = customBreadcrumb;
      const isRootFileName = /^(index|main|root|readme)$/i.test(fileName);
      
      if (isRootFileName || fileName.toLowerCase() === 'root') {
        // Для корневых файлов используем название проекта из config
        breadcrumbText = config.siteName.toUpperCase();
      } else {
        fileName = fileName.toUpperCase();
        breadcrumbText = fileName;
      }
      
      // Ограничиваем общую длину breadcrumb до 25 символов
      if (breadcrumbText.length > 25) {
        breadcrumbText = breadcrumbText.substring(0, 22) + '...';
      }
    }
  } else if (isHomePage) {
    breadcrumbText = 'HOME';  // Для домашней страницы всегда показываем "HOME"
  } else {
    breadcrumbText = currentSection.toUpperCase();
  }
  
  // Вычисляем относительный путь к ассетам
  const assetRoot = getRelativePathToRoot(outputFile);
  
  // Определяем URL для клика на логотип
  let logoClickUrl = config.logoClickUrl || relativeRoot;
  // Если это не абсолютный URL, делаем его относительным
  if (!logoClickUrl.startsWith('http') && !logoClickUrl.startsWith('#')) {
    logoClickUrl = relativeRoot + (logoClickUrl.startsWith('./') ? logoClickUrl.substring(2) : logoClickUrl);
  }
  
  // Поддержка новой структуры socials (массив объектов) и старой (объект)
  const socials = Array.isArray(config.socials) ? config.socials : convertLegacySocials(config.socials);
  
  // Генерируем кнопки для Discord и Ko-Fi (если есть)
  const communityButtons = [];
  
  const discordSocial = socials.find(s => s.name === 'discord');
  if (discordSocial && discordSocial.url) {
    communityButtons.push(`<div class="${cls.communityBtn} discord-btn" onclick="window.open('${discordSocial.url}', '_blank')">
            ${generateInlineSvg('discord', cls.btnIcon, 'var(--btn-icon-size)')}
            <span class="${cls.btnText}">${discordSocial.label}</span>
          </div>`);
  }
  
  const kofiSocial = socials.find(s => s.name === 'kofi');
  if (kofiSocial && kofiSocial.url) {
    communityButtons.push(`<div class="${cls.communityBtn} kofi-btn" onclick="window.open('${kofiSocial.url}', '_blank')">
            ${generateInlineSvg('kofi', cls.btnIcon, 'var(--btn-icon-size)')}
            <span class="${cls.btnText}">Support ♥</span>
          </div>`);
  }
  
  const communityButtonsHtml = communityButtons.join('\n          ');
  
  return `<div class="menu-overlay" onclick="toggleMobileMenu()"></div>
  <header class="${cls.header}">
    <div class="${cls.headerContainer}">
      <div class="hamburger-button" onclick="toggleMobileMenu()">
        <span></span>
        <span></span>
        <span></span>
      </div>
      
      <div class="${cls.logoSection}" onclick="window.location.href='${logoClickUrl}'">
        <img src="${assetRoot}${config.logoPath.startsWith('./') ? config.logoPath.substring(2) : config.logoPath}" alt="Logo" class="${cls.logo}" />
        <div class="${cls.siteTitleWrapper}">
          <span class="${cls.sitename}">${config.siteName}</span>
          <span class="${cls.breadcrumb}">${breadcrumbText}</span>
        </div>
      </div>
      
      <nav class="${cls.navSection}">
        <ul class="${cls.navLinks} desktop-nav">
          ${priorityNavLinks}
        </ul>
        
        <div class="${cls.communityButtons}">
          ${communityButtonsHtml}
        </div>
        
        <button class="search-button" onclick="openSearchModal()" aria-label="Search">
          <svg class="search-button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
        </button>
      </nav>
    </div>
  </header>`;
}

// Конвертирует старую структуру socials в новую
function convertLegacySocials(legacySocials) {
  const result = [];
  const mapping = {
    email: { label: 'Email', icon: 'assets/email.svg' },
    github: { label: 'GitHub', icon: 'assets/github.svg' },
    youtube: { label: 'YouTube', icon: 'assets/youtube.svg' },
    discord: { label: 'Discord', icon: 'assets/discord.svg' },
    kofi: { label: 'Ko-Fi', icon: 'assets/kofi.svg' }
  };
  
  Object.keys(legacySocials).forEach(key => {
    if (legacySocials[key] && mapping[key]) {
      result.push({
        name: key,
        label: mapping[key].label,
        url: legacySocials[key],
        icon: mapping[key].icon
      });
    }
  });
  
  return result;
}

module.exports = { generateHeader };
