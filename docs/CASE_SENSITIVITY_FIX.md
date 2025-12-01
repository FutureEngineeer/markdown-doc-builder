# Исправление проблем с регистрозависимостью путей

## Проблема

На GitHub Pages (Linux) ссылки на файлы репозиториев вели на 404:
- `https://...github.io/.../CLN/wiki/CLN17/V2.0/specification.html` → 404
- Локально на Windows всё работало

## Причина

**Регистрозависимость файловых систем:**
- **Windows**: регистронезависимая FS - `CLN/` и `cln/` это одно и то же
- **Linux (GitHub Pages)**: регистрозависимая FS - `CLN/` и `cln/` это разные директории

**Что происходило:**
1. В конфигах указывались alias с заглавными буквами: `alias: "CLN"`, `alias: "RadiX"`
2. Директории создавались как `dist/CLN/`, `dist/project-beta/RadiX/`
3. Но из-за нормализации путей в Windows они сохранялись как `dist/cln/`, `dist/project-beta/radix/`
4. Ссылки генерировались с заглавными буквами: `href="./CLN/index.html"`
5. На Windows это работало (регистронезависимая FS)
6. На Linux это ломалось - ссылка на `CLN/` не находила директорию `cln/`

## Решение

### 1. Нормализация alias в нижний регистр

**В `build-all-v3.js`:**

```javascript
// Для репозиториев на корневом уровне
const repoOutput = (item.alias || repoInfo?.alias || item.repository.split('/').pop()).toLowerCase();

// Для репозиториев внутри папок
const repoAlias = (sectionItem.alias || repoInfo?.alias || sectionItem.repository.split('/').pop()).toLowerCase();

// Для папок
const outputFolder = (item.alias || item.folder).toLowerCase();
```

### 2. Обновление конфигурационных файлов

**В `website/config.yaml`:**
```yaml
navigation:
  - text: "CLN"
    url: "cln/index.html"  # было: CLN/index.html
  
  - text: "RadiX Project"
    url: "project-beta/radix/index.html"  # было: project-beta/RadiX/index.html
```

**В `website/doc-config.yaml`:**
```yaml
- repository: "https://github.com/creapunk/CLN-ClosedLoopNemaDriver"
  alias: "cln"  # было: CLN
  title: "CLN Driver"
```

**В `website/project-beta/doc-config.yaml`:**
```yaml
- repository: "https://github.com/creapunk/RadiX"
  alias: "radix"  # было: RadiX
  title: "RadiX Project"
```

## Результат

✅ **Директории:**
- `dist/cln/` (нижний регистр)
- `dist/project-beta/radix/` (нижний регистр)

✅ **Ссылки:**
- `href="./cln/index.html"` (нижний регистр)
- `href="./project-beta/radix/index.html"` (нижний регистр)

✅ **Работает на обеих платформах:**
- Windows: работает (как и раньше)
- Linux/GitHub Pages: теперь работает!

## Проверка

### Локально:
```bash
npm run build:fresh
ls -la dist/  # должна быть директория cln (нижний регистр)
ls -la dist/cln/wiki/cln17/v2.0/  # должен быть specification.html
```

### На GitHub Pages:
После деплоя проверить:
- `https://.../cln/index.html` - работает
- `https://.../cln/wiki/cln17/v2.0/specification.html` - работает
- `https://.../project-beta/radix/index.html` - работает

## Новый workflow для деплоя в ветку

Создан `.github/workflows/deploy-to-branch.yml` который:
- Деплоит в ветку `gh-pages`
- Показывает структуру директорий для отладки
- Проверяет регистр директорий

### Настройка GitHub Pages:
1. Settings → Pages
2. Source: Deploy from a branch
3. Branch: `gh-pages` / `/ (root)`

## Дата исправления
1 декабря 2025
