document.addEventListener('DOMContentLoaded', () => {
    hljs.highlightAll();

    // Прокрутка к верху страницы при загрузке
    window.scrollTo(0, 0);

    // Динамический расчет отступов main
    adjustMainMargins();

    // Анимация появления main контента через 0.4 секунды
    setTimeout(() => {
        const main = document.querySelector('main');
        if (main) {
            main.classList.add('loaded');
        }
    }, 400);
});

// Функция для динамического расчета отступов main
function adjustMainMargins() {
    const footer = document.querySelector('footer');
    const main = document.querySelector('main');

    if (!footer || !main) return;

    // Получаем реальную высоту header и footer
    const footerHeight = footer.offsetHeight;

    // Устанавливаем отступы для main
    main.style.marginBottom = `${footerHeight}px`;
}

// Пересчитываем отступы при изменении размера окна
window.addEventListener('resize', adjustMainMargins);


// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href !== '#') {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    });
});

// ============================================


// Scroll animations
const observerOptions = {
    threshold: 0.025,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

document.querySelectorAll('.section, .card, .alert, .code-block').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    observer.observe(el);
});


// Базовый отступ для всех строк в px
const BASE_INDENT_PX = 10;

// Декодирование HTML entities
function decodeHTMLEntities(text) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
}

// Определение языка из классов
function detectLanguage(codeElement) {
    const classes = Array.from(codeElement.classList);

    for (let className of classes) {
        if (className.startsWith('language-')) {
            return className.replace('language-', '');
        }
    }

    return null;
}

// Подсчет количества начальных пробелов в строке
function countLeadingSpaces(text) {
    const match = text.match(/^(\s*)/);
    return match ? match[1].length : 0;
}

// Обертывание pre в code-block
function wrapCodeBlocks() {
    document.querySelectorAll('pre > code').forEach(codeElement => {
        const preElement = codeElement.parentElement;

        // Проверяем, не обернут ли уже
        if (preElement.parentElement.classList.contains('code-block')) {
            return;
        }

        // Создаем обертку
        const wrapper = document.createElement('div');
        wrapper.className = 'code-block';

        // Создаем элемент для языка
        const langElement = document.createElement('span');
        langElement.className = 'code-lang';

        // Вставляем обертку перед pre
        preElement.parentNode.insertBefore(wrapper, preElement);

        // Перемещаем pre внутрь обертки
        wrapper.appendChild(langElement);
        wrapper.appendChild(preElement);
    });
}

// Добавление кнопки копирования
function addCopyButtons() {
    document.querySelectorAll('.code-block pre').forEach(preBlock => {
        if (preBlock.querySelector('.code-copy-btn')) return;

        const button = document.createElement('button');
        button.className = 'code-copy-btn';
        button.textContent = '⧉';
        button.setAttribute('aria-label', 'Copy code');

        button.addEventListener('click', function () {
            copyCode(preBlock, button);
        });

        preBlock.appendChild(button);
    });
}

