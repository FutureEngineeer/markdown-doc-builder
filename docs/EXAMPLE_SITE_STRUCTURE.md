# Пример структуры нового сайта

## Минимальная структура

```
my-site/
├── config.yaml          # Обязательно: конфигурация сайта
├── doc-config.yaml      # Обязательно: структура документации
└── home.md              # Обязательно: главная страница
```

## Минимальный config.yaml

```yaml
# config.yaml
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
```

## Минимальный doc-config.yaml

```yaml
# doc-config.yaml
hierarchy:
  - file: home.md
    title: "Home"
    alias: home
```

## Минимальный home.md

```markdown
# Welcome to My Site

This is the home page of my documentation site.

## Getting Started

Start exploring the documentation using the navigation menu.
```

## Команда для сборки

```bash
node build-all-v3.js my-site
```

## Результат

```
dist/
├── index.html           # Из home.md
├── assets/              # Скопированные ресурсы
├── 404.html             # Автоматически сгенерированные
├── 500.html
└── error.html
```

---

## Расширенная структура

```
my-site/
├── config.yaml
├── doc-config.yaml
├── home.md
├── about.md
├── docs.md
├── guides/
│   ├── doc-config.yaml
│   ├── getting-started.md
│   └── advanced.md
└── api/
    ├── doc-config.yaml
    ├── overview.md
    └── reference.md
```

## Расширенный doc-config.yaml

```yaml
# doc-config.yaml (корневой)
hierarchy:
  # Главная страница
  - file: home.md
    title: "Home"
    alias: home
  
  # Обычные страницы
  - file: about.md
    title: "About"
    alias: about
  
  - file: docs.md
    title: "Documentation"
    alias: docs
  
  # Секция Guides
  - title: "Guides"
    alias: guides
    section: true
    children:
      - title: "Getting Started"
        alias: getting-started
        folder: guides
      - title: "API Reference"
        alias: api
        folder: api

# Игнорируемые файлы
ignored:
  - "README.md"
  - "CONTRIBUTING.md"
```

## doc-config.yaml для подпапки guides/

```yaml
# guides/doc-config.yaml
hierarchy:
  - file: getting-started.md
    title: "Getting Started"
    alias: getting-started
  
  - file: advanced.md
    title: "Advanced Topics"
    alias: advanced
```

## Структура с GitHub репозиториями

```yaml
# doc-config.yaml
hierarchy:
  - file: home.md
    title: "Home"
    alias: home
  
  # Подключение GitHub репозитория
  - repository: "https://github.com/username/my-repo"
    alias: "my-repo"
    title: "My Repository Docs"
  
  - title: "Projects"
    alias: projects
    section: true
    children:
      - repository: "https://github.com/username/project-a"
        alias: "project-a"
        title: "Project A"
      
      - repository: "https://github.com/username/project-b"
        alias: "project-b"
        title: "Project B"
```

## Результат расширенной структуры

```
dist/
├── index.html              # home.md
├── about.html              # about.md
├── docs.html               # docs.md
├── guides/
│   ├── getting-started.html
│   └── advanced.html
├── api/
│   ├── overview.html
│   └── reference.html
├── my-repo/                # GitHub репозиторий
│   ├── index.html
│   └── ...
├── project-a/              # GitHub репозиторий
│   └── ...
├── project-b/              # GitHub репозиторий
│   └── ...
└── assets/
```

---

## Быстрый старт

### Шаг 1: Создайте структуру

```bash
mkdir my-site
cd my-site
```

### Шаг 2: Создайте config.yaml

```bash
cat > config.yaml << 'EOF'
site:
  name: "My Site"
  title: "My Documentation"
  description: "My project documentation"
  baseUrl: "https://example.com"
  language: "en"
  logoClickUrl: "index.html"

navigation:
  - text: "Home"
    url: "index.html"

footer:
  copyright:
    line1: "Copyright © 2024"
    line2: "My Name"

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
EOF
```

### Шаг 4: Создайте home.md

```bash
cat > home.md << 'EOF'
# Welcome

This is my documentation site.

## Features

- Easy to use
- Fast build
- GitHub integration

## Getting Started

Start by exploring the documentation.
EOF
```

### Шаг 5: Запустите сборку

```bash
cd ..
node build-all-v3.js my-site
```

### Шаг 6: Проверьте результат

```bash
ls -la dist/
```

Вы должны увидеть:
- `index.html` - ваша главная страница
- `assets/` - ресурсы
- `404.html`, `500.html`, `error.html` - страницы ошибок

---

## Советы по организации

### 1. Используйте понятные alias

```yaml
- file: getting-started.md
  title: "Getting Started Guide"
  alias: getting-started  # URL будет /getting-started.html
```

### 2. Группируйте связанные страницы

```yaml
- title: "Tutorials"
  section: true
  children:
    - folder: tutorials
```

### 3. Используйте ignored для служебных файлов

```yaml
ignored:
  - "README.md"
  - "CHANGELOG.md"
  - "CONTRIBUTING.md"
```

### 4. Структурируйте по темам

```
my-site/
├── getting-started/
├── tutorials/
├── api-reference/
└── examples/
```

### 5. Используйте подконфигурации

Каждая подпапка может иметь свой `doc-config.yaml` для управления структурой внутри секции.
