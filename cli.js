#!/usr/bin/env node

// cli.js - Command Line Interface для документации
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const { convertMarkdownToHTML, processMultipleFiles } = require('./converter');
const { loadYamlConfig } = require('./components/utils');
const { clearRepoCache, getCacheInfo } = require('./components/githubFetcher');
const { clearHtmlGenerationCache, getHtmlCacheInfo } = require('./components/projectParser');

function showHelp() {
  console.log(`
CREAPUNK Documentation Builder CLI

Usage:
  node cli.js [options] <input> [output]

Options:
  -c, --config <path>     Path to YAML config file (default: export-config.yaml)
  -m, --multi             Process multiple files
  -w, --watch             Watch for file changes
  -s, --serve             Start local development server
  -p, --port <number>     Port for development server (default: 3000)
  --cache-info            Show repository cache information
  --clear-cache           Clear repository cache
  --html-cache-info       Show HTML generation cache information
  --clear-html-cache      Clear HTML generation cache
  --clear-all-cache       Clear both repository and HTML caches
  -h, --help              Show this help message

Examples:
  # Single file
  node cli.js readme.md dist/index.html

  # Multiple files with config
  node cli.js --multi --config export-config.yaml

  # Watch mode
  node cli.js --watch readme.md dist/index.html

  # Development server
  node cli.js --serve --config export-config.yaml

  # Cache management
  node cli.js --cache-info
  node cli.js --clear-cache
  node cli.js --html-cache-info
  node cli.js --clear-html-cache
  node cli.js --clear-all-cache
`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    config: 'export-config.yaml',
    multi: false,
    watch: false,
    serve: false,
    port: 3000,
    help: false,
    cacheInfo: false,
    clearCache: false,
    htmlCacheInfo: false,
    clearHtmlCache: false,
    clearAllCache: false,
    input: null,
    output: null
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '-c':
      case '--config':
        options.config = args[++i];
        break;
      case '-m':
      case '--multi':
        options.multi = true;
        break;
      case '-w':
      case '--watch':
        options.watch = true;
        break;
      case '-s':
      case '--serve':
        options.serve = true;
        break;
      case '-p':
      case '--port':
        options.port = parseInt(args[++i]) || 3000;
        break;
      case '-h':
      case '--help':
        options.help = true;
        break;
      case '--cache-info':
        options.cacheInfo = true;
        break;
      case '--clear-cache':
        options.clearCache = true;
        break;
      case '--html-cache-info':
        options.htmlCacheInfo = true;
        break;
      case '--clear-html-cache':
        options.clearHtmlCache = true;
        break;
      case '--clear-all-cache':
        options.clearAllCache = true;
        break;
      default:
        if (!options.input) {
          options.input = arg;
        } else if (!options.output) {
          options.output = arg;
        }
        break;
    }
  }

  return options;
}

function collectFiles(config) {
  const files = [];
  
  if (config.export?.input?.source) {
    const source = config.export.input.source;
    if (fs.existsSync(source)) {
      if (fs.statSync(source).isFile()) {
        files.push(source);
      } else {
        // Это папка, ищем файлы по паттернам (включая подпапки)
        const patterns = config.export.input.patterns || ['**/*.md'];
        patterns.forEach(pattern => {
          const foundFiles = glob.sync(pattern, { 
            cwd: source,
            ignore: ['node_modules/**', '.git/**', 'dist/**']
          });
          foundFiles.forEach(file => {
            files.push(path.join(source, file));
          });
        });
      }
    }
  }

  // Добавляем дополнительные файлы
  if (config.export?.input?.additionalFiles) {
    config.export.input.additionalFiles.forEach(file => {
      if (fs.existsSync(file)) {
        files.push(file);
      }
    });
  }

  return files.filter((file, index, self) => self.indexOf(file) === index); // Убираем дубликаты
}

