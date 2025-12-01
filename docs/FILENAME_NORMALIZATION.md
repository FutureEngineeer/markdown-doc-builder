# Нормализация имен файлов

## Проблема

HTML файлы генерировались с сохранением оригинального регистра из markdown файлов:
- `Main.md` → `Main.html`
- `API-Specs.md` → `API-Specs.html`
- `README.MD` → `README.html`

Это создавало проблемы:
- Несогласованность в URL
- Проблемы с регистрозависимыми системами (Linux)
- Сложность в навигации и ссылках

## Решение

Все HTML файлы теперь генерируются в **нижнем регистре**:
- `Main.md` → `main.html`
- `API-Specs.md` → `api-specs.html`
- `README.MD` → `index.html`

### Изменения в `build-all-v3.js`

Добавлен `.toLowerCase()` во всех местах генерации имен файлов:

```javascript
// Для обычных файлов
const outputName = isHome ? 'index.html' : fileName.toLowerCase() + '.html';

// Для файлов из репозиториев
const outputFileName = relativePath
  .replace(/\.md$/i, '.html')
  .replace(/readme\.html$/i, 'index.html')
  .toLowerCase();

// Для baseName
const outputName = file.isReadme ? 'index.html' : file.baseName.toLowerCase() + '.html';
```

## Примеры

### До:
```
dist/
├── Main.html
├── API-Specs.html
├── CLN/
│   ├── License.html
│   └── Sponsors.html
└── project-alpha/
    ├── Hardware-Specs.html
    └── API-Specs.html
```

### После:
```
dist/
├── main.html
├── api-specs.html
├── CLN/
│   ├── license.html
│   └── sponsors.html
└── project-alpha/
    ├── hardware-specs.html
    └── api-specs.html
```

## Исключения

Только `index.html` остается в нижнем регистре (как и было):
- `home.md` → `index.html`
- `readme.md` → `index.html`
- `README.MD` → `index.html`

## Совместимость

### Старые ссылки
Если у вас есть старые ссылки с заглавными буквами, они могут не работать. Рекомендуется:
1. Обновить все ссылки на нижний регистр
2. Настроить редиректы на сервере (если нужно)

### GitHub Pages
GitHub Pages работает на Linux, который регистрозависим. Теперь все ссылки будут работать корректно.

## Проверка

Проверить, что все файлы в нижнем регистре:

```bash
# PowerShell
Get-ChildItem -Path "dist" -Recurse -Filter "*.html" | Where-Object { $_.Name -cmatch '[A-Z]' }

# Bash
find dist -name "*.html" | grep -E '[A-Z]'
```

Если команда ничего не возвращает - все файлы в нижнем регистре ✅

## Дата изменений
1 декабря 2025
