# Финальные исправления для GitHub Pages

## Дата: 1 декабря 2025

## Исправленные проблемы

### 1. ✅ Нормализация всех ссылок в нижний регистр

**Проблема:** Ссылки генерировались с сохранением оригинального регистра, что ломалось на Linux.

**Решение:** Добавлен `.toLowerCase()` в `PathResolver.convertMdToHtml()`:
```javascript
convertMdToHtml(mdPath) {
  const fileName = path.basename(mdPath);
  const isReadme = /^readme\.md$/i.test(fileName);
  
  if (isReadme) {
    return mdPath.replace(/readme\.md$/i, 'index.html').toLowerCase();
  }
  
  return mdPath.replace(/\.md$/i, '.html').toLowerCase();
}
```

**Результат:**
- Все генерируемые ссылки теперь в нижнем регистре
- `href="../cln/wiki/applications.html"` вместо `href="../CLN/wiki/applications.html"`

### 2. ✅ Нормализация alias и путей директорий

**Изменения в `build-all-v3.js`:**
```javascript
// Репозитории на корневом уровне
const repoOutput = (item.alias || repoInfo?.alias || item.repository.split('/').pop()).toLowerCase();

// Репозитории внутри папок
const repoAlias = (sectionItem.alias || repoInfo?.alias || sectionItem.repository.split('/').pop()).toLowerCase();

// Папки
const outputFolder = (item.alias || item.folder).toLowerCase();
```

**Изменения в конфигах:**
- `website/config.yaml`: `alias: "cln"`, `alias: "radix"`
- `website/doc-config.yaml`: `alias: "cln"`
- `website/project-beta/doc-config.yaml`: `alias: "radix"`

**Результат:**
- Директории: `dist/cln/`, `dist/project-beta/radix/`
- Ссылки: `href="./cln/index.html"`
- Полная совместимость с Linux/GitHub Pages

### 3. ✅ Двухпроходная система сборки

**Проблема:** Hamburger menu генерировался до создания директорий репозиториев.

**Решение:**
- **Проход 1:** Обработка всех файлов репозиториев
- **Проход 2:** Обработка локальных файлов

**Результат:**
- Hamburger menu содержит все репозитории
- Section map видит полную структуру

### 4. ✅ Исправление поиска директорий репозиториев

**Проблема:** `findSectionNode` искал `temp/cln/`, но реальная директория `temp/creapunk-CLN-ClosedLoopNemaDriver/`.

**Решение в `newSectionMap.js`:**
```javascript
// Находим реальное имя директории репозитория в temp/
let tempRepoDir = null;
if (hierarchyInfo.allRepositories) {
  const repoInfo = hierarchyInfo.allRepositories.find(r => r.alias === alias);
  if (repoInfo) {
    tempRepoDir = path.join(baseDir, 'temp', `${repoInfo.owner}-${repoInfo.repo}`);
  }
}
```

**Результат:**
- Section map показывает полную структуру репозиториев
- CLN: Overview, License, Sponsors, Hardware, Wiki
- RadiX: Overview, License, Wiki

### 5. ✅ Новый workflow для деплоя в ветку

**Файл:** `.github/workflows/deploy-to-branch.yml`

**Особенности:**
- Деплоит в ветку `gh-pages`
- Показывает структуру директорий для отладки
- Проверяет регистр файлов
- Запускается при push в main, по расписанию, или вручную

**Настройка GitHub Pages:**
1. Settings → Pages
2. Source: Deploy from a branch
3. Branch: `gh-pages` / `/ (root)`

## Известные ограничения

### Section Map для вложенных репозиториев

**Проблема:** Для репозиториев внутри папок (например, `project-beta/radix`) section-map показывает структуру родительской папки (`project-beta`), а не самого репозитория.

**Причина:** `getRootFolder()` возвращает первую папку после `dist/`, что для `dist/project-beta/radix/index.html` даёт `project-beta`.

**Обходное решение:** Использовать репозитории на корневом уровне hierarchy, а не внутри папок.

**Планируется:** Улучшение логики определения корневой папки для вложенных репозиториев.

## Проверка работоспособности

### Локально:
```bash
npm run build:fresh

# Проверка структуры
ls -la dist/  # должна быть cln (нижний регистр)
ls -la dist/cln/wiki/cln17/v2.0/  # должен быть specification.html

# Проверка ссылок
grep -r "href.*cln" dist/index.html  # все ссылки в нижнем регистре
```

### На GitHub Pages:
После деплоя проверить:
- ✅ `https://.../cln/index.html` - работает
- ✅ `https://.../cln/wiki/cln17/v2.0/specification.html` - работает
- ✅ `https://.../project-beta/radix/index.html` - работает
- ✅ Hamburger menu содержит все репозитории
- ✅ Section map показывает структуру

## Итоговая статистика исправлений

- **Файлов изменено:** 8
- **Компонентов обновлено:** 5
- **Конфигов обновлено:** 3
- **Workflow создано:** 1
- **Документации создано:** 6

## Следующие шаги

1. Закоммитить все изменения
2. Запушить в main
3. Проверить автоматический деплой в gh-pages
4. Настроить GitHub Pages на ветку gh-pages
5. Проверить работоспособность на production

## Дата завершения
1 декабря 2025
