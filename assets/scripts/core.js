// core.js - Базовая функциональность страницы
document.addEventListener('DOMContentLoaded', () => {
    // Прокрутка к верху страницы при загрузке
    window.scrollTo(0, 0);

    // Проверяем наличие section-map и добавляем класс к .scope
    const scope = document.querySelector('.scope');
    const sectionMap = document.querySelector('.section-map');
    
    if (scope && sectionMap) {
        scope.classList.add('has-section-map');
    }

    // Анимация появления main контента через 0.4 секунды
    setTimeout(() => {
        const main = document.querySelector('main');
        if (main) {
            main.classList.add('loaded');
        }
    }, 400);
});

// Функция для динамического расчета отступов (больше не нужна для header/footer)
function adjustMainMargins() {
    // Header и footer теперь часть grid, отступы не нужны
}

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

// Функция переключения мобильного меню (hamburger menu слева)
function toggleMobileMenu() {
    const hamburgerButton = document.querySelector('.hamburger-button');
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    const overlay = document.querySelector('.menu-overlay');
    
    if (hamburgerButton && hamburgerMenu && overlay) {
        hamburgerButton.classList.toggle('active');
        hamburgerMenu.classList.toggle('active');
        overlay.classList.toggle('active');
        document.body.classList.toggle('menu-open');
        
        // Блокируем/разблокируем прокрутку body
        if (hamburgerMenu.classList.contains('active')) {
            document.body.style.overflow = 'hidden';
            
            // Закрываем меню при клике на ссылку
            const navLinks = hamburgerMenu.querySelectorAll('.hamburger-menu-nav a');
            navLinks.forEach(link => {
                link.addEventListener('click', () => {
                    hamburgerButton.classList.remove('active');
                    hamburgerMenu.classList.remove('active');
                    overlay.classList.remove('active');
                    document.body.classList.remove('menu-open');
                    document.body.style.overflow = '';
                }, { once: true });
            });
        } else {
            document.body.style.overflow = '';
        }
    }
}

// Обработка кликов по элементам sidebar и section-map
document.addEventListener('DOMContentLoaded', () => {
    // Функция обработки клика для sidebar и section-map
    function handleItemClick(item, e) {
        const li = item.closest('li');
        const hasChildren = li && li.classList.contains('has-children');
        const hasLink = item.querySelector('.link');
        const hasFolderOnly = item.querySelector('.folder-only');
        const clickedTriangle = e.target.classList.contains('triangle');
        
        // Случай 1: Карточка БЕЗ ссылки (folder-only) с детьми - клик в любом месте раскрывает
        if (hasChildren && hasFolderOnly) {
            e.preventDefault();
            e.stopPropagation();
            li.classList.toggle('expanded');
            
            // Если секция закрывается, закрываем все дочерние секции
            if (!li.classList.contains('expanded')) {
                const childSections = li.querySelectorAll('.has-children');
                childSections.forEach(child => {
                    child.classList.remove('expanded');
                });
            }
            return;
        }
        
        // Случай 2: Карточка СО ссылкой БЕЗ детей - клик в любом месте переходит по ссылке
        if (!hasChildren && hasLink) {
            // Переход произойдет через onclick на .link
            return;
        }
        
        // Случай 3: Карточка СО ссылкой С детьми
        if (hasChildren && hasLink) {
            // Клик на треугольник - раскрывает
            if (clickedTriangle) {
                e.preventDefault();
                e.stopPropagation();
                li.classList.toggle('expanded');
                
                // Если секция закрывается, закрываем все дочерние секции
                if (!li.classList.contains('expanded')) {
                    const childSections = li.querySelectorAll('.has-children');
                    childSections.forEach(child => {
                        child.classList.remove('expanded');
                    });
                }
            }
            // Клик в остальных местах - переход по ссылке (через onclick на .link)
            return;
        }
    }
    
    // Обработка кликов по item-content в hamburger menu
    document.querySelectorAll('.hamburger-menu-nav .item-content').forEach(item => {
        item.addEventListener('click', (e) => {
            handleItemClick(item, e);
        });
    });
    
    // Обработка кликов по item-content в section-map
    document.querySelectorAll('.section-map-nav .item-content').forEach(item => {
        item.addEventListener('click', (e) => {
            handleItemClick(item, e);
        });
    });
});

