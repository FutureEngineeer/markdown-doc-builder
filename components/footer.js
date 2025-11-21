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
  
  if (config.socials.email) {
    socialButtons.push(`<div class="${cls.socialPill} email" onclick="window.open('mailto:${config.socials.email}', '_blank')">
        ${generateInlineSvg('email', cls.socialIcon, 'var(--icon-size)')}
        <span class="${cls.socialLabel}">Email</span>
      </div>`);
  }
  
  if (config.socials.github) {
    socialButtons.push(`<div class="${cls.socialPill} github" onclick="window.open('${config.socials.github}', '_blank')">
        ${generateInlineSvg('github', cls.socialIcon, 'var(--icon-size)')}
        <span class="${cls.socialLabel}">GitHub</span>
      </div>`);
  }
  
  if (config.socials.youtube) {
    socialButtons.push(`<div class="${cls.socialPill} youtube" onclick="window.open('${config.socials.youtube}', '_blank')">
        ${generateInlineSvg('youtube', cls.socialIcon, 'var(--icon-size)')}
        <span class="${cls.socialLabel}">YouTube</span>
      </div>`);
  }
  
  if (config.socials.discord) {
    socialButtons.push(`<div class="${cls.socialPill} discord" onclick="window.open('${config.socials.discord}', '_blank')">
        ${generateInlineSvg('discord', cls.socialIcon, 'var(--icon-size)')}
        <span class="${cls.socialLabel}">Discord</span>
      </div>`);
  }
  
  if (config.socials.kofi) {
    socialButtons.push(`<div class="${cls.socialPill} kofi" onclick="window.open('${config.socials.kofi}', '_blank')">
        ${generateInlineSvg('kofi', cls.socialIcon, 'var(--icon-size)')}
        <span class="${cls.socialLabel}">Ko-Fi</span>
      </div>`);
  }
  
  return `<footer class="${cls.footer}">
    <div class="${cls.footerContainer}">
      <div class="${cls.copyright}">
        <span class="${cls.copyrightLine1}">Copyright © 2023-Present</span>
        <span class="${cls.copyrightLine2}">creapunk community</span>
      </div>
      
      <div class="${cls.socialLinks}">
        ${socialButtons.join('\n        ')}
      </div>
    </div>
  </footer>`;
}

module.exports = { generateFooter };
