# Исправление разрешения относительных ссылок в репозиториях

## Проблема

Относительные ссылки внутри файлов из GitHub репозиториев не учитывали положение файла относительно корня сайта. Например:
1. Ссылка `/wiki/CLN17/V1.5/specification.md` из файла в подпапке создавала неправильный путь
2. Ссылка `license.md` из корня репозитория указывала на `../../temp/creapunk-RadiX/license.html` вместо `LICENSE.html`

## Решение

### 1. Использование outputFile вместо currentFile
Изменена логика определения текущего файла в `findFileInIndex`:
- Вместо использования `currentFile` (путь в `temp/`) используется `outputFile` (путь в `dist/`)
- Из `outputFile` извлекается `localRelativePath` файла в репозитории
- Это позволяет правильно разрешать относительные ссылки

### 2. Поиск без учёта регистра
Добавлена проверка имён файлов без учёта регистра:
- `license.md` находит `LICENSE.MD`
- Сравнение происходит через `.toLowerCase()`

### 3. Правильный доступ к файлам репозитория
Исправлен путь к файлам в структуре:
- Было: `item.repoInfo?.files`
- Стало: `item.repoInfo?.projectData?.files || item.repoInfo?.files`

### 4. Fallback логика в processMarkdownLinks
Когда файл не найден в индексе, используется `outputFile` для определения текущей позиции:
- Извлекается путь относительно `dist/`
- Разрешается относительный путь
- Вычисляется правильный относительный путь к целевому файлу

### 5. Отключение onclick для .md ссылок
В `components/utils.js` отключено добавление `onclick` для ссылок на `.md` файлы:
- Такие ссылки обрабатываются в `resolveInternalLinks`
- Это предотвращает создание неправильных путей

## Примеры работы

### Пример 1: Ссылка из корня на подпапку
- **Исходный файл**: `dist/CLN/index.html`
- **Ссылка в markdown**: `./wiki/CLN17/V1.5/specification.md`
- **Результат**: `wiki/CLN17/V1.5/specification.html`

### Пример 2: Ссылка из подпапки на другую подпапку
- **Исходный файл**: `dist/CLN/hardware/CLN17/V1.5/index.html`
- **Ссылка в markdown**: `/wiki/CLN17/V1.5/specification.md`
- **Результат**: `../../../wiki/CLN17/V1.5/specification.html`

### Пример 3: Ссылка на файл с другим регистром
- **Исходный файл**: `dist/project-beta/RadiX/index.html`
- **Ссылка в markdown**: `license.md`
- **Файл в репозитории**: `LICENSE.MD`
- **Результат**: `license.html` (правильный относительный путь)

## Изменённые файлы

1. **converter.js**:
   - Функция `findFileInIndex` в `processMarkdownLinks` (строка ~710)
   - Функция `findFileInIndex` в `resolveInternalLinks` (строка ~940)
   - Fallback логика в `processMarkdownLinks` (строка ~865)
   - Функция `processLink` в `resolveInternalLinks` (строка ~1090)

2. **components/utils.js**:
   - Отключено добавление `onclick` для `.md` ссылок (строка ~336)

## Дата исправления

29 ноября 2025
