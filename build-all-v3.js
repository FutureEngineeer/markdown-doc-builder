// build-all-v3.js - Новая версия с использованием модульной архитектуры
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { BuildOrchestrator } = require('./components/buildOrchestrator');
const { globalLinkManager } = require('./components/linkManager');
const { downloadGitHubRepoMarkdown } = require('./components/githubFetcher');
const { registerRepositoryAlias } = require('./components/config');
const { generateErrorPages } = require('./components/errorPageGenerator');

/**
 * Phase 1: Complete indexing
 */
async function indexAllFiles(rootPath) {
  console.log('📂 Phase 1: Indexing all files...\n');
  
  const index = {
    files: [],
    folders: [],
    repositories: [],
    hierarchy: []
  };

  // Load root doc-config
  const rootConfigPath = path.join(rootPath, 'doc-config.yaml');
  let rootConfig = null;
  
  if (fs.existsSync(rootConfigPath)) {
    const configContent = fs.readFileSync(rootConfigPath, 'utf8');
    rootConfig = yaml.load(configContent);
    console.log('   ✓ Loaded root doc-config.yaml');
  }

  // Index local files
  function indexDirectory(dirPath, relativePath = '', parentConfig = null) {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    const localFiles = [];
    
    const configPath = path.join(dirPath, 'doc-config.yaml');
    let currentConfig = null;
    if (fs.existsSync(configPath)) {
      currentConfig = yaml.load(fs.readFileSync(configPath, 'utf8'));
    }

    items.forEach(item => {
      const fullPath = path.join(dirPath, item.name);
      const itemRelativePath = relativePath ? path.join(relativePath, item.name) : item.name;

      if (item.isDirectory()) {
        const subFiles = indexDirectory(fullPath, itemRelativePath, currentConfig);
        localFiles.push(...subFiles);
        
        index.folders.push({
          name: item.name,
          path: fullPath,
          relativePath: itemRelativePath,
          config: currentConfig
        });
      } else if (item.name.endsWith('.md')) {
        const fileInfo = {
          name: item.name,
          path: fullPath,
          relativePath: itemRelativePath,
          baseName: path.basename(item.name, '.md'),
          isReadme: /^readme$/i.test(path.basename(item.name, '.md')),
          config: currentConfig
        };
        
        localFiles.push(fileInfo);
        index.files.push(fileInfo);
      }
    });

    return localFiles;
  }

  const localFiles = indexDirectory(rootPath);
  console.log(`   ✓ Indexed ${localFiles.length} local files`);

  // Download and index repositories
  const tempDir = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  async function processHierarchyForRepos(items) {
    for (const item of items) {
      if (item.repository) {
        console.log(`   📥 Downloading: ${item.alias || item.repository}`);
        
        // Регистрируем псевдоним в глобальной конфигурации
        const urlMatch = item.repository.match(/https:\/\/github\.com\/([^\/]+)\/([^\/]+)/);
        if (urlMatch && item.alias) {
          const [, owner, repo] = urlMatch;
          registerRepositoryAlias(owner, repo, item.alias);
        }
        
        const projectData = await downloadGitHubRepoMarkdown(item.repository, tempDir, item.alias);
        
        if (projectData.files.length > 0) {
          index.repositories.push({
            url: item.repository,
            alias: item.alias || projectData.repo,
            owner: projectData.owner,
            repo: projectData.repo,
            projectData: projectData,
            files: projectData.files
          });
          console.log(`      ✓ ${projectData.files.length} files`);
        }
      }
      
      if (item.children) {
        await processHierarchyForRepos(item.children);
      }
    }
  }

  if (rootConfig && rootConfig.hierarchy) {
    await processHierarchyForRepos(rootConfig.hierarchy);
  }

  for (const folder of index.folders) {
    const folderConfigPath = path.join(folder.path, 'doc-config.yaml');
    if (fs.existsSync(folderConfigPath)) {
      try {
        const folderConfigContent = fs.readFileSync(folderConfigPath, 'utf8');
        const folderConfig = yaml.load(folderConfigContent);
        if (folderConfig && folderConfig.hierarchy) {
          await processHierarchyForRepos(folderConfig.hierarchy);
        }
      } catch (error) {
        console.warn(`   ⚠️  Error processing ${folder.relativePath}:`, error.message);
      }
    }
  }

  if (rootConfig && rootConfig.hierarchy) {
    index.hierarchy = rootConfig.hierarchy;
    index.rootConfig = rootConfig;
    index.rootConfig._basePath = rootPath;
  }

  console.log(`\n   ✓ Total indexed: ${index.files.length} files, ${index.repositories.length} repositories\n`);
  
  return index;
}

