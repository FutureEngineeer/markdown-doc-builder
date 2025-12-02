# Кастомные функции Markdown

Полное руководство по всем специальным возможностям markdown в генераторе документации.

---

## 📋 1. Overview (Карточка продукта)

Создает красивую карточку продукта с изображением, статусом, ценой и характеристиками.

### Синтаксис

```markdown
# Название продукта

## Project Overview

![Product Image](image.png)

**Revision:** v2.0
**Status:** Active
**Price:** $99 (Pre-order available)

Краткое описание продукта.
Может быть несколько строк.

**Key Features:**
- Первая особенность
- Вторая особенность
- Третья особенность

**Interfaces:** USB, UART, SPI
**Tags:** Hardware, Driver, Open Source

---
```

### Поддерживаемые поля

| Поле | Формат | Описание |
|------|--------|----------|
| `**Revision:**` | Текст | Версия продукта (v1.0, v2.5, etc.) |
| `**Version:**` | Текст | Альтернатива Revision |
| `**Status:**` | Текст | Статус (Active, Preview, Obsolete, etc.) |
| `**Price:**` | Текст | Цена с опциональной заметкой в скобках |
| `**Cost:**` | Текст | Альтернатива Price |
| `**Key Features:**` | Список | Ключевые особенности (после списком) |
| `**Interfaces:**` | Через запятую | Интерфейсы подключения |
| `**Tags:**` | Через запятую | Теги для категоризации |

### Статусы

Статус автоматически окрашивается:
- **Active/Stable/Released** → зеленый
- **Preview/Beta/Development** → синий
- **Obsolete** → красный
- **Not Recommended/Deprecated** → желтый

### Пример

```markdown
# CLN17 v2.0

## Product Overview

> ![CLN17](cln17-image.png)
> 
> **Revision:** v2.0
> **Status:** Active
> **Price:** $45 (Pre-order $40)
> 
> Closed-loop stepper motor driver with advanced features.
> Supports NEMA17 motors with high precision control.
> 
> **Key Features:**
> - Closed-loop control
> - Silent operation
> - USB configuration
> - Real-time monitoring
> 
> **Interfaces:** USB, UART, Step/Dir
> **Tags:** Hardware, Motor Driver, Open Source

---
```

---

## 🎴 2. Feature Cards (Карточки функций)

Автоматически преобразует списки или подзаголовки с эмодзи в красивые карточки.

### Вариант 1: Список

```markdown
## Features

- 🚀 **Fast Performance** - Lightning-fast processing with optimized algorithms
- 🔒 **Secure** - End-to-end encryption for all data
- 🎨 **Customizable** - Fully customizable themes and layouts
- 📱 **Responsive** - Works on all devices
```

### Вариант 2: Подзаголовки

```markdown
## Features

### 🚀 Fast Performance
Lightning-fast processing with optimized algorithms.
Works seamlessly with large datasets.

### 🔒 Secure
End-to-end encryption for all data.
Industry-standard security protocols.

### 🎨 Customizable
Fully customizable themes and layouts.
Easy to configure.
```

### Правила

1. **Эмодзи обязательны** - без эмодзи карточки не создаются
2. **Минимум 2 элемента** - нужно минимум 2 элемента для карточек
3. **Описание до 40 слов** - длинные описания обрезаются
4. **Ссылки поддерживаются** - `[Title](url)` делает карточку кликабельной

### Секции для карточек

Карточки автоматически создаются в секциях:
- `## Features`
- `## Applications`
- `## Resources`

### Сетка карточек

Автоматически определяется:
- 1 карточка → полная ширина
- 2 карточки → 2 колонки
- 3 карточки → 3 колонки
- 4 карточки → 4 колонки
- 5+ карточек → 3-5 колонок (зависит от длины описаний)

---

## 📊 3. Specification Cards (Карточки спецификаций)

Создает карточки с техническими характеристиками.

### Вариант 1: Секция Specifications

```markdown
## Specifications

### Hardware
- **MCU:** STM32F103
- **Clock:** 72 MHz
- **RAM:** 20 KB
- **Flash:** 64 KB

### Power
- **Input Voltage:** 12-24V DC
- **Current:** Up to 2A
- **Power:** 24W max
```

### Вариант 2: Документ спецификации

Если H1 содержит слово "Specification", все H2 становятся карточками:

```markdown
# CLN17 Specification

## Hardware Specifications
- **MCU:** STM32F103
- **Clock:** 72 MHz

## Electrical Specifications
- **Voltage:** 12-24V
- **Current:** 2A max

## Mechanical Specifications
- **Size:** 50x50mm
- **Weight:** 25g
```

### Вложенные списки

Поддерживаются вложенные списки:

```markdown
### Pin Configuration
- **Pin 1:** VCC
  - Voltage: 5V
  - Current: 500mA max
- **Pin 2:** GND
  - Ground reference
```

### Alerts в спецификациях

Используйте markdown alerts:

```markdown
### Safety Notes

> [!WARNING]
> High voltage! Disconnect power before maintenance.

> [!NOTE]
> Use shielded cables for best performance.
```

---

## 🔄 4. Interactive Selectors (Интерактивные селекторы)

