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

// Управление прокруткой main и section-map
function setupScrollBehavior() {
    const main = document.querySelector('main');
    const sectionMap = document.querySelector('.section-map');
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    const body = document.body;
    
    if (!main) return;
    
    let isOverSectionMap = false;
    let isOverMain = false;
    let isOverHamburgerMenu = false;
    
    // Отслеживаем наведение на section-map
    if (sectionMap) {
        sectionMap.addEventListener('mouseenter', () => {
            isOverSectionMap = true;
        });
        
        sectionMap.addEventListener('mouseleave', () => {
            isOverSectionMap = false;
        });
    }
    
    // Отслеживаем наведение на hamburger menu
    if (hamburgerMenu) {
        hamburgerMenu.addEventListener('mouseenter', () => {
            isOverHamburgerMenu = true;
        });
        
        hamburgerMenu.addEventListener('mouseleave', () => {
            isOverHamburgerMenu = false;
        });
    }
    
    // Отслеживаем наведение на main
    main.addEventListener('mouseenter', () => {
        isOverMain = true;
    });
    
    main.addEventListener('mouseleave', () => {
        isOverMain = false;
    });
    
    // Перехватываем событие прокрутки колесом мыши на body
    body.addEventListener('wheel', (e) => {
        // Пропускаем события с Ctrl/Cmd для браузерного масштабирования
        if (e.ctrlKey || e.metaKey) {
            return;
        }
        
        // Проверяем, открыт ли hamburger menu
        const isHamburgerMenuOpen = hamburgerMenu && hamburgerMenu.classList.contains('active');
        
        // Если hamburger menu открыт, направляем всю прокрутку на него
        if (isHamburgerMenuOpen) {
            e.preventDefault();
            hamburgerMenu.scrollTop += e.deltaY;
            return;
        }
        
        // Если мышка над section-map, позволяем ему прокручиваться
        if (isOverSectionMap && sectionMap) {
            // Проверяем, может ли section-map прокручиваться дальше
            const canScrollDown = sectionMap.scrollTop < sectionMap.scrollHeight - sectionMap.clientHeight;
            const canScrollUp = sectionMap.scrollTop > 0;
            
            if ((e.deltaY > 0 && canScrollDown) || (e.deltaY < 0 && canScrollUp)) {
                // Section-map может прокручиваться, не мешаем
                return;
            }
        }
        
        // Если мышка НЕ над main и НЕ над section-map (т.е. за пределами основной ширины)
        // перенаправляем прокрутку на main
        if (!isOverMain && !isOverSectionMap) {
            e.preventDefault();
            main.scrollTop += e.deltaY;
        }
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