/**
 * Phase 2: Build file structure and save hierarchy info
 */
function generateNavigationTemplates(index) {
  console.log('🗺️  Phase 2: Building file structure...\n');
  
  const fileStructure = buildFileStructure(index);
  displayFileStructure(fileStructure);
  
  const hierarchyInfo = {
    root: index.rootConfig,
    sections: {},
    allFiles: index.files.map(f => ({
      name: f.name,
      relativePath: f.relativePath,
      baseName: f.baseName,
      isReadme: f.isReadme
    })),
    allRepositories: index.repositories.map(r => ({
      alias: r.alias,
      url: r.url,
      owner: r.owner,
      repo: r.repo,
      filesCount: r.files.length
    })),
    fileStructure: fileStructure
  };

  const processedSections = new Set();
  index.folders.forEach(folder => {
    const folderName = path.basename(folder.relativePath);
    const folderConfigPath = path.join(folder.path, 'doc-config.yaml');
    
    if (fs.existsSync(folderConfigPath) && !processedSections.has(folderName)) {
      try {
        const configContent = fs.readFileSync(folderConfigPath, 'utf8');
        const folderConfig = yaml.load(configContent);
        hierarchyInfo.sections[folderName] = folderConfig;
        processedSections.add(folderName);
      } catch (error) {
        console.warn(`⚠️  Error loading doc-config for ${folderName}:`, error.message);
      }
    }
  });

  const hierarchyPath = path.join(process.cwd(), '.temp', 'hierarchy-info.json');
  if (!fs.existsSync(path.dirname(hierarchyPath))) {
    fs.mkdirSync(path.dirname(hierarchyPath), { recursive: true });
  }
  fs.writeFileSync(hierarchyPath, JSON.stringify(hierarchyInfo, null, 2));
  
  console.log('\n   ✓ File structure built');
  console.log(`   ✓ Total: ${hierarchyInfo.allFiles.length} files, ${hierarchyInfo.allRepositories.length} repositories\n`);
  
  return fileStructure;
}

/**
 * Phase 3: Generate files using BuildOrchestrator
 */
