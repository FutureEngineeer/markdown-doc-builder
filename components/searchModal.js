// searchModal.js - Генерация HTML для модального окна поиска

/**
 * Генерирует HTML для модального окна поиска
 * @returns {string} HTML модального окна
 */
function generateSearchModal() {
  return `
  <!-- Search Modal -->
  <div id="search-modal" class="search-modal">
    <div class="search-modal-overlay"></div>
    <div class="search-modal-content">
      <div class="search-input-wrapper">
        <svg class="search-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
        <input 
          type="text" 
          id="search-input" 
          class="search-input" 
          placeholder="Search documentation..."
          autocomplete="off"
          spellcheck="false"
        />
        <button class="search-close-button" onclick="closeSearchModal()" aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <div id="search-results" class="search-results">
        <div class="search-hint">Type at least 2 characters to search</div>
      </div>
      
      <div class="search-footer">
        <div class="search-footer-shortcuts">
          <div class="search-footer-shortcut">
            <kbd class="search-footer-key">↑</kbd>
            <kbd class="search-footer-key">↓</kbd>
            <span>navigate</span>
          </div>
          <div class="search-footer-shortcut">
            <kbd class="search-footer-key">Enter</kbd>
            <span>select</span>
          </div>
          <div class="search-footer-shortcut">
            <kbd class="search-footer-key">Esc</kbd>
            <span>close</span>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

module.exports = { generateSearchModal };
