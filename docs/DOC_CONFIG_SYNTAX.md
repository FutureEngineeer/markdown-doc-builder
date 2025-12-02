# Синтаксис doc-config.yaml

## Обзор

Файл `doc-config.yaml` определяет структуру навигации и порядок отображения файлов в генераторе документации. Только файлы, указанные в `hierarchy`, будут отображаться в меню и конвертироваться в HTML.

## Базовый синтаксис

Каждый элемент в `hierarchy` представляет собой пару ключ-значение, где:
- **Ключ** - это название элемента (отображается в меню)
- **Значение** - это путь к файлу, папке или URL репозитория

### Формат

```yaml
hierarchy:
  - Название элемента:
      path: "путь/к/файлу.md"
      description: "Описание элемента"
      alias: "custom-alias"
```

## Типы элементов

### 1. Файл

Указывает на markdown файл для конвертации.

**Полный формат:**
```yaml
- Home:
    path: home.md
    description: "Главная страница сайта"
    alias: home
```

**Краткий формат:**
```yaml
- Home: home.md
```

### 2. Папка

Указывает на папку с markdown файлами. Путь должен заканчиваться на `/`.

**Полный формат:**
```yaml
- Documentation:
    path: docs/
    description: "Документация проекта"
    alias: documentation
```

**Краткий формат:**
```yaml
- Documentation: docs/
```

### 3. GitHub репозиторий

Указывает на GitHub репозиторий для загрузки и конвертации.

**Полный формат:**
```yaml
- CLN Driver:
    path: "https://github.com/creapunk/CLN-ClosedLoopNemaDriver"
    section: true
    description: "CLN ClosedLoop Nema Driver"
    alias: cln-driver
```

**Краткий формат:**
```yaml
- CLN Driver: "https://github.com/creapunk/CLN-ClosedLoopNemaDriver"
```

**Параметр `section: true`** - отображает репозиторий как отдельную секцию в навигации.

### 4. Секция с подразделами

Группирует несколько элементов под одним заголовком.

```yaml
- Projects:
    section: true
    description: "Все проекты"
    sub:
      - Проект Alpha: project-alpha/
      - Проект Beta: project-beta/
      - External Repo: "https://github.com/user/repo"
```

## Полный пример

```yaml
# doc-config.yaml для root папки
hierarchy:
  # Главная страница
  - Home:
      path: home.md
      description: "Главная страница сайта"
  
  # Основная документация
  - Main Docs:
      path: main.md
      description: "Полная документация проекта"
  
  # GitHub репозиторий как секция
  - CLN Driver:
      path: "https://github.com/creapunk/CLN-ClosedLoopNemaDriver"
      section: true
      description: "CLN ClosedLoop Nema Driver"
  
  # Секция с подразделами
  - Projects:
      section: true
      sub:
        - Проект Alpha: project-alpha/
        - Проект Beta: project-beta/
  
  # Дополнительные материалы
  - Additional:
      section: true
      sub:
        - Sub Section: sub/
        - API Docs: api/
```

## Вложенные doc-config.yaml

Каждая папка может иметь свой собственный `doc-config.yaml` для определения структуры внутри папки.

**Пример для `project-beta/doc-config.yaml`:**

```yaml
hierarchy:
  - Project Beta Overview:
      path: overview.md
      description: "Main documentation for Project Beta"
  
  - API Reference:
      path: api-reference.md
      description: "API documentation for Project Beta"

  - RadiX:
      path: "https://github.com/creapunk/RadiX"
      section: true
      description: "RadiX Project repository"
```

## Параметры элементов

### `path` (обязательный)
Путь к файлу, папке или URL репозитория.

### `description` (опциональный)
Описание элемента для метаданных и подсказок.

### `alias` (опциональный)
Пользовательский алиас для URL. Если не указан, генерируется автоматически из названия.

### `section` (опциональный)
Для репозиториев: `true` - отображает как отдельную секцию.
Для папок: `true` - создает группу с подразделами (требуется `sub`).

### `sub` (опциональный)
Массив дочерних элементов для секций.

## Автоматическая генерация alias

Если `alias` не указан, он генерируется автоматически:
- Преобразование в нижний регистр
- Удаление эмодзи и специальных символов
- Замена пробелов на дефисы

**Примеры:**
- "Home Page" → `home-page`
- "API Docs" → `api-docs`
- "Проект Alpha" → `alpha`

## Обратная совместимость

Генератор поддерживает старый формат для обратной совместимости, но рекомендуется использовать новый синтаксис.

## Правила

1. Только файлы из `hierarchy` будут конвертироваться и отображаться в меню
2. Порядок элементов в `hierarchy` определяет порядок в навигации
3. Файлы вне `hierarchy` игнорируются
4. Каждая папка может иметь свой `doc-config.yaml`
5. Вложенные `doc-config.yaml` наследуют настройки родительских
