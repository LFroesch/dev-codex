# Terminal Commands Expansion Plan

## Current Status

### ✅ Working Commands
- `/add todo` - Create todo
- `/add note` - Create note
- `/add devlog` - Create dev log entry
- `/view todos` - List todos
- `/view notes` - List notes
- `/view devlog` - List dev log entries
- `/view docs` - List documentation
- `/swap` - Switch projects
- `/export` - Export project
- `/help` - Show help

### ❌ Missing Commands

Based on analysis of pages and backend APIs, the following functionalities are missing from the terminal:

---

## 1. Documentation Commands (DocsPage.tsx)

### Missing:
- `/add doc` - Create documentation template

### Backend Support:
✅ `POST /api/projects/:id/docs` - Exists

### Implementation:

#### commandParser.ts
```typescript
ADD_DOC = 'add_doc',

// Aliases
'add doc': CommandType.ADD_DOC,
'add-doc': CommandType.ADD_DOC,
'doc': CommandType.ADD_DOC,

// Metadata
[CommandType.ADD_DOC]: {
  type: CommandType.ADD_DOC,
  syntax: '/add doc [type] [title] - [content] [@project]',
  description: 'Create a new documentation template',
  examples: [
    '/add doc Model User - id, name, email @myproject',
    '/doc API /api/users - GET all users',
    '/add-doc ENV DATABASE_URL - connection string'
  ],
  requiresProject: true,
  requiresArgs: true
}
```

#### commandExecutor.ts
```typescript
case CommandType.ADD_DOC:
  return await this.handleAddDoc(parsed, currentProjectId);

private async handleAddDoc(parsed, currentProjectId) {
  // Parse: /add doc [type] [title] - [content]
  // Types: Model, Route, API, Util, ENV, Auth, Runtime, Framework
  const args = parsed.args.join(' ');
  const parts = args.split(' - ');

  if (parts.length < 2) {
    return error('Format: /add doc [type] [title] - [content]');
  }

  const firstPart = parts[0].trim().split(' ');
  const type = firstPart[0]; // Model, Route, etc
  const title = firstPart.slice(1).join(' ');
  const content = parts[1].trim();

  await projectAPI.createDoc(projectId, { type, title, content });
  return success(`📚 Added ${type} doc: "${title}"`);
}
```

---

## 2. Stack/Tech Commands (StackPage.tsx)

### Missing:
- `/add tech` - Add technology to stack
- `/add package` - Add package to project
- `/view stack` - View tech stack
- `/remove tech` - Remove technology
- `/remove package` - Remove package

### Backend Support:
✅ `POST /api/projects/:id/technologies` - Exists
✅ `POST /api/projects/:id/packages` - Exists
✅ `DELETE /api/projects/:id/technologies/:category/:name` - Exists
✅ `DELETE /api/projects/:id/packages/:category/:name` - Exists

### Implementation:

#### commandParser.ts
```typescript
ADD_TECH = 'add_tech',
ADD_PACKAGE = 'add_package',
VIEW_STACK = 'view_stack',
REMOVE_TECH = 'remove_tech',
REMOVE_PACKAGE = 'remove_package',

// Aliases
'add tech': CommandType.ADD_TECH,
'add-tech': CommandType.ADD_TECH,
'tech': CommandType.ADD_TECH,

'add package': CommandType.ADD_PACKAGE,
'add-package': CommandType.ADD_PACKAGE,
'pkg': CommandType.ADD_PACKAGE,

'view stack': CommandType.VIEW_STACK,
'stack': CommandType.VIEW_STACK,

'remove tech': CommandType.REMOVE_TECH,
'rm tech': CommandType.REMOVE_TECH,

'remove package': CommandType.REMOVE_PACKAGE,
'rm pkg': CommandType.REMOVE_PACKAGE,
```

