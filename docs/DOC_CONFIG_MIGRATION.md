# Миграция на новый синтаксис doc-config.yaml

## Обзор изменений

Новый синтаксис более компактный и читаемый. Основные изменения:

1. Использование ключ-значение вместо явных полей `file:`, `repository:`, `folder:`
2. Параметры элемента группируются в объект под ключом
3. Секции используют `section: true` и `sub:` вместо `children:`

## Примеры миграции

### Файл

**Старый формат:**
```yaml
- file: home.md
  title: "Home"
  description: "Главная страница"
```

**Новый формат:**
```yaml
- Home:
    path: home.md
    description: "Главная страница"
```

**Краткий формат:**
```yaml
- Home: home.md
```

---

### Папка

**Старый формат:**
```yaml
- folder: docs/
  title: "Documentation"
  description: "Документация проекта"
```

**Новый формат:**
```yaml
- Documentation:
    path: docs/
    description: "Документация проекта"
```

**Краткий формат:**
```yaml
- Documentation: docs/
```

---

### GitHub репозиторий

**Старый формат:**
```yaml
- repository: "https://github.com/user/repo"
  title: "My Repo"
  alias: "my-repo"
  description: "Описание репозитория"
```

**Новый формат:**
```yaml
- My Repo:
    path: "https://github.com/user/repo"
    alias: my-repo
    description: "Описание репозитория"
```

**Краткий формат:**
```yaml
- My Repo: "https://github.com/user/repo"
```

---

### Репозиторий как секция

**Старый формат:**
```yaml
- repository: "https://github.com/user/repo"
  title: "CLN Driver"
  alias: "cln"
  section: true
  description: "CLN ClosedLoop Nema Driver"
```

**Новый формат:**
```yaml
- CLN Driver:
    path: "https://github.com/user/repo"
    section: true
    alias: cln
    description: "CLN ClosedLoop Nema Driver"
```

---

### Секция с подразделами

**Старый формат:**
```yaml
- section: "Projects"
  children:
    - folder: project-alpha/
      title: "Проект Alpha"
    - folder: project-beta/
      title: "Проект Beta"
```

**Новый формат:**
```yaml
- Projects:
    section: true
    sub:
      - Проект Alpha: project-alpha/
      - Проект Beta: project-beta/
```

---

## Полный пример миграции

### Старый формат

```yaml
hierarchy:
  - file: home.md
    title: "Home"
    description: "Главная страница сайта"
  
  - file: main.md
    title: "Main Docs"
    description: "Полная документация проекта"
  
  - repository: "https://github.com/creapunk/CLN-ClosedLoopNemaDriver"
    title: "CLN Driver"
    alias: "cln"
    description: "CLN ClosedLoop Nema Driver"
  
  - section: "Projects"
    children:
      - folder: project-alpha/
        title: "Проект Alpha"
      - folder: project-beta/
        title: "Проект Beta"
  
  - section: "Additional"
    children:
      - folder: sub/
        title: "Sub Section"
```

### Новый формат

```yaml
hierarchy:
  - Home:
      path: home.md
      description: "Главная страница сайта"
  
  - Main Docs:
      path: main.md
      description: "Полная документация проекта"
  
  - CLN Driver:
      path: "https://github.com/creapunk/CLN-ClosedLoopNemaDriver"
      section: true
      description: "CLN ClosedLoop Nema Driver"
  
  - Projects:
      section: true
      sub:
        - Проект Alpha: project-alpha/
        - Проект Beta: project-beta/
  
  - Additional:
      section: true
      sub:
        - Sub Section: sub/
```

### Краткий формат (минимальный)

```yaml
hierarchy:
  - Home: home.md
  - Main Docs: main.md
  - CLN Driver: "https://github.com/creapunk/CLN-ClosedLoopNemaDriver"
  - Projects:
      section: true
      sub:
        - Проект Alpha: project-alpha/
        - Проект Beta: project-beta/
  - Additional:
      section: true
      sub:
        - Sub Section: sub/
```

## Автоматическая миграция

Генератор поддерживает старый формат для обратной совместимости, но рекомендуется мигрировать на новый синтаксис для лучшей читаемости.

## Преимущества нового формата

✅ **Компактность** - меньше строк кода
✅ **Читаемость** - структура более понятна
✅ **Гибкость** - легко переключаться между кратким и полным форматом
✅ **Консистентность** - единый подход для всех типов элементов

## Проверка миграции

После миграции запустите сборку:

```bash
node build-all-v3.js website
```

Если миграция прошла успешно, вы увидите:
```
✓ Processed X doc-config files
✓ Found X files in hierarchy
✓ Found X repositories
```

Если есть ошибки, они будут отображены с префиксом `⚠️`.
