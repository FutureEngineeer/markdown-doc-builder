// footer.js
const { CSS_CLASSES, getAssets } = require('./config');
const { generateInlineSvg } = require('./utils');

function generateFooter(config, relativePath = '') {
  const cls = CSS_CLASSES;
  
  // Функция для корректировки пути к ассетам
  const getAssetPath = (assetPath) => {
    if (relativePath) {
      return relativePath + assetPath;
    }
    return assetPath;
  };
  
  const socialButtons = [];
  
  // Поддержка новой структуры socials (массив объектов) и старой (объект)
  const socials = Array.isArray(config.socials) ? config.socials : convertLegacySocials(config.socials);
  
  socials.forEach(social => {
    if (social.url) {
      const url = social.name === 'email' && !social.url.startsWith('mailto:') 
        ? `mailto:${social.url}` 
        : social.url;
      
      // Используем цвета из config.yaml
      const iconColor = social.color || '#ffffff';
      const hoverColor = social.hoverColor || social.color || '#ffffff';
      const isFilled = social.filled === true;
      
      // Добавляем класс filled если нужно
      const filledClass = isFilled ? ' filled' : '';
      
      // Устанавливаем цвет через CSS переменные для более гибкого управления
      socialButtons.push(`<div class="${cls.socialPill} ${social.name}${filledClass}" 
        style="--pill-color: ${iconColor}; --pill-hover-color: ${hoverColor}; color: ${iconColor};"
        onclick="window.open('${url}', '_blank')">
        ${generateInlineSvg(social.name, cls.socialIcon, 'var(--icon-size)')}
        <span class="${cls.socialLabel}">${social.label}</span>
      </div>`);
    }
  });
  
  // Получаем текст copyright из конфига
  const copyrightLine1 = config.footer?.copyright?.line1 || 'Copyright © 2023-Present';
  const copyrightLine2 = config.footer?.copyright?.line2 || 'creapunk community';
  
  return `<footer class="${cls.footer}">
    <div class="${cls.footerContainer}">
      <div class="${cls.copyright}">
        <span class="${cls.copyrightLine1}">${copyrightLine1}</span>
        <span class="${cls.copyrightLine2}">${copyrightLine2}</span>
      </div>
      
      <div class="${cls.socialLinks}">
        ${socialButtons.join('\n        ')}
      </div>
    </div>
  </footer>`;
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

module.exports = { generateFooter };
