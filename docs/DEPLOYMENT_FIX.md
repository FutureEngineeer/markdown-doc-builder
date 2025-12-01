# Исправление деплоя GitHub Actions

## Проблема
При запуске GitHub Actions возникала ошибка:
```
Error: Root path is required!
Error: Process completed with exit code 1.
```

## Причина
В `package.json` команда `build:all` содержала опечатку и не передавала аргумент `website` в скрипт `build-all-v3.js`.

## Решение
Исправлены команды в `package.json`:

```json
"scripts": {
  "build": "node build-all-v3.js website",
  "build:all": "node build-all-v3.js website",
  "build:netlify": "node build-all-v3.js website"
}
```

## Проверка
Теперь при запуске `npm run build:all` скрипт получит правильный аргумент `website` и сборка пройдет успешно.

## GitHub Actions
Workflow `.github/workflows/build-and-deploy.yml` использует команду `npm run build:all`, которая теперь работает корректно.

### Особенности workflow:
- Запускается по расписанию каждые 12 часов
- Можно запустить вручную через `workflow_dispatch`
- Использует кеширование для ускорения сборки
- Автоматически деплоит на GitHub Pages

## Дата исправления
1 декабря 2025
