# Система конфигурации через config.yaml

Теперь за билд отвечает файл `config.yaml`. В этом файле можно настроить все аспекты сайта и процесса сборки.

## Структура конфигурации

### Основные настройки сайта
```yaml
site:
  name: "CREAPUNK"                    # Название сайта
  title: "Documentation Builder"      # Заголовок сайта
  description: "Описание сайта"       # Описание для meta тегов
  baseUrl: "https://your-site.com"    # Базовый URL сайта
  language: "ru"                      # Язык сайта
  logoClickUrl: "/"                   # Ссылка при клике на лого
```

### Навигация
```yaml
navigation:
  - text: "Проекты"                   # Текст ссылки
    url: "#projects"                  # URL ссылки
  - text: "Документация"
    url: "#documentation"
  - text: "API"
    url: "test-files/sub/api.html"    # Можно указать путь к файлу
```

### Социальные ссылки
```yaml
socials:
  email: "your@email.com"
  github: "https://github.com/your-username"
  youtube: "https://youtube.com/@your-channel"
  discord: "https://discord.gg/your-server"
  kofi: "https://ko-fi.com/creapunk"
```

### Пути к иконкам
```yaml
icons:
  # Иконки сайта
  site:
    logo: "./assets/creapunk-icon.svg"
    favicon:
      ico: "./assets/creapunk-icon.png"
      svg: "./assets/creapunk-icon.svg"
      appleTouchIcon: "./assets/creapunk-icon.png"
      manifest: "/manifest.webmanifest"
  
  # Иконки социальных сетей (встроенные SVG)
  social:
    email: "assets/email.svg"
    github: "assets/github.svg"
    youtube: "assets/youtube.svg"
    discord: "assets/discord.svg"
    kofi: "assets/kofi.svg"
```

### Внешние ресурсы
```yaml
external:
  # CSS файлы
  stylesheets:
    - href: "assets/styles.css"       # Локальный файл
      type: "local"
    - href: "https://cdn.example.com/style.css"  # CDN
      type: "cdn"
      integrity: "sha384-..."        # Опционально для CDN

  # JavaScript файлы
  scripts:
    - src: "assets/script.js"
      type: "local"
      defer: true                    # Опционально
    - src: "https://cdn.example.com/script.js"
      type: "cdn"
      defer: false
```

### Ключевые слова для парсинга секций
```yaml
sections:
  keywords:
    overview: ["project overview", "product overview", "обзор проекта"]
    features: ["features", "возможности", "функции"]
    specifications: ["specifications", "specs", "характеристики"]
    applications: ["applications", "usage", "применение"]
    resources: ["resources", "ресурсы"]
    examples: ["examples", "примеры"]
    guide: ["guide", "руководство", "инструкция"]
```

### Настройки билда
```yaml
build:
  # Список разрешенных репозиториев для парсинга
  allowedRepositories:
    - "https://github.com/creapunk/CLN-ClosedLoopNemaDriver"
    - "https://github.com/creapunk/RadiX"
  
  # Входные файлы и папки
  input:
    # Основные файлы для парсинга
    files:
      - "./test-files/main.md"
      - "./test-files/root.md"
      # ... другие файлы
    
    # Папки для парсинга
    directories:
      - "./test-files"
      - "./test-files/project-alpha"
    
    # GitHub репозитории для скачивания
    githubRepositories:
      - url: "https://github.com/creapunk/CLN-ClosedLoopNemaDriver"
        description: "Closed-loop drivers for NEMA motors"
        alias: "CLN"  # Псевдоним для сокращения длинного названия (опционально)
      - url: "https://github.com/creapunk/RadiX"
        description: "RadiX project"
        alias: "RadiX"  # Псевдоним может совпадать с названием

    # Псевдонимы репозиториев (alias):
    # - Если указан alias, он используется для создания папок и ссылок вместо полного названия
    # - Без alias: создается папка "creapunk-CLN-ClosedLoopNemaDriver"
    # - С alias "CLN": создается папка "CLN"
    # - Это особенно полезно для длинных названий репозиториев

  # Выходные настройки
  output:
    directory: "./dist"
    copyAssets: true
    assetsDir: "./assets"
```

### Настройки обработки ссылок
```yaml
linkProcessing:
  # Если ссылка ведет на .md файл репозитория, которого НЕТ в allowedRepositories,
  # то ссылка остается неизменной на исходный файл в репозитории
  preserveExternalLinks: true
  # Конвертировать .md ссылки в .html для разрешенных репозиториев
  convertMdToHtml: true
  # Базовый путь для относительных ссылок
  basePath: "./"
```

## Логика обработки ссылок

### Разрешенные репозитории
Если ссылка ведет на `.md` файл в репозитории, который есть в списке `allowedRepositories`, то:
- Ссылка конвертируется в локальную HTML ссылку
- Файл должен быть скачан и обработан системой

### Неразрешенные репозитории
Если ссылка ведет на `.md` файл в репозитории, которого НЕТ в списке `allowedRepositories`, то:
- Ссылка остается неизменной (ведет на исходный файл в GitHub)
- Пользователь будет перенаправлен на GitHub

### Локальные ссылки
Локальные ссылки на `.md` файлы автоматически конвертируются в `.html` ссылки.

## Обратная совместимость

Система поддерживает обратную совместимость с `export-config.yaml`. Если `config.yaml` не найден, система попытается использовать `export-config.yaml` как fallback.

## Использование

1. Создайте или отредактируйте файл `config.yaml` в корне проекта
2. Настройте все необходимые параметры
3. Запустите билд: `node build-all.js`

Система автоматически загрузит конфигурацию и применит все настройки при сборке сайта.