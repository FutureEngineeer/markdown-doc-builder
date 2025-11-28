// test-search.js - Тестирование поискового индекса
const fs = require('fs');
const path = require('path');

console.log('🔍 Тестирование поискового индекса...\n');

// Проверяем наличие индекса
const indexPath = path.join(__dirname, '../dist/search-index.json');

if (!fs.existsSync(indexPath)) {
  console.error('❌ Файл search-index.json не найден!');
  console.log('   Запустите: npm run build');
  process.exit(1);
}

// Загружаем индекс
const searchData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

console.log('📊 Статистика индекса:');
console.log(`   Документов: ${searchData.documents.length}`);
console.log(`   Размер файла: ${(fs.statSync(indexPath).size / 1024).toFixed(2)} KB\n`);

// Проверяем структуру документов
console.log('📄 Примеры документов:\n');

searchData.documents.slice(0, 5).forEach((doc, idx) => {
  console.log(`${idx + 1}. ${doc.title}`);
  console.log(`   URL: ${doc.url}`);
  console.log(`   Breadcrumb: ${doc.breadcrumb || 'N/A'}`);
  console.log(`   Section: ${doc.section || 'N/A'}`);
  console.log(`   Content preview: ${doc.content.substring(0, 80)}...`);
  console.log('');
});

// Проверяем наличие индекса Lunr
if (searchData.index) {
  console.log('✅ Индекс Lunr создан успешно');
  console.log(`   Версия: ${searchData.index.version || 'N/A'}`);
  console.log(`   Полей: ${searchData.index.fields ? searchData.index.fields.length : 'N/A'}`);
} else {
  console.error('❌ Индекс Lunr не найден в файле!');
  process.exit(1);
}

// Проверяем наличие необходимых файлов
console.log('\n📁 Проверка файлов:');

const requiredFiles = [
  'assets/scripts/search.js',
  'assets/styles/search.css',
  'components/searchIndex.js',
  'components/searchModal.js'
];

let allFilesExist = true;

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  const exists = fs.existsSync(filePath);
  console.log(`   ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
});

if (allFilesExist) {
  console.log('\n✅ Все файлы поиска на месте!');
} else {
  console.log('\n⚠️  Некоторые файлы отсутствуют');
}

// Проверяем HTML файлы
console.log('\n🌐 Проверка HTML файлов:');

const distPath = path.join(__dirname, '../dist');
const htmlFiles = [];

function scanHtml(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  items.forEach(item => {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      scanHtml(fullPath);
    } else if (item.name.endsWith('.html')) {
      htmlFiles.push(fullPath);
    }
  });
}

scanHtml(distPath);

console.log(`   Найдено HTML файлов: ${htmlFiles.length}`);

// Проверяем несколько файлов на наличие поисковых компонентов
const sampleFile = htmlFiles[0];
if (sampleFile) {
  const content = fs.readFileSync(sampleFile, 'utf8');
  
  const hasSearchButton = content.includes('search-button');
  const hasSearchModal = content.includes('search-modal');
  const hasLunrScript = content.includes('lunr');
  const hasSearchScript = content.includes('search.js');
  
  console.log(`\n   Проверка ${path.basename(sampleFile)}:`);
  console.log(`   ${hasSearchButton ? '✅' : '❌'} Кнопка поиска`);
  console.log(`   ${hasSearchModal ? '✅' : '❌'} Модальное окно`);
  console.log(`   ${hasLunrScript ? '✅' : '❌'} Lunr.js`);
  console.log(`   ${hasSearchScript ? '✅' : '❌'} search.js`);
  
  if (hasSearchButton && hasSearchModal && hasLunrScript && hasSearchScript) {
    console.log('\n✅ Поиск полностью интегрирован!');
  } else {
    console.log('\n⚠️  Некоторые компоненты поиска отсутствуют в HTML');
  }
}

console.log('\n' + '='.repeat(60));
console.log('Тестирование завершено!');
console.log('='.repeat(60));
