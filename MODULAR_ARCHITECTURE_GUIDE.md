# Руководство по модульной архитектуре генератора

## Быстрый старт

### Использование новой версии сборки

```bash
# Запуск новой версии с модульной архитектурой
node build-all-v3.js
```

### Что изменилось

1. **Все ссылки относительно корня dist** - больше не нужно считать уровни вложенности вручную
2. **Автоматическое отслеживание ссылок** - все ссылки регистрируются и проверяются
3. **Карта ссылок** - полная информация о всех ссылках в `.temp/link-map.json`
4. **Отчет о сборке** - подробная статистика в `.temp/build-report.json`

## Структура модулей

```
components/
├── pathResolver.js       # Управление путями
├── linkManager.js        # Управление ссылками  
├── linkProcessor.js      # Обработка ссылок
├── configManager.js      # Управление конфигурацией
├── contentProcessor.js   # Обработка контента
├── htmlGenerator.js      # Генерация HTML
└── buildOrchestrator.js  # Оркестрация сборки
```

## Основные возможности

### 1. Отслеживание ссылок

Все ссылки автоматически регистрируются и классифицируются:

```javascript
const { globalLinkManager } = require('./components/linkManager');

// Получить статистику
const stats = globalLinkManager.getStats();
console.log(stats);
// {
//   total: 150,
//   internal: 80,
//   external: 50,
//   assets: 20,
//   broken: 0
// }
```

### 2. Карта ссылок

После сборки создается файл `.temp/link-map.json`:

```json
{
  "metadata": {
    "generatedAt": "2024-01-01T00:00:00.000Z",
    "stats": {
      "total": 150,
      "internal": 80,
      "external": 50,
      "assets": 20,
      "broken": 0
    }
  },
  "links": [
    {
      "url": "./images/screenshot.png",
      "type": "asset",
      "sourceFiles": ["docs/guide.md"],
      "resolved": true,
      "targetPath": "dist/assets/images/screenshot.png",
      "isValid": true
    }
  ],
  "brokenLinks": [],
  "assetUsage": [
    {
      "asset": "./images/screenshot.png",
      "usedIn": ["docs/guide.md"]
    }
  ]
}
```

### 3. Отчет о сборке

Файл `.temp/build-report.json` содержит:

```json
{
  "summary": {
    "filesProcessed": 50,
    "filesGenerated": 50,
    "errors": 0,
    "warnings": 2,
    "duration": "5.23s"
  },
  "links": {
    "total": 150,
    "internal": 80,
    "external": 50,
    "assets": 20,
    "broken": 0
  },
  "errors": [],
  "warnings": [],
  "brokenLinks": "✓ No broken links found"
}
```

## Использование модулей

### PathResolver - Управление путями

```javascript
const { PathResolver } = require('./components/pathResolver');
const resolver = new PathResolver();

// Индексируем файл
resolver.indexFile('docs/guide.md', 'dist/docs/guide.html');

// Получаем относительный путь к корню
const relativeRoot = resolver.getRelativePathToRoot('dist/docs/guide.html');
// => '../'

// Конвертируем .md в .html
const htmlPath = resolver.convertMdToHtml('readme.md');
// => 'index.html'

// Нормализуем путь к ассету
const assetPath = resolver.normalizeAssetPath('./images/logo.png', 'dist/docs/guide.html');
// => '../assets/images/logo.png'
```

### LinkManager - Управление ссылками

```javascript
const { globalLinkManager } = require('./components/linkManager');

// Регистрируем ссылку
globalLinkManager.registerLink(
  'docs/guide.md',           // Исходный файл
  './images/screenshot.png', // URL ссылки
  'asset'                    // Тип: internal, external, asset, anchor
);

// Разрешаем внутреннюю ссылку
globalLinkManager.resolveInternalLink(
  './other-doc.md',
  'docs/guide.md',
  'dist/docs/other-doc.html'
);

// Помечаем ссылку как битую
globalLinkManager.markBroken('./missing.md', 'File not found');

// Получаем все ссылки из файла
const links = globalLinkManager.getLinksFromFile('docs/guide.md');

// Экспортируем карту ссылок
globalLinkManager.exportLinkMap('.temp/link-map.json');

// Генерируем отчет о битых ссылках
const report = globalLinkManager.generateBrokenLinksReport();
console.log(report);
```

