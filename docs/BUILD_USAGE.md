# Руководство по использованию системы сборки

## Обзор

Система сборки статического сайта теперь поддерживает указание корневой папки через аргумент командной строки. Это позволяет создавать несколько независимых сайтов в одном проекте.

## Структура проекта

```
project/
├── build-all-v3.js          # Основной скрипт сборки
├── package.json             # Конфигурация npm
├── components/              # Модули системы сборки
├── assets/                  # Общие ресурсы (CSS, JS, изображения)
├── website/                 # Корневая папка сайта #1
│   ├── config.yaml         # Конфигурация сайта
│   ├── doc-config.yaml     # Структура документации
│   ├── home.md             # Главная страница
│   └── ...                 # Другие файлы
└── another-site/           # Корневая папка сайта #2
    ├── config.yaml
    ├── doc-config.yaml
    └── ...
```

## Использование

### Базовая команда

```bash
node build-all-v3.js <root-path>
```

**⚠️ Важно:** Аргумент `<root-path>` обязателен!

### Примеры

```bash
# Сборка сайта из папки website
node build-all-v3.js website

# Сборка сайта из другой папки
node build-all-v3.js another-site

# Сборка из текущей папки
node build-all-v3.js .
```

### NPM скрипты

```bash
# Стандартная сборка (использует website)
npm run build

# Сборка с очисткой
npm run build:clean

# Сборка с оптимизацией
npm run build:optimized
```

## Конфигурация корневой папки

### Обязательные файлы

1. **config.yaml** - основная конфигурация сайта
   - Настройки сайта (название, описание, URL)
   - Навигация
   - Социальные ссылки
   - Иконки
   - Внешние ресурсы (CSS, JS)
   - Аналитика

2. **doc-config.yaml** - структура документации
   - Иерархия страниц
   - Порядок отображения в меню
   - Репозитории GitHub
   - Секции и подразделы

### Пример config.yaml

```yaml
# Основные настройки сайта
site:
  name: "My Site"
  title: "My Documentation"
  description: "Site description"
  baseUrl: "https://example.com"
  language: "en"
  logoClickUrl: "index.html"

# Навигация
navigation:
  - text: "Home"
    url: "index.html"
  - text: "Docs"
    url: "docs.html"

# Социальные ссылки
socials:
  - name: "github"
    label: "GitHub"
    url: "https://github.com/username"
    icon: "assets/github.svg"

# Footer
footer:
  copyright:
    line1: "Copyright © 2024"
    line2: "Your Name"

# Иконки
icons:
  site:
    logo: "./assets/logo.svg"
    favicon:
      ico: "./assets/favicon.png"

# Внешние ресурсы
external:
  stylesheets:
    - href: "./assets/styles.css"
      type: "local"
  scripts:
    - src: "./assets/script.js"
      type: "local"
      defer: true
```

### Пример doc-config.yaml

```yaml
# Иерархия страниц
hierarchy:
  # Главная страница
  - file: home.md
    title: "Главная"
    alias: home
  
  # Обычная страница
  - file: docs.md
    title: "Документация"
    alias: docs
  
  # GitHub репозиторий
  - repository: "https://github.com/user/repo"
    alias: "my-repo"
    title: "My Repository"
  
  # Секция с подстраницами
  - title: "Guides"
    alias: guides
    section: true
    children:
      - title: "Getting Started"
        alias: getting-started
        folder: getting-started
      - title: "Advanced"
        alias: advanced
        folder: advanced

# Игнорируемые файлы (не показываются в меню)
ignored:
  - "contributing.md"
  - "changelog.md"
```

## Процесс сборки

### Фаза 1: Индексация файлов
- Сканирование всех .md файлов в корневой папке
- Загрузка GitHub репозиториев
- Создание индекса всех файлов

### Фаза 2: Построение структуры
- Анализ иерархии из doc-config.yaml
- Создание структуры навигации
- Определение путей вывода

### Фаза 3: Генерация файлов
- Конвертация Markdown в HTML
- Обработка ссылок
- Копирование изображений
- Применение шаблонов

### Фаза 4: Генерация служебных страниц
- Страницы ошибок (404, 500)
- Карта ссылок
- Отчет о сборке

## Выходные файлы

```
dist/
├── index.html              # Главная страница (из home.md)
├── docs.html               # Обычные страницы
├── my-repo/                # Репозиторий GitHub
│   ├── index.html
│   └── ...
├── guides/                 # Секции
│   ├── getting-started/
│   └── advanced/
├── assets/                 # Ресурсы
│   ├── styles.css
│   ├── scripts/
│   └── images/
├── 404.html                # Страницы ошибок
├── 500.html
└── error.html

.temp/
├── link-map.json           # Карта всех ссылок
├── build-report.json       # Отчет о сборке
└── hierarchy-info.json     # Структура файлов
```

## Создание нового сайта

1. Создайте новую папку для сайта:
```bash
mkdir my-new-site
cd my-new-site
```

2. Создайте `config.yaml` с настройками сайта

3. Создайте `doc-config.yaml` со структурой документации

4. Добавьте markdown файлы (например, `home.md`)

5. Запустите сборку:
```bash
node build-all-v3.js my-new-site
```

## Множественные сайты

Вы можете создать несколько независимых сайтов в одном проекте:

```
project/
├── site-en/
│   ├── config.yaml
│   ├── doc-config.yaml
│   └── home.md
├── site-ru/
│   ├── config.yaml
│   ├── doc-config.yaml
│   └── home.md
└── site-docs/
    ├── config.yaml
    ├── doc-config.yaml
    └── home.md
```

Сборка каждого сайта:
```bash
node build-all-v3.js site-en
node build-all-v3.js site-ru
node build-all-v3.js site-docs
```

## Советы

1. **Используйте относительные пути** в config.yaml для ресурсов
2. **Структурируйте файлы** по папкам для лучшей организации
3. **Используйте alias** для коротких и понятных URL
4. **Проверяйте отчеты** в .temp/ для отладки ссылок
5. **Игнорируйте служебные файлы** через ignored в doc-config.yaml

## Отладка

### Проверка структуры
```bash
# Просмотр иерархии файлов
cat .temp/hierarchy-info.json
```

### Проверка ссылок
```bash
# Просмотр карты ссылок
cat .temp/link-map.json
```

### Проверка отчета сборки
```bash
# Просмотр статистики
cat .temp/build-report.json
```

## Миграция существующих проектов

Если у вас уже есть проект со старой структурой:

1. Создайте папку для сайта (например, `website`)
2. Переместите туда все .md файлы
3. Создайте `config.yaml` и `doc-config.yaml`
4. Обновите пути в конфигурации
5. Запустите сборку с новым путем

## Поддержка

При возникновении проблем:
1. Проверьте наличие config.yaml в корневой папке
2. Убедитесь, что doc-config.yaml содержит hierarchy
3. Проверьте пути к файлам в hierarchy
4. Просмотрите логи сборки для ошибок
5. Проверьте .temp/build-report.json для деталей