#### commandExecutor.ts
```typescript
case CommandType.ADD_TECH:
  return await this.handleAddTech(parsed, currentProjectId);

private async handleAddTech(parsed, currentProjectId) {
  // /add tech React --category=framework --version=18.2.0
  const name = parsed.args[0];
  const category = parsed.flags.get('category') || 'framework';
  const version = parsed.flags.get('version') || '';

  await projectAPI.addTechnology(projectId, { category, name, version });
  return success(`⚡ Added ${name} to tech stack`);
}

// Similar for packages, view stack, remove commands
```

---

## 3. Deployment Commands (DeploymentPage.tsx)

### Missing:
- `/view deployment` - View deployment info
- `/set deployment` - Update deployment data
- `/set url` - Set live URL
- `/set status` - Set deployment status

### Backend Support:
✅ `PUT /api/projects/:id` (updates `deploymentData` field) - Exists

### Implementation:

#### commandParser.ts
```typescript
VIEW_DEPLOYMENT = 'view_deployment',
SET_DEPLOYMENT = 'set_deployment',

// Aliases
'view deployment': CommandType.VIEW_DEPLOYMENT,
'deployment': CommandType.VIEW_DEPLOYMENT,
'deploy': CommandType.VIEW_DEPLOYMENT,

'set deployment': CommandType.SET_DEPLOYMENT,
'set-deploy': CommandType.SET_DEPLOYMENT,
```

#### commandExecutor.ts
```typescript
private async handleViewDeployment(parsed, currentProjectId) {
  const project = await resolveProject();
  const dd = project.deploymentData || {};

  return {
    type: ResponseType.DATA,
    message: `🚀 Deployment info for ${project.name}`,
    data: {
      liveUrl: dd.liveUrl,
      platform: dd.deploymentPlatform,
      status: dd.deploymentStatus,
      lastDeploy: dd.lastDeployDate,
      branch: dd.deploymentBranch
    }
  };
}

private async handleSetDeployment(parsed, currentProjectId) {
  // /set deployment --url=https://myapp.com --platform=vercel --status=active
  const deploymentData = {
    liveUrl: parsed.flags.get('url'),
    deploymentPlatform: parsed.flags.get('platform'),
    deploymentStatus: parsed.flags.get('status'),
    deploymentBranch: parsed.flags.get('branch')
  };

  await projectAPI.update(projectId, { deploymentData });
  return success(`🚀 Updated deployment settings`);
}
```

---

## 4. Public/Sharing Commands (PublicPage.tsx)

### Missing:
- `/view public` - View public settings
- `/set public` - Toggle public visibility
- `/set slug` - Set public URL slug

### Backend Support:
✅ `PUT /api/projects/:id` (updates `isPublic`, `publicSlug`, etc) - Exists

### Implementation:

#### commandParser.ts
```typescript
VIEW_PUBLIC = 'view_public',
SET_PUBLIC = 'set_public',

'view public': CommandType.VIEW_PUBLIC,
'public': CommandType.VIEW_PUBLIC,

'set public': CommandType.SET_PUBLIC,
'make public': CommandType.SET_PUBLIC,
'make private': CommandType.SET_PUBLIC,
```

#### commandExecutor.ts
```typescript
private async handleSetPublic(parsed, currentProjectId) {
  // /set public --enabled=true --slug=my-awesome-project
  const isPublic = parsed.flags.get('enabled') === 'true';
  const publicSlug = parsed.flags.get('slug');

  await projectAPI.update(projectId, { isPublic, publicSlug });
  return success(`🌐 Project is now ${isPublic ? 'public' : 'private'}`);
}
```

---

## 5. Team/Sharing Commands (SharingPage.tsx)

### Missing:
- `/view team` - View team members
- `/invite` - Invite user to project
- `/remove member` - Remove team member

### Backend Support:
✅ `GET /api/projects/:id/members` - Exists
✅ `POST /api/projects/:id/invite` - Exists
✅ `DELETE /api/projects/:id/members/:userId` - Exists

### Implementation:

#### commandParser.ts
```typescript
VIEW_TEAM = 'view_team',
INVITE_MEMBER = 'invite_member',
REMOVE_MEMBER = 'remove_member',

'view team': CommandType.VIEW_TEAM,
'team': CommandType.VIEW_TEAM,

'invite': CommandType.INVITE_MEMBER,
'invite member': CommandType.INVITE_MEMBER,

'remove member': CommandType.REMOVE_MEMBER,
'kick': CommandType.REMOVE_MEMBER,
```