// Добавление номеров строк с поддержкой переносов
function addLineNumbers() {
    document.querySelectorAll('.code-block code').forEach(codeBlock => {
        if (codeBlock.querySelector('.code-line-wrapper')) return;

        // Декодируем HTML entities перед обработкой
        const decodedText = decodeHTMLEntities(codeBlock.textContent);
        codeBlock.textContent = decodedText;

        // Применяем подсветку синтаксиса
        hljs.highlightElement(codeBlock);

        const highlightedHTML = codeBlock.innerHTML;
        let lines = highlightedHTML.split('\n');

        // Удаляем пустые строки в начале и конце
        while (lines.length > 0 && lines[0].trim() === '') {
            lines.shift();
        }
        while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
            lines.pop();
        }

        codeBlock.innerHTML = '';

        lines.forEach((line, index) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'code-line-wrapper';

            const lineNum = document.createElement('div');
            lineNum.className = 'code-line-num';
            lineNum.textContent = index + 1;

            const codeLine = document.createElement('div');
            codeLine.className = 'code-line';

            // Создаем временный элемент для подсчета пробелов
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = line || ' ';
            const textContent = tempDiv.textContent;

            // Подсчитываем начальные пробелы
            const leadingSpaces = countLeadingSpaces(textContent);

            // Удаляем начальные пробелы из HTML
            let processedLine = line;
            if (leadingSpaces > 0) {
                // Удаляем начальные пробелы
                processedLine = textContent.slice(leadingSpaces);

                // Применяем подсветку синтаксиса к обработанной строке
                tempDiv.textContent = processedLine;
                const tempCode = document.createElement('code');
                tempCode.className = codeBlock.className;
                tempCode.textContent = processedLine;
                hljs.highlightElement(tempCode);
                processedLine = tempCode.innerHTML;
            }

            codeLine.innerHTML = processedLine || ' ';

            // Применяем отступ через CSS с базовым отступом 40px
            // Формула: BASE_INDENT_PX + leadingSpaces + 2ch (для компенсации отрицательного text-indent)
            // text-indent: -2ch создает висячий отступ
            const totalPaddingCh = leadingSpaces + 2; // +2ch для висячего отступа
            codeLine.style.paddingLeft = `calc(${BASE_INDENT_PX}px + ${totalPaddingCh}ch)`;
            codeLine.style.textIndent = `-2ch`;

            // Сохраняем leadingSpaces как data-атрибут для копирования
            codeLine.setAttribute('data-leading-spaces', leadingSpaces);

            wrapper.appendChild(lineNum);
            wrapper.appendChild(codeLine);
            codeBlock.appendChild(wrapper);
        });
    });
}
// Добавляем Map для хранения активных таймеров
const copyTimeouts = new Map();

// Копирование кода с восстановлением пробелов
function copyCode(preBlock, button) {
    // Отменяем предыдущий таймер, если он есть
    if (copyTimeouts.has(button)) {
        clearTimeout(copyTimeouts.get(button));
        copyTimeouts.delete(button);
    }

    const codeLines = preBlock.querySelectorAll('.code-line');

    const codeText = Array.from(codeLines).map(line => {
        // Получаем исходное количество пробелов из data-атрибута
        const leadingSpaces = parseInt(line.getAttribute('data-leading-spaces') || '0', 10);
        const spaces = ' '.repeat(leadingSpaces);

        return spaces + line.textContent;
    }).join('\n');

    navigator.clipboard.writeText(codeText).then(() => {
        // Сохраняем оригинальный текст в data-атрибуте при первом нажатии
        if (!button.hasAttribute('data-original-text')) {
            button.setAttribute('data-original-text', button.textContent);
        }

        button.textContent = '✓';
        button.style.background = '#2FB65A';

        const timeoutId = setTimeout(() => {
            button.textContent = button.getAttribute('data-original-text');
            button.style.background = '';
            copyTimeouts.delete(button);
        }, 2000);

        // Сохраняем ID таймера
        copyTimeouts.set(button, timeoutId);
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}


// Проверка и настройка языка
function checkAndSetupLanguage() {
    document.querySelectorAll('.code-block').forEach(block => {
        const codeElement = block.querySelector('code');
        const langElement = block.querySelector('.code-lang');

        if (!codeElement) return;

        const language = detectLanguage(codeElement);

        if (language) {
            block.classList.add('has-lang');
            if (langElement) {
                langElement.textContent = language;
                langElement.classList.add('active');
            }
        } else {
            block.classList.remove('has-lang');
            if (langElement) {
                langElement.classList.remove('active');
            }
        }
    });
}

// Google Analytics функции
function trackEvent(eventName, parameters = {}) {
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, parameters);
    }
}

function trackExternalLink(url, linkText) {
    trackEvent('click', {
        event_category: 'external_link',
        event_label: url,
        link_text: linkText
    });
}

