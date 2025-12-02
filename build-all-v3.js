// build-all-v3.js - Новая версия с использованием модульной архитектуры
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { BuildOrchestrator } = require('./components/buildOrchestrator');
const { globalLinkManager } = require('./components/linkManager');
const { downloadGitHubRepoMarkdown } = require('./components/githubFetcher');
const { registerRepositoryAlias } = require('./components/config');
const { generateErrorPages } = require('./components/errorPageGenerator');
const { DocConfigProcessor } = require('./components/docConfigProcessor');

/**
 * Phase 1: Complete indexing with doc-config processing
 */
async function indexAllFiles(rootPath) {
  console.log('📂 Phase 1: Indexing all files...\n');
  
  // Используем новый процессор doc-config
  const docProcessor = new DocConfigProcessor(rootPath);
  const docResult = docProcessor.process();
  
  const index = {
    files: docResult.files,
    allFiles: docResult.allFiles,
    folders: docResult.allFolders,
    repositories: [],
    hierarchy: docResult.tree,
    docTree: docResult.tree,
    rootConfig: docProcessor.loadDocConfig(rootPath)
  };
  
  if (index.rootConfig) {
    index.rootConfig._basePath = rootPath;
  }



  // Download and index repositories from doc tree
  const tempDir = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  async function processRepositoriesFromTree(node) {
    if (node.type === 'repository') {
      console.log(`   📥 Downloading: ${node.alias || node.repository}`);
      
      // Регистрируем псевдоним в глобальной конфигурации
      const urlMatch = node.repository.match(/https:\/\/github\.com\/([^\/]+)\/([^\/]+)/);
      if (urlMatch && node.alias) {
        const [, owner, repo] = urlMatch;
        registerRepositoryAlias(owner, repo, node.alias);
      }
      
      const projectData = await downloadGitHubRepoMarkdown(node.repository, tempDir, node.alias);
      
      if (projectData.files.length > 0) {
        index.repositories.push({
          url: node.repository,
          alias: node.alias || projectData.repo,
          owner: projectData.owner,
          repo: projectData.repo,
          title: node.title,
          projectData: projectData,
          files: projectData.files
        });
        console.log(`      ✓ ${projectData.files.length} files`);
      }
    }
    
    if (node.children) {
      for (const child of node.children) {
        await processRepositoriesFromTree(child);
      }
    }
  }

  // Обрабатываем все репозитории из дерева
  await processRepositoriesFromTree(docResult.tree);

  const totalRepoFiles = index.repositories.reduce((sum, repo) => sum + (repo.projectData?.files?.length || 0), 0);
  console.log(`\n   ✓ Total indexed: ${index.files.length} files (${index.allFiles.length} total scanned), ${index.repositories.length} repositories (${totalRepoFiles} files)\n`);
  
  return index;
}

/**
 * Phase 2: Build file structure and save hierarchy info
 */
function generateNavigationTemplates(index) {
  console.log('🗺️  Phase 2: Building site structure...\n');
  
  const fileStructure = buildFileStructure(index);
  displayFileStructure(fileStructure, index);
  
  // Собираем секции из дерева (рекурсивно обрабатываем все узлы)
  const sections = {};
  const extractSections = (node) => {
    // Добавляем в sections только если у папки есть СОБСТВЕННЫЙ doc-config.yaml
    if (node.type === 'folder' && node.config && node.config.hierarchy) {
      const sectionName = path.basename(node.relativePath);
      // Нормализуем оба пути к абсолютным для корректного сравнения
      const folderPath = path.resolve(process.cwd(), index.rootConfig._basePath || 'website', node.relativePath);
      const configDirPath = path.resolve(node.config._dirPath);
      
      // Проверяем что config принадлежит именно этой папке, а не родительской
      if (configDirPath === folderPath) {
        sections[sectionName] = node.config;
      }
    }
    
    // Рекурсивно обрабатываем children
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        extractSections(child);
      }
    }
  };
  
  if (index.docTree) {
    extractSections(index.docTree);
  }
  
  const hierarchyInfo = {
    root: index.rootConfig,
    tree: index.docTree,
    sections: sections,
    allFiles: index.allFiles.map(f => ({
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
      title: r.title,
      filesCount: r.files.length
    })),
    fileStructure: fileStructure
  };

  const hierarchyPath = path.join(process.cwd(), '.temp', 'hierarchy-info.json');
  if (!fs.existsSync(path.dirname(hierarchyPath))) {
    fs.mkdirSync(path.dirname(hierarchyPath), { recursive: true });
  }
  fs.writeFileSync(hierarchyPath, JSON.stringify(hierarchyInfo, null, 2));
  
  return fileStructure;
}

