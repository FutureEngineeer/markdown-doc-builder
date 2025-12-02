# Doc-Config Processing System

## Обзор

Новая система обработки `doc-config.yaml` файлов строит полную целостную карту-дерево файлов на основе множества вложенных конфигураций.

## Принцип работы

### Рекурсивная логика

1. **Если в папке есть `doc-config.yaml`** → он переопределяет структуру этой папки и вложенных
2. **Если `doc-config.yaml` нет** → отображаются все файлы и папки рекурсивно
3. **Вложенные `doc-config.yaml`** обрабатываются рекурсивно

### Алгоритм обработки

```
buildTreeForDirectory(dirPath):
  docConfig = loadDocConfig(dirPath)
  
  if docConfig && docConfig.hierarchy:
    return buildTreeFromHierarchy(docConfig.hierarchy)
  else:
    return buildTreeFromFileSystem(dirPath)
```

## Структура дерева

### Типы узлов

```javascript
{
  type: 'hierarchy' | 'filesystem',
  config: {...},  // doc-config.yaml если есть
  children: [
    {
      type: 'file',
      file: 'readme.md',
      title: 'Overview',
      path: '/full/path/readme.md',
      relativePath: 'readme.md'
    },
    {
      type: 'folder',
      folder: 'guides',
      title: 'Guides',
      path: '/full/path/guides',
      relativePath: 'guides',
      children: [...],
      config: {...}  // doc-config.yaml папки guides
    },
    {
      type: 'repository',
      repository: 'https://github.com/user/repo',
      alias: 'my-repo',
      title: 'My Repository'
    },
    {
      type: 'section',
      title: 'Projects',
      alias: 'projects',
      children: [...]
    }
  ]
}
```

## Примеры

### Пример 1: Root с doc-config

```
website/
├── doc-config.yaml
├── home.md
├── main.md
└── guides/
    ├── doc-config.yaml
    ├── getting-started.md
    └── advanced.md
```

**website/doc-config.yaml:**
```yaml
hierarchy:
  - file: home.md
    title: "Home"
  - file: main.md
    title: "Documentation"
  - folder: guides
    title: "Guides"
```

**Результат:**
- `home.md` и `main.md` отображаются в указанном порядке
- Папка `guides` обрабатывается рекурсивно
- Внутри `guides` применяется её собственный `doc-config.yaml`

### Пример 2: Папка без doc-config

```
website/
├── doc-config.yaml
└── tutorials/
    ├── tutorial-1.md
    ├── tutorial-2.md
    └── advanced/
        └── tutorial-3.md
```

**website/doc-config.yaml:**
```yaml
hierarchy:
  - folder: tutorials
    title: "Tutorials"
```

**Результат:**
- Папка `tutorials` не имеет своего `doc-config.yaml`
- Все файлы внутри `tutorials` отображаются автоматически
- Подпапка `advanced` также обрабатывается рекурсивно
- Порядок: алфавитный

### Пример 3: Смешанная структура

```
website/
├── doc-config.yaml
├── home.md
├── docs/
│   ├── doc-config.yaml  ← есть конфиг
│   ├── api.md
│   └── guide.md
└── examples/
    ├── example-1.md     ← нет конфига
    └── example-2.md
```

**website/doc-config.yaml:**
```yaml
hierarchy:
  - file: home.md
  - folder: docs
    title: "Documentation"
  - folder: examples
    title: "Examples"
```

**docs/doc-config.yaml:**
```yaml
hierarchy:
  - file: guide.md
    title: "User Guide"
  - file: api.md
    title: "API Reference"
```

**Результат:**
- `docs/` использует свой `doc-config.yaml` → файлы в указанном порядке
- `examples/` не имеет `doc-config.yaml` → все файлы автоматически

## API

### DocConfigProcessor

