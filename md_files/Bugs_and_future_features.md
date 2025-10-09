# Bugs & Future Features

## 🐛 Bugs
- [ ] Public page display improvements
- [ ] Search notes functionality

## 🧹 Code Cleanup
- [x] Add database indexes for performance
- [x] Implement caching for user projects
- [x] Optimize repeated queries in command handlers
- [ ] Consolidate API hooks
- [ ] Standardize button components
- [ ] Create route factory
- [ ] Consolidate toast implementations
- [ ] Notes → Todos conversion

## 🎨 UI Improvements
- [ ] Hover states consistency
- [ ] Badge styling
- [ ] Icon standardization
- [ ] Toast timeouts
- [ ] Admin page cleanup
- [ ] Layout improvements
- [ ] Keyboard shortcuts
- [ ] Back button handling

## ✨ New Features

### High Priority
- [x] **Search System:** `/search [query]` - Full-text search across all content
- [x] **Task Management Commands:**
  - `/complete [todo]` - Mark todo as complete
  - `/assign [todo] [user]` - Assign todo to user
  - `/priority [todo] [level]` - Set priority
  - `/due [todo] [date]` - Set due date
- [x] **Summary/Export:** `/summary` or `/readme` - Generate project summaries/prompts
- [ ] **Wizard Commands:** Flesh out `/wizard new/setup/deploy` for interactive flows

### Medium Priority
- [ ] **AI Bridge:**
  - `/suggest [request]` - AI-powered suggestions for project management
  - `/dump [requests]` - Batch AI operations (e.g., "add todo X, create project Y")
  - Natural language processing for commands
  - "Siri/Clippy" experience for project management
- [ ] **TUI Companion App:** Terminal UI for desktop
- [ ] **Star System:** Star/favorite projects and items
- [ ] **Comment System:** Add comments to todos/notes

### Low Priority
- [ ] Outage banner system
- [ ] Force update mechanism
- [ ] Browser extension integration
