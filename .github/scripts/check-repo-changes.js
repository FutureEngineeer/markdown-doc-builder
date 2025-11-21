const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const simpleGit = require('simple-git');

/**
 * Проверяет изменения в репозиториях и определяет нужна ли пересборка
 */
async function checkRepoChanges() {
  try {
    // Загружаем конфигурацию
    const config = yaml.load(fs.readFileSync('config.yaml', 'utf8'));
    const repositories = config?.build?.input?.githubRepositories || [];
    
    if (repositories.length === 0) {
      console.log('No repositories configured');
      return { forceRebuild: false, changedRepos: [] };
    }
    
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