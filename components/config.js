// config.js
const fs = require('fs');
const yaml = require('js-yaml');

// CSS классы (статичные)
const CSS_CLASSES = {
  productCard: 'product-card',
  productContent: 'product-content',
  productImage: 'product-image',
  productImagePlaceholder: 'product-image-placeholder',
  productDetails: 'product-details',
  status: 'status',
  statusDot: 'status-dot',
  statusVersionRow: 'status-version-row',
  cardHeader: 'card-header',
  cardTitle: 'card-title',
  versionPill: 'version-pill',
  price: 'price',
  priceNote: 'price-note',
  description: 'description',
  interfaces: 'interfaces',
  interfaceTag: 'interface-tag',
  specs: 'specs',
  tags: 'tags',
  tag: 'tag',
  section: 'section',
  sectionTitle: 'section-title',
  sectionContent: 'section-content',
  specsGrid: 'specs-grid',
  specCard: 'spec-card',
  specCardTitle: 'spec-card-title',
  specList: 'spec-list',
  specItem: 'spec-item',
  specLabel: 'spec-label',
  specValue: 'spec-value',
  card: 'card',
  cardIcon: 'card-icon',
  cardContentWrapper: 'card-content',
  cardDescription: 'card-description',
  gradientOverlay: 'gradient-overlay',
  grid1: 'grid-1',
  grid2: 'grid-2',
  grid3: 'grid-3',
  grid4: 'grid-4',
  grid5: 'grid-5',
  projectButton: 'btn',
  siteWrapper: 'site-wrapper',
  header: 'header',
  headerContainer: 'header-container',
  logoSection: 'logo-section',
  logo: 'logo',
  siteTitleWrapper: 'site-title-wrapper',
  sitename: 'sitename',
  breadcrumb: 'breadcrumb',
  navSection: 'nav-section',
  navLinks: 'nav-links',
  communityButtons: 'community-buttons',
  communityBtn: 'community-btn',
  btnIcon: 'btn-icon',
  btnText: 'btn-text',
  footer: 'footer',
  footerContainer: 'footer-container',
  copyright: 'copyright',
  copyrightLine1: 'copyright-line1',
  copyrightLine2: 'copyright-line2',
  socialLinks: 'social-links',
  socialPill: 'social-pill',
  socialIcon: 'social-icon',
  socialLabel: 'social-label',
  alert: 'alert',
  alertIcon: 'alert-icon',
  alertContent: 'alert-content',
  codeBlock: 'code-block',
  codeLang: 'code-lang',
};

// Загрузка конфигурации из config.yaml
let configCache = null;

function loadConfig() {
  if (configCache) {
    return configCache;
  }

  try {
    const configPath = 'config.yaml';
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf8');
      configCache = yaml.load(configContent);
      return configCache;
    }
  } catch (error) {
    console.warn('⚠️  Не удалось загрузить config.yaml:', error.message);
  }

  // Fallback конфигурация
  return getDefaultConfig();
}

function getDefaultConfig() {
  return {
    site: {
      name: 'CREAPUNK',
      title: 'Documentation Builder',
      logoClickUrl: '/'
    },
    navigation: [
      { text: 'Projects', url: '#projects' },
      { text: 'Docs', url: '#documentation' }
    ],
    socials: {
      email: 'your@email.com',
      github: 'https://github.com/your-username',
      youtube: 'https://youtube.com/@your-channel',
      discord: 'https://discord.gg/your-server',
      kofi: 'https://ko-fi.com/creapunk'
    },
    icons: {
      site: {
        logo: './assets/creapunk-icon.svg',
        favicon: {
          ico: './assets/creapunk-icon.png',
          svg: './assets/creapunk-icon.svg',
          appleTouchIcon: './assets/creapunk-icon.png',
          manifest: '/manifest.webmanifest'
        }
      },
      social: {
        email: 'assets/email.svg',
        github: 'assets/github.svg',
        youtube: 'assets/youtube.svg',
        discord: 'assets/discord.svg',
        kofi: 'assets/kofi.svg'
      }
    },
    external: {
      stylesheets: [
        { href: 'assets/styles.css', type: 'local' },
        { 
          href: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css',
          type: 'cdn',
          integrity: ''
        }
      ],
      scripts: [
        { src: 'assets/script.js', type: 'local', defer: true },
        { 
          src: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js',
          type: 'cdn',
          defer: false
        }
      ]
    },
    sections: {
      keywords: {
        overview: ['project overview', 'product overview'],
        features: ['features'],
        specifications: ['specifications', 'specs'],
        applications: ['applications', 'usage', 'use cases', 'scenarios'],
        resources: ['resources'],
        examples: ['examples'],
        guide: ['guide']
      }
    },
    build: {
      allowedRepositories: [],
      input: {
        files: [],
        directories: [],
        githubRepositories: []
      }
    },
    linkProcessing: {
      preserveExternalLinks: true,
      convertMdToHtml: true,
      basePath: './'
    }
  };
}