// Управление прокруткой section-map и hamburger menu
function setupScrollBehavior() {
    const sectionMapContent = document.querySelector('.section-map-content');
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    const body = document.body;
    
    let isOverSectionMap = false;
    
    // Отслеживаем наведение на section-map
    if (sectionMapContent) {
        sectionMapContent.addEventListener('mouseenter', () => {
            isOverSectionMap = true;
        });
        
        sectionMapContent.addEventListener('mouseleave', () => {
            isOverSectionMap = false;
        });
    }
    
    // Перехватываем событие прокрутки колесом мыши на body
    body.addEventListener('wheel', (e) => {
        // Пропускаем события с Ctrl/Cmd для браузерного масштабирования
        if (e.ctrlKey || e.metaKey) {
            return;
        }
        
        // Проверяем, открыт ли hamburger menu
        const isHamburgerMenuOpen = hamburgerMenu && hamburgerMenu.classList.contains('active');
        
        // Если hamburger menu открыт, направляем всю прокрутку на него
        if (isHamburgerMenuOpen && isOverSectionMap === false) {
            e.preventDefault();
            hamburgerMenu.scrollTop += e.deltaY;
            return;
        }
        
        // Если мышка над section-map-content, позволяем ему прокручиваться независимо
        if (isOverSectionMap && sectionMapContent) {
            e.stopPropagation();
            // Браузер сам обработает прокрутку section-map-content
            return;
        }
        
        // В остальных случаях body прокручивается естественным образом
    }, { passive: false });
}

// Инициализируем управление прокруткой после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    setupScrollBehavior();
    setupSidebarAutoClose();
});

// Автоматически закрываем hamburger menu при изменении размера окна > 1000px
function setupSidebarAutoClose() {
    window.addEventListener('resize', () => {
        if (window.innerWidth > 1000) {
            const hamburgerButton = document.querySelector('.hamburger-button');
            const hamburgerMenu = document.querySelector('.hamburger-menu');
            const overlay = document.querySelector('.menu-overlay');
            
            if (hamburgerButton && hamburgerMenu && overlay) {
                hamburgerButton.classList.remove('active');
                hamburgerMenu.classList.remove('active');
                overlay.classList.remove('active');
                document.body.classList.remove('menu-open');
                document.body.style.overflow = '';
            }
        }
    });
}

// Экспортируем для использования в других модулях
if (typeof window !== 'undefined') {
    window.toggleMobileMenu = toggleMobileMenu;
}


// Функциональность якорных ссылок для заголовков
document.addEventListener('DOMContentLoaded', () => {
    // Добавляем обработчик для всех якорных ссылок
    const anchorLinks = document.querySelectorAll('.anchor-link');
    
    anchorLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            const href = link.getAttribute('href');
            const targetId = href.substring(1); // Убираем #
            
            // Копируем полную ссылку в буфер обмена
            const fullUrl = window.location.origin + window.location.pathname + href;
            
            navigator.clipboard.writeText(fullUrl).then(() => {
                // Визуальная обратная связь
                const originalText = link.textContent;
                link.textContent = '✓';
                link.style.opacity = '1';
                
                setTimeout(() => {
                    link.textContent = originalText;
                }, 1500);
                
                // Обновляем URL без перезагрузки страницы
                history.pushState(null, null, href);
                
                // Прокручиваем к элементу
                const target = document.getElementById(targetId);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }).catch(err => {
                console.error('Не удалось скопировать ссылку:', err);
            });
        });
    });
    
    // Проверяем, есть ли якорь в URL при загрузке страницы
    if (window.location.hash) {
        setTimeout(() => {
            const target = document.querySelector(window.location.hash);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
    }
});
