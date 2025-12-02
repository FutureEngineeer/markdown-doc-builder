# Руководство по миграции на новый формат doc-config

## Обзор изменений

Новый формат doc-config.yaml более компактный и читаемый. Основные изменения:

1. **Ключ-значение вместо объектов** - `- Home: home.md` вместо `- file: home.md, title: "Home"`
2. **Автоматическая генерация alias** - не нужно указывать вручную
3. **Определение типа по значению** - файл/папка/URL определяется автоматически
4. **Упрощенные секции** - `sub:` вместо `children:`

## Таблица соответствий

| Старый формат | Новый формат |
|---------------|--------------|
| `file: home.md` | `Home: home.md` |
| `folder: docs` | `Docs: docs/` |
| `repository: "url"` | `Project: "url"` |
| `title: "Home"` | `Home:` (ключ) |
| `alias: home` | Генерируется автоматически |
| `children:` | `sub:` |

## Примеры миграции

### Пример 1: Простой файл

**Старый формат:**
```yaml
hierarchy:
  - file: home.md
    title: "Home"
    alias: home
    description: "Main page"
```

**Новый формат:**
```yaml
hierarchy:
  - Home: home.md
    description: "Main page"
```

### Пример 2: Папка

**Старый формат:**
```yaml
hierarchy:
  - folder: docs
    title: "Documentation"
    alias: documentation
```

**Новый формат:**
```yaml
hierarchy:
  - Documentation: docs/
```

### Пример 3: Репозиторий

**Старый формат:**
```yaml
hierarchy:
  - repository: "https://github.com/user/project"
    title: "My Project"
    alias: my-project
    section: true
```

**Новый формат:**
```yaml
hierarchy:
  - My Project: "https://github.com/user/project"
    section: true
```

### Пример 4: Секция с подразделами

**Старый формат:**
```yaml
hierarchy:
  - title: "Projects"
    alias: projects
    section: true
    children:
      - folder: project-a
        title: "Project A"
        alias: project-a
      - folder: project-b
        title: "Project B"
        alias: project-b
```

**Новый формат:**
```yaml
hierarchy:
  - Projects:
    section: true
    sub:
      - Project A: project-a/
      - Project B: project-b/
```

### Пример 5: Сложная структура

**Старый формат:**
```yaml
hierarchy:
  - file: home.md
    title: "Home"
    alias: home
  
  - title: "Documentation"
    alias: docs
    section: true
    children:
      - file: intro.md
        title: "Introduction"
        alias: intro
      - file: guide.md
        title: "User Guide"
        alias: guide
  
  - repository: "https://github.com/user/hardware"
    title: "Hardware"
    alias: hardware
    section: true
```

**Новый формат:**
```yaml
hierarchy:
  - Home: home.md
  
  - Documentation:
    section: true
    sub:
      - Introduction: intro.md
      - User Guide: guide.md
  
  - Hardware: "https://github.com/user/hardware"
    section: true
```

## Автоматическая генерация alias

В новом формате alias генерируется автоматически:

| Название | Alias |
|----------|-------|
| `Home` | `home` |
| `Main Docs` | `main-docs` |
| `Project Alpha` | `project-alpha` |
| `API Reference` | `api-reference` |
| `CLN 🚀` | `cln` |

**Правила:**
1. Lowercase
2. Пробелы → дефисы
3. Эмодзи и спец символы удаляются
4. Множественные дефисы → один

## Определение типа элемента

Тип определяется автоматически по значению:

```yaml
hierarchy:
  - Home: home.md              # Файл (заканчивается на .md)
  - Docs: docs/                # Папка (заканчивается на /)
  - Project: "https://..."     # Репозиторий (URL)
  - Section:                   # Секция (есть sub:)
    section: true
    sub: [...]
```

## Пошаговая миграция

### Шаг 1: Создайте резервную копию

```bash
cp website/doc-config.yaml website/doc-config.yaml.backup
```

### Шаг 2: Обновите корневой doc-config.yaml

Преобразуйте каждый элемент hierarchy:

1. Замените `file:` на `Название: файл.md`
2. Замените `folder:` на `Название: папка/`
3. Замените `repository:` на `Название: "url"`
4. Замените `children:` на `sub:`
5. Удалите `alias:` (генерируется автоматически)
6. Оставьте `description:` и `section:` без изменений

### Шаг 3: Обновите вложенные doc-config.yaml

Повторите процесс для всех doc-config.yaml в подпапках.

### Шаг 4: Проверьте результат

```bash
node test-doc-config.js
```

Это покажет дерево структуры и поможет убедиться, что всё правильно.

### Шаг 5: Запустите сборку

```bash
node build-all-v3.js website
```

## Проверка миграции

После миграции проверьте:

1. **Структура дерева** - `node test-doc-config.js`
2. **Сборка** - `node build-all-v3.js website`
3. **Файлы в dist/** - убедитесь, что все файлы на месте
4. **Навигация** - проверьте меню на сайте

## Обратная совместимость

Старый формат **НЕ поддерживается** в новой версии. Необходимо мигрировать все doc-config.yaml файлы.

## Помощь

Если возникли проблемы:

1. Проверьте синтаксис YAML
2. Убедитесь, что пути к файлам правильные
3. Проверьте, что папки заканчиваются на `/`
4. Запустите `node test-doc-config.js` для диагностики

## Примеры реальных проектов

### До миграции

```yaml
hierarchy:
  - file: home.md
    title: "Главная"
    alias: home
    description: "Главная страница сайта"
  
  - file: main.md
    title: "Основная документация"
    alias: main-docs
    description: "Полная документация проекта"
  
  - repository: "https://github.com/creapunk/CLN-ClosedLoopNemaDriver"
    alias: "cln"
    title: "CLN Driver"
    section: true
  
  - title: "Проекты"
    alias: projects
    section: true
    children:
      - title: "Проект Alpha"
        alias: project-alpha
        folder: project-alpha
      - title: "Проект Beta"
        alias: project-beta
        folder: project-beta
```

### После миграции

```yaml
hierarchy:
  - Home: home.md
    description: "Главная страница сайта"
  
  - Main Docs: main.md
    description: "Полная документация проекта"
  
  - CLN: "https://github.com/creapunk/CLN-ClosedLoopNemaDriver"
    section: true
    description: "CLN Driver"
  
  - Projects:
    section: true
    sub:
      - Project Alpha: project-alpha/
      - Project Beta: project-beta/
```

**Результат:** 
- 50% меньше строк кода
- Более читаемая структура
- Автоматическая генерация alias
- Проще поддерживать
