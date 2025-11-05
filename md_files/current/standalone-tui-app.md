# Standalone TUI Application

## Overview
Create a standalone TUI (Text User Interface) application that allows users to interact with the project manager from their native terminal (Ubuntu/bash, PowerShell, etc.) instead of through the web interface.

## Concept
Users can install and run a CLI tool (e.g., `pm` or `project-manager`) directly in their terminal that provides the same functionality as the web-based terminal, but as a native terminal application.

## Benefits
- **No browser needed**: Quick access without opening a web browser
- **Faster workflow**: Integrate into existing terminal workflows
- **Scriptable**: Can be used in shell scripts and automation
- **Native feel**: Works like other CLI tools (git, npm, etc.)
- **Offline capability**: Could cache data for offline use
- **Cross-platform**: Works on Linux, macOS, Windows (PowerShell/WSL)

## Technical Approach

### Technology Stack Options
1. **Node.js CLI** (recommended - leverages existing backend)
   - Package: `commander` or `yargs` for CLI parsing
   - Package: `inquirer` or `prompts` for interactive wizards
   - Package: `chalk` for colors
   - Package: `ora` for spinners
   - Package: `blessed` or `ink` for full TUI interface
   - Package: `axios` for API calls

2. **Go CLI** (for compiled binary, easier distribution)
   - Package: `cobra` for CLI framework
   - Package: `bubbletea` for TUI framework
   - Package: `lipgloss` for styling

3. **Rust CLI** (for performance and compiled binary)
   - Package: `clap` for CLI parsing
   - Package: `ratatui` for TUI interface
   - Package: `reqwest` for HTTP requests

### Architecture
```
┌─────────────────────────────────────┐
│  User's Terminal (bash/PowerShell)  │
│                                     │
│  $ pm /add todo "Fix bug"          │
│  $ pm /today                       │
│  $ pm /view notes                  │
└─────────────────────────────────────┘
                 │
                 │ HTTP/API calls
                 ▼
┌─────────────────────────────────────┐
│  Backend API (existing)             │
│  - /api/terminal/execute            │
│  - Authentication via JWT           │
└─────────────────────────────────────┘
```

## Features to Implement

### Phase 1: Basic CLI
- [ ] Authentication (login, store JWT token locally)
- [ ] Execute all existing terminal commands
- [ ] Project context (current project selection)
- [ ] Basic output formatting (colors, emojis)
- [ ] Error handling and suggestions

### Phase 2: Interactive Features
- [ ] Interactive wizards (add/edit items)
- [ ] Tab completion for commands
- [ ] Command history
- [ ] Inline editing for multi-line content

### Phase 3: Advanced TUI
- [ ] Full-screen TUI mode (like `htop`)
- [ ] Split panes (todos on left, notes on right)
- [ ] Keyboard navigation
- [ ] Mouse support
- [ ] Real-time updates (websocket connection)

### Phase 4: Offline & Sync
- [ ] Local caching of data
- [ ] Offline mode (work disconnected, sync later)
- [ ] Conflict resolution

## Example Usage

### Simple Commands
```bash
# Login
$ pm login user@example.com

# Quick commands (like web terminal)
$ pm /today
$ pm /add todo --title="Fix bug" --content="Fix the auth issue"
$ pm /view notes
$ pm /search "api endpoint"

# Project switching
$ pm /swap @MyProject
$ pm @AnotherProject /view todos

# Chained commands
$ pm /add todo "Task 1" && /add todo "Task 2" && /view todos
```

### Interactive Wizards
```bash
$ pm /wizard new
? Project name: My New Project
? Category: web
? Description: A cool new project
✓ Project created successfully!

$ pm /add note
? Title: Meeting Notes
? Category: docs
? Content (opens editor): [vim/nano opens]
✓ Note created!
```

### Full TUI Mode
```bash
$ pm tui
# Opens full-screen interface with:
# - Top bar: current project, user info
# - Left panel: todos list
# - Right panel: notes/devlogs
# - Bottom: command input
# - Navigation: arrow keys, vim keys (hjkl)
```

## Installation Methods
```bash
# NPM (if Node.js based)
npm install -g @yourorg/project-manager-cli
pm --version

# Binary download (if Go/Rust)
curl -sSL https://get.projectmanager.io | sh
pm --version

# Homebrew (macOS)
brew install project-manager-cli

# Scoop (Windows)
scoop install project-manager

# APT (Ubuntu/Debian)
sudo apt install project-manager-cli
```

## Configuration
```bash
# Config file: ~/.pm/config.json
{
  "apiUrl": "https://api.projectmanager.io",
  "defaultProject": "project-id-here",
  "theme": "dark",
  "editor": "vim"
}

# Set config
$ pm config set apiUrl "http://localhost:3000"
$ pm config set editor "code --wait"
```

## Authentication Flow
1. User runs `pm login`
2. Opens browser for OAuth (or prompts for email/password)
3. Stores JWT token in `~/.pm/auth.json` (encrypted)
4. All subsequent commands use stored token
5. Auto-refresh token when needed
6. `pm logout` clears token

## Development Tasks
- [ ] Design CLI command structure
- [ ] Create authentication module
- [ ] Implement API client
- [ ] Build command parser
- [ ] Create output formatters
- [ ] Implement interactive wizards
- [ ] Build full TUI mode
- [ ] Create installers/packaging
- [ ] Write documentation
- [ ] Create demo GIF/video

## Implementation Priority
**Recommended: Start with Node.js CLI** because:
- You already have Node.js/TypeScript expertise
- Can reuse types from backend
- Faster iteration
- Easy to publish to npm
- Can be packaged as binary later with `pkg` or `nexe`

## Open Questions
- Should it be a separate repo or in this monorepo?
- Should it support multiple backends (local, cloud)?
- Should it have a daemon mode for real-time sync?
- Should it integrate with system notifications?