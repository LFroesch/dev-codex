# Batch Commands and Undo Feature - Technical Analysis

Date: 2025-11-20

## 1. Batch Processing > 10 Commands

### Current Limitation
**Location**: `backend/src/services/commandExecutor.ts:269-275`

```typescript
if (commands.length > 10) {
  return {
    type: ResponseType.ERROR,
    message: 'Too many chained commands. Maximum is 10 commands per batch.',
  };
}
```

### Technical Complications for Processing 100+ Commands

#### Memory & Performance Issues
- **Sequential execution** (line 285-294): Commands run one-by-one with `await`, blocking until each completes
- **No timeout protection**: A single slow command blocks the entire batch
- **HTTP timeout risk**: Most servers timeout at 30-60 seconds. 100 commands could easily exceed this
- **Response payload size**: Batch results include full command responses - 100 results = huge JSON payload

#### Database Load
- Each command typically hits MongoDB multiple times
- No transaction support for batch operations
- 100 commands = potentially 500+ DB queries in rapid succession
- Activity logging for each command adds extra writes

#### Error Handling
- Currently stops on first error (line 291-294)
- Partial execution = messy state (some commands succeed, some don't)
- No rollback mechanism

### Implementation Options

#### Option 1: Chunked Processing (Easiest)
```typescript
// Process in batches of 10, show progress
private async executeBatch(commandStr: string, currentProjectId?: string) {
  const commands = this.splitBatchCommands(commandStr);
  const CHUNK_SIZE = 10;
  const chunks = [];

  for (let i = 0; i < commands.length; i += CHUNK_SIZE) {
    chunks.push(commands.slice(i, i + CHUNK_SIZE));
  }

  // Process chunks sequentially, return progress after each
  // Total: 100 commands = 10 chunks × ~5 seconds = 50 seconds
}
```

**Pros:**
- Simple to implement
- Works within existing architecture
- No new dependencies

**Cons:**
- Still blocks HTTP request
- User can't navigate away
- Poor UX for large batches

#### Option 2: Background Job Queue (Better, more complex)
- Submit 100 commands → returns job ID immediately
- Process in background with progress updates via WebSocket/polling
- User can navigate away and check status later

**Requirements:**
- Redis or similar for job queue
- Bull or similar job processor
- WebSocket or SSE for progress updates
- New UI for job status

**Pros:**
- Non-blocking
- Can handle thousands of commands
- Professional solution

**Cons:**
- Infrastructure complexity
- Additional hosting costs
- More code to maintain

#### Option 3: Confirmation Modal (Quick Win)
```typescript
// In frontend: if commands.length > 10, show warning modal
// "You're about to run 47 commands. This may take 30+ seconds. Continue?"
// Backend: increase limit to 50 with request timeout set to 120 seconds
```

**Pros:**
- 30 minutes to implement
- Solves immediate problem
- No architectural changes

**Cons:**
- Still has timeout risk
- Manual confirmation is annoying
- Not scalable long-term

### Recommendation
**Phase 1**: Option 3 (increase limit to 50 with warning modal)
**Phase 2**: Option 2 for paid users (background jobs for 100+ commands)

---

## 2. /undo Command Technical Analysis

### Good News: Infrastructure Already Exists

**Activity Logging** (`backend/src/services/activityLogger.ts`):
- ✅ Logs every action with `oldValue` and `newValue`
- ✅ Stores action type, resource type, resource ID
- ✅ Includes metadata and timestamp
- ✅ Human-readable descriptions
- ✅ Plan-based retention (7/30/90 days)

**Activity Log Model** (`backend/src/models/ActivityLog.ts`):
```typescript
interface IActivityLog {
  projectId: ObjectId;
  userId: ObjectId;
  sessionId: string;
  action: string; // 'created' | 'updated' | 'deleted' | ...
  resourceType: 'todo' | 'note' | 'devlog' | ...;
  resourceId: string;
  details: {
    field?: string;
    oldValue?: any;      // ← KEY for undo!
    newValue?: any;      // ← KEY for undo!
    resourceName?: string;
    metadata?: Record<string, any>;
  };
  timestamp: Date;
  planTier: 'free' | 'pro' | 'premium';
  expiresAt?: Date;
}
```

### Implementation Strategy

```typescript
// New endpoint: POST /api/terminal/undo
async handleUndo(userId: string, sessionId: string): Promise<CommandResponse> {
  // 1. Find most recent non-view activities in this session
  const recentActivities = await ActivityLog.find({
    userId,
    sessionId,
    action: { $nin: ['viewed', 'cleared_activity_log'] }
  })
  .sort({ timestamp: -1 })
  .limit(10);

  // 2. Group by batch (activities within 5 seconds = same batch)
  const lastBatch = groupByBatch(recentActivities);

  // 3. Generate inverse commands for each action
  const undoCommands = lastBatch.map(activity => {
    switch(activity.action) {
      case 'created':
        return `/delete ${activity.resourceType} "${activity.resourceId}"`;
      case 'deleted':
        return `/restore ${activity.resourceType} with data...`; // ← tricky
      case 'updated':
        return `/edit ${activity.resourceType} "${activity.resourceId}" --${activity.details.field}="${activity.details.oldValue}"`;
      // etc...
    }
  });

  // 4. Show preview, require confirmation
  return {
    type: 'undo_preview',
    message: `Found ${undoCommands.length} actions to undo`,
    data: { undoCommands, preview: true }
  };
}
```

### Undo Complexity by Action Type

#### Easy to Undo ✅
- **ADD → DELETE**: Just delete the resource
- **EDIT → EDIT**: Restore oldValue (stored in ActivityLog)
- **COMPLETE TODO → UNCOMPLETE**: Flip status back
- **ADD TAG → REMOVE TAG**: Remove the tag
- **ASSIGN → UNASSIGN**: Remove assignment

#### Moderately Hard ⚠️
- **DELETE → RESTORE**: Need soft deletes or full data snapshot
  - **Current system**: Hard deletes (resource is gone)
  - **Solution**: Add `deletedAt` field, soft delete by default
  - **Cost**: Extra query filtering everywhere: `{ deletedAt: null }`

- **Bulk operations**: If user did `/delete todos @project`, one command = 50 deletions
  - ActivityLog has 50 separate entries
  - User expects one "undo" to revert all 50
  - **Solution**: Add `batchId` field to ActivityLog to group related actions

- **EDIT with multiple fields**: ActivityLog stores one field per entry
  - User edits todo: title, description, priority, due date
  - That's 4 separate ActivityLog entries
  - **Solution**: Undo should prompt "which field(s)?" or undo all 4

#### Very Hard ❌
- **Relationship changes**: Editing component dependencies creates/deletes multiple Relationship documents
  - One command = multiple DB changes
  - ActivityLog shows separate entries for each relationship
  - **Solution**: Track "parent action ID" in ActivityLog

- **Cascading deletes**: Deleting a project deletes all todos, notes, etc.
  - Need to restore everything in correct order
  - **Solution**: Store full snapshot before major operations (premium only)

### Tiered Feature Implementation

#### Free Users
- Undo last **1 action only**
- Preview shows what will be undone
- Only simple actions (ADD, EDIT single field, COMPLETE)
- Error message for DELETE: "Cannot undo deletes without Pro plan"
- 7-day ActivityLog retention

#### Pro Users ($10/month)
- Undo last **batch** (up to 10 actions)
- Soft deletes enabled (can undo DELETE)
- 30-day ActivityLog retention
- Batch grouping (one undo for related actions)

#### Premium Users ($25/month)
- Undo **multiple batches** with picker UI
- Full data snapshots before delete
- Advanced undo picker: "Browse last 50 actions, undo any"
- Undo history viewer with diff preview
- 90-day or unlimited ActivityLog retention

### Database & Compute Costs

#### Storage Costs
**Activity Logs** (already implemented):
- 1 activity = ~200 bytes (action, resourceId, oldValue, newValue, timestamp)
- 1000 activities/user/month = 200KB
- Free tier: 7 days × 1000/month = ~50KB/user (negligible)
- Pro tier: 30 days × 1000/month = ~200KB/user
- Premium tier: 90 days × 1000/month = ~600KB/user

**Soft Deletes** (new):
- Just adds `deletedAt` field to existing documents
- No additional storage until user deletes
- Deleted items persist until manually purged
- Cost: ~0% increase (metadata only)

**Full Snapshots** (premium only):
- Store complete JSON before delete
- Average todo/note = ~500 bytes
- 100 deletes/month = 50KB extra/user
- Cost: ~$0.01/user/month in extra storage

#### Compute Costs
- **Undo generation**: 1 DB query to fetch recent activities (~5ms)
- **Undo execution**: Same as normal command (no additional cost)
- **Soft delete filtering**: Adds `{ deletedAt: null }` to every query (+1ms)
- **Total overhead**: ~10% for premium features, negligible for free/pro

### The "Edit Undo" Problem

#### Simple Edits: Easy ✅
```typescript
// User: /edit todo "Fix bug" --title="Fix critical bug"
// ActivityLog: { field: 'title', oldValue: 'Fix bug', newValue: 'Fix critical bug' }
// Undo: /edit todo "Fix critical bug" --title="Fix bug"
```

#### Complex Edits: Hard ⚠️
```typescript
// User: /edit component "Auth" --dependencies="User,Session,Token"
// This might create 3 new Relationship documents
// ActivityLog shows 3 separate 'created' actions for relationships
// Undo needs to: revert component AND delete 3 relationships
// Solution: Track "parent action ID" in ActivityLog
```

#### Recommended Approach
- **Free**: Undo simple field edits (title, description, status)
- **Pro**: Undo complex edits (relationships, tags, nested data)
- **Premium**: Full transaction replay with time-travel debugging

---

## Implementation Roadmap

### Phase 1: MVP (2-4 hours)
**Target**: Free users, basic undo

1. Add `/undo` command to parser
2. Create `UtilityHandlers.handleUndo()`
3. Query last 5 activities for session
4. Generate preview of undo actions
5. Require confirmation before executing

**Features**:
- Preview last 5 actions
- Only undo ADD, EDIT (single field), COMPLETE
- Show error for DELETE/complex actions

### Phase 2: Pro Features (1-2 days)
**Target**: Paid users, soft deletes

1. Add `deletedAt` field to models (Todo, Note, DevLog, Component)
2. Update all queries to filter `{ deletedAt: null }`
3. Change delete handlers to set `deletedAt: new Date()`
4. Add `batchId` to ActivityLog for grouping
5. Implement batch undo (undo 10 actions at once)

**Features**:
- Soft deletes across all resources
- Undo batch operations
- 30-day activity retention
- Batch grouping

### Phase 3: Premium Features (3-5 days)
**Target**: Premium users, advanced undo

1. Add snapshot collection for full data backup
2. Create undo history UI with picker
3. Implement diff viewer (show before/after)
4. Add "parent action ID" tracking for complex operations
5. Time-travel debugging mode

**Features**:
- Browse last 50 actions
- Undo any historical action
- Full data snapshots
- Advanced diff preview
- 90-day retention

---

## Security Considerations

### Permission Checks
- Verify user has permission to undo (same user who performed action)
- Check project membership hasn't changed
- Validate undo target still exists
- Rate limit undo operations (prevent spam)

### Data Integrity
- Validate state hasn't changed since original action
- Prevent undo of critical operations (billing, account deletion)
- Log all undo operations themselves (meta-logging)
- Add confirmation for bulk undos (>5 actions)

### Edge Cases
- User performs action → leaves project → tries to undo
- User performs action → resource locked → tries to undo
- User performs action → project deleted → tries to undo
- Multiple users editing same resource → conflict resolution

---

## Metrics to Track

### Usage Analytics
- Undo command usage frequency
- Most commonly undone actions
- Undo success/failure rate
- Average time between action and undo

### Business Metrics
- Conversion rate (free → pro after hitting undo limits)
- Feature engagement by tier
- Retention impact (do users with undo stick around longer?)
- Cost per undo operation

---

## Conclusion

### Batch Commands (>10)
**Recommendation**: Start with Option 3 (increase limit to 50 with warning modal), then implement background jobs for premium users later.

**Estimated Effort**: 2 hours
**Risk**: Low
**Value**: High (users want this)

### Undo Feature
**Recommendation**: MVP for free users (2-4 hours), then expand to pro/premium tiers.

**Estimated Effort**:
- Phase 1 (MVP): 2-4 hours
- Phase 2 (Pro): 1-2 days
- Phase 3 (Premium): 3-5 days

**Risk**: Medium (soft deletes require careful implementation)
**Value**: Very High (killer feature, competitive advantage)
**Cost**: ~$0.01/user/month for premium features

### Next Steps
1. ✅ Document technical analysis (this file)
2. ⏳ Prototype `/undo` preview (read-only)
3. ⏳ Test with sample data
4. ⏳ Implement MVP for free users
5. ⏳ Add soft deletes for pro users
6. ⏳ Build advanced UI for premium users