// Функции для получения конфигурации
function getConfig() {
  return loadConfig();
}

function getSiteConfig() {
  const config = getConfig();
  return {
    siteName: config.site.name,
    logoPath: config.icons.site.logo,
    logoClickUrl: config.site.logoClickUrl || '/',
    breadcrumb: 'Home / Projects',
    favicon: config.icons.site.favicon,
    navigation: config.navigation,
    socials: config.socials
  };
}

function getAssets() {
  const config = getConfig();
  return {
    icons: config.icons.social
  };
}

function getExternalAssets() {
  const config = getConfig();
  return config.external;
}

function getSectionKeywords() {
  const config = getConfig();
  return config.sections.keywords;
}

// Статичные поля обзора (не зависят от конфигурации)
const OVERVIEW_FIELDS = {
  revision: ['revision', 'version'],
  status: ['status'],
  price: ['price', 'cost'],
  keyFeatures: ['key features', 'features'],
  interfaces: ['interfaces', 'interface'],
  tags: ['tags', 'tag']
};

// Функция для проверки разрешенных репозиториев
function isRepositoryAllowed(repoUrl) {
  // Проверяем, что repoUrl является строкой
  if (typeof repoUrl !== 'string') {
    return false;
  }
  
  const config = getConfig();
  const allowedRepos = config.build.allowedRepositories || [];
  return allowedRepos.some(allowed => {
    // Проверяем, что allowed является строкой
    if (typeof allowed !== 'string') {
      return false;
    }
    // Нормализуем URL для сравнения
    const normalizeUrl = (url) => url.replace(/\/$/, '').toLowerCase();
    return normalizeUrl(repoUrl).includes(normalizeUrl(allowed)) || 
           normalizeUrl(allowed).includes(normalizeUrl(repoUrl));
  });
}

// Очистка кеша конфигурации (для перезагрузки)
function clearConfigCache() {
  configCache = null;
}

// Карта псевдонимов репозиториев (owner/repo -> alias)
const repositoryAliases = new Map();

/**
 * Регистрирует псевдоним для репозитория
 */
function registerRepositoryAlias(owner, repo, alias) {
  if (alias) {
    const key = `${owner}/${repo}`;
    repositoryAliases.set(key, alias);
  }
}

/**
 * Получает псевдоним для репозитория
 */
function getRepositoryAlias(owner, repo) {
  const key = `${owner}/${repo}`;
  return repositoryAliases.get(key) || null;
}

/**
 * Получает имя директории для репозитория (псевдоним или стандартное имя)
 */
function getRepositoryDirName(owner, repo) {
  const alias = getRepositoryAlias(owner, repo);
  return alias || `${owner}-${repo}`;
}

/**
 * Очищает карту псевдонимов
 */
function clearRepositoryAliases() {
  repositoryAliases.clear();
}




module.exports = {
  CSS_CLASSES,
  OVERVIEW_FIELDS,
  // Функции для получения конфигурации
  getConfig,
  getSiteConfig,
  getAssets,
  getExternalAssets,
  getSectionKeywords,
  isRepositoryAllowed,
  clearConfigCache,
  // Функции для работы с псевдонимами
  registerRepositoryAlias,
  getRepositoryAlias,
  getRepositoryDirName,
  clearRepositoryAliases,
  // Для обратной совместимости
  get ASSETS() { return getAssets(); },
  get EXTERNAL_ASSETS() { return getExternalAssets(); },
  get siteConfig() { return getSiteConfig(); },
  get SECTION_KEYWORDS() { return getSectionKeywords(); }
};