function ensureOutputDir(outputPath) {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyAssets(config) {
  if (!config.export?.output?.copyAssets) return;
  
  const assetsDir = config.export.output.assetsDir || './assets';
  const outputDir = config.export.output.directory || './dist';
  const targetAssetsDir = path.join(outputDir, 'assets');

  if (fs.existsSync(assetsDir)) {
    if (!fs.existsSync(targetAssetsDir)) {
      fs.mkdirSync(targetAssetsDir, { recursive: true });
    }

    // Рекурсивно копируем все файлы и папки
    function copyRecursive(src, dest) {
      const items = fs.readdirSync(src);
      items.forEach(item => {
        const srcPath = path.join(src, item);
        const destPath = path.join(dest, item);
        
        if (fs.statSync(srcPath).isDirectory()) {
          if (!fs.existsSync(destPath)) {
            fs.mkdirSync(destPath, { recursive: true });
          }
          copyRecursive(srcPath, destPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
          console.log(`✓ Copied asset: ${path.relative(assetsDir, srcPath)}`);
        }
      });
    }
    
    copyRecursive(assetsDir, targetAssetsDir);
  }
}

function startWatcher(files, outputDir, config) {
  const chokidar = require('chokidar');
  
  console.log('👀 Watching for changes...');
  console.log('Files:', files);
  
  const watcher = chokidar.watch(files, {
    ignored: /node_modules/,
    persistent: true
  });

  watcher.on('change', (filePath) => {
    console.log(`\n📝 File changed: ${filePath}`);
    try {
      if (files.length === 1) {
        const outputFile = path.join(outputDir, 'index.html');
        convertMarkdownToHTML(filePath, outputFile, config);
      } else {
        processMultipleFiles(files, outputDir, config);
      }
      console.log('✅ Rebuild complete');
    } catch (error) {
      console.error('❌ Build error:', error.message);
    }
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Stopping watcher...');
    watcher.close();
    process.exit(0);
  });
}

function startDevServer(outputDir, port = 3000) {
  const http = require('http');
  const url = require('url');
  const mime = require('mime-types');

  const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url);
    let pathname = parsedUrl.pathname;
    
    if (pathname === '/') {
      pathname = '/index.html';
    }

    const filePath = path.join(outputDir, pathname);
    
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }

      const mimeType = mime.lookup(filePath) || 'text/plain';
      res.writeHead(200, { 'Content-Type': mimeType });
      res.end(data);
    });
  });

  server.listen(port, () => {
    console.log(`🚀 Development server running at http://localhost:${port}`);
    console.log(`📁 Serving files from: ${outputDir}`);
  });

  return server;
}

async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    return;
  }

  // Обработка команд кеша
  if (options.cacheInfo) {
    const cacheInfo = getCacheInfo();
    console.log('\n📋 Информация о кеше репозиториев:');
    console.log(`Кешировано репозиториев: ${cacheInfo.count}`);
    if (cacheInfo.count > 0) {
      console.log('Репозитории в кеше:');
      cacheInfo.repositories.forEach(repo => console.log(`  - ${repo}`));
    }
    return;
  }

  if (options.htmlCacheInfo) {
    const htmlCacheInfo = getHtmlCacheInfo();
    console.log('\n📋 Информация о кеше HTML генерации:');
    console.log(`Кешировано HTML генераций: ${htmlCacheInfo.count}`);
    if (htmlCacheInfo.count > 0) {
      console.log('HTML генерации в кеше:');
      htmlCacheInfo.repositories.forEach(repo => console.log(`  - ${repo}`));
    }
    return;
  }

  if (options.clearCache) {
    clearRepoCache();
    console.log('✅ Кеш репозиториев очищен');
    return;
  }

  if (options.clearHtmlCache) {
    clearHtmlGenerationCache();
    console.log('✅ Кеш HTML генерации очищен');
    return;
  }

  if (options.clearAllCache) {
    clearRepoCache();
    clearHtmlGenerationCache();
    console.log('✅ Все кеши очищены');
    return;
  }

  // Загружаем конфигурацию
  let config = null;
  if (fs.existsSync(options.config)) {
    config = loadYamlConfig(options.config);
    console.log(`📋 Loaded config: ${options.config}`);
  }

  let files = [];
  let outputDir = './dist';
  let outputFile = 'index.html';

  if (options.multi || (config && config.export?.input?.additionalFiles)) {
    // Мультифайловый режим
    if (config) {
      files = collectFiles(config);
      outputDir = config.export?.output?.directory || './dist';
    } else {
      console.error('❌ Multi-file mode requires a config file');
      process.exit(1);
    }
  } else {
    // Одиночный файл
    const inputFile = options.input || config?.export?.input?.source || 'readme.md';
    const outputPath = options.output || path.join(outputDir, outputFile);
    
    if (!fs.existsSync(inputFile)) {
      console.error(`❌ Input file not found: ${inputFile}`);
      process.exit(1);
    }

    files = [inputFile];
    outputDir = path.dirname(outputPath);
    outputFile = path.basename(outputPath);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🔨 CREAPUNK Documentation Builder');
  console.log('='.repeat(60));
  console.log(`📁 Output directory: ${outputDir}`);
  console.log(`📄 Files to process: ${files.length}`);
  files.forEach(file => console.log(`   - ${file}`));
  console.log('='.repeat(60));

  // Создаем выходную папку
  ensureOutputDir(path.join(outputDir, outputFile));

  try {
    // Обрабатываем файлы
    if (files.length === 1) {
      const outputPath = path.join(outputDir, outputFile);
      convertMarkdownToHTML(files[0], outputPath, options.config);
    } else {
      processMultipleFiles(files, outputDir, options.config);
    }

    // Копируем ассеты
    if (config) {
      copyAssets(config);
    }

    console.log('\n✅ Build completed successfully!');

    // Запускаем watcher если нужно
    if (options.watch) {
      startWatcher(files, outputDir, options.config);
    }

    // Запускаем dev server если нужно
    if (options.serve) {
      const port = options.port || config?.development?.server?.port || 3000;
      startDevServer(outputDir, port);
    }

  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    if (config?.development?.debug) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Запускаем CLI
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  });
}

module.exports = { main, parseArgs, collectFiles };