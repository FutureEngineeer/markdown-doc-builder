/**
 * Компонент для обработки Google Analytics
 * Генерирует код аналитики на основе конфигурации
 */

/**
 * Генерирует HTML код для Google Analytics
 * @param {Object} config - Конфигурация аналитики
 * @returns {string} HTML код для вставки в head
 */
function generateAnalyticsCode(config) {
    if (!config?.analytics?.googleAnalytics?.enabled) {
        return '';
    }

    const measurementId = config.analytics.googleAnalytics.measurementId;
    
    if (!measurementId || measurementId === 'G-XXXXXXXXXX') {
        console.warn('Google Analytics Measurement ID не настроен в config.yaml');
        return '';
    }

    return `
    <!-- Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${measurementId}', {
        page_title: document.title,
        page_location: window.location.href,
        custom_map: {
          'custom_parameter_1': 'project_type',
          'custom_parameter_2': 'documentation_section'
        }
      });
    </script>`;
}

/**
 * Генерирует JavaScript код для расширенного отслеживания
 * @param {Object} config - Конфигурация аналитики
 * @returns {string} JavaScript код для отслеживания
 */
function generateTrackingCode(config) {
    if (!config?.analytics?.googleAnalytics?.enabled) {
        return '';
    }

    const tracking = config.analytics.tracking || {};
    
    let trackingCode = `
// Google Analytics расширенное отслеживание
(function() {
    // Проверяем доступность gtag
    if (typeof gtag === 'undefined') {
        console.warn('Google Analytics не загружен');
        return;
    }

    // Базовые функции отслеживания
    window.trackEvent = function(eventName, parameters = {}) {
        gtag('event', eventName, parameters);
    };

    window.trackPageView = function(pagePath, pageTitle) {
        gtag('config', '${config.analytics.googleAnalytics.measurementId}', {
            page_path: pagePath,
            page_title: pageTitle
        });
    };
`;

    if (tracking.externalLinks) {
        trackingCode += `
    // Отслеживание внешних ссылок
    document.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (link && link.href && !link.href.includes(window.location.hostname)) {
            gtag('event', 'click', {
                event_category: 'outbound',
                event_label: link.href,
                transport_type: 'beacon'
            });
        }
    });
`;
    }

    if (tracking.downloads) {
        trackingCode += `
    // Отслеживание скачиваний
    document.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (link && link.href) {
            const downloadExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.zip', '.rar', '.exe', '.dmg', '.apk'];
            const isDownload = downloadExtensions.some(ext => link.href.toLowerCase().includes(ext));
            
            if (isDownload) {
                const filename = link.href.split('/').pop();
                gtag('event', 'file_download', {
                    event_category: 'engagement',
                    event_label: filename,
                    file_extension: filename.split('.').pop()
                });
            }
        }
    });
`;
    }

    if (tracking.scrollTracking) {
        trackingCode += `
    // Отслеживание прокрутки
    let scrollMilestones = [25, 50, 75, 90];
    let trackedMilestones = new Set();
    
    function trackScrollDepth() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = Math.round((scrollTop / docHeight) * 100);
        
        scrollMilestones.forEach(milestone => {
            if (scrollPercent >= milestone && !trackedMilestones.has(milestone)) {
                trackedMilestones.add(milestone);
                gtag('event', 'scroll', {
                    event_category: 'engagement',
                    event_label: milestone + '%',
                    value: milestone
                });
            }
        });
    }
    
    let scrollTimeout;
    window.addEventListener('scroll', function() {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(trackScrollDepth, 250);
    });
`;
    }

    if (tracking.timeOnPage) {
        trackingCode += `
    // Отслеживание времени на странице
    const pageStartTime = Date.now();
    let timeTrackingInterval;
    
    function startTimeTracking() {
        timeTrackingInterval = setInterval(() => {
            const timeSpent = Math.round((Date.now() - pageStartTime) / 1000);
            
            // Отправляем milestone каждые 30 секунд
            if (timeSpent % 30 === 0) {
                gtag('event', 'timing_complete', {
                    name: 'page_read_time',
                    value: timeSpent
                });
            }
        }, 1000);
    }
    
    // Отслеживание ухода со страницы
    window.addEventListener('beforeunload', function() {
        const totalTime = Math.round((Date.now() - pageStartTime) / 1000);
        gtag('event', 'page_view_time', {
            event_category: 'engagement',
            event_label: 'session_duration',
            value: totalTime,
            transport_type: 'beacon'
        });
        
        if (timeTrackingInterval) {
            clearInterval(timeTrackingInterval);
        }
    });
    
    // Запускаем отслеживание времени
    startTimeTracking();
`;
    }

    trackingCode += `
    // Отслеживание взаимодействий с проектами
    document.addEventListener('click', function(e) {
        const button = e.target.closest('button, .btn');
        if (button) {
            const buttonText = button.textContent.trim();
            const section = button.closest('section');
            const sectionId = section ? section.id : 'unknown';
            
            gtag('event', 'button_click', {
                event_category: 'interaction',
                event_label: buttonText,
                section: sectionId
            });
        }
    });

    // Отслеживание навигации по якорным ссылкам
    document.addEventListener('click', function(e) {
        const link = e.target.closest('a[href^="#"]');
        if (link) {
            const targetSection = link.getAttribute('href').substring(1);
            gtag('event', 'internal_navigation', {
                event_category: 'navigation',
                event_label: targetSection
            });
        }
    });

})();`;

    return trackingCode;
}

/**
 * Обрабатывает конфигурацию аналитики и возвращает код для вставки
 * @param {Object} config - Полная конфигурация сайта
 * @returns {Object} Объект с HTML и JS кодом аналитики
 */
function processAnalytics(config) {
    return {
        headCode: generateAnalyticsCode(config),
        trackingCode: generateTrackingCode(config),
        isEnabled: config?.analytics?.googleAnalytics?.enabled || false,
        measurementId: config?.analytics?.googleAnalytics?.measurementId || null
    };
}

module.exports = {
    generateAnalyticsCode,
    generateTrackingCode,
    processAnalytics
};