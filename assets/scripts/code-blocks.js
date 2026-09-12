// code-blocks.js - Подсветка синтаксиса и копирование кода

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
        if (typeof hljs !== 'undefined') {
            hljs.highlightElement(codeBlock);
        }

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
                if (typeof hljs !== 'undefined') {
                    hljs.highlightElement(tempCode);
                }
                processedLine = tempCode.innerHTML;
            }

            codeLine.innerHTML = processedLine || ' ';

            // Применяем отступ через CSS с базовым отступом 40px
            const totalPaddingCh = leadingSpaces + 2;
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

// Map для хранения активных таймеров
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

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    // Применяем подсветку синтаксиса ко всем блокам кода
    if (typeof hljs !== 'undefined') {
        hljs.highlightAll();
    }
    
    wrapCodeBlocks();
    checkAndSetupLanguage();
    addLineNumbers();
    addCopyButtons();
});
