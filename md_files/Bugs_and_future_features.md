# To Do Later

## Bugs
- [ ] Public page display improvements
- [ ] Search notes functionality

## Code cleanup
- [ ] Consolidate API hooks
- [ ] Standardize button components
- [ ] Create route factory
- [ ] Consolidate toast implementations
- [ ] Notes → Todos conversion

## UI improvements
- [ ] Hover states consistency
- [ ] Badge styling
- [ ] Icon standardization
- [ ] Toast timeouts
- [ ] Admin page cleanup
- [ ] Layout improvements
- [ ] Keyboard shortcuts
- [ ] Back button handling

## New features
- [ ] TUI companion app
- [ ] Star system
- [ ] Comment system
- [ ] Outage banner
- [ ] Force update mechanism

Code
Cleanup:
1. Extract common project resolution logic into base handler class
2. Split commandExecutor.ts into category modules (CRUD, Team, Settings, Stack)
3. Refactor CommandResponse.tsx - extract render functions into separate components
4. Add input validation and sanitization
5. Improve error handling with centralized response builder
6. Add database indexes for performance

New Commands (Priority):
1. Search: /search [query] - Full-text search across all content
2. Task Management: /complete, /assign, /priority, /due
3. Quick Actions: /today, /week, /recent, /stats
4. Links: /link [url] - Save project resources
5. Issues: /issue [title] - Bug/issue tracking
6. Advanced: /timeline, /roadmap, /template

New Sections:
1. Dashboard with analytics and metrics
2. Links/Resources repository
3. Issues/Bugs tracker
4. Roadmap/Milestones view
- Add DB indexes on frequently queried fields
- Implement caching for user projects
- Optimize repeated queries in command handlers