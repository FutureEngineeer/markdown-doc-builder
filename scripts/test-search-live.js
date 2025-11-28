// test-search-live.js - Генерация тестовых HTML страниц для проверки поиска

const fs = require('fs');
const path = require('path');

console.log('🧪 Создание тестовых страниц для проверки поиска\n');

// Тестовые страницы на разных уровнях вложенности
const testPages = [
  {
    path: 'dist/test-search-root.html',
    title: 'Test Search - Root Level',
    depth: 0
  },
  {
    path: 'dist/CLN/test-search-level1.html',
    title: 'Test Search - Level 1',
    depth: 1
  },
  {
    path: 'dist/CLN/wiki/test-search-level2.html',
    title: 'Test Search - Level 2',
    depth: 2
  },
  {
    path: 'dist/CLN/hardware/CLN17/test-search-level3.html',
    title: 'Test Search - Level 3',
    depth: 3
  }
];

const generateTestPage = (title, depth) => {
  const relativeRoot = depth === 0 ? './' : '../'.repeat(depth);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="stylesheet" href="${relativeRoot}assets/styles.css">
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    .test-info {
      background: #f0f0f0;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .test-info h2 {
      margin-top: 0;
    }
    .test-button {
      padding: 10px 20px;
      margin: 10px 5px;
      cursor: pointer;
      background: #2FB65A;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 16px;
    }
    .test-button:hover {
      background: #26a04d;
    }
    .console-output {
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 15px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      max-height: 400px;
      overflow-y: auto;
      margin-top: 10px;
    }
    .log-entry {
      margin: 5px 0;
    }
    .log-success { color: #4ec9b0; }
    .log-error { color: #f48771; }
    .log-warn { color: #dcdcaa; }
    .log-info { color: #9cdcfe; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  
  <div class="test-info">
    <h2>📍 Page Information</h2>
    <p><strong>Depth Level:</strong> ${depth}</p>
    <p><strong>Path:</strong> <code id="current-path"></code></p>
    <p><strong>Expected Index Path:</strong> <code id="expected-index-path"></code></p>
  </div>

  <div class="test-info">
    <h2>🔍 Search Test</h2>
    <p>Click the button below or press <kbd>Ctrl+K</kbd> to open search modal.</p>
    <button class="test-button" onclick="openSearchModal()">Open Search (Ctrl+K)</button>
    <button class="test-button" onclick="testSearchManually()">Test Search Manually</button>
    <button class="test-button" onclick="clearConsole()">Clear Console</button>
  </div>

  <div class="test-info">
    <h2>📊 Console Output</h2>
    <div id="console-output" class="console-output">
      <div class="log-entry log-info">Console output will appear here...</div>
    </div>
  </div>

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
  </div>

  <script src="https://cdn.jsdelivr.net/npm/lunr@2.3.9/lunr.min.js"></script>
  <script src="${relativeRoot}assets/scripts/search.js"></script>
  
  <script>
    // Перехватываем console.log для отображения в UI
    const consoleOutput = document.getElementById('console-output');
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    
    function addLogEntry(message, type = 'info') {
      const entry = document.createElement('div');
      entry.className = 'log-entry log-' + type;
      entry.textContent = message;
      consoleOutput.appendChild(entry);
      consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }
    
    console.log = function(...args) {
      originalLog.apply(console, args);
      addLogEntry(args.join(' '), 'info');
    };
    
    console.error = function(...args) {
      originalError.apply(console, args);
      addLogEntry('ERROR: ' + args.join(' '), 'error');
    };
    
    console.warn = function(...args) {
      originalWarn.apply(console, args);
      addLogEntry('WARN: ' + args.join(' '), 'warn');
    };
    
    function clearConsole() {
      consoleOutput.innerHTML = '<div class="log-entry log-info">Console cleared...</div>';
    }
    
    // Отображаем информацию о странице
    document.getElementById('current-path').textContent = window.location.pathname;
    
    // Вычисляем ожидаемый путь к индексу
    const depth = ${depth};
    const expectedPath = depth === 0 ? './search-index.json' : '../'.repeat(depth) + 'search-index.json';
    document.getElementById('expected-index-path').textContent = expectedPath;
    
    // Тестовая функция
    async function testSearchManually() {
      addLogEntry('=== Manual Search Test ===', 'info');
      addLogEntry('Current path: ' + window.location.pathname, 'info');
      addLogEntry('Depth level: ${depth}', 'info');
      
      try {
        // Открываем модальное окно
        openSearchModal();
        
        // Ждём инициализации
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Проверяем инициализацию
        if (typeof searchInitialized !== 'undefined' && searchInitialized) {
          addLogEntry('✅ Search initialized successfully', 'success');
          
          // Выполняем тестовый поиск
          const testQuery = 'CLN';
          addLogEntry('Performing test search: ' + testQuery, 'info');
          
          const input = document.getElementById('search-input');
          if (input) {
            input.value = testQuery;
            input.dispatchEvent(new Event('input'));
            
            await new Promise(resolve => setTimeout(resolve, 500));
            addLogEntry('✅ Test search completed', 'success');
          }
        } else {
          addLogEntry('❌ Search not initialized', 'error');
        }
      } catch (error) {
        addLogEntry('❌ Test failed: ' + error.message, 'error');
      }
    }
    
    // Логируем загрузку страницы
    addLogEntry('Page loaded at depth level ${depth}', 'info');
    addLogEntry('Expected index path: ' + expectedPath, 'info');
  </script>
</body>
</html>`;
};

// Создаём тестовые страницы
testPages.forEach(page => {
  const dir = path.dirname(page.path);
  
  // Создаём директорию если не существует
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Генерируем и сохраняем страницу
  const html = generateTestPage(page.title, page.depth);
  fs.writeFileSync(page.path, html, 'utf8');
  
  console.log(`✅ Created: ${page.path}`);
});

console.log('\n✅ All test pages created!');
console.log('\nOpen these pages in browser to test search:');
testPages.forEach(page => {
  console.log(`  - ${page.path}`);
});
