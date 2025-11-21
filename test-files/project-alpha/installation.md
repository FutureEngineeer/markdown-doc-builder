# Project Alpha - Installation Guide

Complete installation and setup guide for Project Alpha.

## System Requirements

- Node.js 16.0 or higher
- npm 7.0 or higher
- Git (for plugin management)

## Installation Methods

### NPM Installation (Recommended)

```bash
npm install -g project-alpha
```

### Manual Installation

1. Download the latest release
2. Extract to your preferred directory
3. Add to PATH

```bash
export PATH=$PATH:/path/to/project-alpha/bin
```

### Docker Installation

```bash
docker pull creapunk/project-alpha:latest
docker run -it creapunk/project-alpha
```

## Initial Setup

After installation, run the setup wizard:

```bash
alpha setup
```

This will:
- Create configuration directory
- Set up default plugins
- Configure authentication
- Test system connectivity

## Verification

Verify your installation:

```bash
alpha --version
alpha doctor
```

## Troubleshooting

Common installation issues and solutions:

### Permission Errors
```bash
sudo npm install -g project-alpha
```

### Path Issues
Add to your shell profile:
```bash
echo 'export PATH=$PATH:~/.npm-global/bin' >> ~/.bashrc
```