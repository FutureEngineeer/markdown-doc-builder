# Documentation

Документация проекта creapunk-docs-builder.

## Содержание

### Deployment & Configuration
- **[GITHUB_PAGES_DEPLOY.md](GITHUB_PAGES_DEPLOY.md)** - Руководство по деплою на GitHub Pages
- **[DEPLOYMENT_FIX.md](DEPLOYMENT_FIX.md)** - Исправления проблем с деплоем
- **[CHANGELOG_DEPLOY.md](CHANGELOG_DEPLOY.md)** - История изменений конфигурации деплоя
- **[FILENAME_NORMALIZATION.md](FILENAME_NORMALIZATION.md)** - Нормализация имен файлов в нижний регистр
- **[BUILD_ORDER_FIX.md](BUILD_ORDER_FIX.md)** - Исправление порядка сборки для репозиториев

### Architecture & Implementation
- **[АРХИТЕКТУРА.md](АРХИТЕКТУРА.md)** - Архитектура проекта
- **[SEARCH_IMPLEMENTATION.md](SEARCH_IMPLEMENTATION.md)** - Реализация поиска
- **[SEARCH_IMPROVEMENTS.md](SEARCH_IMPROVEMENTS.md)** - Улучшения поиска

### User Guides
- **[USER_GUIDE_SEARCH.md](USER_GUIDE_SEARCH.md)** - Руководство пользователя по поиску

### Performance
- **[PERFORMANCE_OPTIMIZATION.md](PERFORMANCE_OPTIMIZATION.md)** - Оптимизация производительности

## Quick Start

### Локальная разработка
```bash
# Установка зависимостей
npm install

# Сборка с нуля
npm run build:fresh

# Обычная сборка
npm run build:all

# Очистка временных файлов
npm run clean
```

### Деплой на GitHub Pages
Деплой происходит автоматически через GitHub Actions:
- По расписанию каждые 12 часов
- Вручную через Actions → Build and Deploy → Run workflow

Подробнее: [GITHUB_PAGES_DEPLOY.md](GITHUB_PAGES_DEPLOY.md)

## Структура проекта

```
.
├── assets/              # Статические ресурсы (CSS, JS, изображения)
├── components/          # Модульные компоненты генератора
├── docs/               # Документация (этот каталог)
├── scripts/            # Вспомогательные скрипты
├── website/            # Исходные markdown файлы
│   ├── config.yaml     # Главная конфигурация
│   └── doc-config.yaml # Конфигурация структуры
├── dist/               # Сгенерированный сайт (не в git)
├── .temp/              # Временные файлы (не в git)
└── build-all-v3.js     # Главный скрипт сборки
```

## Основные команды

| Команда | Описание |
|---------|----------|
| `npm run build:all` | Обычная сборка |
| `npm run build:fresh` | Сборка с нуля (очистка + сборка) |
| `npm run clean` | Очистка временных файлов |
| `npm run optimize` | Оптимизация сборки |
| `npm run errors:generate` | Генерация страниц ошибок |

## Troubleshooting

### Проблемы с деплоем
См. [DEPLOYMENT_FIX.md](DEPLOYMENT_FIX.md)

### Проблемы с производительностью
См. [PERFORMANCE_OPTIMIZATION.md](PERFORMANCE_OPTIMIZATION.md)

### Проблемы с поиском
См. [SEARCH_IMPLEMENTATION.md](SEARCH_IMPLEMENTATION.md)

## Дата обновления
1 декабря 2025
