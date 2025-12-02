# Hierarchy Visualization

## Обзор

При сборке система выводит визуализацию иерархии файлов с пометками о типе каждого элемента.

## Пример вывода

```
📂 Phase 1: Indexing all files...

   ✓ Processed 3 doc-config files
   ✓ Found 12 files in hierarchy
   ✓ Found 2 repositories
   ✓ Total scanned: 18 files, 5 folders

📊 File hierarchy:

├─ 📋 Home [hierarchy]
├─ 📄 Documentation [hierarchy]
├─ 📁 Guides [doc-config]
│  ├─ 📋 Overview [hierarchy]
│  ├─ 📄 Getting Started [hierarchy]
│  └─ 📄 Advanced Topics [hierarchy]
├─ 📂 Examples [auto-scanned]
│  ├─ 📄 Example 1 [auto-scanned]
│  ├─ 📄 Example 2 [auto-scanned]
│  └─ 🚫 draft.md [IGNORED]
├─ 📦 CLN Driver (cln) [REPOSITORY]
└─ 📑 Projects [SECTION]
   ├─ 📁 Project Alpha [doc-config]
   │  └─ 📋 Overview [hierarchy]
   └─ 📁 Project Beta [doc-config]
      ├─ 📋 Overview [hierarchy]
      ├─ 📄 API Reference [hierarchy]
      └─ 📦 RadiX Project (radix) [REPOSITORY]

📈 Statistics:
   Files: 15 total
      ├─ 10 from doc-config
      ├─ 4 auto-scanned
      └─ 1 ignored
   Folders: 5 total
      ├─ 3 with doc-config
      └─ 2 auto-scanned
   Repositories: 2
   Sections: 1

Legend:
  Icons:
    📋 README file
    📄 Regular file
    📁 Folder with doc-config.yaml
    📂 Folder (auto-scanned)
    📦 GitHub repository
    📑 Section (group)
    🚫 Ignored file

  Badges:
    [hierarchy] - Defined in doc-config.yaml
    [auto-scanned] - Found automatically
    [doc-config] - Folder with doc-config.yaml
    [REPOSITORY] - GitHub repository
    [SECTION] - Section container
    [IGNORED] - Ignored by config
```

## Иконки

### Файлы
- **📋** - README файл (readme.md, index.md)
- **📄** - Обычный markdown файл
- **🚫** - Игнорируемый файл (из `ignored` в doc-config)

### Папки
- **📁** - Папка с `doc-config.yaml` (структура контролируется)
- **📂** - Папка без конфига (автоматическое сканирование)

### Специальные
- **📦** - GitHub репозиторий
- **📑** - Секция (группа элементов)

## Цветовая маркировка

### Green (зеленый)
```
📄 Documentation [hierarchy]
```
Файлы явно указанные в hierarchy doc-config.yaml

### Cyan (голубой)
```
📂 Examples [auto-scanned]
   ├─ 📄 Example 1 [auto-scanned]
```
Элементы, которые были найдены автоматически (нет в doc-config.yaml)

### Yellow (желтый)
```
📁 Guides [doc-config]
```
Папки с собственным doc-config.yaml

### Magenta (пурпурный)
```
📦 CLN Driver (cln) [REPOSITORY]
```
GitHub репозитории

### Blue (синий)
```
📑 Projects [SECTION]
```
Секции (группы элементов)

### Gray (серый)
```
🚫 draft.md [IGNORED]
```
Игнорируемые файлы (не будут конвертированы)

## Статистика

### Files
- **total** - общее количество файлов
- **from doc-config** - файлы явно указанные в hierarchy
- **auto-scanned** - файлы найденные автоматически
- **ignored** - игнорируемые файлы

### Folders
- **total** - общее количество папок
- **with doc-config** - папки с собственным doc-config.yaml
- **auto-scanned** - папки без конфига

### Repositories
Количество GitHub репозиториев в структуре

### Sections
Количество секций (групп элементов)

## Использование

### Проверка структуры
Визуализация помогает:
- Убедиться, что все файлы найдены
- Проверить порядок элементов
- Увидеть какие файлы игнорируются
- Понять где применяется doc-config

### Отладка
Если файл не появляется на сайте:
1. Проверьте, есть ли он в визуализации
2. Проверьте, не помечен ли он как `(ignored)`
3. Проверьте, в какой папке он находится
4. Проверьте, есть ли doc-config в родительской папке

### Оптимизация
- Если много `(auto)` файлов - возможно стоит создать doc-config
- Если много `(ignored)` файлов - проверьте настройки ignored
- Если структура не та, что ожидалась - проверьте hierarchy в doc-config

## Настройка ignored

В `doc-config.yaml`:

```yaml
# Игнорировать конкретные файлы
ignored:
  - draft.md
  - temp.md

# Или с wildcard
ignored:
  - "draft-*.md"
  - "temp-*.md"
  - "*.draft.md"
```

Игнорируемые файлы:
- Отображаются в визуализации с 🚫
- Не конвертируются в HTML
- Не появляются в навигации
- Не учитываются в статистике активных файлов

## Примеры паттернов

### Простая структура (все auto)
```
📂 docs (auto)
   ├─ 📄 page1 (auto)
   ├─ 📄 page2 (auto)
   └─ 📄 page3 (auto)
```
Нет doc-config.yaml - все файлы автоматически

### Контролируемая структура
```
📁 docs (doc-config)
   ├─ 📄 Introduction
   ├─ 📄 Getting Started
   └─ 📄 Advanced
```
Есть doc-config.yaml - порядок контролируется

### Смешанная структура
```
📁 docs (doc-config)
   ├─ 📄 Introduction
   ├─ 📂 examples (auto)
   │  ├─ 📄 example1 (auto)
   │  └─ 📄 example2 (auto)
   └─ 📄 Conclusion
```
Главная папка контролируется, подпапка автоматическая

### С игнорированием
```
📁 docs (doc-config)
   ├─ 📄 Published Article
   ├─ 🚫 draft-article.md (ignored)
   └─ 🚫 temp-notes.md (ignored)
```
Черновики игнорируются
