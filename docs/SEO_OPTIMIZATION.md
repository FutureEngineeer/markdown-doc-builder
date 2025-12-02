# SEO Оптимизация

## Обзор

Сайт теперь полностью оптимизирован для поисковых систем с автоматической генерацией всех необходимых файлов и мета-тегов.

## Реализованные функции

### 1. robots.txt
- Автоматически копируется в `dist/` при сборке
- Разрешает индексацию всех страниц
- Блокирует служебные директории (.temp, .git, node_modules)
- Содержит ссылку на sitemap.xml

**Расположение:** `robots.txt` (корень проекта)

### 2. sitemap.xml
- Автоматически генерируется при каждой сборке
- Включает все HTML страницы из dist/
- Исключает страницы ошибок (400.html, 404.html и т.д.)
- Содержит приоритеты и частоту обновления для каждой страницы

**Приоритеты:**
- Главная страница (index.html в корне): 1.0, weekly
- Индексные страницы разделов: 0.8, weekly
- Руководства и туториалы: 0.7, monthly
- Остальные страницы: 0.5, monthly

**Генератор:** `components/sitemapGenerator.js`

### 3. Мета-теги для SEO

Каждая страница автоматически получает:

#### Базовые мета-теги:
- `<meta name="description">` - описание страницы
- `<meta name="keywords">` - ключевые слова
- `<meta name="author">` - автор (название сайта)

#### Open Graph (для социальных сетей):
- `og:type` - тип контента (website)
- `og:site_name` - название сайта
- `og:title` - заголовок страницы
- `og:description` - описание
- `og:url` - URL страницы
- `og:image` - изображение для превью

#### Twitter Card:
- `twitter:card` - тип карточки (summary_large_image)
- `twitter:title` - заголовок
- `twitter:description` - описание
- `twitter:image` - изображение

#### Canonical URL:
- `<link rel="canonical">` - канонический URL страницы

**Генератор:** `components/htmlGenerator.js` → `generateSeoMetaTags()`

### 4. Favicon в страницах ошибок

Страницы ошибок (404, 500 и т.д.) теперь включают:
- Favicon (ICO, SVG)
- Apple Touch Icon
- Мета-тег `robots: noindex, nofollow` (чтобы не индексировались)

**Генератор:** `components/errorPageGenerator.js`

## Конфигурация

### config.yaml

Добавьте SEO параметры в `website/config.yaml`:

```yaml
site:
  name: "creapunk"
  title: "motion control systems"
  description: "Multi-repository documentation builder for GitHub Pages. Open-source motion control systems, robotics projects, and technical documentation."
  keywords: "motion control, robotics, documentation, GitHub Pages, open source, CLN17, RadiX, creapunk"
  baseUrl: "https://futureengineeer.github.io/markdown-doc-builder"
  language: "en"
```

### doc-config.yaml

Для отдельных страниц можно указать специфичные SEO параметры:

```yaml
pages:
  - file: "index.md"
    title: "CLN Driver Documentation"
    description: "Complete documentation for CLN stepper motor driver"
    keywords: "stepper motor, driver, CLN17, motion control"
    image: "./assets/cln-preview.png"
```

## Процесс сборки

SEO файлы генерируются автоматически при запуске:

```bash
node build-all-v3.js website
```

### Фазы сборки:

1. **Phase 1-3:** Генерация HTML страниц с мета-тегами
2. **Phase 4:** Генерация страниц ошибок с favicon
3. **Phase 5:** Генерация search-index.json
4. **Phase 6:** Генерация _redirects
5. **Phase 7:** Генерация sitemap.xml ✨
6. **Phase 8:** Копирование robots.txt ✨

## Проверка

### Проверить robots.txt:
```bash
cat dist/robots.txt
```

### Проверить sitemap.xml:
```bash
cat dist/sitemap.xml
```

### Проверить мета-теги на странице:
```bash
# Первые 30 строк index.html
Get-Content dist/index.html -Head 30
```

## Рекомендации

### 1. Обновите baseUrl
В `website/config.yaml` укажите правильный URL вашего сайта:
```yaml
site:
  baseUrl: "https://ваш-домен.com"
```

### 2. Добавьте изображения для превью
Для лучшего отображения в социальных сетях добавьте изображения:
- Размер: 1200x630px (рекомендуется)
- Формат: PNG или JPG
- Расположение: `assets/logo.png` или специфичное для страницы

### 3. Настройте описания
Добавьте уникальные описания для каждой секции в doc-config.yaml

### 4. Проверьте в Google Search Console
После деплоя:
1. Добавьте сайт в Google Search Console
2. Отправьте sitemap.xml
3. Проверьте индексацию страниц

### 5. Проверьте Open Graph
Используйте инструменты:
- Facebook Sharing Debugger: https://developers.facebook.com/tools/debug/
- Twitter Card Validator: https://cards-dev.twitter.com/validator

## Технические детали

### Структура мета-тегов

```html
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Заголовок страницы</title>
  
  <!-- SEO мета-теги -->
  <meta name="description" content="...">
  <meta name="keywords" content="...">
  <meta name="author" content="...">
  
  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="...">
  <meta property="og:title" content="...">
  <meta property="og:description" content="...">
  <meta property="og:url" content="...">
  <meta property="og:image" content="...">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="...">
  <meta name="twitter:description" content="...">
  <meta name="twitter:image" content="...">
  
  <!-- Canonical URL -->
  <link rel="canonical" href="...">
  
  <!-- Favicon -->
  <link rel="icon" href="..." sizes="32x32">
  <link rel="icon" href="..." type="image/svg+xml">
  <link rel="apple-touch-icon" href="...">
</head>
```

## Файлы

### Измененные файлы:
- `components/htmlGenerator.js` - добавлен метод `generateSeoMetaTags()`
- `components/errorPageGenerator.js` - добавлены favicon и robots meta
- `build-all-v3.js` - добавлены фазы 7 и 8
- `website/config.yaml` - добавлены keywords

### Новые файлы:
- `robots.txt` - правила для поисковых роботов
- `components/sitemapGenerator.js` - генератор sitemap
- `docs/SEO_OPTIMIZATION.md` - эта документация

### Генерируемые файлы:
- `dist/robots.txt` - копия robots.txt
- `dist/sitemap.xml` - карта сайта
- `dist/*.html` - все страницы с SEO мета-тегами
