# Создание нового сайта - Пошаговая инструкция

## Метод 1: Ручное создание (рекомендуется для понимания)

### Шаг 1: Создайте папку

```bash
mkdir my-site
cd my-site
```

### Шаг 2: Создайте config.yaml

```bash
cat > config.yaml << 'EOF'
site:
  name: "My Site"
  title: "My Documentation Site"
  description: "Documentation for my project"
  baseUrl: "https://example.com"
  language: "en"
  logoClickUrl: "index.html"

navigation:
  - text: "Home"
    url: "index.html"
  - text: "Docs"
    url: "docs.html"

footer:
  copyright:
    line1: "Copyright © 2024"
    line2: "My Company"

icons:
  site:
    logo: "./assets/logo.svg"
    favicon:
      ico: "./assets/favicon.png"

external:
  stylesheets:
    - href: "./assets/styles.css"
      type: "local"
  scripts: []
EOF
```

### Шаг 3: Создайте doc-config.yaml

```bash
cat > doc-config.yaml << 'EOF'
hierarchy:
  - file: home.md
    title: "Home"
    alias: home
  
  - file: docs.md
    title: "Documentation"
    alias: docs
EOF
```

### Шаг 4: Создайте home.md

```bash
cat > home.md << 'EOF'
# Welcome to My Site

This is the home page of my documentation site.

## Features

- Easy to use
- Fast build
- GitHub integration

## Getting Started

Check out the [documentation](docs.html) to learn more.
EOF
```

### Шаг 5: Создайте docs.md

```bash
cat > docs.md << 'EOF'
# Documentation

Complete documentation for my project.

## Installation

```bash
npm install
```

## Usage

```bash
npm run build
```

## Configuration

Edit `config.yaml` to customize your site.
EOF
```

### Шаг 6: Вернитесь в корень проекта и соберите сайт

```bash
cd ..
node build-all-v3.js my-site
```

### Шаг 7: Проверьте результат

```bash
ls -la dist/
```

Вы должны увидеть:
- `index.html` (из home.md)
- `docs.html` (из docs.md)
- `assets/` (ресурсы)
- `404.html`, `500.html` и другие страницы ошибок

---

## Метод 2: Копирование существующего сайта

### Шаг 1: Скопируйте структуру

```bash
cp -r website my-site
cd my-site
```

### Шаг 2: Отредактируйте config.yaml

Измените настройки сайта под ваши нужды:
- `site.name`
- `site.title`
- `site.description`
- `site.baseUrl`

### Шаг 3: Отредактируйте doc-config.yaml

Настройте структуру документации:
- Удалите ненужные файлы из `hierarchy`
- Добавьте свои файлы

### Шаг 4: Удалите ненужные файлы

```bash
# Удалите файлы, которые вам не нужны
rm -f *.md
```

### Шаг 5: Добавьте свои файлы

Создайте свои markdown файлы согласно структуре в `doc-config.yaml`

### Шаг 6: Соберите сайт

```bash
cd ..
node build-all-v3.js my-site
```

---

## Метод 3: Скрипт автоматического создания

### Создайте скрипт create-site.sh

```bash
cat > create-site.sh << 'SCRIPT'
#!/bin/bash

# Проверка аргументов
if [ -z "$1" ]; then
  echo "Usage: ./create-site.sh <site-name>"
  exit 1
fi

SITE_NAME=$1

# Создание папки
mkdir -p "$SITE_NAME"
cd "$SITE_NAME"

# Создание config.yaml
cat > config.yaml << 'EOF'
site:
  name: "SITE_NAME"
  title: "SITE_NAME Documentation"
  description: "Documentation for SITE_NAME"
  baseUrl: "https://example.com"
  language: "en"
  logoClickUrl: "index.html"

navigation:
  - text: "Home"
    url: "index.html"

footer:
  copyright:
    line1: "Copyright © 2024"
    line2: "Your Name"

icons:
  site:
    logo: "./assets/logo.svg"
    favicon:
      ico: "./assets/favicon.png"

external:
  stylesheets:
    - href: "./assets/styles.css"
      type: "local"
  scripts: []
EOF

# Замена SITE_NAME на реальное имя
sed -i "s/SITE_NAME/$SITE_NAME/g" config.yaml

# Создание doc-config.yaml
cat > doc-config.yaml << 'EOF'
hierarchy:
  - file: home.md
    title: "Home"
    alias: home
EOF

# Создание home.md
cat > home.md << 'EOF'
# Welcome

This is the home page.

## Getting Started

Start exploring the documentation.
EOF

cd ..

echo "✅ Site '$SITE_NAME' created successfully!"
echo "📝 Edit files in $SITE_NAME/"
echo "🚀 Build with: node build-all-v3.js $SITE_NAME"
SCRIPT

chmod +x create-site.sh
```

### Использование скрипта

```bash
./create-site.sh my-new-site
```

---

## Расширенная структура

### Создание сайта с подразделами

