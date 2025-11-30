// scriptLoader.js - Умная загрузка скриптов на основе контента страницы

/**
 * Определяет, какие скрипты нужны для данного HTML контента
 * @param {string} htmlContent - HTML контент страницы
 * @param {Object} config - Конфигурация из config.yaml
 * @returns {Array} Массив путей к необходимым скриптам
 */
function detectRequiredScripts(htmlContent, config = {}) {
    const scripts = [];
    
    // core.js - всегда загружается (базовая функциональность)
    scripts.push('assets/scripts/core.js');
    
    // sidebar.js - если есть sidebar
    if (hasSidebar(htmlContent)) {
        scripts.push('assets/scripts/sidebar.js');
    }
    
    // code-blocks.js - если есть блоки кода
    if (hasCodeBlocks(htmlContent)) {
        scripts.push('assets/scripts/code-blocks.js');
    }
    
    // selectors.js - если есть селекторы
    if (hasSelectors(htmlContent)) {
        scripts.push('assets/scripts/selectors.js');
    }
    
    // animations.js - если включены анимации в конфиге
    if (config.features?.animations !== false) {
        scripts.push('assets/scripts/animations.js');
    }
    
    // analytics-tracking.js - если включена аналитика
    if (config.analytics?.enabled && config.analytics?.trackingId) {
        scripts.push('assets/scripts/analytics-tracking.js');
    }
    
    // search.js - поиск всегда включен
    scripts.push('assets/scripts/search.js');
    
    return scripts;
}

/**
 * Проверяет наличие блоков кода в HTML
 * @param {string} html - HTML контент
 * @returns {boolean}
 */
function hasCodeBlocks(html) {
    return /<pre[^>]*>[\s\S]*?<code/i.test(html) || 
           /<code class="language-/i.test(html);
}

/**
 * Проверяет наличие селекторов в HTML
 * @param {string} html - HTML контент
 * @returns {boolean}
 */
function hasSelectors(html) {
    return /class="segment-group"/i.test(html) ||
           /class="selector-container"/i.test(html);
}

/**
 * Проверяет наличие sidebar в HTML
 * @param {string} html - HTML контент
 * @returns {boolean}
 */
function hasSidebar(html) {
    return /class="sidebar"/i.test(html);
}

/**
 * Вычисляет относительный путь к корню проекта на основе выходного файла
 * @param {string} outputFile - Путь к выходному HTML файлу
 * @returns {string} Относительный путь к корню (например, "../" или "../../")
 */
function getRelativePathToRoot(outputFile) {
    const path = require('path');
    
    if (!outputFile) return './';
    
    // Заменяем обратные слеши на прямые для кросс-платформенности
    let normalizedPath = outputFile.replace(/\\/g, '/');
    const pathParts = normalizedPath.split('/');
    
    const distIndex = pathParts.findIndex(part => part === 'dist');
    
    if (distIndex === -1) {
        const folderDepth = pathParts.length - 1;
        return folderDepth <= 0 ? './' : '../'.repeat(folderDepth);
    }
    
    const levelsAfterDist = pathParts.length - distIndex - 2;
    
    if (levelsAfterDist <= 0) {
        return './';
    }
    
    return '../'.repeat(levelsAfterDist);
}

/**
 * Генерирует теги <script> для необходимых модулей
 * @param {string} htmlContent - HTML контент страницы
 * @param {string} outputFile - Путь к выходному файлу для корректных относительных путей
 * @param {Object} config - Конфигурация
 * @returns {string} HTML теги скриптов
 */
