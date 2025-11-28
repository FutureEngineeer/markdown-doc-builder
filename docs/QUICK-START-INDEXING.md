# Быстрый старт: Система индексирования

## Что это?

Новая система индексирования автоматически:
- Сканирует все файлы в `website/`
- Скачивает GitHub репозитории
- Применяет правила из `doc-config.yaml`
- Генерирует site-map и section-map
- Обнаруживает дубликаты

## Запуск

```bash
npm run build:indexed
```

## Структура проекта

```
website/
├── doc-config.yaml          # Главная конфигурация
├── home.md                  # Главная страница
├── main.md                  # Основная документация
├── project-alpha/
│   ├── doc-config.yaml      # Конфигурация для project-alpha
│   ├── main.md
│   └── installation.md
└── project-beta/
    ├── doc-config.yaml      # Конфигурация для project-beta
    └── overview.md
```

## Конфигурация doc-config.yaml

### Минимальная конфигурация

```yaml
hierarchy:
  - file: home.md
    title: "Главная"
```

### Полная конфигурация

```yaml
hierarchy:
  # Локальный файл
  - file: home.md
    title: "Главная"
    alias: home
    description: "Главная страница сайта"
  
  # GitHub репозиторий
  - repository: "https://github.com/user/repo"
    alias: "repo-name"
    title: "Repository Title"
  
  # Секция с подпапками
  - title: "Проекты"
    alias: projects
    section: true
    children:
      - title: "Проект Alpha"
        alias: project-alpha
        folder: project-alpha

# Игнорируемые файлы (не конвертируются)
ignored:
  - test.md
  - draft.md
```

## Правила

### 1. README файлы
- `README.md`, `readme.md`, `Readme.md` → `index.html`
- В меню отображается H1 заголовок файла
- README всегда первый в списке

### 2. Иерархия
- Файлы отображаются в порядке из `hierarchy`
- Если файла нет в `hierarchy`, он не конвертируется

### 3. Переопределение
- `doc-config.yaml` в подпапке переопределяет правила родительской папки
- Применяется только к файлам в этой подпапке

### 4. Alias
- Используется для создания коротких URL
- Если не указан, используется имя файла

## Примеры

### Пример 1: Простой сайт

```yaml
# website/doc-config.yaml
hierarchy:
  - file: home.md
    title: "Home"
  - file: about.md
    title: "About"
  - file: contact.md
    title: "Contact"
```

### Пример 2: С репозиториями

```yaml
# website/doc-config.yaml
hierarchy:
  - file: home.md
    title: "Home"
  
  - repository: "https://github.com/user/project"
    alias: "project"
    title: "My Project"
```

### Пример 3: С секциями

```yaml
# website/doc-config.yaml
hierarchy:
  - file: home.md
    title: "Home"
  
  - title: "Documentation"
    section: true
    children:
      - folder: guides
        title: "Guides"
      - folder: api
        title: "API Reference"
```

## Проверка результата

После сборки проверьте:
1. `.temp/hierarchy-info.json` - индекс всех файлов
2. `dist/` - сгенерированные HTML файлы
3. Консоль - предупреждения о дубликатах

## Отладка

### Проблема: Файл не конвертируется
**Решение**: Убедитесь, что файл указан в `hierarchy` в `doc-config.yaml`

### Проблема: Неправильный порядок в меню
**Решение**: Измените порядок элементов в `hierarchy`

### Проблема: Дубликаты репозиториев
**Решение**: Проверьте, что репозиторий указан только один раз во всех `doc-config.yaml`

## Миграция со старой системы

1. Создайте `website/doc-config.yaml`
2. Перенесите настройки из `config.yaml` в `hierarchy`
3. Запустите `npm run build:indexed`
4. Проверьте результат
5. Если все работает, удалите старые скрипты

## Дополнительно

- [Полная документация](./INDEXING-SYSTEM.md)
- [Примеры конфигураций](../website/)
