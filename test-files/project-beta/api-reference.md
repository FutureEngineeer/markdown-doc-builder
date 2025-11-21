# Project Beta - API Reference

Complete API reference for Project Beta framework.

## Core API

### Application

#### `createApp(options)`

Creates a new Beta application instance.

```typescript
import { createApp } from 'project-beta'

const app = createApp({
  router: true,
  ssr: true,
  optimization: 'auto'
})
```

**Parameters:**
- `options.router` - Enable file-based routing
- `options.ssr` - Enable server-side rendering  
- `options.optimization` - Optimization level ('auto', 'aggressive', 'minimal')

### Router

#### `useRouter()`

Access the router instance in components.

```typescript
import { useRouter } from 'project-beta'

const router = useRouter()
router.push('/dashboard')
```

#### `defineRoute(path, component)`

Define dynamic routes programmatically.

```typescript
defineRoute('/user/:id', UserComponent)
```

### Optimization

#### `optimize(config)`

Configure optimization settings.

```typescript
optimize({
  images: true,
  css: 'critical',
  js: 'split',
  preload: ['fonts', 'critical-css']
})
```

## Hooks API

### `useData(key, fetcher)`

Data fetching hook with caching.

```typescript
const { data, loading, error } = useData('user', () => 
  fetch('/api/user').then(r => r.json())
)
```

### `useCache(key, value, ttl)`

Manual cache management.

```typescript
const [cached, setCache] = useCache('settings', defaultSettings, 3600)
```

## Plugin API

### `definePlugin(plugin)`

Create custom plugins.

```typescript
export default definePlugin({
  name: 'my-plugin',
  setup(app) {
    app.provide('myService', new MyService())
  }
})
```