async function generateFiles(index, fileStructure) {
  console.log('📝 Phase 3: Generating files...\n');
  
  const orchestrator = new BuildOrchestrator({
    projectRoot: process.cwd(),
    distDir: 'dist'
  });
  
  orchestrator.startBuild();
  
  // Регистрируем все репозитории в LinkProcessor
  for (const repo of index.repositories) {
    orchestrator.registerRepository(repo.owner, repo.repo, repo.projectData);
  }
  
  // Индексируем все файлы для разрешения ссылок
  for (const file of index.files) {
    const outputPath = getOutputPath(file, fileStructure);
    if (outputPath) {
      orchestrator.indexFile(file.path, outputPath);
    }
  }
  
  // Индексируем файлы репозиториев
  for (const repo of index.repositories) {
    const repoAlias = repo.alias || `${repo.owner}-${repo.repo}`;
    for (const file of repo.files) {
      if (file.type === 'markdown') {
        const relativePath = file.localRelativePath.replace(/\\/g, '/');
        const outputFileName = relativePath.replace(/\.md$/i, '.html').replace(/readme\.html$/i, 'index.html');
        const outputPath = path.join('dist', repoAlias, outputFileName);
        orchestrator.indexFile(file.localPath, outputPath);
      }
    }
  }
  
  // Обрабатываем файлы
  async function processStructureItem(item) {
    if (item.type === 'file' && !item.isIgnored) {
      const sourceFile = index.files.find(f => {
        const normalizedSource = item.source.replace(/\\/g, '/');
        const normalizedFile = f.relativePath.replace(/\\/g, '/');
        return normalizedFile === normalizedSource;
      });
      
      if (sourceFile) {
        const outputPath = path.join('dist', item.output);
        await orchestrator.processFile(sourceFile.path, outputPath);
      }
    } else if (item.type === 'folder') {
      for (const file of item.files) {
        await processStructureItem(file);
      }
      if (item.hiddenFiles) {
        for (const file of item.hiddenFiles) {
          await processStructureItem(file);
        }
      }
    } else if (item.type === 'repository') {
      const repoInfo = item.repoInfo;
      if (repoInfo) {
        const outputDir = path.join('dist', item.output);
        
        for (const file of repoInfo.files) {
          if (file.type === 'markdown') {
            const relativePath = file.localRelativePath.replace(/\\/g, '/');
            const outputFileName = relativePath.replace(/\.md$/i, '.html').replace(/readme\.html$/i, 'index.html');
            const outputPath = path.join(outputDir, outputFileName);
            
            await orchestrator.processFile(file.localPath, outputPath);
          }
        }
      }
    } else if (item.type === 'section') {
      for (const child of item.children) {
        await processStructureItem(child);
      }
    }
  }
  
  for (const item of fileStructure.root) {
    await processStructureItem(item);
  }
  
  // Обрабатываем изображения из markdown файлов
  console.log('\n📸 Processing images...');
  orchestrator.processMarkdownImages('website');
  
  // Копируем ассеты
  orchestrator.copyAssets();
  
  // Копируем файлы ошибок в корень dist
  copyErrorPages();
  
  // Завершаем сборку
  orchestrator.finishBuild();
  
  // Выводим статистику
  const report = orchestrator.generateBuildReport();
  console.log('\n📊 Build Statistics:');
  console.log(`   Files processed: ${report.summary.filesProcessed}`);
  console.log(`   Files generated: ${report.summary.filesGenerated}`);
  console.log(`   Total links: ${report.links.total}`);
  console.log(`   Broken links: ${report.links.broken}`);
  console.log(`   Duration: ${report.summary.duration}`);
  
  if (report.links.broken > 0) {
    console.log('\n⚠️  Broken links detected! Check .temp/link-map.json for details');
  }
}

/**
 * Helper: Get output path for file
 */
function getOutputPath(file, fileStructure) {
  function findInStructure(items, targetPath) {
    for (const item of items) {
      if (item.type === 'file' && item.source === targetPath) {
        return path.join('dist', item.output);
      } else if (item.type === 'folder') {
        const found = findInStructure(item.files, targetPath);
        if (found) return found;
        
        if (item.hiddenFiles) {
          const foundHidden = findInStructure(item.hiddenFiles, targetPath);
          if (foundHidden) return foundHidden;
        }
      } else if (item.type === 'section') {
        const found = findInStructure(item.children, targetPath);
        if (found) return found;
      }
    }
    return null;
  }
  
  return findInStructure(fileStructure.root, file.relativePath);
}

/**
 * Copy assets
 */
function copyAssets() {
  console.log('📁 Copying assets...');
  
  function copyRecursive(source, target) {
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
    }
    
    const items = fs.readdirSync(source, { withFileTypes: true });
    
    for (const item of items) {
      const sourcePath = path.join(source, item.name);
      const targetPath = path.join(target, item.name);
      
      if (item.isDirectory()) {
        copyRecursive(sourcePath, targetPath);
      } else {
        fs.copyFileSync(sourcePath, targetPath);
      }
    }
  }

  const sourceDir = 'assets';
  const targetDir = 'dist/assets';
  
  if (fs.existsSync(sourceDir)) {
    copyRecursive(sourceDir, targetDir);
    console.log('   ✓ Assets copied\n');
  }
}

/**
 * Copy error pages to root
 */