function trackDownload(filename, url) {
    trackEvent('file_download', {
        event_category: 'download',
        event_label: filename,
        file_url: url
    });
}

function trackScrollDepth(percentage) {
    trackEvent('scroll', {
        event_category: 'engagement',
        event_label: `${percentage}%`,
        value: percentage
    });
}

// Отслеживание внешних ссылок
function setupExternalLinkTracking() {
    document.querySelectorAll('a[href^="http"]').forEach(link => {
        if (!link.hostname.includes(window.location.hostname)) {
            link.addEventListener('click', function(e) {
                const url = this.href;
                const linkText = this.textContent.trim();
                trackExternalLink(url, linkText);
            });
        }
    });
}

// Отслеживание скачиваний
function setupDownloadTracking() {
    const downloadExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.zip', '.rar', '.exe', '.dmg'];
    
    document.querySelectorAll('a').forEach(link => {
        const href = link.getAttribute('href');
        if (href && downloadExtensions.some(ext => href.toLowerCase().includes(ext))) {
            link.addEventListener('click', function(e) {
                const filename = href.split('/').pop();
                trackDownload(filename, href);
            });
        }
    });
}

// Отслеживание прокрутки
function setupScrollTracking() {
    let scrollDepths = [25, 50, 75, 90];
    let trackedDepths = new Set();
    
    function checkScrollDepth() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = Math.round((scrollTop / docHeight) * 100);
        
        scrollDepths.forEach(depth => {
            if (scrollPercent >= depth && !trackedDepths.has(depth)) {
                trackedDepths.add(depth);
                trackScrollDepth(depth);
            }
        });
    }
    
    let scrollTimeout;
    window.addEventListener('scroll', function() {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(checkScrollDepth, 100);
    });
}

// Отслеживание времени на странице
function setupTimeTracking() {
    const startTime = Date.now();
    
    // Отправляем событие каждые 30 секунд
    setInterval(() => {
        const timeSpent = Math.round((Date.now() - startTime) / 1000);
        trackEvent('time_on_page', {
            event_category: 'engagement',
            event_label: 'time_milestone',
            value: timeSpent
        });
    }, 30000);
    
    // Отправляем финальное время при уходе со страницы
    window.addEventListener('beforeunload', function() {
        const timeSpent = Math.round((Date.now() - startTime) / 1000);
        trackEvent('page_exit', {
            event_category: 'engagement',
            event_label: 'total_time',
            value: timeSpent
        });
    });
}

// Отслеживание кликов по кнопкам
function setupButtonTracking() {
    document.querySelectorAll('button, .btn').forEach(button => {
        button.addEventListener('click', function() {
            const buttonText = this.textContent.trim();
            const buttonClass = this.className;
            
            trackEvent('button_click', {
                event_category: 'interaction',
                event_label: buttonText,
                button_class: buttonClass
            });
        });
    });
}

// Отслеживание навигации по разделам
function setupSectionTracking() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', function() {
            const sectionId = this.getAttribute('href').substring(1);
            trackEvent('section_navigation', {
                event_category: 'navigation',
                event_label: sectionId
            });
        });
    });
}

// Инициализация аналитики
function initializeAnalytics() {
    // Проверяем, включена ли аналитика
    if (typeof gtag !== 'undefined') {
        setupExternalLinkTracking();
        setupDownloadTracking();
        setupScrollTracking();
        setupTimeTracking();
        setupButtonTracking();
        setupSectionTracking();
        
        // Отправляем событие загрузки страницы
        trackEvent('page_view', {
            event_category: 'engagement',
            page_title: document.title,
            page_location: window.location.href
        });
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    wrapCodeBlocks();
    checkAndSetupLanguage();
    addLineNumbers();
    addCopyButtons();
    
    // Инициализируем аналитику после небольшой задержки
    setTimeout(initializeAnalytics, 1000);
});






