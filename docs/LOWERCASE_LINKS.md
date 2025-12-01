# Нижний регистр ссылок и конвертация README

## Обзор

Все ссылки на файлы проекта генерируются в нижнем регистре, а все файлы `README.md` (независимо от регистра) конвертируются в `index.html`.

## Реализация

### 1. Конвертация README.md → index.html

Все файлы с именем `README.md`, `README.MD`, `readme.md` и т.д. автоматически конвертируются в `index.html` в соответствующей директории.

**Компоненты:**
- `components/projectParser.js` - строки 488-495, 565-567
- `components/linkProcessor.js` - строки 270-277, 290-297, 303-310
- `components/pathResolver.js` - строки 72-77
- `components/githubFetcher.js` - строки 550-558, 721-729, 746-754

### 2. Нижний регистр для всех ссылок

Все пути к файлам `.html` генерируются в нижнем регистре с помощью `.toLowerCase()`.

**Компоненты:**
- `components/projectParser.js` - строка 488 (outputRelativePath), строка 384 (htmlPath), строка 567 (htmlFileName)
- `components/linkProcessor.js` - строки 270, 290, 303
- `components/pathResolver.js` - строки 73, 76
- `components/githubFetcher.js` - строки 550, 721, 746
- `components/hamburgerMenu.js` - строки 143, 259, 398, 427, 593
- `components/newSectionMap.js` - строки 171, 224

## Примеры

### Конвертация файлов

```
README.MD       → index.html
README.md       → index.html
readme.md       → index.html
LICENSE.MD      → license.html
Specification.md → specification.html
```

### Пути в ссылках

```html
<!-- Все ссылки в нижнем регистре -->
<a href="../cln/index.html">CLN</a>
<a href="../project-beta/radix/index.html">RadiX</a>
<a href="../cln/wiki/cln17/v1.5/specification.html">Spec</a>
```

## Проверка

Для проверки корректности работы:

```powershell
# Проверка README → index.html
dir dist -Recurse -File | Where-Object {$_.Name -eq "index.html"}

# Проверка отсутствия файлов с заглавными буквами
dir dist -Recurse -File | Where-Object {$_.Name -cmatch "[A-Z]" -and $_.Extension -eq ".html" -and $_.Name -notmatch "^\d"}

# Проверка ссылок в файлах
$content = Get-Content "dist\cln\index.html" -Raw
$matches = [regex]::Matches($content, "href=['\`"]([^'\`"]+\.html)['\`"]")
$upperCaseLinks = $matches | Where-Object {$_.Groups[1].Value -cmatch "[A-Z]" -and $_.Groups[1].Value -notmatch "^http"}
Write-Host "Ссылок с заглавными буквами: $($upperCaseLinks.Count)"
```

## Исключения

- Папки с изображениями в `dist/assets/images/` сохраняют оригинальный регистр из GitHub репозиториев
- Error pages (400.html, 404.html и т.д.) содержат цифры, но это нормально
