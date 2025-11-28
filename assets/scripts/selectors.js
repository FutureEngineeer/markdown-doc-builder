// selectors.js - Сегментированные селекторы

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
