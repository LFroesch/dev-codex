# Community Features Implementation Plan

## Overview
Add social/community features to enable user interaction with public projects: favorites, comments, and leaderboards.

## Current State
- **Frontend Pages**: DiscoverPage (project listing), PublicProjectPage (project detail), PublicProfilePage (user profile)
- **Backend API**: `/public/projects` (list), `/public/project/:id` (detail), `/public/user/:id` (profile)
- **Existing Features**: Public projects, search/filter by category/tag/search, user profiles with project listings

---

## Phase 1: Favorites System

### Database Schema
**New Collection: `ProjectFavorite`**
```typescript
{
  userId: ObjectId,          // User who favorited
  projectId: ObjectId,       // Project that was favorited
  createdAt: Date,           // When favorited
}
// Indexes: [userId, projectId] (unique), projectId, createdAt
```

**Update Project Model**
- Add field: `favoriteCount: Number` (denormalized for performance)

### Backend Endpoints
- `POST /api/public/project/:id/favorite` - Toggle favorite (requires auth)
- `GET /api/public/project/:id/favorites` - Get favorite count
- `GET /api/public/favorites/my` - Get user's favorited projects

### Frontend Changes
**PublicProjectPage.tsx** (lines 6-450)
- Add favorite button near "Share" button (line 244-252)
- Show favorite count icon/badge
- Optimistic UI updates with loading state

**DiscoverPage.tsx** (lines 6-426)
- Add small favorite icon/count to project cards (line 327 area)
- Optional: Add "My Favorites" filter/tab

**PublicProfilePage.tsx** (lines 6-325)
- Optional: Show user's favorite count in profile stats

---

## Phase 2: Comments System

### Database Schema
**New Collection: `ProjectComment`**
```typescript
{
  projectId: ObjectId,       // Project being commented on
  userId: ObjectId,          // Comment author
  content: String,           // Comment text (max 500 chars)
  createdAt: Date,
  updatedAt: Date,
  isEdited: Boolean,
  parentId: ObjectId?,       // For nested replies (optional)
}
// Indexes: projectId, userId, createdAt
```

### Backend Endpoints
- `POST /api/public/project/:id/comments` - Create comment (requires auth)
- `GET /api/public/project/:id/comments` - List comments (paginated)
- `PUT /api/public/project/:id/comments/:commentId` - Edit own comment
- `DELETE /api/public/project/:id/comments/:commentId` - Delete own comment

### Frontend Changes
**PublicProjectPage.tsx**
- Add comments section after documentation section (after line 428)
- Comment form (textarea + submit button) - auth required
- Comment list with author name/avatar, timestamp, edit/delete for own comments
- Pagination or "load more" for comments
- Real-time feel with optimistic updates

---

## Phase 3: Leaderboards

### Backend Endpoints
- `GET /api/public/leaderboard/daily` - Projects with most favorites today
- `GET /api/public/leaderboard/weekly` - Projects with most favorites this week
- `GET /api/public/leaderboard/all-time` - Projects with most total favorites

Query: Aggregate ProjectFavorite by date ranges, return top 10 projects with counts

### Frontend Changes
**DiscoverPage.tsx**
- Add collapsible "Leaderboards" section above projects grid
- Tabs for Daily/Weekly/All-Time
- Show top 10 projects with rank, project name (linked), favorite count
- Simple badge styling (🥇🥈🥉 for top 3)

**OR create new LeaderboardPage.tsx** if prefer dedicated page

---

## Implementation Notes

### Authentication
- All write operations (favorite, comment) require authenticated user
- Show login prompt/modal for non-authenticated users who try to interact
- Read operations (view counts, view comments) are public

### Permissions
- Users can only edit/delete their own comments
- Project owners could potentially delete any comment on their project (optional)
- Rate limiting on comment creation (max 10 per hour per user)

### UI/UX
- Use existing component patterns from current pages
- Favorite: Heart icon (empty/filled), show count
- Comments: Chat bubble icon with count, expandable section
- Leaderboard: Fire/trophy icons, highlight top 3

### Performance
- Cache leaderboard data (5-15 min TTL)
- Denormalize favorite counts on Project model
- Paginate comments (10-20 per page)
- Index all foreign keys and date fields

---

## Future Options

### Phase 4: Advanced Features (Future)
- **Forums/Discussions**: Separate discussion board with categories, threads, posts
  - New collections: `ForumCategory`, `ForumThread`, `ForumPost`
  - Dedicated forum page with categories like "Show & Tell", "Help", "General"

- **Reactions**: Beyond favorites - add emoji reactions to projects/comments (👍👎😍🚀)

- **User Following**: Follow users to see their new projects in a feed

- **Notifications**: Notify project owners of new comments/favorites

- **Project Tags Trending**: Track trending tags over time

- **User Achievements/Badges**: Badges for milestones (10 favorites, 50 comments, etc.)

- **Project Updates Feed**: Let owners post updates/changelogs to followers

- **Search Improvements**: Full-text search with Elasticsearch, search comments

---

## Migration Plan

1. **Phase 1** (Favorites) - 1-2 days
   - Create schema & backend routes
   - Add favorite button to PublicProjectPage
   - Add counts to DiscoverPage cards

2. **Phase 2** (Comments) - 2-3 days
   - Create schema & backend routes
   - Build comment UI component
   - Integrate into PublicProjectPage

3. **Phase 3** (Leaderboards) - 1 day
   - Build aggregation queries
   - Add leaderboard section to DiscoverPage

**Total Estimate: 4-6 days for all 3 phases**