### LinkProcessor - Обработка ссылок

```javascript
const { LinkProcessor } = require('./components/linkProcessor');
const processor = new LinkProcessor();

// Регистрируем репозиторий
processor.registerRepository('owner', 'repo', repoData);

// Обрабатываем ссылки в markdown
const processedMd = processor.processMarkdownLinks(
  markdown,
  'docs/guide.md',
  'dist/docs/guide.html'
);

// Обрабатываем ссылки в HTML
const processedHtml = processor.processHtmlLinks(
  html,
  'docs/guide.md',
  'dist/docs/guide.html'
);

// Обрабатываем ссылки в GitHub репозитории
const processedRepoMd = processor.processGitHubRepoLinks(
  markdown,
  repoData,
  'wiki/page.md',
  [otherRepo1, otherRepo2]
);
```

### ConfigManager - Управление конфигурацией

```javascript
const { globalConfigManager } = require('./components/configManager');

// Загружаем глобальную конфигурацию
const config = globalConfigManager.loadGlobalConfig();

// Загружаем конфигурацию секции
const sectionConfig = globalConfigManager.loadSectionConfig('docs');

// Получаем конфигурацию для файла (с объединением)
const fileConfig = globalConfigManager.getConfigForFile('docs/guide.md');

// Валидируем конфигурацию
const validation = globalConfigManager.validateConfig(config);
if (!validation.valid) {
  console.error('Config errors:', validation.errors);
}

// Сохраняем конфигурацию
globalConfigManager.saveConfig(config, 'custom-config.yaml');

// Очищаем кеш
globalConfigManager.clearCache();
```

### ContentProcessor - Обработка контента

```javascript
const { ContentProcessor } = require('./components/contentProcessor');
const processor = new ContentProcessor();

// Обрабатываем markdown
const results = await processor.processMarkdown(markdown, {
  relativeRoot: '../',
  sourceFile: 'docs/guide.md',
  outputFile: 'dist/docs/guide.html'
});

// results содержит:
// - pageData: данные overview
// - contentHtml: отрендеренный HTML
// - specResult: результаты парсинга спецификаций
// - featureResult: результаты парсинга features
// - applicationResult: результаты парсинга applications
// - resourceResult: результаты парсинга resources
// - projectResult: результаты парсинга projects

// Рендерим карточки в секции
const html = processor.renderCardsIntoSections(
  results.contentHtml,
  results
);

// Получаем все якоря
const anchors = processor.getAnchors();

// Сбрасываем состояние
processor.reset();
```

### HtmlGenerator - Генерация HTML

```javascript
const { HtmlGenerator } = require('./components/htmlGenerator');
const generator = new HtmlGenerator(config);

// Генерируем полную страницу
const html = generator.generateFullPage({
  title: 'Guide',
  pageData: pageData,
  contentHtml: contentHtml,
  outputFile: 'dist/docs/guide.html',
  relativeRoot: '../',
  breadcrumb: 'Docs / Guide',
  currentPage: 'guide.html'
});

// Генерируем только основной контент
const mainContent = generator.generateMainContent({
  pageData: pageData,
  contentHtml: contentHtml
});

// Генерируем favicon теги
const faviconTags = generator.generateFaviconTags(
  'dist/docs/guide.html',
  '../'
);

// Генерируем теги стилей
const styleTags = generator.generateStylesheets(
  'dist/docs/guide.html',
  '../',
  contentHtml
);

// Генерируем теги скриптов
const scriptTags = generator.generateScripts(
  'dist/docs/guide.html',
  '../',
  contentHtml
);
```

### BuildOrchestrator - Оркестрация сборки

