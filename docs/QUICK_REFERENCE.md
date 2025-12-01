# Быстрая справка

## 🚀 Основные команды

```bash
# Сборка сайта (аргумент обязателен!)
node build-all-v3.js <папка>

# Примеры
node build-all-v3.js website
node build-all-v3.js my-site
node build-all-v3.js docs

# Через npm (аргумент тоже обязателен!)
npm run build website
npm run build my-site
```

## 📁 Минимальная структура сайта

```
my-site/
├── config.yaml          # Настройки сайта
├── doc-config.yaml      # Структура меню
└── home.md              # Главная страница
```

## ⚙️ Минимальный config.yaml

```yaml
site:
  name: "My Site"
  title: "My Docs"
  baseUrl: "https://example.com"
  language: "en"

navigation:
  - text: "Home"
    url: "index.html"

footer:
  copyright:
    line1: "© 2024"
    line2: "My Name"
```

## 📋 Минимальный doc-config.yaml

```yaml
hierarchy:
  - file: home.md
    title: "Home"
    alias: home
```

## 🎯 Быстрое создание сайта

```bash
# 1. Создать папку
mkdir my-site && cd my-site

# 2. Создать файлы
cat > config.yaml << 'EOF'
site:
  name: "My Site"
  title: "My Docs"
  baseUrl: "https://example.com"
EOF

cat > doc-config.yaml << 'EOF'
hierarchy:
  - file: home.md
    title: "Home"
EOF

echo "# Welcome" > home.md

# 3. Собрать
cd .. && node build-all-v3.js my-site
```

## 📊 Результат сборки

```
dist/
├── index.html           # Главная (из home.md)
├── *.html               # Остальные страницы
├── assets/              # Ресурсы
└── 404.html             # Страницы ошибок
```

## 🔍 Проверка

```bash
# Структура
tree my-site

# Конфигурация
cat my-site/config.yaml

# Результат
ls -la dist/

# Отчет
cat .temp/build-report.json
```

## 📖 Документация

| Файл | Описание |
|------|----------|
| [БЫСТРЫЙ_СТАРТ.md](БЫСТРЫЙ_СТАРТ.md) | Краткое руководство |
| [CREATE_NEW_SITE.md](CREATE_NEW_SITE.md) | Создание сайта |
| [BUILD_USAGE.md](BUILD_USAGE.md) | Полное руководство |
| [COMMANDS.md](COMMANDS.md) | Все команды |
| [EXAMPLE_SITE_STRUCTURE.md](EXAMPLE_SITE_STRUCTURE.md) | Примеры структур |

## 🛠️ NPM команды

```bash
npm run build              # Сборка
npm run build:clean        # Сборка с очисткой
npm run build:optimized    # Сборка + оптимизация
npm run optimize           # Оптимизация
npm run cache:clear        # Очистка кеша
```

## 🎨 Структура с секциями

```yaml
# doc-config.yaml
hierarchy:
  - file: home.md
    title: "Home"
  
  - title: "Guides"
    section: true
    children:
      - folder: guides
  
  - title: "API"
    section: true
    children:
      - folder: api
```

## 🔗 С GitHub репозиториями

```yaml
# doc-config.yaml
hierarchy:
  - file: home.md
    title: "Home"
  
  - repository: "https://github.com/user/repo"
    alias: "my-repo"
    title: "My Repo"
```

## ⚠️ Типичные ошибки

| Ошибка | Решение |
|--------|---------|
| Root path does not exist | `mkdir my-site` |
| config.yaml not found | Создать config.yaml |
| No hierarchy defined | Добавить hierarchy в doc-config.yaml |
| File not found | Создать отсутствующий файл |

## 🔧 Отладка

```bash
# Логи
node build-all-v3.js my-site

# Отчет
cat .temp/build-report.json | jq

# Ссылки
cat .temp/link-map.json | jq

# Структура
cat .temp/hierarchy-info.json | jq
```

## 💡 Полезные команды

```bash
# Очистка и пересборка
rm -rf dist .temp && npm run build

# Сборка нескольких сайтов
for site in website docs blog; do
  node build-all-v3.js $site
done

# Проверка битых ссылок
cat .temp/link-map.json | jq '.broken'
```

## 🎓 Шаблоны

### Документация
```yaml
hierarchy:
  - file: home.md
  - file: installation.md
  - file: usage.md
  - file: api.md
```

### Блог
```yaml
hierarchy:
  - file: home.md
  - title: "Posts"
    section: true
    children:
      - folder: posts
```

### Портфолио
```yaml
hierarchy:
  - file: home.md
  - file: about.md
  - title: "Projects"
    section: true
    children:
      - folder: projects
```

## 📞 Помощь

1. Читайте [БЫСТРЫЙ_СТАРТ.md](БЫСТРЫЙ_СТАРТ.md)
2. Изучайте примеры в `website/`
3. Проверяйте `.temp/build-report.json`
4. Смотрите логи сборки

---

**Совет:** Начните с минимальной структуры, затем расширяйте по мере необходимости.
