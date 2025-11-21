const fs = require('fs');
const path = require('path');
const { getCacheInfo } = require('../components/githubFetcher');

/**
 * Показывает информацию о кеше
 */
function showCacheInfo() {
  console.log('📋 Информация о кеше\n');
  
  // Кеш репозиториев
  try {
    const repoCache = getCacheInfo();
    console.log('🌐 Кеш репозиториев:');
    console.log(`  Количество: ${repoCache.count}`);
    
    if (repoCache.count > 0) {
      console.log('  Репозитории:');
      repoCache.repositories.forEach(repo => {
        console.log(`    - ${repo}`);
      });
    }
    console.log('');
  } catch (error) {
    console.log('❌ Ошибка чтения кеша репозиториев:', error.message);
  }
  
  // Кеш файлов
  const fileHashCache = '.temp/file-hashes.json';
  if (fs.existsSync(fileHashCache)) {
    try {
      const cache = JSON.parse(fs.readFileSync(fileHashCache, 'utf8'));
      const files = Object.keys(cache);
      
      console.log('📄 Кеш файлов:');
      console.log(`  Количество: ${files.length}`);
      
      if (files.length > 0 && files.length <= 10) {
        console.log('  Файлы:');
        files.forEach(file => {
          console.log(`    - ${file}`);
        });
      } else if (files.length > 10) {
        console.log('  Файлы (первые 10):');
        files.slice(0, 10).forEach(file => {
          console.log(`    - ${file}`);
        });
        console.log(`    ... и еще ${files.length - 10}`);
      }
      console.log('');
    } catch (error) {
      console.log('❌ Ошибка чтения кеша файлов:', error.message);
    }
  } else {
    console.log('📄 Кеш файлов: отсутствует\n');
  }
  
  // Размеры папок
  const folders = ['.temp', 'temp', 'dist', 'node_modules'];
  
  console.log('📁 Размеры папок:');
  for (const folder of folders) {
    if (fs.existsSync(folder)) {
      try {
        const size = getFolderSize(folder);
        console.log(`  ${folder}: ${formatBytes(size)}`);
      } catch (error) {
        console.log(`  ${folder}: ошибка чтения`);
      }
    } else {
      console.log(`  ${folder}: не существует`);
    }
  }
}

/**
 * Вычисляет размер папки
 */
function getFolderSize(folderPath) {
  let totalSize = 0;
  
  function calculateSize(currentPath) {
    const stats = fs.statSync(currentPath);
    
    if (stats.isFile()) {
      totalSize += stats.size;
    } else if (stats.isDirectory()) {
      const items = fs.readdirSync(currentPath);
      for (const item of items) {
        calculateSize(path.join(currentPath, item));
      }
    }
  }
  
  calculateSize(folderPath);
  return totalSize;
}

/**
 * Форматирует размер в байтах
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

if (require.main === module) {
  showCacheInfo();
}

module.exports = { showCacheInfo };