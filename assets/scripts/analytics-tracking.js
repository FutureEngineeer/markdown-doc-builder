// analytics-tracking.js - Отслеживание событий Google Analytics

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

// Инициализируем аналитику после небольшой задержки
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initializeAnalytics, 1000);
});
