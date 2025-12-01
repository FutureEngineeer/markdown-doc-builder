# Исправление деплоя GitHub Actions

## Проблема 1: Ошибка при запуске сборки
При запуске GitHub Actions возникала ошибка:
```
Error: Root path is required!
Error: Process completed with exit code 1.
```

### Причина
В `package.json` команда `build:all` содержала опечатку и не передавала аргумент `website` в скрипт `build-all-v3.js`.

### Решение
Исправлены команды в `package.json`:

```json
"scripts": {
  "build": "node build-all-v3.js website",
  "build:all": "node build-all-v3.js website",
  "build:netlify": "node build-all-v3.js website"
}
```

## Проблема 2: Отсутствие навигации и социальных ссылок
После сборки в header и footer отсутствовали ссылки навигации и социальные кнопки.

### Причина
`BuildOrchestrator` не передавал путь к `config.yaml`, который находится в `website/config.yaml`, а не в корне проекта. Из-за этого использовалась конфигурация по умолчанию с пустыми массивами.

### Решение

1. **Обновлен `build-all-v3.js`** - передает путь к конфигу:
```javascript
const configPath = path.join(rootPath, 'config.yaml');
const orchestrator = new BuildOrchestrator({
  projectRoot: process.cwd(),
  distDir: 'dist',
  configPath: configPath
});
```

2. **Обновлен `BuildOrchestrator`** - принимает путь к конфигу:
```javascript
constructor(options = {}) {
  this.configPath = options.configPath || 'config.yaml';
  this.globalConfig = this.configManager.loadGlobalConfig(this.configPath);
}
```

3. **Обновлен `HtmlGenerator`** - нормализует структуру конфига:
```javascript
// Нормализация для обратной совместимости
if (this.config.site && this.config.site.name && !this.config.siteName) {
  this.config.siteName = this.config.site.name;
}
if (this.config.icons && this.config.icons.site && this.config.icons.site.logo && !this.config.logoPath) {
  this.config.logoPath = this.config.icons.site.logo;
}
```

## Результат
✅ Сборка проходит успешно  
✅ Header содержит все ссылки навигации  
✅ Header содержит кнопки Discord и Ko-Fi  
✅ Footer содержит все социальные ссылки (Email, GitHub, YouTube, Discord, Ko-Fi)  
✅ Конфигурация правильно загружается из `website/config.yaml`

## GitHub Actions
Workflow `.github/workflows/build-and-deploy.yml` использует команду `npm run build:all`, которая теперь работает корректно.

### Особенности workflow:
- Запускается по расписанию каждые 12 часов
- Можно запустить вручную через `workflow_dispatch`
- **Сборка всегда с нуля** - перед каждой сборкой очищаются `.temp`, `temp` и `dist`
- Автоматически деплоит на GitHub Pages

### Процесс сборки:
1. Checkout кода
2. Установка Node.js 18
3. Установка зависимостей (`npm ci`)
4. **Очистка временных файлов** (`.temp`, `temp`, `dist`)
5. Сборка сайта (`npm run build:all`)
6. Загрузка артефакта
7. Деплой на GitHub Pages

## Дата исправления
1 декабря 2025