```javascript
const { BuildOrchestrator } = require('./components/buildOrchestrator');

const orchestrator = new BuildOrchestrator({
  projectRoot: process.cwd(),
  distDir: 'dist'
});

// Начинаем сборку
orchestrator.startBuild();

// Индексируем файлы
orchestrator.indexFile('docs/guide.md', 'dist/docs/guide.html');

// Регистрируем репозитории
orchestrator.registerRepository('owner', 'repo', repoData);

// Обрабатываем файл
const result = await orchestrator.processFile(
  'docs/guide.md',
  'dist/docs/guide.html'
);

// Обрабатываем несколько файлов
const results = await orchestrator.processFiles([
  { sourcePath: 'docs/guide.md', outputPath: 'dist/docs/guide.html' },
  { sourcePath: 'docs/api.md', outputPath: 'dist/docs/api.html' }
]);

// Копируем ассеты
orchestrator.copyAssets();

// Экспортируем карту ссылок
orchestrator.exportLinkMap();

// Генерируем отчет
const report = orchestrator.generateBuildReport();

// Сохраняем отчет
orchestrator.saveBuildReport();

// Завершаем сборку
orchestrator.finishBuild();

// Очищаем данные
orchestrator.clear();
```

## Проверка результатов

### Проверка карты ссылок

```bash
# Показать статистику
cat .temp/link-map.json | jq '.metadata.stats'

# Показать битые ссылки
cat .temp/link-map.json | jq '.brokenLinks'

# Показать использование ассетов
cat .temp/link-map.json | jq '.assetUsage'
```

### Проверка отчета о сборке

```bash
# Показать сводку
cat .temp/build-report.json | jq '.summary'

# Показать статистику по ссылкам
cat .temp/build-report.json | jq '.links'

# Показать ошибки
cat .temp/build-report.json | jq '.errors'
```

## Расширение функциональности

### Добавление нового типа карточек

1. Создайте парсер в `components/customCardParser.js`:

```javascript
function parseCustomCards(markdown) {
  // Ваша логика парсинга
  return {
    cards: [],
    cleanedMarkdown: markdown
  };
}

function renderCustomCards(cards) {
  // Ваша логика рендеринга
  return '<div>...</div>';
}

module.exports = {
  parseCustomCards,
  renderCustomCards
};
```

2. Добавьте в `ContentProcessor`:

```javascript
const { parseCustomCards, renderCustomCards } = require('./customCardParser');

// В методе processMarkdown:
const customResult = parseCustomCards(markdown);
markdown = customResult.cleanedMarkdown;

// В методе renderCardsIntoSections:
if (results.customResult.cards.length > 0) {
  const customHtml = renderCustomCards(results.customResult.cards);
  // Вставьте в нужную секцию
}
```

### Добавление нового типа ссылок

1. Добавьте обработку в `LinkProcessor.processMarkdownLinks()`:

```javascript
// Обрабатываем новый тип ссылок
processed = processed.replace(/\[([^\]]+)\]\(custom:([^)]+)\)/g, (match, text, url) => {
  this.linkManager.registerLink(sourceFile, url, 'custom');
  // Ваша логика обработки
  return `[${text}](processed-url)`;
});
```

2. Добавьте статистику в `LinkManager.getStats()`:

```javascript
getStats() {
  return {
    // ...существующие поля
    custom: this.customLinks.size
  };
}
```

## Лучшие практики

1. **Всегда индексируйте файлы** перед обработкой
2. **Используйте относительные пути** для всех ассетов
3. **Проверяйте карту ссылок** после каждой сборки
4. **Используйте конфигурации секций** для специфичных настроек
5. **Очищайте кеш** при изменении конфигурации

## Отладка

### Включение подробных логов

```javascript
const orchestrator = new BuildOrchestrator({ 
  verbose: true 
});
```

### Проверка конкретной ссылки

```javascript
const linkInfo = globalLinkManager.links.get('./images/logo.png');
console.log(linkInfo);
```

### Проверка индекса файлов

```javascript
const found = pathResolver.findInIndex('guide.md');
console.log(found);
```

## Миграция с v2

### Было (build-all-v2.js):

```javascript
await convertMarkdownToHTML(
  'docs/guide.md',
  'dist/docs/guide.html'
);
```

### Стало (build-all-v3.js):

```javascript
const orchestrator = new BuildOrchestrator();
orchestrator.startBuild();
orchestrator.indexFile('docs/guide.md', 'dist/docs/guide.html');
await orchestrator.processFile('docs/guide.md', 'dist/docs/guide.html');
orchestrator.finishBuild();
```

## Поддержка

- **Документация**: `ARCHITECTURE_V2.md`
- **Примеры**: `build-all-v3.js`
- **Отчеты**: `.temp/build-report.json`
- **Карта ссылок**: `.temp/link-map.json`
