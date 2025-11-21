const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * Обработчик webhook для GitHub
 * Проверяет, нужно ли пересобирать сайт при изменениях в отслеживаемых репозиториях
 */
async function handleWebhook(payload) {
  try {
    // Загружаем конфигурацию
    const config = yaml.load(fs.readFileSync('config.yaml', 'utf8'));
    const repositories = config?.build?.input?.githubRepositories || [];
    
    if (repositories.length === 0) {
      console.log('No repositories configured for tracking');
      return false;
    }
    
    // Извлекаем информацию о репозитории из payload
    const repoUrl = payload.repository?.html_url;
    const pushedAt = payload.repository?.pushed_at;
    const commits = payload.commits || [];
    
    if (!repoUrl) {
      console.log('No repository URL in payload');
      return false;
    }
    
    // Проверяем, отслеживается ли этот репозиторий
    const isTracked = repositories.some(repo => repo.url === repoUrl);
    
    if (!isTracked) {
      console.log(`Repository ${repoUrl} is not tracked`);
      return false;
    }
    
    console.log(`Webhook received for tracked repository: ${repoUrl}`);
    console.log(`Commits: ${commits.length}`);
    
    // Проверяем, есть ли изменения в .md файлах
    const hasMarkdownChanges = commits.some(commit => {
      const modifiedFiles = [
        ...(commit.added || []),
        ...(commit.modified || []),
        ...(commit.removed || [])
      ];
      
      return modifiedFiles.some(file => file.endsWith('.md'));
    });
    
    if (hasMarkdownChanges) {
      console.log('Markdown files were changed, triggering rebuild');
      
      // Обновляем кеш с информацией о последнем изменении
      const cacheFile = '.temp/repos-cache.json';
      let cache = {};
      
      if (fs.existsSync(cacheFile)) {
        try {
          cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        } catch (error) {
          console.log('Cache file corrupted, creating new');
          cache = {};
        }
      }
      
      // Помечаем репозиторий как измененный
      cache[repoUrl] = {
        lastUpdate: new Date().toISOString(),
        pushedAt: pushedAt,
        needsRebuild: true
      };
      
      // Сохраняем кеш
      if (!fs.existsSync('.temp')) {
        fs.mkdirSync('.temp', { recursive: true });
      }
      fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
      
      return true; // Нужна пересборка
    } else {
      console.log('No markdown files changed, skipping rebuild');
      return false;
    }
    
  } catch (error) {
    console.error('Error handling webhook:', error);
    return true; // В случае ошибки, лучше пересобрать
  }
}

/**
 * Проверяет, нужна ли пересборка на основе кеша
 */
function shouldRebuild() {
  try {
    const cacheFile = '.temp/repos-cache.json';
    
    if (!fs.existsSync(cacheFile)) {
      return true; // Нет кеша, нужна сборка
    }
    
    const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    
    // Проверяем, есть ли репозитории, помеченные для пересборки
    const needsRebuild = Object.values(cache).some(repo => repo.needsRebuild);
    
    if (needsRebuild) {
      console.log('Found repositories marked for rebuild');
      
      // Сбрасываем флаги пересборки
      for (const repo of Object.values(cache)) {
        repo.needsRebuild = false;
      }
      
      fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
      return true;
    }
    
    // Проверяем время последней сборки (не чаще 12 часов)
    const lastBuildTime = cache.lastBuildTime ? new Date(cache.lastBuildTime) : new Date(0);
    const now = new Date();
    const timeDiff = now - lastBuildTime;
    const maxInterval = 12 * 60 * 60 * 1000; // 12 часов
    
    if (timeDiff > maxInterval) {
      console.log(`Last build was ${Math.round(timeDiff / (60 * 60 * 1000))} hours ago, triggering rebuild`);
      return true;
    }
    
    console.log('No rebuild needed');
    return false;
    
  } catch (error) {
    console.error('Error checking rebuild status:', error);
    return true; // В случае ошибки, лучше пересобрать
  }
}

module.exports = {
  handleWebhook,
  shouldRebuild
};