#### commandExecutor.ts
```typescript
private async handleViewTeam(parsed, currentProjectId) {
  const response = await teamAPI.getMembers(projectId);

  return {
    type: ResponseType.DATA,
    message: `👥 Team members (${response.members.length})`,
    data: {
      members: response.members.map(m => ({
        name: `${m.userId.firstName} ${m.userId.lastName}`,
        email: m.userId.email,
        role: m.role,
        isOwner: m.isOwner
      }))
    }
  };
}

private async handleInvite(parsed, currentProjectId) {
  // /invite user@example.com --role=editor
  const email = parsed.args[0];
  const role = parsed.flags.get('role') || 'editor';

  await teamAPI.invite(projectId, email, role);
  return success(`📧 Invitation sent to ${email}`);
}
```

---

## 6. Settings Commands (SettingsPage.tsx)

### Missing:
- `/view settings` - View project settings
- `/set name` - Update project name
- `/set description` - Update description
- `/set category` - Update category
- `/add tag` - Add tag
- `/remove tag` - Remove tag

### Backend Support:
✅ `PUT /api/projects/:id` - Exists

### Implementation:

#### commandParser.ts
```typescript
VIEW_SETTINGS = 'view_settings',
SET_NAME = 'set_name',
SET_DESCRIPTION = 'set_description',
ADD_TAG = 'add_tag',
REMOVE_TAG = 'remove_tag',

'view settings': CommandType.VIEW_SETTINGS,
'settings': CommandType.VIEW_SETTINGS,

'set name': CommandType.SET_NAME,
'rename': CommandType.SET_NAME,

'set description': CommandType.SET_DESCRIPTION,
'describe': CommandType.SET_DESCRIPTION,

'add tag': CommandType.ADD_TAG,
'tag': CommandType.ADD_TAG,

'remove tag': CommandType.REMOVE_TAG,
'untag': CommandType.REMOVE_TAG,
```

---

## 7. News Commands (NewsPage.tsx)

### Missing:
- `/view news` - View news/updates

### Backend Support:
✅ `GET /api/news` - Exists

### Implementation:

#### commandParser.ts
```typescript
VIEW_NEWS = 'view_news',

'view news': CommandType.VIEW_NEWS,
'news': CommandType.VIEW_NEWS,
'updates': CommandType.VIEW_NEWS,
```

#### commandExecutor.ts
```typescript
private async handleViewNews(parsed) {
  const response = await newsAPI.getPublished();

  return {
    type: ResponseType.DATA,
    message: `📰 Latest news (${response.posts.length})`,
    data: {
      news: response.posts.slice(0, 5).map(p => ({
        title: p.title,
        type: p.type,
        date: p.publishedAt,
        summary: p.summary
      }))
    }
  };
}
```

---

## 8. Account/Theme Commands (AccountSettingsPage.tsx)

### Missing:
- `/set theme` - Change theme
- `/view themes` - List available themes

### Backend Support:
✅ `PUT /api/auth/settings` - Exists

### Implementation:

#### commandParser.ts
```typescript
SET_THEME = 'set_theme',
VIEW_THEMES = 'view_themes',

'set theme': CommandType.SET_THEME,
'theme': CommandType.SET_THEME,

'view themes': CommandType.VIEW_THEMES,
'themes': CommandType.VIEW_THEMES,
```

#### commandExecutor.ts
```typescript
private async handleSetTheme(parsed) {
  // /set theme dark
  const themeName = parsed.args[0];

  await authAPI.updateSettings({ theme: themeName });

  // Trigger theme change in frontend
  document.documentElement.setAttribute('data-theme', themeName);

  return success(`🎨 Theme changed to ${themeName}`);
}

private async handleViewThemes() {
  const themes = [
    'dim', 'light', 'dark', 'cupcake', 'bumblebee', 'emerald',
    'retro', 'cyberpunk', 'synthwave', 'forest', 'aqua', 'lofi'
  ];

  return {
    type: ResponseType.DATA,
    message: '🎨 Available themes',
    data: { themes }
  };
}
```

