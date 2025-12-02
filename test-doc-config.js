// test-doc-config.js - Тест нового формата doc-config
const { DocConfigProcessor } = require('./components/docConfigProcessor');

const processor = new DocConfigProcessor('website');
const result = processor.process();

console.log('\n📋 Doc Config Tree:\n');
console.log(processor.visualizeTree(result.tree));

console.log('\n📊 Statistics:');
const stats = processor.getTreeStats(result.tree);
console.log(`   Files: ${stats.totalFiles} (${stats.hierarchyFiles} in hierarchy, ${stats.autoFiles} auto-scanned)`);
console.log(`   Folders: ${stats.folders} (${stats.configFolders} with config, ${stats.autoFolders} auto-scanned)`);
console.log(`   Repositories: ${stats.repositories}`);
console.log(`   Sections: ${stats.sections}`);

console.log('\n📦 Repositories:');
result.repositories.forEach(repo => {
  console.log(`   - ${repo.title} (${repo.alias}): ${repo.url}`);
});