function generateModularScripts(htmlContent, outputFile = '', config = {}) {
    const relativeRoot = getRelativePathToRoot(outputFile);
    
    const allScripts = [];
    
    // Добавляем внешние зависимости (highlight.js, KaTeX и т.д.)
    const dependencies = getExternalDependencies(htmlContent, config);
    const scriptDeps = dependencies.filter(dep => dep.type === 'script');
    
    scriptDeps.forEach(dep => {
        const defer = dep.defer ? ' defer' : '';
        const async = dep.async ? ' async' : '';
        const integrity = dep.integrity 
            ? ` integrity="${dep.integrity}" crossorigin="${dep.crossorigin || 'anonymous'}"` 
            : '';
        allScripts.push(`  <script src="${dep.src}"${defer}${async}${integrity}></script>`);
    });
    
    // Добавляем модульные скрипты
    const requiredScripts = detectRequiredScripts(htmlContent, config);
    
    requiredScripts.forEach(scriptPath => {
        let src = scriptPath;
        // Корректируем путь для вложенных файлов
        if (!src.startsWith('http')) {
            src = src.startsWith('./') ? src.substring(2) : src;
            src = relativeRoot + src;
        }
        allScripts.push(`  <script src="${src}"></script>`);
    });
    
    return allScripts.length > 0 ? '\n' + allScripts.join('\n') : '';
}

/**
 * Получает список внешних зависимостей для скриптов
 * @param {string} htmlContent - HTML контент страницы
 * @param {Object} config - Конфигурация
 * @returns {Array} Массив объектов с информацией о внешних зависимостях
 */
function getExternalDependencies(htmlContent, config = {}) {
    const dependencies = [];
    
    // lunr.js - для поиска (всегда загружается)
    dependencies.push({
        type: 'script',
        src: 'https://cdn.jsdelivr.net/npm/lunr@2.3.9/lunr.min.js',
        defer: false
    });
    
    // highlight.js - если есть блоки кода
    if (hasCodeBlocks(htmlContent)) {
        dependencies.push({
            type: 'script',
            src: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js',
            defer: false
        });
        
        // Используем стиль из конфигурации, если указан
        const hljsStylesheet = config.external?.stylesheets?.find(s => 
            s.href && s.href.includes('highlight.js') && s.href.includes('styles')
        );
        
        if (hljsStylesheet) {
            dependencies.push({
                type: 'stylesheet',
                href: hljsStylesheet.href,
                integrity: hljsStylesheet.integrity || '',
                crossorigin: hljsStylesheet.crossorigin || 'anonymous'
            });
        } else {
            // Fallback на дефолтный стиль, если не указан в конфиге
            dependencies.push({
                type: 'stylesheet',
                href: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css'
            });
        }
    }
    
    // KaTeX - если есть математические формулы
    if (hasMathFormulas(htmlContent)) {
        dependencies.push({
            type: 'stylesheet',
            href: 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css',
            integrity: 'sha384-n8MVd4RsNIU0tAv4ct0nTaAbDJwPJzDEaqSD1odI+WdtXRGWt2kTvGFasHpSy3SV',
            crossorigin: 'anonymous'
        });
        dependencies.push({
            type: 'script',
            src: 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js',
            integrity: 'sha384-XjKyOOlGwcjNTAIQHIpVOOVA+CuTF5UvLqGSXW6lqsOenBkP8MBqDnlmEOC/1tgg',
            crossorigin: 'anonymous',
            defer: true
        });
        dependencies.push({
            type: 'script',
            src: 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js',
            integrity: 'sha384-+VBxd3r6XgURycqtZ117nYw44OOcIax56Z4dCRWbxyPt0Koah1uHoK0o4+/RRE05',
            crossorigin: 'anonymous',
            defer: true
        });
    }
    
    return dependencies;
}

/**
 * Проверяет наличие математических формул
 * @param {string} html - HTML контент
 * @returns {boolean}
 */
function hasMathFormulas(html) {
    return /\$\$[\s\S]*?\$\$/i.test(html) || 
           /\\\[[\s\S]*?\\\]/i.test(html) ||
           /class="math"/i.test(html);
}

module.exports = {
    detectRequiredScripts,
    generateModularScripts,
    getExternalDependencies,
    hasCodeBlocks,
    hasSelectors,
    hasMathFormulas
};
