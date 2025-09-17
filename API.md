# API & Features

**Base URL:** `/api`  
**Auth:** JWT via cookies or `Authorization: Bearer <token>`

## Core Features

### Projects
- Create, edit, archive, delete projects
- Team collaboration with roles (Owner/Editor/Viewer)
- Public/private visibility settings
- Categories and tags

### Todos
- Task management with priorities and due dates
- Status tracking (not_started, in_progress, blocked, completed)
- Assignment to team members

### Notes
- Rich text notes with real-time collaborative editing
- Note locking to prevent conflicts
- Version tracking

### Documentation
- Template system for API, models, frameworks
- Structured documentation management

## Key Endpoints

### Authentication
```
POST /auth/register
POST /auth/login
GET /auth/me
```

### Projects
```
GET /projects              # List user's projects
POST /projects             # Create project
GET /projects/:id          # Get project details
PUT /projects/:id          # Update project
DELETE /projects/:id       # Delete project
```

### Todos
```
POST /projects/:id/todos           # Create todo
PUT /projects/:id/todos/:todoId    # Update todo
DELETE /projects/:id/todos/:todoId # Delete todo
```

### Notes
```
POST /projects/:id/notes           # Create note
PUT /projects/:id/notes/:noteId    # Update note
POST /projects/:id/notes/:noteId/lock   # Lock for editing
DELETE /projects/:id/notes/:noteId/lock # Unlock
```

### Team Management
```
GET /projects/:id/members          # List team members
POST /projects/:id/invite          # Invite user
PATCH /projects/:id/members/:userId # Update role
DELETE /projects/:id/members/:userId # Remove member
```

## Real-time Features
- Socket.io for live collaboration
- Note editing locks
- Activity tracking
- Team presence indicators

## Additional Features
- Stripe billing integration
- Export/import project data
- Admin dashboard
- Analytics and notifications
- Public project discovery