const { buildAll } = require('../build-all.js');
const { getCacheInfo } = require('../components/githubFetcher');
const fs = require('fs');
const path = require('path');

/**
 * Скрипт для тестирования сборки локально
 */
async function testBuild() {
  console.log('🧪 Тестирование локальной сборки...\n');
  
  try {
    // Показываем информацию о кеше до сборки
    console.log('📋 Информация о кеше до сборки:');
    const cacheInfo = getCacheInfo();
    console.log(`  Кешированных репозиториев: ${cacheInfo.count}`);
    if (cacheInfo.count > 0) {
      cacheInfo.repositories.forEach(repo => console.log(`    - ${repo}`));
    }
    console.log('');
    
    // Запускаем сборку
    const startTime = Date.now();
    await buildAll();
    const endTime = Date.now();
    
    console.log(`\n⏱️  Время сборки: ${Math.round((endTime - startTime) / 1000)} секунд`);
    
    // Проверяем результат
    const distDir = './dist';
    if (fs.existsSync(distDir)) {
      const files = getAllFiles(distDir);
      console.log(`📁 Создано файлов: ${files.length}`);
      
      // Показываем структуру
      console.log('\n📂 Структура dist/:');
      showDirectoryStructure(distDir, '  ');
      
      // Проверяем основные файлы
      const requiredFiles = ['index.html', 'assets/styles.css', 'assets/script.js'];
      const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(distDir, file)));
      
      if (missingFiles.length === 0) {
        console.log('\n✅ Все основные файлы созданы успешно!');
      } else {
        console.log('\n⚠️  Отсутствуют файлы:');
        missingFiles.forEach(file => console.log(`    - ${file}`));
      }
      
    } else {
      console.log('❌ Папка dist не создана!');
    }
    
    // Показываем информацию о кеше после сборки
    console.log('\n📋 Информация о кеше после сборки:');
    const finalCacheInfo = getCacheInfo();
    console.log(`  Кешированных репозиториев: ${finalCacheInfo.count}`);
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
    process.exit(1);
  }
}

/**
 * Рекурсивно получает все файлы в директории
 */
function getAllFiles(dir, files = []) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory()) {
      getAllFiles(fullPath, files);
    } else {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Показывает структуру директории
 */
function showDirectoryStructure(dir, prefix = '') {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  items.forEach((item, index) => {
    const isLast = index === items.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    
    console.log(`${prefix}${connector}${item.name}`);
    
    if (item.isDirectory()) {
      const nextPrefix = prefix + (isLast ? '    ' : '│   ');
      showDirectoryStructure(path.join(dir, item.name), nextPrefix);
    }
  });
}

// Запускаем тест
if (require.main === module) {
  testBuild();
}

module.exports = { testBuild };