---

## Summary: Commands to Add

### Total New Commands: ~30

| Category | Commands | Count |
|----------|----------|-------|
| **Docs** | `/add doc` | 1 |
| **Stack** | `/add tech`, `/add package`, `/view stack`, `/remove tech`, `/remove package` | 5 |
| **Deployment** | `/view deployment`, `/set deployment`, `/set url`, `/set status` | 4 |
| **Public** | `/view public`, `/set public`, `/set slug` | 3 |
| **Team** | `/view team`, `/invite`, `/remove member` | 3 |
| **Settings** | `/view settings`, `/set name`, `/set description`, `/add tag`, `/remove tag` | 5 |
| **News** | `/view news` | 1 |
| **Theme** | `/set theme`, `/view themes` | 2 |

---

## Implementation Checklist

### Phase 1: Documentation & Stack (Week 1)
- [ ] Add `ADD_DOC` command type to commandParser.ts
- [ ] Implement `handleAddDoc()` in commandExecutor.ts
- [ ] Add stack command types (ADD_TECH, ADD_PACKAGE, VIEW_STACK, etc)
- [ ] Implement stack handlers in commandExecutor.ts
- [ ] Add navigation buttons in CommandResponse.tsx for stack
- [ ] Test all doc and stack commands

### Phase 2: Deployment & Public (Week 2)
- [ ] Add deployment command types to commandParser.ts
- [ ] Implement deployment handlers in commandExecutor.ts
- [ ] Add public/sharing command types
- [ ] Implement public handlers
- [ ] Add navigation buttons for deployment and public pages
- [ ] Test deployment and public commands

### Phase 3: Team & Settings (Week 3)
- [ ] Add team command types
- [ ] Implement team handlers (view team, invite, remove)
- [ ] Add settings command types
- [ ] Implement settings handlers
- [ ] Add navigation buttons
- [ ] Test team and settings commands

### Phase 4: News & Theme (Week 4)
- [ ] Add news command type
- [ ] Implement news handler
- [ ] Add theme command types
- [ ] Implement theme handlers (with frontend integration)
- [ ] Test news and theme commands
- [ ] Update help documentation with all new commands

### Phase 5: Polish & Documentation (Week 5)
- [ ] Update TERMINAL_STATUS.md with all new commands
- [ ] Create command cheat sheet
- [ ] Add examples to help system
- [ ] Test all commands end-to-end
- [ ] Update frontend CommandResponse.tsx with all navigation buttons

---

## Files to Modify

### Backend (2 files)
1. `backend/src/services/commandParser.ts` - Add all new command types
2. `backend/src/services/commandExecutor.ts` - Add all new handlers

### Frontend (1 file)
1. `frontend/src/components/CommandResponse.tsx` - Add navigation buttons for new commands

### Documentation (2 files)
1. `md_files/TERMINAL_STATUS.md` - Update status
2. `md_files/TERMINAL_COMMANDS_EXPANSION_PLAN.md` - This file

---

## Estimated Timeline

- Phase 1: 5 days (Docs + Stack)
- Phase 2: 5 days (Deployment + Public)
- Phase 3: 5 days (Team + Settings)
- Phase 4: 3 days (News + Theme)
- Phase 5: 2 days (Polish)

**Total: ~20 days** for full implementation

---

## Priority Order

1. **High Priority** (Week 1-2)
   - `/add doc` - Frequently used
   - `/add tech`, `/add package` - Core functionality
   - `/view stack` - Important for developers

2. **Medium Priority** (Week 3)
   - `/view team`, `/invite` - Team collaboration
   - `/view deployment` - Deployment tracking
   - `/set theme` - User experience

3. **Low Priority** (Week 4-5)
   - `/view news` - Nice to have
   - `/view settings` - Covered by UI mostly
   - Advanced deployment commands

---

**Last Updated**: 2025-10-03
**Status**: Planning Complete
**Next Step**: Begin Phase 1 Implementation
