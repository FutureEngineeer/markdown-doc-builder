# Руководство по миграции на систему индексирования

## Обзор изменений

Новая система индексирования заменяет старую систему сборки и предоставляет:
- Автоматическое индексирование файлов
- Поддержку doc-config.yaml на любом уровне
- Обнаружение дубликатов
- Улучшенную генерацию меню

## Шаги миграции

### 1. Создайте doc-config.yaml

Создайте файл `website/doc-config.yaml`:

```yaml
hierarchy:
  - file: home.md
    title: "Главная"
    alias: home
  
  - file: main.md
    title: "Документация"
    alias: main

ignored:
  - test.md
  - draft.md
```

### 2. Перенесите настройки из config.yaml

**Старый config.yaml:**
```yaml
build:
  scope:
    - type: file
      path: website/home.md
      title: "Home"
    - type: repository
      url: "https://github.com/user/repo"
      alias: "repo"
```

**Новый doc-config.yaml:**
```yaml
hierarchy:
  - file: home.md
    title: "Home"
  
  - repository: "https://github.com/user/repo"
    alias: "repo"
    title: "Repository"
```

### 3. Создайте doc-config для подпапок

Если у вас есть подпапки с документацией, создайте для них отдельные `doc-config.yaml`:

```
website/
├── doc-config.yaml          # Root config
├── project-alpha/
│   └── doc-config.yaml      # Config для project-alpha
└── project-beta/
    └── doc-config.yaml      # Config для project-beta
```

### 4. Запустите новую сборку

```bash
npm run build:indexed
```

### 5. Проверьте результат

```bash
npm run index:check
```

Проверьте:
- Все ли файлы проиндексированы
- Нет ли дубликатов
- Правильный ли порядок в иерархии

### 6. Проверьте сгенерированные страницы

Откройте `dist/index.html` в браузере и проверьте:
- Hamburger menu (site-map)
- Section-map
- Навигацию между страницами

## Различия между системами

### Старая система
- Использовала `config.yaml` с `build.scope`
- Сканировала файлы во время сборки
- Не поддерживала вложенные конфигурации
- Не обнаруживала дубликаты

### Новая система
- Использует `doc-config.yaml` с `hierarchy`
- Создает индекс перед сборкой
- Поддерживает doc-config на любом уровне
- Автоматически обнаруживает дубликаты

## Обратная совместимость

Новая система совместима со старой:
- Если нет `.temp/hierarchy-info.json`, используется старая система
- Можно использовать обе системы параллельно
- `npm run build:all` - старая система
- `npm run build:indexed` - новая система

## Решение проблем

### Файл не конвертируется
**Причина**: Файл не указан в `hierarchy`
**Решение**: Добавьте файл в `hierarchy` в `doc-config.yaml`

### Неправильный порядок в меню
**Причина**: Неправильный порядок в `hierarchy`
**Решение**: Измените порядок элементов в `hierarchy`

### Дубликаты репозиториев
**Причина**: Репозиторий указан в нескольких `doc-config.yaml`
**Решение**: Оставьте репозиторий только в одном месте

### README не становится index.html
**Причина**: Файл называется не `README.md` (с учетом регистра)
**Решение**: Переименуйте файл или используйте `isReadme: true` в индексаторе

## Рекомендации

1. **Начните с простого**: Создайте минимальный `doc-config.yaml` и постепенно добавляйте элементы
2. **Используйте alias**: Это упрощает навигацию и делает URL короче
3. **Проверяйте индекс**: Регулярно запускайте `npm run index:check`
4. **Документируйте структуру**: Добавьте комментарии в `doc-config.yaml`

## Примеры

### Пример 1: Миграция простого сайта

**Было (config.yaml):**
```yaml
build:
  scope:
    - website/home.md
    - website/about.md
    - website/contact.md
```

**Стало (doc-config.yaml):**
```yaml
hierarchy:
  - file: home.md
    title: "Home"
  - file: about.md
    title: "About"
  - file: contact.md
    title: "Contact"
```

### Пример 2: Миграция с репозиториями

**Было (config.yaml):**
```yaml
build:
  scope:
    - type: file
      path: website/home.md
    - type: repository
      url: "https://github.com/user/repo"
      alias: "repo"
```

**Стало (doc-config.yaml):**
```yaml
hierarchy:
  - file: home.md
    title: "Home"
  - repository: "https://github.com/user/repo"
    alias: "repo"
    title: "Repository"
```

## Дополнительные ресурсы

- [Система индексирования](./INDEXING-SYSTEM.md)
- [Быстрый старт](./QUICK-START-INDEXING.md)
- [Примеры конфигураций](../website/)
