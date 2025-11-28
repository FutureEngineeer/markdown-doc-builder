// test-search-paths.js - Тестирование путей поиска для разных уровней вложенности

console.log('🧪 Тестирование путей поиска\n');

// Симуляция функции getSearchIndexPath
function getSearchIndexPath(pathname) {
  const depth = (pathname.match(/\//g) || []).length - 1;
  
  if (depth <= 1) {
    return './search-index.json';
  }
  
  return '../'.repeat(depth - 1) + 'search-index.json';
}

// Симуляция функции getResultUrl
function getResultUrl(pathname, resultUrl) {
  const depth = (pathname.match(/\//g) || []).length - 1;
  let url = resultUrl.replace(/^\.\//, '');
  
  if (depth <= 1) {
    return url;
  }
  
  return '../'.repeat(depth - 1) + url;
}

// Тестовые случаи
const testCases = [
  {
    page: '/index.html',
    description: 'Корневая страница'
  },
  {
    page: '/main.html',
    description: 'Страница в корне'
  },
  {
    page: '/CLN/index.html',
    description: 'Страница на 1 уровень глубже'
  },
  {
    page: '/CLN/wiki/features.html',
    description: 'Страница на 2 уровня глубже'
  },
  {
    page: '/CLN/hardware/CLN17/V2.0/index.html',
    description: 'Страница на 4 уровня глубже'
  },
  {
    page: '/project-beta/RadiX/wiki/design-foundations.html',
    description: 'Страница на 3 уровня глубже'
  }
];

const sampleResults = [
  { url: './', title: 'Home' },
  { url: 'CLN/index.html', title: 'CLN Driver' },
  { url: 'CLN/hardware/CLN17/V2.0/index.html', title: 'CLN17 V2.0' }
];

console.log('📊 Тестирование путей к индексу:\n');

testCases.forEach(test => {
  const indexPath = getSearchIndexPath(test.page);
  console.log(`${test.description}`);
  console.log(`  Страница: ${test.page}`);
  console.log(`  Путь к индексу: ${indexPath}`);
  console.log('');
});

console.log('\n📊 Тестирование URL результатов:\n');

testCases.forEach(test => {
  console.log(`${test.description} (${test.page}):`);
  sampleResults.forEach(result => {
    const url = getResultUrl(test.page, result.url);
    console.log(`  ${result.title}: ${url}`);
  });
  console.log('');
});

console.log('✅ Тестирование завершено!');