// Глобальное состояние выбранных опций
const selectedOptions = {};

// Utility функции
function equalizeButtonWidths(group) {
  const buttons = group.querySelectorAll('.segment');
  buttons.forEach(btn => btn.style.width = 'auto');
  
  let maxWidth = 0;
  buttons.forEach(btn => {
    const width = btn.offsetWidth;
    if (width > maxWidth) maxWidth = width;
  });
  
  buttons.forEach(btn => btn.style.width = maxWidth + 'px');
}

function updateSlider(group, btn) {
  const slider = group.querySelector('.slider-bg');
  slider.style.width = btn.offsetWidth + 'px';
  slider.style.height = btn.offsetHeight + 'px';
  slider.style.left = btn.offsetLeft + 'px';
  slider.style.top = btn.offsetTop + 'px';
}

function updateContainerHeight(container) {
  const activePanel = container.querySelector('.content-panel.active');
  if (activePanel) {
    const height = activePanel.scrollHeight + 18; // +18px для padding
    container.style.height = height + 'px';
  }
}

// Синхронизация селекторов
function initializeSelectorSync() {
  const allSelectors = document.querySelectorAll('.segment-group');

  allSelectors.forEach(selector => {
    const buttons = selector.querySelectorAll('.segment');
    const groupId = selector.dataset.groupId;
    const selectorIndex = parseInt(selector.dataset.selectorIndex);

    if (!selectedOptions[groupId]) {
      selectedOptions[groupId] = buttons[0].dataset.option;
    }

    buttons.forEach((btn, index) => {
      btn.addEventListener('click', () => {
        const selectedOption = btn.dataset.option;
        selectedOptions[groupId] = selectedOption;

        // Находим все селекторы с таким же groupId
        const sameGroupSelectors = document.querySelectorAll(
          `.segment-group[data-group-id="${groupId}"]`
        );

        sameGroupSelectors.forEach(otherSelector => {
          const otherIndex = parseInt(otherSelector.dataset.selectorIndex);

          // Если это селектор ВЫШЕ текущего, не трогаем его
          if (otherIndex < selectorIndex) {
            return;
          }

          // Находим кнопку с таким же label
          const matchingButton = otherSelector.querySelector(
            `.segment[data-option="${selectedOption}"]`
          );

          if (matchingButton) {
            const otherButtons = otherSelector.querySelectorAll('.segment');
            const otherContainer = document.getElementById(
              otherSelector.id + '-container'
            );
            const panels = otherContainer.querySelectorAll('.content-panel');
            const targetId = matchingButton.dataset.target;

            // Убираем активный класс со всех кнопок и панелей
            otherButtons.forEach(b => b.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));

            // Добавляем активный класс
            matchingButton.classList.add('active');
            document.getElementById(targetId).classList.add('active');

            // Обновляем слайдер и высоту контейнера
            updateSlider(otherSelector, matchingButton);
            
            // Небольшая задержка для плавности
            setTimeout(() => {
              updateContainerHeight(otherContainer);
            }, 50);
          }
        });
      });
    });
  });
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
  // Инициализируем все селекторы
  document.querySelectorAll('.segment-group').forEach(group => {
    equalizeButtonWidths(group);
    const activeBtn = group.querySelector('.segment.active');
    updateSlider(group, activeBtn);
    
    const container = document.getElementById(group.id + '-container');
    updateContainerHeight(container);
  });

  // Инициализируем синхронизацию
  initializeSelectorSync();

  // Обработка resize
  window.addEventListener('resize', () => {
    document.querySelectorAll('.segment-group').forEach(group => {
      equalizeButtonWidths(group);
      const activeBtn = group.querySelector('.segment.active');
      updateSlider(group, activeBtn);
      
      const container = document.getElementById(group.id + '-container');
      updateContainerHeight(container);
    });
  });
});