/**
 * Phase 3: Generate files using BuildOrchestrator
 */
async function generateFiles(index, fileStructure, rootPath) {
  console.log('📝 Phase 3: Generating files...\n');
  
  // Определяем путь к config.yaml
  const configPath = path.join(rootPath, 'config.yaml');
  
  const orchestrator = new BuildOrchestrator({
    projectRoot: process.cwd(),
    distDir: 'dist',
    configPath: configPath
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
        const outputFileName = relativePath.replace(/\.md$/i, '.html').replace(/readme\.html$/i, 'index.html').toLowerCase();
        const outputPath = path.join('dist', repoAlias, outputFileName);
        orchestrator.indexFile(file.localPath, outputPath);
      }
    }
  }
  
  // Обрабатываем файлы в два прохода:
  // Проход 1: Сначала обрабатываем ВСЕ репозитории
  // Проход 2: Затем обрабатываем локальные файлы
  
  console.log('   📦 Pass 1: Processing repository files...');
  
  async function processRepositories(item) {
    // Обрабатываем репозитории (включая те, что помечены как section)
    if (item.type === 'repository' || (item.type === 'section' && item.isRepository)) {
      const repoInfo = item.repoInfo;
      if (repoInfo) {
        const outputDir = path.join('dist', item.output);
        console.log(`      Processing repository: ${item.output}`);
        
        for (const file of repoInfo.files) {
          if (file.type === 'markdown') {
            const relativePath = file.localRelativePath.replace(/\\/g, '/');
            const outputFileName = relativePath.replace(/\.md$/i, '.html').replace(/readme\.html$/i, 'index.html').toLowerCase();
            const outputPath = path.join(outputDir, outputFileName);
            
            await orchestrator.processFile(file.localPath, outputPath);
          }
        }
      }
    }
    
    // Рекурсивно обрабатываем дочерние элементы
    if (item.type === 'folder' || item.type === 'section') {
      const children = item.type === 'folder' ? item.files : item.children;
      if (children) {
        for (const child of children) {
          await processRepositories(child);
        }
      }
    }
  }
  
  // Проход 1: Обрабатываем репозитории
  for (const item of fileStructure.root) {
    await processRepositories(item);
  }
  
  console.log('   📄 Pass 2: Processing local files...');
  
  async function processLocalFiles(item) {
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
        await processLocalFiles(file);
      }
      if (item.hiddenFiles) {
        for (const file of item.hiddenFiles) {
          await processLocalFiles(file);
        }
      }
    } else if (item.type === 'section') {
      for (const child of item.children) {
        await processLocalFiles(child);
      }
    }
  }
  
  // Проход 2: Обрабатываем локальные файлы
  for (const item of fileStructure.root) {
    await processLocalFiles(item);
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
async function build(rootPath) {
  if (!rootPath) {
    throw new Error('Root path is required');
  }
  console.log('🚀 Starting build v3 (modular architecture)...\n');
  console.log(`📂 Root path: ${rootPath}\n`);
  
  const startTime = Date.now();
  
  try {
    // Validate root path
    if (!fs.existsSync(rootPath)) {
      throw new Error(`Root path does not exist: ${rootPath}`);
    }
    
    // Check for config.yaml in root path
    const configPath = path.join(rootPath, 'config.yaml');
    if (!fs.existsSync(configPath)) {
      console.warn(`⚠️  Warning: config.yaml not found in ${rootPath}`);
      console.warn('   Using default configuration\n');
    } else {
      console.log(`✓ Found config.yaml in ${rootPath}\n`);
    }
    
    // Phase 1: Index all files
    const index = await indexAllFiles(rootPath);
    
    // Phase 2: Build file structure
    const fileStructure = generateNavigationTemplates(index);
    
    // Phase 3: Generate files
    await generateFiles(index, fileStructure, rootPath);
    
    // Phase 4: Generate error pages
    console.log('\n🚨 Phase 4: Generating error pages...\n');
    const errorPagesConfigPath = path.join(rootPath, 'config.yaml');
    generateErrorPages(errorPagesConfigPath);
    
    // Phase 5: Generate search index
    console.log('\n🔍 Phase 5: Generating search index...\n');
    const { scanAndIndexHtmlFiles, saveSearchIndex } = require('./components/searchIndex');
    const distDir = path.join(process.cwd(), 'dist');
    const searchData = scanAndIndexHtmlFiles(distDir);
    const searchIndexPath = path.join(distDir, 'search-index.json');
    saveSearchIndex(searchData, searchIndexPath);
    console.log(`   ✓ Indexed ${searchData.documents.length} pages`);
    console.log('   ✓ Generated search-index.json\n');
    
    // Phase 6: Generate _redirects for Netlify
    console.log('\n🔀 Phase 6: Generating _redirects...\n');
    const redirectsPath = path.join('dist', '_redirects');
    const redirectsContent = `# Redirect old readme.html links to index.html
/*/readme.html /*/index.html 301
/*/*/readme.html /*/*/index.html 301
/*/*/*/readme.html /*/*/*/index.html 301
/*/*/*/*/readme.html /*/*/*/*/index.html 301

# Custom error pages for Netlify
/* /404.html 404
/* /500.html 500
`;
    fs.writeFileSync(redirectsPath, redirectsContent, 'utf8');
    console.log('   ✓ Generated _redirects\n');
    
    // Phase 7: Generate sitemap.xml
    console.log('\n🗺️  Phase 7: Generating sitemap.xml...\n');
    const { generateSitemap } = require('./components/sitemapGenerator');
    const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
    const baseUrl = config.site?.baseUrl || 'https://creapunk.com';
    generateSitemap(distDir, baseUrl);
    
    // Phase 8: Copy robots.txt to dist
    console.log('\n🤖 Phase 8: Copying robots.txt...\n');
    const robotsSrc = path.join(process.cwd(), 'robots.txt');
    const robotsDest = path.join(distDir, 'robots.txt');
    if (fs.existsSync(robotsSrc)) {
      fs.copyFileSync(robotsSrc, robotsDest);
      console.log('   ✓ Copied robots.txt to dist\n');
    } else {
      console.log('   ⚠️  robots.txt not found in root\n');
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ Build completed in ${duration}s`);
    console.log('\n📄 Generated files:');
    console.log('   - .temp/link-map.json (link map)');
    console.log('   - .temp/build-report.json (build report)');
    console.log('   - .temp/hierarchy-info.json (file structure)');
    console.log('   - dist/search-index.json (search index)');
    console.log('   - dist/sitemap.xml (sitemap)');
    console.log('   - dist/robots.txt (robots)');
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
      const outputName = isHome ? 'index.html' : fileName.toLowerCase() + '.html';
      
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
      // Если папка помечена как section: true, обрабатываем её как секцию
      if (item.section === true) {
        // Загружаем doc-config папки для получения дочерних элементов
        const folderPath = path.join(index.rootConfig._basePath || 'website', item.folder);
        const configPath = path.join(folderPath, 'doc-config.yaml');
        let children = [];
        
        if (fs.existsSync(configPath)) {
          try {
            const configContent = fs.readFileSync(configPath, 'utf8');
            const folderConfig = yaml.load(configContent);
            if (folderConfig && folderConfig.hierarchy) {
              children = folderConfig.hierarchy.map(child => processHierarchyItem(child, item.folder, false)).filter(Boolean);
            }
          } catch (error) {
            console.warn(`   ⚠️  Error loading ${configPath}:`, error.message);
          }
        }
        
        return {
          type: 'section',
          title: item.title || item.folder,
          alias: item.alias || item.folder,
          isSection: true,
          isFolder: true,
          output: (item.alias || item.folder).toLowerCase(),
          children: children
        };
      }
      
      const outputFolder = (item.alias || item.folder).toLowerCase();
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
        ignoredFiles: [],
        relativePath: item.folder,  // Добавляем relativePath для extractSections
        config: sectionConfig  // Добавляем config для использования в extractSections
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
            const outputName = isHome ? 'index.html' : fileName.toLowerCase() + '.html';
            
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
            const repoAlias = (sectionItem.alias || repoInfo?.alias || sectionItem.repository.split('/').pop()).toLowerCase();
            
            // Если репозиторий помечен как section: true, обрабатываем его как секцию
            if (sectionItem.section === true) {
              folderStructure.files.push({
                type: 'section',
                title: sectionItem.title || repoAlias,
                alias: sectionItem.alias || repoAlias,
                isSection: true,
                isRepository: true,
                source: sectionItem.repository,
                output: `${outputFolder}/${repoAlias}`,
                repoInfo: repoInfo,
                children: [] // Будет заполнено из doc-config репозитория
              });
            } else {
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
          }
        });
        
        allFolderFiles.forEach(file => {
          const fileRelPath = file.relativePath.replace(/\\/g, '/');
          const fileInHierarchy = filesInHierarchy.has(fileRelPath);
          const fileIgnoredRoot = ignoredFiles.has(file.name);
          const fileIgnoredLocal = folderIgnored.has(file.name);
          
          if (fileIgnoredRoot || fileIgnoredLocal) {
            const outputName = file.isReadme ? 'index.html' : file.baseName.toLowerCase() + '.html';
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
            const outputName = file.isReadme ? 'index.html' : file.baseName.toLowerCase() + '.html';
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
            const outputName = file.isReadme ? 'index.html' : file.baseName.toLowerCase() + '.html';
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
            const outputName = file.isReadme ? 'index.html' : file.baseName.toLowerCase() + '.html';
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
      const repoOutput = (item.alias || repoInfo?.alias || item.repository.split('/').pop()).toLowerCase();
      
      // Если репозиторий помечен как section: true, обрабатываем его как секцию
      if (item.section === true) {
        return {
          type: 'section',
          title: item.title || item.alias,
          alias: item.alias,
          isSection: true,
          isRepository: true,
          source: item.repository,
          output: repoOutput,
          repoInfo: repoInfo,
          children: [] // Дочерние элементы будут добавлены из doc-config репозитория
        };
      }
      
      return {
        type: 'repository',
        source: item.repository,
        output: repoOutput,
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
 * Build file tree from flat list of files
 */
function buildFileTree(files) {
  const tree = {};
  
  files.forEach(file => {
    const filePath = file.localRelativePath || file.originalPath || '';
    const parts = filePath.split(/[/\\]/).filter(p => p);
    
    let current = tree;
    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        // This is a file
        if (!current._files) current._files = [];
        current._files.push({ name: part, file });
      } else {
        // This is a folder
        if (!current[part]) current[part] = {};
        current = current[part];
      }
    });
  });
  
  return tree;
}

/**
 * Scan dist directory for HTML files
 */
function scanDistDirectory(dirPath, basePath = '') {
  const files = [];
  
  function scan(dir, relativePath = '') {
    if (!fs.existsSync(dir)) {
      return;
    }
    
    const items = fs.readdirSync(dir, { withFileTypes: true });
    items.forEach(item => {
      const itemPath = path.join(dir, item.name);
      const itemRelative = relativePath ? `${relativePath}/${item.name}` : item.name;
      
      if (item.isDirectory()) {
        scan(itemPath, itemRelative);
      } else if (item.name.endsWith('.html')) {
        files.push({
          name: item.name,
          path: itemRelative
        });
      }
    });
  }
  
  scan(dirPath);
  return files;
}

/**
 * Build file tree from dist files
 */
function buildFileTreeFromDist(files) {
  const tree = {};
  
  files.forEach(file => {
    const parts = file.path.split('/').filter(p => p);
    
    let current = tree;
    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        // This is a file
        if (!current._files) current._files = [];
        current._files.push({ name: part });
      } else {
        // This is a folder
        if (!current[part]) current[part] = {};
        current = current[part];
      }
    });
  });
  
  return tree;
}

/**
 * Display file tree recursively
 */
function displayFileTree(tree, indent, colors, isRoot = true) {
  const entries = Object.keys(tree).filter(k => k !== '_files');
  const files = tree._files || [];
  
  // Фильтруем папки - показываем только те, что содержат HTML файлы
  const foldersWithHtml = entries.filter(folderName => {
    return hasHtmlFiles(tree[folderName]);
  });
  
  const totalItems = foldersWithHtml.length + files.length;
  
  // Display folders first
  foldersWithHtml.forEach((folderName, index) => {
    const isLast = index === foldersWithHtml.length - 1 && files.length === 0;
    const connector = isLast ? '└── ' : '├── ';
    const extension = isLast ? '    ' : '│   ';
    
    console.log(`${indent}${connector}📁 ${colors.cyan}${folderName.toLowerCase()}/${colors.reset}`);
    displayFileTree(tree[folderName], indent + extension, colors, false);
  });
  
  // Display files (только HTML файлы, без картинок)
  const htmlFiles = files.filter(fileObj => {
    const fileName = fileObj.name.toLowerCase();
    // Показываем только .html и .md файлы
    return fileName.endsWith('.html') || fileName.endsWith('.md');
  });
  
  htmlFiles.forEach((fileObj, index) => {
    const isLast = index === htmlFiles.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    let fileName = fileObj.name.toLowerCase();
    
    // Конвертируем .md в .html для отображения
    if (fileName.endsWith('.md')) {
      fileName = fileName.replace(/\.md$/, '.html');
    }
    
    // readme.html -> index.html
    if (fileName === 'readme.html') {
      fileName = 'index.html';
    }
    
    const fileIcon = fileName === 'index.html' ? '🏠' : '📄';
    
    console.log(`${indent}${connector}${fileIcon} ${colors.green}${fileName}${colors.reset}`);
  });
}

// Проверяет, содержит ли дерево HTML файлы (рекурсивно)
function hasHtmlFiles(tree) {
  const files = tree._files || [];
  const hasHtml = files.some(f => {
    const name = f.name.toLowerCase();
    return name.endsWith('.html') || name.endsWith('.md');
  });
  
  if (hasHtml) return true;
  
  const entries = Object.keys(tree).filter(k => k !== '_files');
  return entries.some(key => hasHtmlFiles(tree[key]));
}

/**
 * Display folder tree for structured folders
 */
function displayFolderTree(tree, indent, colors) {
  const entries = Object.keys(tree).filter(k => k !== '_files');
  const files = tree._files || [];
  
  // Display folders first
  entries.forEach((folderName, index) => {
    const isLast = index === entries.length - 1 && files.length === 0;
    const connector = isLast ? '└── ' : '├── ';
    const extension = isLast ? '    ' : '│   ';
    
    console.log(`${indent}${connector}📁 ${colors.cyan}${folderName.toLowerCase()}/${colors.reset}`);
    displayFolderTree(tree[folderName], indent + extension, colors);
  });
  
  // Display files
  files.forEach((file, index) => {
    const isLast = index === files.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    let fileName = path.basename(file.output).toLowerCase();
    
    // readme.html -> index.html
    if (fileName === 'readme.html') {
      fileName = 'index.html';
    }
    
    const fileIcon = fileName === 'index.html' ? '🏠' : '📄';
    let color = colors.green;
    let mark = '';
    
    if (file.isIgnored) {
      color = colors.red;
      mark = ` ${colors.gray}[ignored]${colors.reset}`;
    } else if (!file.inSidebar) {
      color = colors.yellow;
      mark = ` ${colors.gray}[hidden]${colors.reset}`;
    }
    
    console.log(`${indent}${connector}${fileIcon} ${color}${fileName}${colors.reset}${mark}`);
  });
}

/**
 * Display file structure
 */
function displayFileStructure(structure, index) {
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
  
  console.log('📊 Complete Site Structure:\n');
  
  function displayItem(item, indent = '', isLast = true) {
    const connector = isLast ? '└── ' : '├── ';
    const extension = isLast ? '    ' : '│   ';
    
    if (item.type === 'file') {
      let fileName = item.output.toLowerCase();
      
      // readme.html -> index.html
      if (fileName.endsWith('readme.html')) {
        fileName = fileName.replace(/readme\.html$/, 'index.html');
      }
      
      const icon = fileName.endsWith('index.html') ? '🏠' : '📄';
      let color = colors.green;
      let mark = '';
      
      if (item.isIgnored) {
        color = colors.red;
        mark = ` ${colors.gray}[ignored]${colors.reset}`;
      } else if (!item.inSidebar) {
        color = colors.yellow;
        mark = ` ${colors.gray}[hidden]${colors.reset}`;
      }
      
      console.log(`${indent}${connector}${icon} ${color}${fileName}${colors.reset}${mark}`);
    } else if (item.type === 'folder') {
      const folderName = (item.title || item.output).toLowerCase();
      const sectionMark = item.isSection ? ` ${colors.gray}(section)${colors.reset}` : '';
      console.log(`${indent}${connector}📁 ${colors.cyan}${folderName}${colors.reset}${sectionMark}`);
      
      // Разделяем элементы на файлы, секции и репозитории
      const allItems = [...item.files];
      if (item.hiddenFiles) allItems.push(...item.hiddenFiles);
      if (item.ignoredFiles) allItems.push(...item.ignoredFiles);
      
      const regularFiles = [];
      const sectionsAndRepos = [];
      
      allItems.forEach(file => {
        if (file.type === 'section' || file.type === 'repository') {
          sectionsAndRepos.push(file);
        } else {
          regularFiles.push(file);
        }
      });
      
      // Группируем обычные файлы по папкам
      const fileTree = {};
      regularFiles.forEach(file => {
        const outputPath = file.output.replace(`${item.output}/`, '');
        const parts = outputPath.split('/');
        
        if (parts.length === 1) {
          // Файл в корне папки
          if (!fileTree._files) fileTree._files = [];
          fileTree._files.push(file);
        } else {
          // Файл в подпапке
          let current = fileTree;
          for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]]) current[parts[i]] = {};
            current = current[parts[i]];
          }
          if (!current._files) current._files = [];
          current._files.push(file);
        }
      });
      
      // Отображаем дерево файлов
      displayFolderTree(fileTree, indent + extension, colors);
      
      // Отображаем секции и репозитории
      sectionsAndRepos.forEach((child, index) => {
        const isLastChild = index === sectionsAndRepos.length - 1;
        displayItem(child, indent + extension, isLastChild);
      });
    } else if (item.type === 'repository') {
      const repoFiles = item.repoInfo?.projectData?.files || [];
      let filesCount = repoFiles.length;
      
      // Пытаемся прочитать из dist если нет данных в projectData
      let distFiles = [];
      if (filesCount === 0) {
        const distPath = path.join('dist', item.output);
        if (fs.existsSync(distPath)) {
          distFiles = scanDistDirectory(distPath, item.output);
          filesCount = distFiles.length;
        }
      }
      
      const filesInfo = filesCount > 0
        ? ` ${colors.gray}(${filesCount} files)${colors.reset}` 
        : '';
      const sectionMark = item.isSection ? ` ${colors.gray}(section)${colors.reset}` : '';
      const repoName = (item.title || item.output).toLowerCase();
      console.log(`${indent}${connector}📦 ${colors.magenta}${repoName}${colors.reset}${filesInfo}${sectionMark}`);
      
      // Build tree structure from file paths
      if (repoFiles.length > 0) {
        const tree = buildFileTree(repoFiles);
        displayFileTree(tree, indent + extension, colors);
      } else if (distFiles.length > 0) {
        const tree = buildFileTreeFromDist(distFiles);
        displayFileTree(tree, indent + extension, colors);
      }
    } else if (item.type === 'section') {
      // Проверяем, является ли секция репозиторием
      if (item.isRepository && item.repoInfo) {
        const repoFiles = item.repoInfo?.projectData?.files || [];
        let filesCount = repoFiles.length;
        
        // Пытаемся прочитать из dist если нет данных в projectData
        let distFiles = [];
        if (filesCount === 0) {
          const distPath = path.join('dist', item.output);
          if (fs.existsSync(distPath)) {
            distFiles = scanDistDirectory(distPath, item.output);
            filesCount = distFiles.length;
          }
        }
        
        const filesInfo = filesCount > 0
          ? ` ${colors.gray}(${filesCount} files)${colors.reset}` 
          : '';
        const sectionMark = ` ${colors.gray}(section)${colors.reset}`;
        const repoName = item.title.toLowerCase();
        console.log(`${indent}${connector}📦 ${colors.magenta}${repoName}${colors.reset}${filesInfo}${sectionMark}`);
        
        // Build tree structure from file paths
        if (repoFiles.length > 0) {
          const tree = buildFileTree(repoFiles);
          displayFileTree(tree, indent + extension, colors);
        } else if (distFiles.length > 0) {
          const tree = buildFileTreeFromDist(distFiles);
          displayFileTree(tree, indent + extension, colors);
        }
      } else {
        // Обычная секция
        const sectionName = item.title.toLowerCase();
        const sectionMark = ` ${colors.gray}(section)${colors.reset}`;
        console.log(`${indent}${connector}📂 ${colors.blue}${sectionName}${colors.reset}${sectionMark}`);
        item.children.forEach((child, index) => {
          displayItem(child, indent + extension, index === item.children.length - 1);
        });
      }
    }
  }
  
  structure.root.forEach((item, index) => {
    displayItem(item, '', index === structure.root.length - 1);
  });
  
  // Легенда
  console.log('\n📖 Legend:');
  console.log('  🏠 Home page (index.html)');
  console.log('  📄 Regular file');
  console.log('  📁 Folder');
  console.log('  📂 Section (group)');
  console.log('  📦 GitHub repository');
  console.log('  🚫 Ignored file');
  console.log('  (section) - Item is a section container');
  
  // Статистика
  if (index) {
    console.log('\n📈 Statistics:');
    const totalLocalFiles = index.allFiles?.length || 0;
    const totalRepoFiles = index.repositories?.reduce((sum, r) => sum + (r.files?.length || 0), 0) || 0;
    const totalFiles = totalLocalFiles + totalRepoFiles;
    const totalRepos = index.repositories?.length || 0;
    
    console.log(`  Files: ${totalFiles} total`);
    if (totalLocalFiles > 0) {
      console.log(`    ├─ ${totalLocalFiles} local files`);
    }
    if (totalRepoFiles > 0) {
      console.log(`    └─ ${totalRepoFiles} from repositories`);
    }
    if (totalRepos > 0) {
      console.log(`  Repositories: ${totalRepos}`);
    }
  }
}

// Run build
if (require.main === module) {
  // Get root path from command line arguments
  const args = process.argv.slice(2);
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         Static Site Generator - Build System v3           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  if (args.length === 0) {
    console.error('❌ Error: Root path is required!\n');
    console.log('Usage: node build-all-v3.js <root-path>');
    console.log('\nExamples:');
    console.log('  node build-all-v3.js website');
    console.log('  node build-all-v3.js docs-site');
    console.log('  node build-all-v3.js my-project\n');
    process.exit(1);
  }
  
  const rootPath = args[0];
  build(rootPath);
}

module.exports = {
  build,
  indexAllFiles,
  generateNavigationTemplates,
  generateFiles
};
