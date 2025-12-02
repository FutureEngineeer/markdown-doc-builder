# Quick Start: Hierarchy Visualization

## Что это?

При запуске `npm run build:all` система выводит визуальное дерево всех файлов с пометками:
- 📁 Папки с doc-config.yaml
- 📂 Автоматически сканируемые папки
- 📄 Файлы из doc-config
- 🚫 Игнорируемые файлы
- 📦 GitHub репозитории

## Пример вывода

```
📊 File hierarchy:

├─ 📋 Home [hierarchy]
├─ 📄 Documentation [hierarchy]
├─ 📁 Guides [doc-config]
│  ├─ 📋 Overview [hierarchy]
│  └─ 📄 Getting Started [hierarchy]
├─ 📂 Examples [auto-scanned]
│  ├─ 📄 Example 1 [auto-scanned]
│  └─ 🚫 draft.md [IGNORED]
└─ 📦 CLN Driver (cln) [REPOSITORY]

📈 Statistics:
   Files: 8 total
      ├─ 5 from doc-config
      ├─ 2 auto-scanned
      └─ 1 ignored
   Folders: 2 total
      ├─ 1 with doc-config
      └─ 1 auto-scanned
   Repositories: 1
```

## Как читать

### Цвета и badges
- **Зеленый** `[hierarchy]` - файл из doc-config.yaml
- **Голубой** `[auto-scanned]` - найдено автоматически
- **Желтый** `[doc-config]` - папка с doc-config.yaml
- **Пурпурный** `[REPOSITORY]` - GitHub репозиторий
- **Синий** `[SECTION]` - секция (группа)
- **Серый** `[IGNORED]` - игнорируется

### Иконки
- 📋 README файл
- 📄 Обычный файл
- 📁 Папка с конфигом
- 📂 Папка без конфига
- 🚫 Игнорируемый файл
- 📦 Репозиторий
- 📑 Секция

## Как игнорировать файлы

В `doc-config.yaml`:

```yaml
hierarchy:
  - file: readme.md
  - file: guide.md

ignored:
  - draft.md
  - "temp-*.md"
```

## Отладка

### Файл не появляется на сайте?
1. Проверьте визуализацию - есть ли файл в дереве?
2. Помечен ли он как `[IGNORED]`?
3. Находится ли он в папке с doc-config?
4. Указан ли он в hierarchy?
5. Если файл `[auto-scanned]` - он должен конвертироваться

### Неправильный порядок файлов?
1. Создайте doc-config.yaml в папке
2. Укажите порядок в hierarchy
3. Файлы будут в указанном порядке

### Слишком много файлов?
1. Добавьте ignored в doc-config.yaml
2. Файлы будут помечены 🚫 `[IGNORED]`
3. Они не будут конвертированы

## Примеры

### Контролировать порядок

**Было (auto-scanned):**
```
📂 docs [auto-scanned]
   ├─ 📄 advanced [auto-scanned]
   ├─ 📄 getting-started [auto-scanned]
   └─ 📄 intro [auto-scanned]
```

**Создайте docs/doc-config.yaml:**
```yaml
hierarchy:
  - file: intro.md
    title: "Introduction"
  - file: getting-started.md
    title: "Getting Started"
  - file: advanced.md
    title: "Advanced"
```

**Стало (controlled):**
```
📁 docs [doc-config]
   ├─ 📄 Introduction [hierarchy]
   ├─ 📄 Getting Started [hierarchy]
   └─ 📄 Advanced [hierarchy]
```

### Игнорировать черновики

**Было:**
```
📂 articles [auto-scanned]
   ├─ 📄 article-1 [auto-scanned]
   ├─ 📄 draft-article-2 [auto-scanned]
   └─ 📄 article-3 [auto-scanned]
```

**Создайте articles/doc-config.yaml:**
```yaml
ignored:
  - "draft-*.md"
```

**Стало:**
```
📁 articles [doc-config]
   ├─ 📄 article-1 [auto-scanned]
   ├─ 🚫 draft-article-2 [IGNORED]
   └─ 📄 article-3 [auto-scanned]
```

## Полезные ссылки

- [Полная документация](./DOC_CONFIG_PROCESSING.md)
- [Визуализация](./HIERARCHY_VISUALIZATION.md)
- [Changelog](./CHANGELOG_DOC_CONFIG.md)