function copyErrorPages() {
  console.log('📄 Copying error pages to root...');
  
  const errorPagesDir = 'dist/assets/errors';
  const distRoot = 'dist';
  
  if (!fs.existsSync(errorPagesDir)) {
    console.log('   ⚠️  Error pages directory not found\n');
    return;
  }
  
  const errorFiles = ['404.html', '500.html', 'error.html'];
  let copiedCount = 0;
  
  errorFiles.forEach(file => {
    const sourcePath = path.join(errorPagesDir, file);
    const targetPath = path.join(distRoot, file);
    
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, targetPath);
      copiedCount++;
    }
  });
  
  console.log(`   ✓ Copied ${copiedCount} error pages to root\n`);
}

/**
 * Main build function
 */
async function build() {
  console.log('🚀 Starting build v3 (modular architecture)...\n');
  
  const startTime = Date.now();
  
  try {
    // Phase 1: Index all files
    const index = await indexAllFiles('website');
    
    // Phase 2: Build file structure
    const fileStructure = generateNavigationTemplates(index);
    
    // Phase 3: Generate files
    await generateFiles(index, fileStructure);
    
    // Phase 4: Generate error pages
    console.log('\n🚨 Phase 4: Generating error pages...\n');
    generateErrorPages();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ Build completed in ${duration}s`);
    console.log('\n📄 Generated files:');
    console.log('   - .temp/link-map.json (link map)');
    console.log('   - .temp/build-report.json (build report)');
    console.log('   - .temp/hierarchy-info.json (file structure)');
    console.log('   - dist/*.html (error pages)');
    
  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Helper functions moved inline - no dependencies on old code

/**
 * Build file structure from hierarchy
 */
function buildFileStructure(index) {
  const structure = {
    root: [],
    folders: {}
  };
  
  const rootConfig = index.rootConfig;
  if (!rootConfig || !rootConfig.hierarchy) {
    return structure;
  }
  
  const filesInHierarchy = new Set();
  const ignoredFiles = new Set(rootConfig.ignored || []);
  const sectionIgnoredFiles = new Map();
  
  function collectSectionIgnored(folderName) {
    const folderPath = path.join(index.rootConfig._basePath || 'website', folderName);
    const configPath = path.join(folderPath, 'doc-config.yaml');
    if (fs.existsSync(configPath)) {
      try {
        const configContent = fs.readFileSync(configPath, 'utf8');
        const folderConfig = yaml.load(configContent);
        if (folderConfig && folderConfig.ignored) {
          const ignoredSet = new Set(folderConfig.ignored);
          sectionIgnoredFiles.set(folderName, ignoredSet);
          return ignoredSet;
        }
      } catch (error) {
        // Ignore
      }
    }
    return new Set();
  }
  
  function collectHierarchyFiles(items, basePath = '') {
    items.forEach(item => {
      if (item.file) {
        const filePath = basePath ? `${basePath}/${item.file}` : item.file;
        filesInHierarchy.add(filePath.replace(/\\/g, '/'));
      } else if (item.folder) {
        collectSectionIgnored(item.folder);
        const folderPath = path.join(index.rootConfig._basePath || 'website', item.folder);
        const configPath = path.join(folderPath, 'doc-config.yaml');
        if (fs.existsSync(configPath)) {
          try {
            const configContent = fs.readFileSync(configPath, 'utf8');
            const folderConfig = yaml.load(configContent);
            if (folderConfig && folderConfig.hierarchy) {
              collectHierarchyFiles(folderConfig.hierarchy, item.folder);
            }
          } catch (error) {
            // Ignore
          }
        }
      }
      if (item.children) {
        collectHierarchyFiles(item.children, basePath);
      }
    });
  }
  
  collectHierarchyFiles(rootConfig.hierarchy);
  
  function processHierarchyItem(item, parentPath = '', isRootLevel = true) {
    if (item.file) {
      const fileName = path.basename(item.file, '.md');
      const isHome = fileName.toLowerCase() === 'home';
      const outputName = isHome ? 'index.html' : fileName + '.html';
      
      return {
        type: 'file',
        source: item.file,
        output: parentPath ? `${parentPath}/${outputName}` : outputName,
        title: item.title || fileName,
        alias: item.alias,
        inSidebar: true,
        isIndex: isHome
      };
    } else if (item.folder) {
      const outputFolder = item.alias || item.folder;
      let sectionConfig = null;
      const folderPath = path.join(index.rootConfig._basePath || 'website', item.folder);
      const configPath = path.join(folderPath, 'doc-config.yaml');
      
      if (fs.existsSync(configPath)) {
        try {
          const configContent = fs.readFileSync(configPath, 'utf8');
          sectionConfig = yaml.load(configContent);
        } catch (error) {
          console.warn(`   ⚠️  Error loading ${configPath}:`, error.message);
        }
      }
      
      const folderStructure = {
        type: 'folder',
        source: item.folder,
        output: outputFolder,
        title: item.title || item.folder,
        alias: item.alias,
        isSection: false,
        hasIndex: false,
        files: [],
        hiddenFiles: [],
        ignoredFiles: []
      };
      
      const folderIgnored = sectionIgnoredFiles.get(item.folder) || new Set();
      const allFolderFiles = index.files.filter(f => {
        const normalizedPath = f.relativePath.replace(/\\/g, '/');
        const folderPrefix = item.folder.replace(/\\/g, '/');
        return normalizedPath.startsWith(folderPrefix + '/');
      });
      
      if (sectionConfig && sectionConfig.hierarchy) {
        sectionConfig.hierarchy.forEach(sectionItem => {
          if (sectionItem.file) {
            const fileName = path.basename(sectionItem.file, '.md');
            const isHome = fileName.toLowerCase() === 'home';
            const outputName = isHome ? 'index.html' : fileName + '.html';
            
            if (isHome) {
              folderStructure.hasIndex = true;
            }
            
            folderStructure.files.push({
              type: 'file',
              source: `${item.folder}/${sectionItem.file}`,
              output: `${outputFolder}/${outputName}`,
              title: sectionItem.title || fileName,
              alias: sectionItem.alias,
              inSidebar: true,
              isIndex: isHome
            });
          } else if (sectionItem.repository) {
            const repoInfo = index.repositories.find(r => r.url === sectionItem.repository);
            const repoAlias = sectionItem.alias || repoInfo?.alias || sectionItem.repository.split('/').pop();
            
            folderStructure.files.push({
              type: 'repository',
              source: sectionItem.repository,
              output: `${outputFolder}/${repoAlias}`,
              title: sectionItem.title || repoAlias,
              alias: sectionItem.alias,
              repoInfo: repoInfo,
              inSidebar: true
            });
          }
        });
        
        allFolderFiles.forEach(file => {
          const fileRelPath = file.relativePath.replace(/\\/g, '/');
          const fileInHierarchy = filesInHierarchy.has(fileRelPath);
          const fileIgnoredRoot = ignoredFiles.has(file.name);
          const fileIgnoredLocal = folderIgnored.has(file.name);
          
          if (fileIgnoredRoot || fileIgnoredLocal) {
            const outputName = file.isReadme ? 'index.html' : file.baseName + '.html';
            folderStructure.ignoredFiles.push({
              type: 'file',
              source: file.relativePath,
              output: `${outputFolder}/${outputName}`,
              title: file.baseName,
              alias: null,
              inSidebar: false,
              isIndex: file.isReadme,
              isIgnored: true
            });
          } else if (!fileInHierarchy) {
            const outputName = file.isReadme ? 'index.html' : file.baseName + '.html';
            folderStructure.hiddenFiles.push({
              type: 'file',
              source: file.relativePath,
              output: `${outputFolder}/${outputName}`,
              title: file.baseName,
              alias: null,
              inSidebar: false,
              isIndex: file.isReadme
            });
          }
        });
      } else {
        allFolderFiles.forEach(file => {
          const fileIgnoredRoot = ignoredFiles.has(file.name);
          const fileIgnoredLocal = folderIgnored.has(file.name);
          
          if (fileIgnoredRoot || fileIgnoredLocal) {
            const outputName = file.isReadme ? 'index.html' : file.baseName + '.html';
            folderStructure.ignoredFiles.push({
              type: 'file',
              source: file.relativePath,
              output: `${outputFolder}/${outputName}`,
              title: file.baseName,
              alias: null,
              inSidebar: false,
              isIndex: file.isReadme,
              isIgnored: true
            });
          } else {
            const outputName = file.isReadme ? 'index.html' : file.baseName + '.html';
            if (file.isReadme) {
              folderStructure.hasIndex = true;
            }
            folderStructure.files.push({
              type: 'file',
              source: file.relativePath,
              output: `${outputFolder}/${outputName}`,
              title: file.baseName,
              alias: null,
              inSidebar: true,
              isIndex: file.isReadme
            });
          }
        });
      }
      
      return folderStructure;
    } else if (item.repository) {
      const repoInfo = index.repositories.find(r => r.url === item.repository);
      return {
        type: 'repository',
        source: item.repository,
        output: item.alias || repoInfo?.alias || item.repository.split('/').pop(),
        title: item.title || item.alias,
        alias: item.alias,
        repoInfo: repoInfo,
        inSidebar: true
      };
    } else if (item.section && item.children) {
      return {
        type: 'section',
        title: item.title,
        alias: item.alias,
        isSection: true,
        children: item.children.map(child => processHierarchyItem(child, parentPath, false)).filter(Boolean)
      };
    }
    
    return null;
  }
  
  rootConfig.hierarchy.forEach(item => {
    const processed = processHierarchyItem(item, '', true);
    if (processed) {
      structure.root.push(processed);
    }
  });
  
  return structure;
}

/**
 * Display file structure
 */
function displayFileStructure(structure) {
  const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    white: '\x1b[37m',
    gray: '\x1b[90m',
  };
  
  console.log('📁 File Structure (dist/):\n');
  
  function displayItem(item, indent = '', isLast = true) {
    const connector = isLast ? '└── ' : '├── ';
    const extension = isLast ? '    ' : '│   ';
    
    if (item.type === 'file') {
      const icon = item.isIndex ? '🏠' : '📄';
      let color = colors.green;
      let mark = '';
      
      if (item.isIgnored) {
        color = colors.red;
        mark = ` ${colors.gray}[ignored]${colors.reset}`;
      } else if (!item.inSidebar) {
        color = colors.yellow;
        mark = ` ${colors.gray}[hidden]${colors.reset}`;
      }
      
      console.log(`${indent}${connector}${icon} ${color}${item.output}${colors.reset}${mark}`);
    } else if (item.type === 'folder') {
      console.log(`${indent}${connector}📁 ${colors.cyan}${item.output}/${colors.reset}`);
      
      const allItems = [...item.files];
      const hasHidden = item.hiddenFiles && item.hiddenFiles.length > 0;
      const hasIgnored = item.ignoredFiles && item.ignoredFiles.length > 0;
      
      allItems.forEach((file, index) => {
        const isLastItem = index === allItems.length - 1 && !hasHidden && !hasIgnored;
        displayItem(file, indent + extension, isLastItem);
      });
      
      if (hasHidden) {
        item.hiddenFiles.forEach((file, index) => {
          const isLastItem = index === item.hiddenFiles.length - 1 && !hasIgnored;
          displayItem(file, indent + extension, isLastItem);
        });
      }
      
      if (hasIgnored) {
        item.ignoredFiles.forEach((file, index) => {
          displayItem(file, indent + extension, index === item.ignoredFiles.length - 1);
        });
      }
    } else if (item.type === 'repository') {
      console.log(`${indent}${connector}📦 ${colors.magenta}${item.output}/${colors.reset}`);
    } else if (item.type === 'section') {
      console.log(`${indent}${connector}📂 ${colors.blue}${item.title}${colors.reset}`);
      item.children.forEach((child, index) => {
        displayItem(child, indent + extension, index === item.children.length - 1);
      });
    }
  }
  
  structure.root.forEach((item, index) => {
    displayItem(item, '', index === structure.root.length - 1);
  });
}

// Run build
if (require.main === module) {
  build();
}

module.exports = {
  build,
  indexAllFiles,
  generateNavigationTemplates,
  generateFiles
};
