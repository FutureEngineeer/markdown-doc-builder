// build-all-v2.js - New build system with proper indexing
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { convertMarkdownToHTML } = require('./converter');
const { downloadGitHubRepoMarkdown, getCacheInfo } = require('./components/githubFetcher');
const { createGitHubProjectPages } = require('./components/projectParser');

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
    
    // Load doc-config for this directory (don't inherit from parent)
    const configPath = path.join(dirPath, 'doc-config.yaml');
    let currentConfig = null;
    if (fs.existsSync(configPath)) {
      currentConfig = yaml.load(fs.readFileSync(configPath, 'utf8'));
    }

    items.forEach(item => {
      const fullPath = path.join(dirPath, item.name);
      const itemRelativePath = relativePath ? path.join(relativePath, item.name) : item.name;

      if (item.isDirectory()) {
        // Index subdirectory
        const subFiles = indexDirectory(fullPath, itemRelativePath, currentConfig);
        localFiles.push(...subFiles);
        
        index.folders.push({
          name: item.name,
          path: fullPath,
          relativePath: itemRelativePath,
          config: currentConfig
        });
      } else if (item.name.endsWith('.md')) {
        // Index markdown file
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

  // Download and index repositories from all hierarchies (root + sections)
  const tempDir = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  async function processHierarchyForRepos(items) {
    for (const item of items) {
      if (item.repository) {
        console.log(`   📥 Downloading: ${item.alias || item.repository}`);
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

  // Process root hierarchy
  if (rootConfig && rootConfig.hierarchy) {
    await processHierarchyForRepos(rootConfig.hierarchy);
  }

  // Process section hierarchies
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

  // Build hierarchy
  if (rootConfig && rootConfig.hierarchy) {
    index.hierarchy = rootConfig.hierarchy;
    index.rootConfig = rootConfig;
    index.rootConfig._basePath = rootPath; // Store base path for later use
  }

  console.log(`\n   ✓ Total indexed: ${index.files.length} files, ${index.repositories.length} repositories\n`);
  
  return index;
}

/**
 * Phase 2: Build file structure and generate navigation templates
 */
function generateNavigationTemplates(index) {
  console.log('🗺️  Phase 2: Building file structure...\n');
  
  // Build complete file structure based on hierarchy
  const fileStructure = buildFileStructure(index);
  
  // Display file structure
  displayFileStructure(fileStructure);
  
  // Save complete index to .temp/hierarchy-info.json for hamburger menu generation
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
      filesCount: r.files.length
    })),
    fileStructure: fileStructure
  };

  // Add section configs (only if they have their own doc-config)
  const processedSections = new Set();
  index.folders.forEach(folder => {
    const folderName = path.basename(folder.relativePath);
    
    // Only add if this folder has its own doc-config (not inherited from parent)
    const folderConfigPath = path.join(folder.path, 'doc-config.yaml');
    if (fs.existsSync(folderConfigPath) && !processedSections.has(folderName)) {
      // Load config directly to ensure it's not inherited
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
  
  // Create sets for tracking files in hierarchy
  const filesInHierarchy = new Set();
  const ignoredFiles = new Set(rootConfig.ignored || []);
  
  // Collect ignored files from all section configs
  const sectionIgnoredFiles = new Map(); // folder -> Set of ignored files
  
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
        // Ignore errors
      }
    }
    return new Set();
  }
  
  // Helper to collect files mentioned in hierarchy
  function collectHierarchyFiles(items, basePath = '') {
    items.forEach(item => {
      if (item.file) {
        const filePath = basePath ? `${basePath}/${item.file}` : item.file;
        filesInHierarchy.add(filePath.replace(/\\/g, '/'));
      } else if (item.folder) {
        // Collect ignored files from this folder
        collectSectionIgnored(item.folder);
        
        // Get folder config to check its hierarchy
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
            // Ignore errors
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
      
      // Get section config - load directly from file to ensure it's not inherited
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
      
      // Get ignored files for this folder
      const folderIgnored = sectionIgnoredFiles.get(item.folder) || new Set();
      
      // Get all files in this folder
      const allFolderFiles = index.files.filter(f => {
        const normalizedPath = f.relativePath.replace(/\\/g, '/');
        const folderPrefix = item.folder.replace(/\\/g, '/');
        return normalizedPath.startsWith(folderPrefix + '/');
      });
      
      // Process files in folder based on its doc-config
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
        
        // Add hidden and ignored files
        allFolderFiles.forEach(file => {
          const fileRelPath = file.relativePath.replace(/\\/g, '/');
          const fileInHierarchy = filesInHierarchy.has(fileRelPath);
          const fileIgnoredRoot = ignoredFiles.has(file.name);
          const fileIgnoredLocal = folderIgnored.has(file.name);
          
          if (fileIgnoredRoot || fileIgnoredLocal) {
            // This file is ignored
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
            // This file is hidden (not in hierarchy, not ignored)
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
        // No doc-config, all files are visible (except ignored)
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
 * Display file structure in a beautiful tree format
 */
function displayFileStructure(structure) {
  // ANSI color codes
  const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    
    // Foreground colors
    green: '\x1b[32m',    // Files in sidebar
    yellow: '\x1b[33m',   // Hidden files
    red: '\x1b[31m',      // Ignored files
    cyan: '\x1b[36m',     // Folders
    blue: '\x1b[34m',     // Sections
    magenta: '\x1b[35m',  // Repositories
    white: '\x1b[37m',    // Index files
    gray: '\x1b[90m',     // Markers
  };
  
  console.log('📁 File Structure (dist/):\n');
  console.log(`${colors.dim}Legend:${colors.reset}`);
  console.log(`  ${colors.green}Green${colors.reset} - Files in sidebar (visible in navigation)`);
  console.log(`  ${colors.yellow}Yellow${colors.reset} - Hidden files (not in hierarchy, but generated)`);
  console.log(`  ${colors.red}Red${colors.reset} - Ignored files (not generated)`);
  console.log(`  ${colors.cyan}Cyan${colors.reset} - Folders`);
  console.log(`  ${colors.blue}Blue${colors.reset} - Sections (navigation groups)`);
  console.log(`  ${colors.magenta}Magenta${colors.reset} - Repositories`);
  console.log(`  🏠 - Index/Home files\n`);
  
  function displayItem(item, indent = '', isLast = true) {
    const connector = isLast ? '└── ' : '├── ';
    const extension = isLast ? '    ' : '│   ';
    
    if (item.type === 'file') {
      const icon = item.isIndex ? '🏠' : '📄';
      let color = colors.green; // Default: in sidebar
      let mark = '';
      
      if (item.isIgnored) {
        color = colors.red;
        mark = ` ${colors.gray}[ignored]${colors.reset}`;
      } else if (!item.inSidebar) {
        color = colors.yellow;
        mark = ` ${colors.gray}[hidden]${colors.reset}`;
      }
      
      console.log(`${indent}${connector}${icon} ${color}${item.output}${colors.reset}${mark} ${colors.dim}(${item.title})${colors.reset}`);
    } else if (item.type === 'folder') {
      const sectionMark = item.isSection ? ` ${colors.gray}[section]${colors.reset}` : '';
      const indexMark = item.hasIndex ? ` ${colors.gray}[has index]${colors.reset}` : '';
      console.log(`${indent}${connector}📁 ${colors.cyan}${item.output}/${colors.reset}${sectionMark}${indexMark} ${colors.dim}(${item.title})${colors.reset}`);
      
      // Display files in sidebar first
      const allItems = [...item.files];
      const hasHidden = item.hiddenFiles && item.hiddenFiles.length > 0;
      const hasIgnored = item.ignoredFiles && item.ignoredFiles.length > 0;
      
      allItems.forEach((file, index) => {
        const isLastItem = index === allItems.length - 1 && !hasHidden && !hasIgnored;
        displayItem(file, indent + extension, isLastItem);
      });
      
      // Display hidden files
      if (hasHidden) {
        item.hiddenFiles.forEach((file, index) => {
          const isLastItem = index === item.hiddenFiles.length - 1 && !hasIgnored;
          displayItem(file, indent + extension, isLastItem);
        });
      }
      
      // Display ignored files
      if (hasIgnored) {
        item.ignoredFiles.forEach((file, index) => {
          displayItem(file, indent + extension, index === item.ignoredFiles.length - 1);
        });
      }
    } else if (item.type === 'repository') {
      const repoInfo = item.repoInfo;
      const sidebarMark = item.inSidebar ? '' : ` ${colors.gray}[hidden]${colors.reset}`;
      console.log(`${indent}${connector}📦 ${colors.magenta}${item.output}/${colors.reset}${sidebarMark} ${colors.dim}(${item.title})${colors.reset}`);
      
      if (repoInfo && repoInfo.files) {
        // Build file tree from repository files
        const fileTree = buildRepoFileTree(repoInfo.files);
        displayRepoTree(fileTree, indent + extension, colors);
      }
    } else if (item.type === 'section') {
      console.log(`${indent}${connector}📂 ${colors.blue}${item.title}${colors.reset} ${colors.gray}[section]${colors.reset}`);
      item.children.forEach((child, index) => {
        displayItem(child, indent + extension, index === item.children.length - 1);
      });
    }
  }
  
  // Build tree structure from flat file list
  function buildRepoFileTree(files) {
    const tree = {};
    
    files.forEach(file => {
      if (file.type === 'markdown') {
        const relativePath = file.localRelativePath.replace(/\\/g, '/');
        const parts = relativePath.split('/');
        let current = tree;
        
        parts.forEach((part, index) => {
          if (index === parts.length - 1) {
            // This is a file
            if (!current._files) current._files = [];
            current._files.push({
              name: part,
              isReadme: /^readme\.md$/i.test(part)
            });
          } else {
            // This is a directory
            if (!current[part]) current[part] = {};
            current = current[part];
          }
        });
      }
    });
    
    return tree;
  }
  
  // Display repository file tree
  function displayRepoTree(tree, indent = '', colors) {
    const entries = Object.entries(tree).filter(([key]) => key !== '_files');
    const files = tree._files || [];
    const totalItems = entries.length + files.length;
    let itemIndex = 0;
    
    // Display directories first
    entries.forEach(([name, subtree]) => {
      itemIndex++;
      const isLast = itemIndex === totalItems;
      const connector = isLast ? '└── ' : '├── ';
      const extension = isLast ? '    ' : '│   ';
      
      console.log(`${indent}${connector}📁 ${colors.cyan}${name}/${colors.reset}`);
      displayRepoTree(subtree, indent + extension, colors);
    });
    
    // Display files
    files.forEach(file => {
      itemIndex++;
      const isLast = itemIndex === totalItems;
      const connector = isLast ? '└── ' : '├── ';
      const icon = file.isReadme ? '🏠' : '📄';
      const fileName = file.name.replace(/\.md$/i, '.html');
      const color = file.isReadme ? colors.white : colors.green;
      
      console.log(`${indent}${connector}${icon} ${color}${fileName}${colors.reset}`);
    });
  }
  
  structure.root.forEach((item, index) => {
    displayItem(item, '', index === structure.root.length - 1);
  });
}

/**
 * Phase 3: Generate ONLY main content (without HTML wrapper)
 */
async function generateMainContent(index, fileStructure) {
  console.log('📝 Phase 3: Generating main content...\n');
  
  const { generateMainContentOnly } = require('./converter');
  let generatedCount = 0;
  const rootPath = index.rootConfig._basePath || 'website';
  
  // Process structure recursively
  async function processStructureItem(item) {
    if (item.type === 'file') {
      // Skip ignored files
      if (item.isIgnored) {
        console.log(`⊘ Skipped (ignored): ${item.output}`);
        return;
      }
      
      // Find source file
      const sourceFile = index.files.find(f => {
        const normalizedSource = item.source.replace(/\\/g, '/');
        const normalizedFile = f.relativePath.replace(/\\/g, '/');
        return normalizedFile === normalizedSource;
      });
      
      if (!sourceFile) {
        console.warn(`⚠️  Source not found: ${item.source}`);
        return;
      }
      
      // Create output path
      const outputPath = path.join('dist', item.output);
      const outputDir = path.dirname(outputPath);
      
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      try {
        await generateMainContentOnly(sourceFile.path, outputPath);
        generatedCount++;
        
        // Скрываем список файлов, показываем только ошибки
      } catch (error) {
        console.error(`❌ Error: ${item.output}`, error.message);
      }
    } else if (item.type === 'folder') {
      // Process files in folder
      for (const file of item.files) {
        await processStructureItem(file);
      }
      
      // Process hidden files
      if (item.hiddenFiles) {
        for (const file of item.hiddenFiles) {
          await processStructureItem(file);
        }
      }
      
      // Ignored files are not processed
    } else if (item.type === 'repository') {
      // Generate repository files
      const repoInfo = item.repoInfo;
      if (!repoInfo) {
        console.warn(`⚠️  Repository info not found: ${item.source}`);
        return;
      }
      
      // Determine output directory based on item.output
      const outputDir = path.join('dist', item.output);
      
      console.log(`\n📦 Generating repository: ${item.title}`);
      
      // Generate each file in repository
      for (const file of repoInfo.files) {
        if (file.type === 'markdown') {
          try {
            const relativePath = file.localRelativePath.replace(/\\/g, '/');
            const outputFileName = relativePath.replace(/\.md$/i, '.html').replace(/readme\.html$/i, 'index.html');
            const outputPath = path.join(outputDir, outputFileName);
            const outputDirPath = path.dirname(outputPath);
            
            if (!fs.existsSync(outputDirPath)) {
              fs.mkdirSync(outputDirPath, { recursive: true });
            }
            
            await generateMainContentOnly(file.localPath, outputPath);
            generatedCount++;
          } catch (error) {
            console.error(`   ❌ Error: ${file.localRelativePath}`, error.message);
          }
        } else if (file.type === 'image' || file.type === 'asset') {
          // Copy assets
          try {
            const relativePath = file.localRelativePath.replace(/\\/g, '/');
            const outputPath = path.join(outputDir, relativePath);
            const outputDirPath = path.dirname(outputPath);
            
            if (!fs.existsSync(outputDirPath)) {
              fs.mkdirSync(outputDirPath, { recursive: true });
            }
            
            fs.copyFileSync(file.localPath, outputPath);
          } catch (error) {
            console.error(`   ❌ Error copying: ${file.localRelativePath}`, error.message);
          }
        }
      }
      
      console.log(`✓ Repository: ${item.title} (${repoInfo.files.length} files)\n`);
    } else if (item.type === 'section') {
      // Process section children
      for (const child of item.children) {
        await processStructureItem(child);
      }
    }
  }
  
  // Process all root items
  for (const item of fileStructure.root) {
    await processStructureItem(item);
  }
  
  console.log(`\n   ✓ Generated ${generatedCount} main content files\n`);
}

/**
 * Phase 4: Post-process all files - wrap main content in full HTML
 */
async function postProcessAllFiles() {
  console.log('🎨 Phase 4: Post-processing (adding HTML wrapper)...\n');
  
  const { wrapMainContentInHTML } = require('./converter');
  
  // Find all HTML files in dist
  function findAllHtmlFiles(dir, files = []) {
    if (!fs.existsSync(dir)) {
      return files;
    }
    
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    items.forEach(item => {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
        // Skip service directories
        if (!item.name.startsWith('.') && item.name !== 'assets') {
          findAllHtmlFiles(fullPath, files);
        }
      } else if (item.name.endsWith('.html')) {
        files.push(fullPath);
      }
    });
    
    return files;
  }
  
  const htmlFiles = findAllHtmlFiles('dist');
  let processedCount = 0;
  
  for (const filePath of htmlFiles) {
    try {
      await wrapMainContentInHTML(filePath);
      processedCount++;
      // Скрываем список файлов, показываем только ошибки
    } catch (error) {
      console.error(`❌ Error: ${path.relative('dist', filePath)}`, error.message);
    }
  }
  
  console.log(`\n   ✓ Post-processed ${processedCount} files\n`);
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
  
  // Copy manifest
  if (fs.existsSync('manifest.webmanifest')) {
    fs.copyFileSync('manifest.webmanifest', 'dist/manifest.webmanifest');
  }
}

/**
 * Main build function
 */
async function buildAll() {
  console.log('🚀 Building with proper indexing...\n');
  
  // Determine root folder
  const rootPath = fs.existsSync('website') ? 'website' : '.';
  
  // Phase 1: Index everything
  const index = await indexAllFiles(rootPath);
  
  // Phase 2: Build file structure and display it
  const fileStructure = generateNavigationTemplates(index);
  
  console.log('\n' + '='.repeat(60));
  console.log('File structure verified. Proceeding with generation...');
  console.log('='.repeat(60) + '\n');
  
  // Clean dist (except assets)
  if (fs.existsSync('dist')) {
    const distItems = fs.readdirSync('dist', { withFileTypes: true });
    for (const item of distItems) {
      if (item.name !== 'assets' && item.name !== '.gitkeep') {
        const fullPath = path.join('dist', item.name);
        if (item.isDirectory()) {
          fs.rmSync(fullPath, { recursive: true, force: true });
        } else if (item.name.endsWith('.html')) {
          fs.unlinkSync(fullPath);
        }
      }
    }
  } else {
    fs.mkdirSync('dist');
  }

  // Copy assets first
  copyAssets();
  
  // Phase 3: Generate main content only
  await generateMainContent(index, fileStructure);
  
  // Phase 4: Post-process all files (wrap in HTML)
  await postProcessAllFiles();
  
  // Phase 5: Generate search index
  await generateSearchIndex();
  
  // Phase 6: Optimize images
  await optimizeImages();
  
  console.log('='.repeat(60));
  console.log('✅ Build completed successfully!');
  console.log('='.repeat(60));
}

/**
 * Generate search index for all HTML files
 */
async function generateSearchIndex() {
  console.log('🔍 Generating search index...');
  
  const { scanAndIndexHtmlFiles, saveSearchIndex } = require('./components/searchIndex');
  
  try {
    const distDir = path.join(process.cwd(), 'dist');
    const searchData = scanAndIndexHtmlFiles(distDir);
    
    const outputPath = path.join(distDir, 'search-index.json');
    saveSearchIndex(searchData, outputPath);
    
    console.log(`   ✓ Search index created: ${searchData.documents.length} documents indexed\n`);
  } catch (error) {
    console.error('   ❌ Failed to generate search index:', error.message);
  }
}

/**
 * Optimize images in dist folder (smart - only new files)
 */
async function optimizeImages() {
  console.log('🖼️  Optimizing images (smart mode)...');
  
  try {
    const { optimizeImages: smartOptimize } = require('./scripts/optimize-images-smart');
    await smartOptimize();
  } catch (error) {
    // Если пакеты не установлены, показываем предупреждение
    if (error.code === 'ERR_MODULE_NOT_FOUND' || error.code === 'MODULE_NOT_FOUND') {
      console.log(`   ⚠️  Image optimization skipped (packages not installed)`);
      console.log(`   💡 Install: npm install --save-dev imagemin imagemin-mozjpeg imagemin-pngquant imagemin-gifsicle imagemin-svgo\n`);
    } else {
      console.error('   ❌ Failed to optimize images:', error.message);
      console.log('');
    }
  }
}

// Run if called directly
if (require.main === module) {
  buildAll().catch(error => {
    console.error('❌ Build failed:', error);
    process.exit(1);
  });
}

module.exports = { buildAll };