```bash
mkdir -p my-site/guides
mkdir -p my-site/api

# Создание основных файлов
cd my-site

# config.yaml и doc-config.yaml как в методе 1

# Создание файлов в подразделах
cat > guides/getting-started.md << 'EOF'
# Getting Started

Quick start guide.
EOF

cat > guides/doc-config.yaml << 'EOF'
hierarchy:
  - file: getting-started.md
    title: "Getting Started"
EOF

cat > api/reference.md << 'EOF'
# API Reference

Complete API documentation.
EOF

cat > api/doc-config.yaml << 'EOF'
hierarchy:
  - file: reference.md
    title: "API Reference"
EOF

# Обновление корневого doc-config.yaml
cat > doc-config.yaml << 'EOF'
hierarchy:
  - file: home.md
    title: "Home"
  
  - title: "Guides"
    section: true
    children:
      - title: "Getting Started"
        folder: guides
  
  - title: "API"
    section: true
    children:
      - title: "Reference"
        folder: api
EOF

cd ..
node build-all-v3.js my-site
```

---

## Создание сайта с GitHub репозиториями

```bash
mkdir my-site
cd my-site

# config.yaml как обычно

# doc-config.yaml с репозиториями
cat > doc-config.yaml << 'EOF'
hierarchy:
  - file: home.md
    title: "Home"
  
  - repository: "https://github.com/username/repo1"
    alias: "repo1"
    title: "Repository 1"
  
  - repository: "https://github.com/username/repo2"
    alias: "repo2"
    title: "Repository 2"
EOF

cat > home.md << 'EOF'
# Welcome

Documentation with GitHub repositories.

## Repositories

- [Repository 1](repo1/index.html)
- [Repository 2](repo2/index.html)
EOF

cd ..
node build-all-v3.js my-site
```

---

## Проверка созданного сайта

### Проверка структуры

```bash
tree my-site
```

Должно быть:
```
my-site/
├── config.yaml
├── doc-config.yaml
└── home.md
```

### Проверка конфигурации

```bash
# Проверить config.yaml
cat my-site/config.yaml

# Проверить doc-config.yaml
cat my-site/doc-config.yaml
```

### Проверка сборки

```bash
# Собрать сайт
node build-all-v3.js my-site

# Проверить результат
ls -la dist/
```

### Проверка отчетов

```bash
# Отчет о сборке
cat .temp/build-report.json | jq

# Структура файлов
cat .temp/hierarchy-info.json | jq
```

---

## Типичные ошибки и решения

### Ошибка: "Root path does not exist"

**Причина:** Папка не существует

**Решение:**
```bash
mkdir my-site
```

### Ошибка: "config.yaml not found"

**Причина:** Отсутствует config.yaml

**Решение:**
```bash
cd my-site
# Создайте config.yaml
```

### Ошибка: "No hierarchy defined"

**Причина:** Отсутствует doc-config.yaml или пустой hierarchy

**Решение:**
```bash
cd my-site
# Создайте doc-config.yaml с hierarchy
```

### Предупреждение: "File not found in hierarchy"

**Причина:** Файл указан в hierarchy, но не существует

**Решение:**
```bash
# Создайте отсутствующий файл
touch my-site/missing-file.md
```

---

## Шаблоны для разных типов сайтов

### Документация проекта

```yaml
# doc-config.yaml
hierarchy:
  - file: home.md
    title: "Home"
  - file: installation.md
    title: "Installation"
  - file: usage.md
    title: "Usage"
  - file: api.md
    title: "API Reference"
  - file: faq.md
    title: "FAQ"
```

### Блог

```yaml
# doc-config.yaml
hierarchy:
  - file: home.md
    title: "Home"
  - title: "Posts"
    section: true
    children:
      - folder: posts
```

### Портфолио

```yaml
# doc-config.yaml
hierarchy:
  - file: home.md
    title: "Home"
  - file: about.md
    title: "About"
  - title: "Projects"
    section: true
    children:
      - folder: projects
  - file: contact.md
    title: "Contact"
```

### Учебные материалы

```yaml
# doc-config.yaml
hierarchy:
  - file: home.md
    title: "Home"
  - title: "Lessons"
    section: true
    children:
      - folder: lesson-1
      - folder: lesson-2
      - folder: lesson-3
  - file: exercises.md
    title: "Exercises"
```

---

## Следующие шаги

После создания сайта:

1. **Настройте стили**
   - Отредактируйте CSS в `assets/styles.css`
   - Добавьте свои цвета и шрифты

2. **Добавьте контент**
   - Создайте markdown файлы
   - Добавьте изображения в `assets/images/`

3. **Настройте навигацию**
   - Обновите `navigation` в config.yaml
   - Добавьте ссылки на важные страницы

4. **Добавьте аналитику**
   - Настройте Google Analytics в config.yaml
   - Добавьте другие инструменты отслеживания

5. **Деплой**
   - Настройте GitHub Pages или Netlify
   - Обновите `baseUrl` в config.yaml

---

## Полезные ссылки

- [BUILD_USAGE.md](BUILD_USAGE.md) - подробное руководство
- [EXAMPLE_SITE_STRUCTURE.md](EXAMPLE_SITE_STRUCTURE.md) - примеры структур
- [БЫСТРЫЙ_СТАРТ.md](БЫСТРЫЙ_СТАРТ.md) - краткое руководство
- [COMMANDS.md](COMMANDS.md) - справочник команд
