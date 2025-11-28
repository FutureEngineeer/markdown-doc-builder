# Build System V2

## Overview

The new build system uses a 3-phase approach:
1. **Phase 1: Complete Indexing** - Index all files and repositories
2. **Phase 2: Generate Navigation** - Create unified navigation templates
3. **Phase 3: Convert Files** - Convert all files using the same navigation

## Key Features

- ✅ **Unified Navigation**: All files have identical hamburger menu
- ✅ **Proper Indexing**: Complete file structure indexed before conversion
- ✅ **Correct Paths**: CSS and asset paths calculated correctly
- ✅ **All Files Included**: Folders without doc-config.yaml are fully indexed

## Usage

```bash
# New build system (recommended)
npm run build:all

# Old build system (legacy)
npm run build:old
```

## How It Works

### Phase 1: Indexing

```
📂 Phase 1: Indexing all files...
   ✓ Loaded root doc-config.yaml
   ✓ Indexed 33 local files
   📥 Downloading: CLN
      ✓ 26 files
   ✓ Total indexed: 33 files, 1 repositories
```

- Scans all `.md` files in `website/`
- Downloads GitHub repositories from `doc-config.yaml`
- Builds complete file index

### Phase 2: Navigation Templates

```
🗺️  Phase 2: Generating navigation templates...
   ✓ Navigation templates ready
   ✓ Indexed: 33 files, 1 repositories
```

- Saves index to `.temp/hierarchy-info.json`
- Creates unified navigation structure
- All files will use the same hamburger menu

### Phase 3: Conversion

```
📄 Phase 3: Converting files to HTML...
✓ home.md → index.html
✓ main.md
✓ project-alpha/main.md
...
   ✓ Converted 52 files
```

- Converts all indexed files to HTML
- Uses pre-generated navigation templates
- Ensures consistent navigation across all pages

## File Structure

```
website/
├── doc-config.yaml          # Root configuration
├── home.md                  # → dist/index.html
├── main.md                  # → dist/main.html
├── project-alpha/
│   ├── doc-config.yaml      # Section configuration
│   ├── main.md              # → dist/project-alpha/main.html
│   └── ...
└── project-beta/
    ├── doc-config.yaml
    └── ...
```

## Configuration

### Root doc-config.yaml

```yaml
hierarchy:
  - file: home.md
    title: "Home"
    alias: home
  
  - repository: "https://github.com/user/repo"
    alias: "repo"
    title: "Repository"
  
  - title: "Projects"
    section: true
    children:
      - folder: project-alpha
        title: "Project Alpha"

ignored:
  - test.md
  - draft.md
```

### Section doc-config.yaml

```yaml
hierarchy:
  - file: main.md
    title: "Overview"
  
  - file: installation.md
    title: "Installation"
```

## Benefits Over Old System

1. **Consistent Navigation**: All pages have the same hamburger menu
2. **Better Performance**: Index once, use many times
3. **Correct Paths**: Proper relative path calculation
4. **Complete Coverage**: All files are indexed and converted
5. **Clear Process**: Three distinct phases make debugging easier

## Migration

To migrate from old system:
1. Keep your existing `doc-config.yaml` files
2. Run `npm run build:all` (now uses v2)
3. Check generated files in `dist/`
4. Old system still available as `npm run build:old`
