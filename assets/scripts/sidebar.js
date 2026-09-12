// sidebar.js - Скрипт для работы с боковым меню

// Функция переключения раздела sidebar
function toggleSidebarSection(element) {
    const section = element.closest('.sidebar-section');
    if (!section) return;
    
    // Переключаем класс expanded только на текущей секции
    // Не затрагиваем вложенные секции
    section.classList.toggle('expanded');
    
    // Останавливаем всплытие события, чтобы не затронуть родительские секции
    event.stopPropagation();
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    // Добавляем класс has-sidebar к body если sidebar существует
    if (document.querySelector('.sidebar')) {
        document.body.classList.add('has-sidebar');
    }
});

// Экспортируем для использования в других модулях
if (typeof window !== 'undefined') {
    window.toggleSidebarSection = toggleSidebarSection;
}
