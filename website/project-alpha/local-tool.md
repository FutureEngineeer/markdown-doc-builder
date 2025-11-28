# Local Tool

Simple utility for file management and organization.

## Overview

> **Status:** Stable
> **Revision:** v3.2.1
> **Price:** Free
> **Tags:** utility, file-management, organization, simple

> Local Tool is a lightweight file management utility that helps organize and maintain your local file system with smart categorization.

> **Key Features:**
> - Smart file categorization
> - Duplicate detection
> - Batch operations
> - Custom rules engine

> **Interfaces:** CLI, GUI

![Local Tool Screenshot](./assets/local-tool.png)

## Features

### 📁 Smart Organization
Automatically categorizes files based on type, date, and custom rules.

### 🔍 Duplicate Finder
Identifies and manages duplicate files across your system.

### ⚙️ Batch Operations
Perform bulk operations on multiple files simultaneously.

### 🎯 Custom Rules
Create custom organization rules based on your workflow.

## Installation

```bash
# Download from releases
curl -L https://github.com/creapunk/local-tool/releases/latest/download/local-tool.zip

# Or install via package manager
brew install local-tool
```

## Usage

```bash
# Organize current directory
local-tool organize .

# Find duplicates
local-tool duplicates --scan ~/Documents

# Apply custom rules
local-tool rules --config my-rules.json
```

## Configuration

```json
{
  "rules": [
    {
      "name": "Images",
      "pattern": "\\.(jpg|png|gif)$",
      "destination": "~/Pictures/Organized"
    },
    {
      "name": "Documents", 
      "pattern": "\\.(pdf|doc|docx)$",
      "destination": "~/Documents/Sorted"
    }
  ]
}
```