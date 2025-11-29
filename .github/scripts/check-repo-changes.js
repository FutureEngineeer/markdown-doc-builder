const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const simpleGit = require('simple-git');

/**
 * Извлекает репозитории из hierarchy
 */
function extractRepositories(hierarchy, repos = []) {
  if (!hierarchy || !Array.isArray(hierarchy)) return repos;
  
  hierarchy.forEach(item => {
    if (item.repository) {
      repos.push({ url: item.repository, alias: item.alias });
    }
    if (item.children) {
      extractRepositories(item.children, repos);
    }
  });
  
  return repos;
}

/**
 * Проверяет изменения в репозиториях и определяет нужна ли пересборка
 */
async function checkRepoChanges() {
  try {
    // Загружаем конфигурацию из website/doc-config.yaml
    const docConfigPath = 'website/doc-config.yaml';
    let repositories = [];
    
    if (fs.existsSync(docConfigPath)) {
      const docConfig = yaml.load(fs.readFileSync(docConfigPath, 'utf8'));
      repositories = extractRepositories(docConfig?.hierarchy || []);
    }
    
    // Также проверяем секции
    const websiteDir = 'website';
    if (fs.existsSync(websiteDir)) {
      const items = fs.readdirSync(websiteDir, { withFileTypes: true });
      items.forEach(item => {
        if (item.isDirectory()) {
          const sectionConfigPath = path.join(websiteDir, item.name, 'doc-config.yaml');
          if (fs.existsSync(sectionConfigPath)) {
            const sectionConfig = yaml.load(fs.readFileSync(sectionConfigPath, 'utf8'));
            repositories = repositories.concat(extractRepositories(sectionConfig?.hierarchy || []));
          }
        }
      });
    }
    
    if (repositories.length === 0) {
      console.log('No repositories configured');
      return { forceRebuild: false, changedRepos: [] };
    }
    
    console.log(`Found ${repositories.length} repositories to check`);
    repositories.forEach(repo => {
      console.log(`  - ${repo.alias || repo.url}`);
    });
    
    // Проверяем кеш
    const cacheFile = '.temp/repos-cache.json';
    let cache = {};
    
    if (fs.existsSync(cacheFile)) {
      try {
        cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      } catch (error) {
        console.log('Cache file corrupted, will rebuild all');
        cache = {};
      }
    }
    
    const changedRepos = [];
    let forceRebuild = false;
    
    // Проверяем изменения в текущем проекте
    const git = simpleGit();
    try {
      const status = await git.status();
      const recentCommits = await git.log({ maxCount: 1 });
      
      if (recentCommits.latest) {
        const lastCommitTime = new Date(recentCommits.latest.date);
        const cacheTime = cache.lastBuildTime ? new Date(cache.lastBuildTime) : new Date(0);
        
        if (lastCommitTime > cacheTime) {
          console.log('Current project has changes, forcing full rebuild');
          forceRebuild = true;
        }
      }
    } catch (error) {
      console.log('Could not check git status, assuming changes exist');
      forceRebuild = true;
    }
    
    // Проверяем каждый репозиторий
    for (const repo of repositories) {
      const repoKey = repo.url;
      const lastCheck = cache[repoKey]?.lastCommit;
      
      try {
        // Получаем информацию о последнем коммите через GitHub API
        const [, owner, repoName] = repo.url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/commits/HEAD`;
        
        const response = await fetch(apiUrl);
        if (!response.ok) {
          console.log(`Could not check ${repoKey}, assuming changes`);
          changedRepos.push(repoKey);
          continue;
        }
        
        const commitData = await response.json();
        const latestCommit = commitData.sha;
        
        if (lastCheck !== latestCommit) {
          console.log(`Repository ${repoKey} has changes`);
          changedRepos.push(repoKey);
          
          // Обновляем кеш
          if (!cache[repoKey]) cache[repoKey] = {};
          cache[repoKey].lastCommit = latestCommit;
          cache[repoKey].lastCheck = new Date().toISOString();
        } else {
          console.log(`Repository ${repoKey} is up to date`);
        }
        
      } catch (error) {
        console.log(`Error checking ${repoKey}:`, error.message);
        changedRepos.push(repoKey);
      }
    }
    
    // Обновляем время последней сборки
    cache.lastBuildTime = new Date().toISOString();
    
    // Сохраняем кеш
    if (!fs.existsSync('.temp')) {
      fs.mkdirSync('.temp', { recursive: true });
    }
    fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
    
    // Устанавливаем выходные переменные для GitHub Actions
    const core = require('@actions/core');
    core.setOutput('force-rebuild', forceRebuild.toString());
    core.setOutput('changed-repos', JSON.stringify(changedRepos));
    core.setOutput('has-changes', (forceRebuild || changedRepos.length > 0).toString());
    
    console.log(`Force rebuild: ${forceRebuild}`);
    console.log(`Changed repositories: ${changedRepos.length}`);
    
    return { forceRebuild, changedRepos };
    
  } catch (error) {
    console.error('Error checking repository changes:', error);
    // В случае ошибки, делаем полную пересборку
    const core = require('@actions/core');
    core.setOutput('force-rebuild', 'true');
    core.setOutput('changed-repos', '[]');
    core.setOutput('has-changes', 'true');
    
    return { forceRebuild: true, changedRepos: [] };
  }
}

// Запускаем проверку
if (require.main === module) {
  checkRepoChanges().catch(error => {
    console.error('Failed to check repository changes:', error);
    process.exit(1);
  });
}

module.exports = { checkRepoChanges };