```javascript
const { DocConfigProcessor } = require('./components/docConfigProcessor');

const processor = new DocConfigProcessor('/path/to/root');
const result = processor.process();

// result содержит:
{
  tree: {...},           // Полное дерево структуры
  repositories: [...],   // Все найденные репозитории
  files: [...],          // Файлы из hierarchy
  allFiles: [...],       // Все отсканированные файлы
  allFolders: [...],     // Все отсканированные папки
  configs: [...]         // Все загруженные doc-config
}
```

### Методы

#### `loadDocConfig(dirPath)`
Загружает `doc-config.yaml` из указанной папки.

#### `scanDirectory(dirPath, relativePath)`
Сканирует папку и возвращает все `.md` файлы и подпапки.

#### `buildTreeForDirectory(dirPath, relativePath, parentConfig)`
Рекурсивно строит дерево структуры для папки.

#### `buildTreeFromHierarchy(hierarchy, dirPath, relativePath, config)`
Строит дерево на основе `hierarchy` из `doc-config.yaml`.

#### `buildTreeFromFileSystem(dirPath, relativePath, parentConfig)`
Строит дерево на основе файловой системы (когда нет `doc-config`).

#### `collectRepositories(tree)`
Собирает все репозитории из дерева.

#### `collectFiles(tree)`
Собирает все файлы из дерева (для индексации).

#### `process()`
Главный метод - обрабатывает всю структуру начиная с root.

#### `exportToHierarchyInfo(result, additionalData)`
Экспортирует результат в формат `hierarchy-info.json`.

#### `visualizeTree(tree, indent, isLast, showAll)`
Визуализирует дерево в консоль с цветовой маркировкой.

#### `getTreeStats(tree)`
Собирает статистику по дереву (количество файлов, папок, репозиториев и т.д.).

#### `isFileIgnored(fileName, config)`
Проверяет, игнорируется ли файл согласно настройкам `ignored` в конфиге.

## Игнорирование файлов

В `doc-config.yaml` можно указать файлы для игнорирования:

```yaml
hierarchy:
  - file: readme.md
  - file: guide.md

# Игнорируемые файлы
ignored:
  - draft.md
  - temp.md
  - "draft-*.md"  # wildcard
  - "*.draft.md"
```

Игнорируемые файлы:
- Помечаются 🚫 в визуализации
- Не конвертируются в HTML
- Не появляются в навигации
- Не учитываются в статистике активных файлов

## Интеграция с build-all-v3.js

```javascript
const { DocConfigProcessor } = require('./components/docConfigProcessor');

// Phase 1: Indexing
const docProcessor = new DocConfigProcessor(rootPath);
const docResult = docProcessor.process();

// docResult.tree содержит полную структуру
// docResult.repositories содержит все репозитории для скачивания
// docResult.files содержит файлы для конвертации
```

## Формат hierarchy-info.json

```json
{
  "root": {
    "hierarchy": [...]
  },
  "tree": {
    "type": "hierarchy",
    "children": [...]
  },
  "sections": {
    "guides": {...},
    "tutorials": {...}
  },
  "allFiles": [...],
  "allRepositories": [...],
  "configs": [...]
}
```

## Преимущества

1. **Гибкость**: Можно контролировать структуру через `doc-config.yaml` или полагаться на автоматическое сканирование
2. **Рекурсивность**: Вложенные папки могут иметь свои собственные конфигурации
3. **Целостность**: Одно дерево описывает всю структуру сайта
4. **Простота**: Если не нужен контроль - просто не создавайте `doc-config.yaml`

## Миграция

Существующие `doc-config.yaml` файлы работают без изменений. Новая система полностью обратно совместима.

### Что изменилось

- Теперь система **рекурсивно** обрабатывает все `doc-config.yaml`
- Папки без `doc-config.yaml` автоматически включают все файлы
- Дерево строится **один раз** и используется везде

### Что осталось прежним

- Формат `doc-config.yaml` не изменился
- `hierarchy-info.json` содержит те же данные + новое поле `tree`
- Навигация работает как раньше
