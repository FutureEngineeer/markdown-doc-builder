const fs = require('fs');
const { clearCache } = require('./clear-cache');

/**
 * Очищает все и подготавливает к чистой сборке
 */
function cleanBuild() {
  console.log('🧹 Подготовка к чистой сборке...\n');
  
  // Очищаем кеш
  clearCache();
  
  // Создаем необходимые папки
  const requiredDirs = ['.temp', 'dist'];
  
  console.log('\n📁 Создание необходимых папок:');
  for (const dir of requiredDirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Создано: ${dir}/`);
    } else {
      console.log(`⚪ Уже существует: ${dir}/`);
    }
  }
  
  console.log('\n🎉 Готово к чистой сборке!');
  console.log('Запустите: npm run build:all');
}

if (require.main === module) {
  cleanBuild();
}

module.exports = { cleanBuild };