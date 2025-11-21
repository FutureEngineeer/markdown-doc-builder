const fs = require('fs');
const path = require('path');

/**
 * Очищает все кеши
 */
function clearCache() {
  console.log('🧹 Очистка кеша...\n');
  
  const cachePaths = [
    '.temp',
    'temp',
    'dist'
  ];
  
  let clearedCount = 0;
  
  for (const cachePath of cachePaths) {
    if (fs.existsSync(cachePath)) {
      try {
        fs.rmSync(cachePath, { recursive: true, force: true });
        console.log(`✅ Удалено: ${cachePath}/`);
        clearedCount++;
      } catch (error) {
        console.log(`❌ Ошибка удаления ${cachePath}:`, error.message);
      }
    } else {
      console.log(`⚪ Не найдено: ${cachePath}/`);
    }
  }
  
  console.log(`\n🎉 Очищено ${clearedCount} папок кеша`);
  console.log('Теперь можно запустить: npm run build:all');
}

if (require.main === module) {
  clearCache();
}

module.exports = { clearCache };