# Система индексирования

## Обзор

Новая система индексирования обеспечивает:
- Первичное индексирование всех файлов на основе файловой структуры
- Поддержку doc-config.yaml на любом уровне иерархии
- Автоматическое скачивание и индексирование GitHub репозиториев
- Обнаружение дубликатов и конфликтов
- Генерацию site-map (hamburger menu) и section-map на основе индекса

## Последовательность работы

### 1. Чтение всех файлов
```
website/
├── home.md
├── main.md
├── doc-config.yaml          # Root config
├── project-alpha/
│   ├── main.md
│   ├── installation.md
│   └── doc-config.yaml      # Переписывает правила для project-alpha
└── project-beta/
    ├── overview.md
    └── doc-config.yaml      # Переписывает правила для project-beta
```

### 2. Первичное индексирование
- Сканируются все .md файлы
- Извлекаются H1 заголовки
- Определяются README файлы (конвертируются в index.html)
- Сохраняются пути к исходным файлам

### 3. Скачивание репозиториев
- Если в doc-config.yaml есть ссылки на репозитории, они скачиваются
- Репозитории индексируются так же, как локальные файлы
- Применяется doc-config.yaml из репозитория (если есть)

### 4. Повторное индексирование
- Процесс повторяется до тех пор, пока все файлы не проиндексированы
- Включая файлы из скачанных репозиториев

### 5. Применение doc-config
- doc-config.yaml на более низком уровне переписывает правила вышестоящего
- Создаются alias пути для файлов
- Определяется порядок отображения

### 6. Обнаружение дубликатов
- Если на один репозиторий или папку есть ссылка в двух doc-config
- Выводится предупреждение
- Ссылки корректируются автоматически

### 7. Генерация HTML
- Файлы конвертируются на основе индекса
- README/readme (любой регистр) → index.html
- В hamburger menu и section-map выводится H1 заголовок
- README всегда первый в списке

## Формат doc-config.yaml

### Root config (website/doc-config.yaml)
```yaml
hierarchy:
  # Файл
  - file: home.md
    title: "Главная"
    alias: home
    description: "Главная страница"
  
  # Репозиторий
  - repository: "https://github.com/user/repo"
    alias: "repo-name"
    title: "Repository Title"
  
  # Секция с вложенными элементами
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

# Игнорируемые файлы
ignored:
  - test.md
  - draft.md
```

### Folder config (website/project-alpha/doc-config.yaml)
```yaml
hierarchy:
  - file: main.md
    title: "Overview"
    alias: "main"
  
  - file: installation.md
    title: "Installation"
    alias: "install"
```

## Правила переопределения

1. **Файлы**: doc-config в папке переопределяет правила для файлов в этой папке
2. **Порядок**: Файлы отображаются в порядке, указанном в hierarchy
3. **Alias**: Если указан alias, он используется вместо имени файла
4. **Игнорирование**: Файлы из ignored не конвертируются и не отображаются

## Использование

### Запуск сборки с индексированием
```bash
npm run build:indexed
```

### Структура индекса
Индекс сохраняется в `.temp/hierarchy-info.json`:
```json
{
  "files": [
    {
      "key": "home.md",
      "sourcePath": "/path/to/website/home.md",
      "relativePath": "home.md",
      "fileName": "home.md",
      "baseName": "home",
      "isReadme": false,
      "h1Title": "Welcome",
      "alias": "home"
    }
  ],
  "aliases": [
    {
      "alias": "home",
      "path": "home.md"
    }
  ],
  "repositories": [
    {
      "url": "https://github.com/user/repo",
      "alias": "repo-name",
      "owner": "user",
      "repo": "repo",
      "branch": "main",
      "filesCount": 10
    }
  ],
  "hierarchy": [...],
  "duplicates": []
}
```

## Преимущества

1. **Прозрачность**: Весь процесс индексирования виден и контролируем
2. **Гибкость**: doc-config на любом уровне
3. **Безопасность**: Обнаружение дубликатов и конфликтов
4. **Производительность**: Минимум постпроцессинга
5. **Удобство**: README автоматически становится index.html с H1 в меню