Создает переключаемые вкладки для разных вариантов (NPM/Yarn, Windows/Linux, etc.).

### Синтаксис

```markdown
Choose your package manager: [ **NPM** ](#npm) | [ **Yarn** ](#yarn) | [ **PNPM** ](#pnpm)

### NPM
```bash
npm install package-name
```

### Yarn
```bash
yarn add package-name
```

### PNPM
```bash
pnpm add package-name
```
```

### Правила

1. **Формат селектора:** `Hint: [ **Option1** ](#anchor1) | [ **Option2** ](#anchor2)`
2. **Заголовки должны совпадать** с названиями опций
3. **Якоря не обязательны** - используются для идентификации
4. **Контент до следующего заголовка** того же уровня

### Синхронизация

Селекторы с одинаковыми опциями синхронизируются автоматически:

```markdown
Choose OS: [ **Windows** ](#win) | [ **Linux** ](#linux) | [ **macOS** ](#mac)

### Windows
Windows instructions...

### Linux
Linux instructions...

### macOS
macOS instructions...

---

Choose shell: [ **Windows** ](#win) | [ **Linux** ](#linux) | [ **macOS** ](#mac)

### Windows
PowerShell commands...

### Linux
Bash commands...

### macOS
Zsh commands...
```

При выборе "Windows" в первом селекторе, автоматически выберется "Windows" во втором.

### Примеры использования

**Менеджеры пакетов:**
```markdown
Choose: [ **NPM** ](#npm) | [ **Yarn** ](#yarn) | [ **PNPM** ](#pnpm)
```

**Операционные системы:**
```markdown
Select OS: [ **Windows** ](#win) | [ **Linux** ](#linux) | [ **macOS** ](#mac)
```

**Языки программирования:**
```markdown
Language: [ **JavaScript** ](#js) | [ **TypeScript** ](#ts) | [ **Python** ](#py)
```

**Версии:**
```markdown
Version: [ **v1.0** ](#v1) | [ **v2.0** ](#v2) | [ **v3.0** ](#v3)
```

---

## 🔗 5. Anchor Links (Якорные ссылки)

Все заголовки автоматически получают якорные ссылки.

### Автоматическая генерация

```markdown
## My Section Title
```

Создает:
```html
<h2 id="my-section-title">
  My Section Title
  <a href="#my-section-title" class="anchor-link">🔗</a>
</h2>
```

### Правила генерации ID

- Lowercase
- Пробелы → дефисы
- Спец символы удаляются
- Уникальность (добавляется `-1`, `-2` при дубликатах)

### Примеры

| Заголовок | ID |
|-----------|-----|
| `## Getting Started` | `getting-started` |
| `## API Reference` | `api-reference` |
| `## FAQ` | `faq` |
| `## v2.0 Release` | `v20-release` |

---

## 📸 6. Images (Изображения)

Автоматическая обработка и оптимизация изображений.

### Синтаксис

```markdown
![Alt text](path/to/image.png)
```

### Поддерживаемые пути

**Относительные:**
```markdown
![Image](./images/photo.png)
![Image](../assets/logo.png)
```

**Абсолютные от корня:**
```markdown
![Image](/assets/images/banner.png)
```

**Assets:**
```markdown
![Image](assets/logo.png)
```

**URL:**
```markdown
![Image](https://example.com/image.png)
```

### Автоматическая обработка

1. **Оптимизация** - сжатие до 85% качества
2. **Resize** - максимум 1920x1080px
3. **Дедупликация** - одинаковые изображения не копируются дважды
4. **Организация** - все в `dist/assets/images/`

### Структура хранения

```
dist/assets/images/
  root/           # Изображения из корневой папки assets
  website/        # Изображения из website/
  project-alpha/  # Изображения из project-alpha/
```

---

## 📝 7. Markdown Alerts

Используйте GitHub-style alerts для важных заметок.

### Синтаксис

```markdown
> [!NOTE]
> Полезная информация для пользователей.

> [!TIP]
> Совет для лучшего использования.

> [!IMPORTANT]
> Ключевая информация.

> [!WARNING]
> Критическая информация о рисках.

> [!CAUTION]
> Негативные последствия действий.
```

### Типы

| Тип | Цвет | Использование |
|-----|------|---------------|
| `NOTE` | Синий | Общая информация |
| `TIP` | Зеленый | Полезные советы |
| `IMPORTANT` | Фиолетовый | Важная информация |
| `WARNING` | Оранжевый | Предупреждения |
| `CAUTION` | Красный | Опасность |

---

## 🎯 8. Sections (Секции)

H2 заголовки автоматически создают секции с якорями.

### Автоматическое создание

```markdown
## Features

Content here...

## Installation

More content...
```

Создает:
```html
<section id="features" class="section">
  <h2 id="features">Features</h2>
  <div class="section-content">
    Content here...
  </div>
</section>

<section id="installation" class="section">
  <h2 id="installation">Installation</h2>
  <div class="section-content">
    More content...
  </div>
</section>
```

### Специальные секции

Некоторые секции обрабатываются особым образом:

