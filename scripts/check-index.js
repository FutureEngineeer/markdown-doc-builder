// check-index.js - Проверка и отображение индекса
const fs = require('fs');
const path = require('path');

function checkIndex() {
  const indexPath = path.join(process.cwd(), '.temp', 'hierarchy-info.json');
  
  if (!fs.existsSync(indexPath)) {
    console.log('❌ Индекс не найден. Запустите: npm run build:indexed');
    return;
  }
  
  try {
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    
    console.log('📊 Статистика индекса:\n');
    console.log(`   Файлов: ${index.files.length}`);
    console.log(`   Aliases: ${index.aliases.length}`);
    console.log(`   Репозиториев: ${index.repositories.length}`);
    console.log(`   Элементов верхнего уровня: ${index.hierarchy.length}`);
    console.log(`   Дубликатов: ${index.duplicates.length}\n`);
    
    if (index.repositories.length > 0) {
      console.log('📦 Репозитории:');
      index.repositories.forEach(repo => {
        console.log(`   - ${repo.alias} (${repo.owner}/${repo.repo})`);
        console.log(`     Файлов: ${repo.filesCount}`);
      });
      console.log('');
    }
    
    if (index.duplicates.length > 0) {
      console.log('⚠️  Дубликаты:');
      index.duplicates.forEach(dup => {
        console.log(`   - ${dup.type}: ${dup.url || dup.path}`);
        console.log(`     Alias: ${dup.alias}, Существующий: ${dup.existingAlias}`);
      });
      console.log('');
    }
    
    console.log('🏗️  Иерархия:');
    displayHierarchy(index.hierarchy, 1);
    
  } catch (error) {
    console.error('❌ Ошибка чтения индекса:', error.message);
  }
}

function displayHierarchy(items, level = 0) {
  const indent = '   '.repeat(level);
  
  items.forEach(item => {
    if (item.type === 'file') {
      console.log(`${indent}📄 ${item.title} (${item.file})`);
    } else if (item.type === 'folder') {
      console.log(`${indent}📁 ${item.title} (${item.folder})`);
    } else if (item.type === 'repository') {
      console.log(`${indent}📦 ${item.title} (${item.alias})`);
    } else if (item.type === 'section') {
      console.log(`${indent}📂 ${item.title}`);
    }
    
    if (item.children && item.children.length > 0) {
      displayHierarchy(item.children, level + 1);
    }
  });
}

if (require.main === module) {
  checkIndex();
}

module.exports = { checkIndex };
