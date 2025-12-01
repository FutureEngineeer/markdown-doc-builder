# Справочник команд

## Основные команды

### Сборка сайта

```bash
# Базовая команда
node build-all-v3.js <путь-к-папке>

# Примеры
node build-all-v3.js website
node build-all-v3.js docs-site
node build-all-v3.js my-project
```

### NPM скрипты

```bash
# Стандартная сборка (website)
npm run build

# Сборка всех файлов
npm run build:all

# Сборка для Netlify
npm run build:netlify

# Сборка с очисткой
npm run build:clean

# Сборка с оптимизацией
npm run build:optimized
```

## Оптимизация

```bash
# Оптимизация файлов
npm run optimize

# Оптимизация изображений
npm run optimize:images

# Умная оптимизация изображений
npm run optimize:images:smart

# Анализ и оптимизация
npm run optimize:analyze

# Только анализ
npm run analyze
```

## Кеш

```bash
# Очистить кеш
npm run cache:clear

# Информация о кеше
npm run cache:info
```

## Тестирование

```bash
# Тестовая сборка
npm run build:test

# Проверка индекса
npm run index:check

# Тест поиска
npm run search:test

# Тест оптимизации изображений
npm run test:images
```

## Служебные команды

```bash
# Генерация страниц ошибок
npm run errors:generate
```

## Параметры командной строки

### build-all-v3.js

```bash
node build-all-v3.js <root-path>
```

**Параметры:**
- `root-path` - путь к корневой папке сайта (обязательный параметр)

**Примеры:**
```bash
# Указать папку сайта
node build-all-v3.js website

# Указать другую папку
node build-all-v3.js my-docs

# Относительный путь
node build-all-v3.js ./sites/main

# Абсолютный путь
node build-all-v3.js C:\projects\my-site
```

## Выходные файлы

После выполнения команд создаются следующие файлы:

### dist/
```
dist/
├── index.html              # Главная страница
├── *.html                  # Остальные страницы
├── assets/                 # Ресурсы (CSS, JS, изображения)
├── 404.html                # Страница не найдена
├── 500.html                # Ошибка сервера
└── ...                     # Другие страницы ошибок
```

### .temp/
```
.temp/
├── link-map.json           # Карта всех ссылок
├── build-report.json       # Отчет о сборке
├── hierarchy-info.json     # Структура файлов
├── image-index.json        # Индекс изображений
├── image-optimization-cache.json  # Кеш оптимизации
└── repos-cache.json        # Кеш репозиториев
```

## Переменные окружения

```bash
# Установить уровень логирования
export LOG_LEVEL=debug

# Отключить кеширование
export NO_CACHE=true

# Принудительная загрузка репозиториев
export FORCE_DOWNLOAD=true
```

## Примеры использования

### Создание нового сайта

```bash
# 1. Создать структуру
mkdir my-new-site
cd my-new-site

# 2. Создать конфигурацию
cat > config.yaml << EOF
site:
  name: "My Site"
  title: "My Documentation"
EOF

cat > doc-config.yaml << EOF
hierarchy:
  - file: home.md
    title: "Home"
EOF

cat > home.md << EOF
# Welcome
This is my site.
EOF

# 3. Вернуться в корень проекта
cd ..

# 4. Собрать сайт
node build-all-v3.js my-new-site
```

### Сборка нескольких сайтов

```bash
# Сборка основного сайта
node build-all-v3.js website

# Сборка документации
node build-all-v3.js docs

# Сборка блога
node build-all-v3.js blog
```

### Автоматизация

```bash
# Создать скрипт для сборки всех сайтов
cat > build-all-sites.sh << 'EOF'
#!/bin/bash
sites=("website" "docs" "blog")
for site in "${sites[@]}"; do
  echo "Building $site..."
  node build-all-v3.js "$site"
done
EOF

chmod +x build-all-sites.sh
./build-all-sites.sh
```

### CI/CD интеграция

#### GitHub Actions

```yaml
name: Build Sites
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: node build-all-v3.js website
      - run: node build-all-v3.js docs
```

#### Netlify

```toml
[build]
  command = "node build-all-v3.js website"
  publish = "dist"
```

## Отладка

### Проверка конфигурации

```bash
# Проверить config.yaml
cat website/config.yaml

# Проверить doc-config.yaml
cat website/doc-config.yaml
```

### Просмотр отчетов

```bash
# Отчет о сборке
cat .temp/build-report.json | jq

# Карта ссылок
cat .temp/link-map.json | jq

# Структура файлов
cat .temp/hierarchy-info.json | jq
```

### Поиск ошибок

```bash
# Проверить битые ссылки
cat .temp/link-map.json | jq '.broken'

# Проверить предупреждения
cat .temp/build-report.json | jq '.warnings'

# Проверить ошибки
cat .temp/build-report.json | jq '.errors'
```

## Полезные комбинации

```bash
# Очистка и сборка
npm run cache:clear && npm run build

# Сборка и оптимизация
npm run build && npm run optimize

# Полная пересборка
rm -rf dist .temp && npm run build

# Сборка с проверкой
npm run build && npm run index:check

# Сборка и тест поиска
npm run build && npm run search:test
```

## Горячие клавиши (если используется watch mode)

```bash
# Запустить в режиме наблюдения (требует nodemon)
npx nodemon --watch website --exec "node build-all-v3.js website"

# Ctrl+C - остановить
# Ctrl+R - перезапустить
```

## Справка

```bash
# Показать версию Node.js
node --version

# Показать версию npm
npm --version

# Показать установленные пакеты
npm list --depth=0

# Обновить зависимости
npm update

# Проверить устаревшие пакеты
npm outdated
```