- `## Overview` → Product card
- `## Features` → Feature cards
- `## Applications` → Application cards
- `## Resources` → Resource cards
- `## Specifications` → Spec cards

---

## 💡 9. Inline Formatting

Стандартный markdown с расширениями.

### Базовый синтаксис

```markdown
**Bold text**
*Italic text*
`Code inline`
[Link](url)
```

### Код

**Inline:**
```markdown
Use `npm install` to install packages.
```

**Блоки:**
````markdown
```javascript
const hello = "world";
console.log(hello);
```
````

### Списки

**Неупорядоченные:**
```markdown
- Item 1
- Item 2
  - Nested item
```

**Упорядоченные:**
```markdown
1. First
2. Second
3. Third
```

### Таблицы

```markdown
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |
```

---

## 🎨 10. Spoilers (Спойлеры)

Создает раскрывающиеся блоки контента.

### Синтаксис

```markdown
<details>
<summary>Click to expand</summary>

Hidden content here.

Can include:
- Lists
- Code blocks
- Images
- Any markdown

</details>
```

### Открытый по умолчанию

```markdown
<details open>
<summary>Already expanded</summary>

This content is visible by default.

</details>
```

### Вложенные спойлеры

```markdown
<details>
<summary>Level 1</summary>

Content level 1

<details>
<summary>Level 2</summary>

Content level 2

</details>

</details>
```

---

## 📋 Полный пример

```markdown
# CLN17 v2.0 Stepper Driver

## Product Overview

> ![CLN17](cln17.png)
> 
> **Revision:** v2.0
> **Status:** Active
> **Price:** $45 (Pre-order $40)
> 
> Advanced closed-loop stepper motor driver for NEMA17 motors.
> Features silent operation and USB configuration.
> 
> **Key Features:**
> - Closed-loop control with encoder feedback
> - Silent operation (< 40dB)
> - USB configuration interface
> - Real-time monitoring
> 
> **Interfaces:** USB, UART, Step/Dir
> **Tags:** Hardware, Motor Driver, Open Source

---

## Features

- 🎯 **Precision Control** - 0.1° positioning accuracy
- 🔇 **Silent Operation** - Whisper-quiet performance
- ⚡ **Fast Response** - < 1ms reaction time
- 🔧 **Easy Setup** - Plug and play configuration

## Installation

Choose your package manager: [ **NPM** ](#npm) | [ **Yarn** ](#yarn)

### NPM
```bash
npm install cln17-driver
```

### Yarn
```bash
yarn add cln17-driver
```

## Specifications

### Hardware
- **MCU:** STM32F103
- **Clock:** 72 MHz
- **RAM:** 20 KB
- **Flash:** 64 KB

### Electrical
- **Input Voltage:** 12-24V DC
- **Current:** Up to 2A per phase
- **Power:** 24W maximum

> [!WARNING]
> Always disconnect power before connecting motors!

## Applications

- 🤖 **Robotics** - Precise robot arm control
- 🖨️ **3D Printing** - High-quality prints
- 📷 **Camera Sliders** - Smooth motion control
- 🔬 **Lab Equipment** - Precision positioning

## Resources

- 📚 [Documentation](docs.md)
- 💻 [GitHub Repository](https://github.com/user/cln17)
- 🎥 [Video Tutorial](https://youtube.com/watch?v=xxx)
- 💬 [Community Forum](https://forum.example.com)

## FAQ

<details>
<summary>How to update firmware?</summary>

1. Download latest firmware
2. Connect via USB
3. Run update tool
4. Wait for completion

</details>

<details>
<summary>What motors are supported?</summary>

All NEMA17 stepper motors with:
- Voltage: 12-24V
- Current: < 2A per phase
- Steps: 200 or 400 per revolution

</details>
```

---

## 🚀 Советы по использованию

### 1. Структура документа

```markdown
# Заголовок (H1) - только один

## Overview - карточка продукта (опционально)

## Features - карточки функций

## Installation - инструкции с селекторами

## Specifications - технические характеристики

## Applications - примеры использования

## Resources - полезные ссылки

## FAQ - частые вопросы со спойлерами
```

### 2. Эмодзи для карточек

Используйте релевантные эмодзи:
- 🚀 Производительность
- 🔒 Безопасность
- 🎨 Дизайн
- 📱 Мобильность
- ⚡ Скорость
- 🔧 Настройка
- 📊 Аналитика
- 🌐 Интернационализация

### 3. Изображения

- Используйте WebP для лучшего сжатия
- Оптимальный размер: 1200x800px
- Alt text обязателен для SEO
- Храните в `assets/images/`

### 4. Селекторы

- Используйте для альтернативных инструкций
- Группируйте похожие опции
- Синхронизация работает автоматически

### 5. Alerts

- NOTE - для дополнительной информации
- TIP - для полезных советов
- WARNING - для важных предупреждений
- CAUTION - для критических моментов

---

## 📚 Дополнительные ресурсы

- [DOC_CONFIG_FORMAT.md](DOC_CONFIG_FORMAT.md) - формат конфигурации
- [DOC_CONFIG_EXAMPLES.md](DOC_CONFIG_EXAMPLES.md) - примеры структур
- [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) - миграция проектов
