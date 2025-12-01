# Настройка страниц ошибок

## Проблемы и решения

### 1. Кнопка "Back to Home" ведет на относительный путь

**Проблема:** Кнопка использовала относительный путь `index.html`, что приводило к неправильным ссылкам из вложенных директорий (например, `/project-beta/index.html` вместо `/index.html`).

**Решение:** 
- Добавлен параметр `site.homeUrl` в `config.yaml` с абсолютным путем `/index.html`
- Генератор страниц ошибок теперь использует `homeUrl` для кнопки "Back to Home"
- Все ссылки на главную страницу теперь абсолютные от корня сайта

```yaml
site:
  logoClickUrl: "/index.html"  # Ссылка при клике на лого
  homeUrl: "/index.html"       # Главная страница (для кнопки Back to Home)
```

### 2. Кастомные страницы ошибок не работают на GitHub Pages

**Проблема:** GitHub Pages и Netlify по-разному обрабатывают кастомные страницы ошибок.

**Решение для Netlify:**
- Обновлен `netlify.toml` с правильными редиректами
- Страницы ошибок должны быть в корне `/404.html`, `/500.html`
- Создается файл `_redirects` автоматически при сборке

**Решение для GitHub Pages:**
- GitHub Pages автоматически использует `/404.html` из корня
- Для других кодов ошибок нужно настроить через JavaScript редирект
- Файл `_redirects` не работает на GitHub Pages (только на Netlify)

### 3. Относительные ссылки в подразделах

**Проблема:** Ссылка на `license` в `project-beta/radix` ведет на `http://localhost:3000/project-beta/license` вместо корневого `/license.html`.

**Решение:**
- Все внутренние ссылки должны быть абсолютными от корня сайта
- Использовать `/license.html` вместо `license.html`
- Обновить `linkProcessor` для автоматической конвертации относительных ссылок

## Конфигурация

### config.yaml

```yaml
site:
  name: "creapunk"
  logoClickUrl: "/index.html"  # Абсолютный путь от корня
  homeUrl: "/index.html"       # Главная страница
```

### netlify.toml

```toml
# Custom error pages (должны быть ПЕРЕД другими редиректами)
[[redirects]]
  from = "/*"
  to = "/404.html"
  status = 404

[[redirects]]
  from = "/*"
  to = "/500.html"
  status = 500
```

### _redirects (генерируется автоматически)

```
# Custom error pages for Netlify
/* /404.html 404
/* /500.html 500
```

## Тестирование

### Локально
```bash
npm run build
cd dist
python -m http.server 3000
```

Проверьте:
- http://localhost:3000/nonexistent → должна показать 404.html
- http://localhost:3000/project-beta/nonexistent → должна показать 404.html с кнопкой на /index.html

### На Netlify
После деплоя проверьте:
- https://your-site.netlify.app/nonexistent
- https://your-site.netlify.app/project-beta/nonexistent

### На GitHub Pages
GitHub Pages автоматически использует `/404.html` для всех несуществующих страниц.

## Структура файлов

```
dist/
├── 404.html          # Страница ошибки 404
├── 500.html          # Страница ошибки 500
├── 400.html          # Дополнительные страницы ошибок
├── 401.html
├── ...
├── _redirects        # Конфигурация редиректов для Netlify
└── index.html        # Главная страница
```

## Важные замечания

1. **Абсолютные пути:** Всегда используйте абсолютные пути от корня сайта (`/index.html`) для навигации между разделами
2. **Netlify vs GitHub Pages:** Файл `_redirects` работает только на Netlify
3. **Порядок редиректов:** В `netlify.toml` страницы ошибок должны быть объявлены ПЕРЕД другими редиректами
4. **Тестирование:** Локальный сервер может не поддерживать кастомные страницы ошибок - тестируйте на реальном хостинге
