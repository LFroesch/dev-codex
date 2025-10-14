# Bugs & Future Features

## Bugs
- If a user is kicked from a project, force refresh/disconnect them if they are on that project
- Autocomplete for roles / users / variables in the terminalinput.tsx
- Autocomplete tuning/improvements needed

## 🧹 Code Cleanup
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
- [ ] Keyboard shortcuts / Keybinds (add more hotkeys beyond Ctrl+J)
- [ ] Back button handling / Better URL navigation
- [ ] Help Page cleanup and organization
- [ ] Share buttons for projects and content

## ✨ New Features

### High Priority
- [ ] **Wizard Commands:** Flesh out `/wizard new/setup/deploy` for interactive flows
- [ ] **Todo Page System:** Complete todo page with full subtask support
- [ ] `/dump [requests]` - Batch operations (e.g., "add todo X, create project Y")
- [ ] **AI Bridge:** (See clippy.md for detailed implementation)
  - `/suggest [request]` - AI-powered suggestions for project management
  - Natural language processing for commands
  - "Siri/Clippy" experience for project management
- [ ] **Project Types & Filters:**
  - Expanded project categories (game dev, SaaS, ops, full stack, etc.)
  drop down as option in project settings?
  - Tech stack templates/filters per project type
  - Better filtering in create/discover pages

### Medium Priority
- [ ] **Public Page Enhancements:**
  - Rich README/description formatting
  - Public bio/profile pages for users
  - Better presentation of public projects
- [ ] **External Links System:**
  - Link to external assets (Figma, GitHub, etc.)
  - Resource management per project
  - Quick access to external tools
- [ ] **Community Features:**
  - Project forums/discussions
  - Rating system for public projects
  - Feedback/comments on public pages
- [ ] **Star System:** Star/favorite projects and items
- [ ] **Comment System:** Add comments to todos/notes
- [ ] Outage banner system
- [ ] Force update mechanism
- [ ] Browser extension integration
- [ ] Test Page of index.css classes / buttons etc then replace across site
- [ ] Alias odd syntaxing of commands (terminal commands without slash)

### Low Priority
- [ ] **Better Analytics Dashboard:** Enhanced analytics with gamification elements
  - Streak tracking
  - Achievement system
  - Progress visualizations
  - Productivity metrics
- [ ] **TUI Companion App:** Terminal UI for desktop
- [ ] **Future Ideas:**
  - Offline handling / PWA support
  - Whiteboard/diagram page (like Excalidraw/Railway)
  - Real-time collaboration features
