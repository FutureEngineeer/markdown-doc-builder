# 🚀 Creapunk Docs Builder

Автоматический генератор документации с поддержкой GitHub Pages и Netlify

[![Build Status](https://github.com/creapunk/creapunk-docs/workflows/Build%20and%20Deploy/badge.svg)](https://github.com/creapunk/creapunk-docs/actions)

## ✨ Возможности

- 🔍 **Полнотекстовый поиск** - мгновенный поиск по всей документации на базе Lunr.js
- 🔗 **Якорные ссылки** - каждый заголовок имеет прямую ссылку для удобного обмена
- 🔄 **Автоматические обновления** - отслеживание изменений в репозиториях каждые 12 часов
- 💾 **Умное кеширование** - обновляются только измененные файлы
- 🚀 **GitHub Pages & Netlify** - готовые конфигурации для деплоя
- 📱 **Адаптивный дизайн** - работает на всех устройствах
- 🎨 **Кастомизация** - легко настраиваемые темы и стили
- 📊 **Google Analytics** - встроенная аналитика
- 🎯 **Интерактивные селекторы** - переключение между вариантами с синхронизацией

## 🚀 Быстрый старт

### 1. Установка

```bash
git clone https://github.com/creapunk/creapunk-docs.git
cd creapunk-docs
npm install
```

### 2. Настройка

Отредактируйте `config.yaml`:

```yaml
site:
  name: "Ваш проект"
  title: "Описание проекта"
  baseUrl: "https://username.github.io/repository"

build:
  input:
    githubRepositories:
      - url: "https://github.com/username/repo1"
        description: "Описание репозитория"
        alias: "Repo1"  # Псевдоним для сокращения названия
```

### 3. Сборка

```bash
# Локальная сборка
npm run build:all

# Сборка с оптимизацией
npm run build:optimized
```

### 4. Деплой на GitHub Pages

**Быстрая настройка:**

1. Обновите `baseUrl` в `config.yaml`
2. Включите GitHub Pages: Settings → Pages → Source: **GitHub Actions**
3. Закоммитьте и запушьте изменения

**Подробная инструкция:** [GITHUB_PAGES_НАСТРОЙКА.md](GITHUB_PAGES_НАСТРОЙКА.md)

#### Псевдонимы репозиториев

Поле `alias` позволяет задать короткое имя для репозитория:

- **Без псевдонима**: `https://github.com/creapunk/CLN-ClosedLoopNemaDriver` → папка `creapunk-CLN-ClosedLoopNemaDriver`
- **С псевдонимом**: `alias: "CLN"` → папка `CLN`

Это особенно полезно для длинных названий репозиториев, делая пути к файлам более читаемыми.

### 3. Локальное тестирование

```bash
npm run build:test
```

### 4. Деплой

#### GitHub Pages
1. Settings → Pages → Source: "GitHub Actions"
2. Пуш в main ветку запустит автоматическую сборку

#### Netlify
1. Подключите репозиторий в Netlify Dashboard
2. Настройки подтянутся автоматически из `netlify.toml`

## 📋 Команды

| Команда | Описание |
|---------|----------|
| `npm run build` | Основная сборка (build-all-v2.js) |
| `npm run build:all` | То же что и build |
| `npm run build:netlify` | Сборка для Netlify |
| `npm run build:clean` | Очистка + сборка |
| `npm run build:test` | Тестовая сборка с отчетом |
| `npm run cache:clear` | Очистить весь кеш |
| `npm run cache:info` | Информация о кеше |
| `npm run index:check` | Проверка индекса |
| `npm run search:test` | Тестирование поискового индекса |

## 🔧 Автоматизация

### Что происходит автоматически:

- ⏰ **Проверка каждые 12 часов** - система проверяет изменения в отслеживаемых репозиториях
- 🔄 **Инкрементальные обновления** - обновляются только измененные файлы
- 💾 **Кеширование** - ускоряет повторные сборки
- 🚀 **Автоматический деплой** - при изменениях в основном проекте
- 🖼️ **Умная оптимизация изображений** - оптимизируются только новые файлы

### Триггеры пересборки:

1. **Изменения в основном проекте** → полная пересборка
2. **Изменения в отслеживаемых репозиториях** → обновление только этих репозиториев  
3. **Ручной запуск** → сборка по требованию
4. **По расписанию** → каждые 12 часов

## 🎨 Оптимизация

### Умная оптимизация изображений

Система автоматически оптимизирует изображения, отслеживая уже обработанные файлы:

```bash
# Оптимизация только новых изображений
npm run optimize:images:smart

# Анализ всех изображений
npm run optimize:images
```

**Результаты:**
- GIF: до 80% экономии размера
- PNG: до 30% экономии размера
- JPEG: до 30% экономии размера
- SVG: до 20% экономии размера

### Кеширование

Кешируются:
- ✅ Скачанные репозитории
- ✅ Оптимизированные изображения
- ✅ Метаданные репозиториев
- ✅ Хеши оптимизированных файлов

**Ускорение:** с 5 минут до 30-60 секунд!

## 📚 Документация

### Основная документация
- 📖 [Архитектура](ARCHITECTURE.md) - архитектура системы генерации сайта
- 🔧 [Русская архитектура](АРХИТЕКТУРА.md) - архитектура на русском языке
- 🔍 [Поиск](docs/SEARCH_RU.md) - документация по поисковому движку
- 🔍 [Search Engine](docs/SEARCH.md) - search engine documentation (EN)
- 🐛 [Отладка поиска](docs/SEARCH_TROUBLESHOOTING.md) - решение проблем с поиском

### GitHub Pages
- 🚀 [Настройка GitHub Pages](GITHUB_PAGES_НАСТРОЙКА.md) - быстрая инструкция (RU)
- 📖 [GitHub Pages Setup](GITHUB_PAGES_SETUP.md) - подробная документация (EN)
- ✅ [Чеклист](GITHUB_PAGES_CHECKLIST.md) - проверка настройки
- 📋 [Сводка](СВОДКА_НАСТРОЙКИ.md) - что было сделано

## 🎯 Примеры использования

### Документация проекта
```yaml
build:
  input:
    githubRepositories:
      - url: "https://github.com/username/main-project"
        description: "Основной проект"
        alias: "MainProject"  # Псевдоним для сокращения названия
    directories:
      - "./docs"
      - "./wiki"
```

### Мульти-репозиторий документация
```yaml
build:
  input:
    githubRepositories:
      - url: "https://github.com/org/backend"
        description: "Backend API"
        alias: "Backend"  # Псевдоним для сокращения названия
      - url: "https://github.com/org/frontend"  
        description: "Frontend App"
      - url: "https://github.com/org/mobile"
        description: "Mobile App"
```

## 🔍 Мониторинг

### GitHub Actions
- Перейдите в Actions → Build and Deploy
- Смотрите логи сборки и статус

### Netlify
- Dashboard → Site overview  
- Deploys → Deploy log

## ⚡ Оптимизация

### Ускорение сборки
- ✅ Используйте кеширование
- ✅ Добавляйте только нужные репозитории
- ✅ Автоматическое сжатие изображений

### Оптимизация изображений
Система автоматически сжимает все изображения при сборке:
- **JPEG/JPG** - качество 85% (экономия ~30-40%)
- **PNG** - качество 70-90% (экономия ~40-60%)
- **GIF** - оптимизация уровня 2
- **SVG** - минификация с сохранением структуры

```bash
npm run build  # Автоматически оптимизирует изображения
```

Подробнее: [IMAGE_OPTIMIZATION.md](IMAGE_OPTIMIZATION.md)

### Экономия ресурсов  
- ✅ 12-часовой интервал предотвращает частые сборки
- ✅ Инкрементальные обновления экономят время
- ✅ Умное кеширование ускоряет повторные сборки
- ✅ Автоматическое сжатие изображений экономит трафик

## 🆘 Поддержка

### Частые проблемы

**Сборка не запускается:**
```bash
# Проверьте права доступа
# Settings → Actions → General → Workflow permissions
```

**Кеш не работает:**
```bash
npm run cache:clear
npm run build:all
```

**Репозитории не обновляются:**
```bash
# Проверьте конфигурацию
node -e "console.log(require('js-yaml').load(require('fs').readFileSync('config.yaml', 'utf8')))"
```

### Получить помощь

- 🐛 [Issues](https://github.com/creapunk/creapunk-docs/issues) - сообщить о проблеме
- 💬 [Discussions](https://github.com/creapunk/creapunk-docs/discussions) - задать вопрос
- 📧 [Email](mailto:support@creapunk.com) - техническая поддержка

## 🤝 Участие в разработке

1. Fork репозитория
2. Создайте feature ветку
3. Внесите изменения
4. Создайте Pull Request

## 📄 Лицензия

MIT License - см. [LICENSE](LICENSE) файл

---

**Сделано с ❤️ командой [Creapunk](https://creapunk.com)**

**Version:** 2.1  
**Revision:** Rev C  
**Status:** Active  
**Price:** ~$3 BOM (excl TAX)
**Interfaces:** USB-C, CAN-FD, Step/Dir

**Key Features:**
- 6A continuous `current`, 8A peak
- 10-50V **input** voltage ~~range~~
- 15-bit *absolute* encoder feedback
- Thermal mana<sub>gement</sub> and protection mana<sup>gement</sup>

[Buy it here](ff)



## Features
### 🎓Closed-Loop Control

Eliminates step loss in demanding applications using rotary encoder feedback.

### 🎓Closed-Loop Control

Step/Direction for CNC, UART for configuration, CAN-FD for networked systems.

### 🎓[Thermal  Closed-Loop Control](dfd)

Integrated heat dissipation with optional external heatsink mounting.

---

## Specifications

### Electrical Parameters

| Parameter | Min | Typ | Max | Unit |
|-----------|-----|-----|-----|------|
| Input Voltage | 10 | 24 | 50 | V |
| Continuous Current | - | 6 | - | A |
| Peak Current | - | - | 8 | A |

### Control

- **Microstepping:** 1/1 to 1/256
- **PWM Frequency:** 25 kHz (configurable 15-50 kHz)
- **Logic Voltage:** 3.3V/5V compatible
- **Microstepping:** 1/1 to 1/256
- **PWM Frequency:** 25 kHz (configurable 15-50 kHz)
- **Logic Voltage:** 3.3V/5V compatible
- **Microstepping:** 1/1 to 1/256
- **PWM Frequency:** 25 kHz (configurable 15-50 kHz)
- **Logic Voltage:** 3.3V/5V compatible

### Physical

- 🎓**Dimensions:** 50mm × 40mm × 15mm
- 🎓**PCB Layers:** 4-layer with optimized thermal design
- 🎓**Connectors:** JST-PH 2.0mm power, 2.54mm headers

Allow 5mm `f` clearance [on](аа) all sides **during***installation*.

> Allow 5mm `f` clearance [on](аа) all sides **during***installation*.

> [!NOTE]
> Allow 5mm `f` clearance [on](аа) all sides **during***installation*.
> Allow 5mm `f` clearance [on](аа) all sides **during***installation*.

## Applications

1. [🎓**CNC Machines**](creapunk.com) - Precise multi-axis positioning
2. 🎓**3D Printers** - Reliable extruder and motion control
3. 🎓**Laboratory Equipment** - Precision sample positioning
4. 🎓**Robotics** - Actuator and joint control
- 🎓 Learning Platforms - jj
- 🛠️ CNC Machines & 3D printers: dkkfd
* 🛠️ CNC Machines & 3D printers: dkkfd

### 🛠️ industioal
gfggfhnjdh

### ![img](dd.png) automotive
fdkljfkjv

### ![img](dd.png) automohhtive
fdkljfkjv


---

## Getting Started

### Quick Start

1. Connect 12-48V power supply
2. Attach NEMA17 stepper motor
3. Send Step/Dir signals

#### Warnings

> [!NOTE] 
> Highlights information that users should take into account, even when skimming.

> [!TIP]
> Optional information to help a user be more successful.
>
> Allow 5mm `f` clearance [on](аа) all sides **during***installation*.
> Allow 5mm `f` clearance [on](аа) all sides **during***installation*.
> Allow 5mm `f` clearance [on](аа) all sides **during***installation*.
>
> Allow 5mm `f` clearance [on](аа) all sides **during***installation*.
> Allow 5mm `f` clearance [on](аа) all sides **during***installation*.
> Allow 5mm `f` clearance [on](аа) all sides **during***installation*.

> [!IMPORTANT]  
> Crucial information necessary for users to succeed.
>
> Allow 5mm `f` clearance [on](аа) all sides **during***installation*.
> Allow 5mm `f` clearance [on](аа) all sides **during***installation*.
> Allow 5mm `f` clearance [on](аа) all sides **during***installation*.

> [!WARNING]  
> Critical content demanding immediate user attention due to potential risks.

> [!CAUTION]
> Negative potential consequences of an action

## Setupd

- ![d](d)  Collaborative Robots 
- 🔭 Camera & Telescope Stabilization Systems
- 🔭 Laboratory Equipment
- 🏭 Industrial Motion Control Systems

``` python
# Example Python code for basic stepping
import RPi.GPIO as GPIO
 import time

STEP_PIN = 17
 DIR_PIN = 18

GPIO.setmode(GPIO.BCM)
 GPIO.setup(STEP_PIN, GPIO.OUT)
 GPIO.setup(DIR_PIN, GPIO.OUT)

def rotate_motor(steps, direction):
 GPIO.output(DIR_PIN, direction)
 for _ in range(steps):
 GPIO.output(STEP_PIN, GPIO.HIGH)
 time.sleep(0.001)
 GPIO.output(STEP_PIN, GPIO.LOW)
 time.sleep(0.001)

# Rotate 200 steps clockwise

```

----

### How to Calibrate the Sensor

Follow these steps in order:

1. Power on the device and wait 30 seconds for warmup
2. Press and hold the calibration button for 5 seconds
3. Release when the LED starts blinking green
4. Wait for the automatic calibration cycle to complete
5. Verify the calibration by checking the output values

The calibration process takes approximately 2 minutes.

## Analytics and Tracking

This documentation site supports Google Analytics 4 integration for tracking visitor behavior and site performance.

### Configuration

To enable analytics, update your `config.yaml`:

```yaml
analytics:
  googleAnalytics:
    enabled: true
    measurementId: "G-XXXXXXXXXX"  # Replace with your Measurement ID
  tracking:
    externalLinks: true
    downloads: true
    scrollTracking: true
    timeOnPage: true
```

### What's Tracked

- Page views and navigation
- Button clicks and interactions
- External link clicks
- File downloads
- Scroll depth (25%, 50%, 75%, 90%)
- Time spent on pages

For detailed setup instructions, see the analytics configuration section in config.yaml.


## 🎯 Интерактивные селекторы

Создавайте интерактивные переключатели для различных вариантов (менеджеры пакетов, фреймворки, инструменты) с автоматической синхронизацией.

### Быстрый пример

```markdown
Choose your package manager: [ **NPM** ](#npm) | [ **Yarn** ](#yarn) | [ **PNPM** ](#pnpm)

#### NPM
`npm install my-package`

#### Yarn
`yarn add my-package`

#### PNPM
`pnpm add my-package`
```

### Особенности

- ✅ Автоматическая синхронизация между селекторами с одинаковыми опциями
- ✅ Плавные анимации переключения
- ✅ Адаптивный дизайн для всех устройств
- ✅ Поддержка якорей для прямых ссылок
- ✅ Направленная синхронизация (только вниз по странице)

### Документация

Интерактивные селекторы позволяют создавать переключатели между различными вариантами (менеджеры пакетов, фреймворки и т.д.) с автоматической синхронизацией выбора на странице.

### Тестирование

```bash
# Конвертировать тестовый файл
node converter.js test-files/selector-test.md dist/selector-test.html

# Открыть в браузере
start dist/selector-test.html
```
